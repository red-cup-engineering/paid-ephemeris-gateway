// edge/ws.ts — WebSocket upgrade handling with charge-settled admission.
//
// Each upgrade request is a Meme. Handshake and policy evidence settle whether the socket is admitted
// (potential) or denied (active). Contradicted admission is held (stable) and
// the socket is destroyed rather than silently dropped.
//
// Provides a typed WebSocketSession abstraction over raw net.Socket.

import { randomBytes } from "node:crypto";
import { acceptKey, encodeFrame, FrameDecoder } from "@emsenn/computing-with-http/codecs/ws";
import net from "node:net";
import tls from "node:tls";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { witness, UtteranceLog } from "../internal/witness.mjs";
import { chargeValueFromBits } from "../admission.mjs";

export type WsMessage =
  | { type: "text"; data: string }
  | { type: "binary"; data: Buffer }
  | { type: "ping"; data: Buffer }
  | { type: "pong"; data: Buffer }
  | { type: "close"; code: number; reason: string };

export type WsSession = {
  readonly id: string;
  readonly req: IncomingMessage;
  send(data: string | Buffer): void;
  ping(data?: Buffer): void;
  close(code?: number, reason?: string): void;
  on(event: "message", cb: (msg: WsMessage) => void): void;
  on(event: "close", cb: (code: number, reason: string) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
};

export type WsOptions = {
  path?: string | RegExp;
  admit?: (req: IncomingMessage) => boolean | Promise<boolean>;
  onSession: (session: WsSession) => void | Promise<void>;
  pingIntervalMs?: number;
  maxMessageBytes?: number;
  selectProtocol?: (offered: string[], req: IncomingMessage) => string | undefined;
};

type FrameHandler = (opcode: number, payload: Buffer, fin: boolean) => void;

function parseFrames(socket: Duplex, onFrame: FrameHandler, maxPayload?: number): void {
  const decoder = new FrameDecoder(maxPayload === undefined ? {} : { maxPayload });
  socket.on("data", (chunk: Buffer) => {
    for (const frame of decoder.push(chunk)) {
      if (frame.tooLarge) {
        const payload = Buffer.alloc(2);
        payload.writeUInt16BE(1009, 0);
        socket.write(encodeFrame(0x8, payload));
        socket.end();
        return;
      }
      onFrame(frame.opcode, frame.payload, frame.fin);
    }
  });
}

function createSession(id: string, req: IncomingMessage, socket: Duplex, maxMessageBytes?: number): WsSession {
  const listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  function emit(event: string, ...args: unknown[]): void {
    for (const cb of listeners.get(event) ?? []) cb(...args);
  }

  let textAccumulator = "";
  let binaryAccumulator: Buffer[] = [];

  parseFrames(socket, (opcode, payload, fin) => {
    if (opcode === 0x1) { // text
      textAccumulator += payload.toString("utf8");
      if (fin) { emit("message", { type: "text", data: textAccumulator }); textAccumulator = ""; }
    } else if (opcode === 0x2) { // binary
      binaryAccumulator.push(payload);
      if (fin) { emit("message", { type: "binary", data: Buffer.concat(binaryAccumulator) }); binaryAccumulator = []; }
    } else if (opcode === 0x8) { // close
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000;
      const reason = payload.length > 2 ? payload.slice(2).toString("utf8") : "";
      emit("close", code, reason);
      const closePayload = payload.length >= 2 ? payload : Buffer.from([0x03, 0xe8]);
      socket.write(encodeFrame(0x8, closePayload));
      socket.end();
    } else if (opcode === 0x9) { // ping
      socket.write(encodeFrame(0xa, payload));
      emit("message", { type: "ping", data: payload });
    } else if (opcode === 0xa) { // pong
      emit("message", { type: "pong", data: payload });
    }
  }, maxMessageBytes);

  socket.on("error", (err: Error) => emit("error", err));
  socket.on("close", () => emit("close", 1006, ""));

  return {
    id,
    req,
    send(data) {
      const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
      const opcode = typeof data === "string" ? 0x1 : 0x2;
      socket.write(encodeFrame(opcode, buf));
    },
    ping(data = Buffer.alloc(0)) { socket.write(encodeFrame(0x9, data)); },
    close(code = 1000, reason = "") {
      const buf = Buffer.allocUnsafe(2 + Buffer.byteLength(reason));
      buf.writeUInt16BE(code, 0);
      Buffer.from(reason, "utf8").copy(buf, 2);
      socket.write(encodeFrame(0x8, buf));
      socket.end();
    },
    on(event: "message" | "close" | "error", cb: ((...args: unknown[]) => void)) {
      const list = listeners.get(event) ?? [];
      list.push(cb);
      listeners.set(event, list);
    },
    socket,
  } as WsSession;
}

function badUpgrade(socket: Duplex, status: string, headers: Record<string, string> = {}): void {
  const lines = [`HTTP/1.1 ${status}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), "Connection: close", "", ""];
  socket.write(lines.join("\r\n"));
  socket.destroy();
}

/** Returns an upgrade handler compatible with App.upgrades. */
export function wsUpgrade(opts: WsOptions): {
  match: string | RegExp | ((path: string) => boolean);
  handler: (req: IncomingMessage, socket: unknown, head: Buffer) => void;
} {
  const store = new UtteranceLog();
  let sessionCounter = 0;

  return {
    match: opts.path ?? "/",
    handler: async (req: IncomingMessage, socket: unknown, _head: Buffer) => {
      const sock = socket as Duplex;
      const t = String(Date.now()); // law-allow: wall-clock-as-data — witness timestamp testimony; sessionCounter is the ordinal identity
      const sessionId = `ws-${t}-${sessionCounter++}`;

      const key = req.headers["sec-websocket-key"];
      const version = req.headers["sec-websocket-version"];

      let positive = Boolean(key && version === "13");
      let negative = !positive;

      if (opts.admit) {
        const ok = await opts.admit(req);
        positive ||= ok;
        negative ||= !ok;
      }

      const memeCharge = chargeValueFromBits(positive, negative);
      witness(store, { subject: sessionId, predicate: "ws", object: memeCharge }, memeCharge === "potential" ? [true, false] : [false, true]);

      if (!key) { badUpgrade(sock, "400 Bad Request"); return; }
      if (version !== "13") { badUpgrade(sock, "426 Upgrade Required", { "Sec-WebSocket-Version": "13" }); return; }
      if (memeCharge === "stable") { sock.destroy(); return; }
      if (memeCharge !== "potential") {
        sock.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        sock.destroy();
        return;
      }

      const accept = acceptKey(String(key));
      const offered = String(req.headers["sec-websocket-protocol"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const protocol = opts.selectProtocol?.(offered, req);
      sock.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        (protocol ? `Sec-WebSocket-Protocol: ${protocol}\r\n` : "") +
        `\r\n`,
      );

      const session = createSession(sessionId, req, sock, opts.maxMessageBytes);

      if (opts.pingIntervalMs) {
        const interval = setInterval(() => session.ping(), opts.pingIntervalMs);
        session.on("close", () => clearInterval(interval));
      }

      await opts.onSession(session);
      if (_head?.length) sock.emit("data", _head);
    },
  };
}

export function websocketServer(
  onConnection: (ws: {
    send(data: string | Buffer): void;
    ping(data?: Buffer): void;
    close(code?: number, reason?: string): void;
    on(event: "message" | "close" | "error", cb: (...args: any[]) => void): unknown;
    readonly readyState: number;
    socket: Duplex;
  }, req: IncomingMessage) => void | Promise<void>,
  options: { selectProtocol?: (offered: string[], req: IncomingMessage) => string | undefined; maxPayload?: number } = {},
) {
  const endpoint = {
    handleUpgrade(req: IncomingMessage, socket: unknown, head: Buffer) {
      let raw: Duplex | undefined;
      const upgrade = wsUpgrade({
        ...(options.selectProtocol ? { selectProtocol: options.selectProtocol } : {}),
        ...(options.maxPayload === undefined ? {} : { maxMessageBytes: options.maxPayload }),
        onSession: async (session) => {
          raw = (session as unknown as { socket?: Duplex }).socket;
          const adapter = {
            send: session.send,
            ping: session.ping,
            close: session.close,
            on(event: "message" | "close" | "error", cb: (...args: unknown[]) => void) {
              if (event === "message") {
                session.on("message", (msg) => {
                  if (msg.type === "text") cb(msg.data, false);
                  else if (msg.type === "binary") cb(msg.data, true);
                });
              } else if (event === "close") {
                session.on("close", (code, reason) => cb(code, reason));
              } else {
                session.on("error", (error) => cb(error));
              }
              return adapter;
            },
            get readyState() { return raw && !(raw as { destroyed?: boolean }).destroyed ? 1 : 3; },
            get socket() { return raw!; },
          };
          await onConnection(adapter, req);
        },
      });
      return upgrade.handler(req, socket, head);
    },
    toUpgrade(match?: string | RegExp | ((path: string) => boolean)) {
      return { ...(match ? { match } : {}), handleUpgrade: endpoint.handleUpgrade };
    },
  };
  return endpoint;
}

function clientHandshake(targetWsUrl: string, headers: Record<string, string> = {}): Promise<{ socket: Duplex; head: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetWsUrl);
    const secure = url.protocol === "wss:";
    const port = Number(url.port || (secure ? 443 : 80));
    const key = randomBytes(16).toString("base64");
    const expected = acceptKey(key);
    const socket: Duplex = secure
      ? tls.connect({ host: url.hostname, port, servername: url.hostname })
      : net.connect({ host: url.hostname, port });
    let buf = Buffer.alloc(0);

    socket.once("error", reject);
    socket.once("connect", () => {
      const lines = [
        `GET ${url.pathname || "/"}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
        "",
        "",
      ];
      socket.write(lines.join("\r\n"));
    });
    socket.on("data", function onData(chunk: Buffer) {
      buf = Buffer.concat([buf, chunk]);
      const split = buf.indexOf("\r\n\r\n");
      if (split === -1) return;
      socket.removeListener("data", onData);
      const header = buf.subarray(0, split).toString("utf8");
      const head = buf.subarray(split + 4);
      const status = header.split("\r\n")[0] ?? "";
      const accept = /sec-websocket-accept:\s*(.+)/i.exec(header)?.[1]?.trim();
      if (!/ 101 /.test(status) || accept !== expected) {
        socket.destroy();
        reject(new Error(`upstream WebSocket handshake failed: ${status}`));
        return;
      }
      resolve({ socket, head });
    });
  });
}

export function websocketProxy(targetWsUrl: string, options: { headers?: Record<string, string> } = {}) {
  return async (req: IncomingMessage, socket: unknown, head: Buffer) => {
    const downstream = socket as Duplex;
    const key = req.headers["sec-websocket-key"];
    if ((req.headers.upgrade ?? "").toString().toLowerCase() !== "websocket" || !key) {
      badUpgrade(downstream, "400 Bad Request");
      return;
    }

    let upstream: { socket: Duplex; head: Buffer };
    try {
      const headers = { ...(options.headers ?? {}) };
      const protocol = req.headers["sec-websocket-protocol"];
      if (protocol) headers["Sec-WebSocket-Protocol"] = String(protocol);
      upstream = await clientHandshake(targetWsUrl, headers);
    } catch {
      badUpgrade(downstream, "502 Bad Gateway");
      return;
    }

    downstream.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      `Upgrade: websocket\r\n` +
      `Connection: Upgrade\r\n` +
      `Sec-WebSocket-Accept: ${acceptKey(String(key))}\r\n\r\n`,
    );
    if (upstream.head.length) downstream.write(upstream.head);
    if (head.length) upstream.socket.write(head);
    const tear = () => {
      try { downstream.destroy(); } catch {}
      try { upstream.socket.destroy(); } catch {}
    };
    downstream.on("error", tear);
    upstream.socket.on("error", tear);
    downstream.on("close", tear);
    upstream.socket.on("close", tear);
    downstream.pipe(upstream.socket);
    upstream.socket.pipe(downstream);
  };
}
