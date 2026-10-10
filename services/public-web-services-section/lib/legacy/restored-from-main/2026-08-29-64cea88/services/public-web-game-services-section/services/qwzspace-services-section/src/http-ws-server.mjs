// http-ws-server — the WebSocket transport: a zero-dependency RFC 6455 server written by hand on
// node:http's `upgrade` event. LIFTED VERBATIM-IN-SPIRIT from apps/games/aletheon/server/net/ws.mjs
// (the repo keeps no `ws` package and we honor that), with the static file handler from that game's
// server/http.mjs folded in so the WS transport can also serve the browser client zero-dep.
//
// It does exactly what a realtime webapp-game needs — text frames, ping/pong, close — and nothing
// it doesn't. The handshake is the SHA-1 of the client key + the RFC GUID; the frame codec masks
// (client→server is masked, server→client is not) and drains as many complete frames as a buffer
// holds. setNoDelay favors latency over throughput — this is a game loop.
//
//   attach(httpServer, onConnection)  — upgrades sockets; calls onConnection(conn) per client.
//   conn.send(text|obj)               — one text frame, server→client unmasked (objects are JSON'd).
//   conn.onMessage = (str) => {}      — a decoded text message arrived (client→server, unmasked).
//   conn.onClose = () => {}           — the socket closed.
//   conn.close()                      — send a close frame and end.
//
// wsClient(conn) wraps a Conn into the broadcast-hub's client shape `{ send(obj):bool, heartbeat }`,
// so the WS transport rides the exact same hub as SSE. staticHandler(root) serves the browser client.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const accept = (key) => createHash("sha1").update(key + GUID).digest("base64");

export function attach(server, onConnection) {
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) { socket.destroy(); return; }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept(key)}\r\n\r\n`
    );
    onConnection(new Conn(socket));
  });
}

class Conn {
  constructor(socket) {
    this.socket = socket;
    this.onMessage = null;
    this.onClose = null;
    this._buf = Buffer.alloc(0);
    this._open = true;
    socket.on("data", (d) => this._onData(d));
    socket.on("close", () => this._fireClose());
    socket.on("error", () => this._fireClose());
    socket.setNoDelay(true); // latency over throughput — this is a game loop
  }

  // send — one text frame. Accepts a string (sent as-is) or any value (JSON-serialized), so a Conn
  // can ride the hub's send(obj) contract directly.
  send(text) {
    if (!this._open) return false;
    try {
      this.socket.write(encodeText(typeof text === "string" ? text : JSON.stringify(text)));
      return true;
    } catch {
      this._fireClose();
      return false;
    }
  }

  close() {
    if (!this._open) return;
    try { this.socket.write(Buffer.from([0x88, 0x00])); this.socket.end(); } catch {}
    this._open = false;
  }

  _fireClose() {
    if (!this._open) return;
    this._open = false;
    if (this.onClose) this.onClose();
  }

  _onData(chunk) {
    this._buf = this._buf.length ? Buffer.concat([this._buf, chunk]) : chunk;
    // drain as many complete frames as the buffer holds
    for (;;) {
      const frame = decodeFrame(this._buf);
      if (!frame) return; // need more bytes
      this._buf = this._buf.subarray(frame.consumed);
      if (frame.opcode === 0x8) { this.close(); this._fireClose(); return; } // close
      else if (frame.opcode === 0x9) { this._pong(frame.payload); } // ping → pong
      else if (frame.opcode === 0x1 || frame.opcode === 0x0) { // text / continuation
        const text = frame.payload.toString("utf8");
        if (this.onMessage) this.onMessage(text);
      }
      // opcode 0xA (pong) and others: ignore
    }
  }

  _pong(payload) {
    const len = payload.length;
    if (len < 126) this.socket.write(Buffer.concat([Buffer.from([0x8a, len]), payload]));
  }
}

// wsClient — wrap a Conn into a broadcast-hub client. send() rides Conn.send (objects JSON'd);
// heartbeat() is a no-op because RFC 6455 keep-alive is the browser's ping/pong, which Conn answers
// in _onData. lastSeq tracks the last processed intent seq for delta acks.
export function wsClient(conn) {
  return {
    conn,
    lastSeq: 0,
    send(obj) { return conn.send(obj); },
    heartbeat() { return true; },
  };
}

// === static file serving (lifted from aletheon/server/http.mjs) ================================
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glsl": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// staticHandler — a tiny zero-dep static file server for the browser client. Serves `root`: `/` is
// `index.html`, every other path is a native ESM module/asset the browser imports directly (no
// bundler). Path traversal is refused; unknown paths 404. `index` overrides the "/" target.
export function staticHandler(root, index = "/index.html") {
  return async (req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = index;
      const filePath = normalize(join(root, urlPath));
      if (!filePath.startsWith(root)) { res.writeHead(403).end("forbidden"); return; }
      if (!existsSync(filePath)) { res.writeHead(404).end("not found"); return; }
      const body = await readFile(filePath);
      const type = MIME[extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-cache" });
      res.end(body);
    } catch {
      res.writeHead(500).end("error");
    }
  };
}

// decodeFrame — parse ONE frame from the head of `buf` (client→server, so masked). Returns
// { opcode, payload, consumed } or null if the buffer doesn't yet hold a whole frame.
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0], b1 = buf[1];
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < off + 2) return null;
    len = buf.readUInt16BE(off); off += 2;
  } else if (len === 127) {
    if (buf.length < off + 8) return null;
    const big = buf.readBigUInt64BE(off); off += 8;
    len = Number(big); // game messages are tiny; 53-bit range is ample
  }
  const maskLen = masked ? 4 : 0;
  if (buf.length < off + maskLen + len) return null;
  let payload;
  if (masked) {
    const mask = buf.subarray(off, off + 4); off += 4;
    payload = Buffer.allocUnsafe(len);
    const src = buf.subarray(off, off + len);
    for (let i = 0; i < len; i++) payload[i] = src[i] ^ mask[i & 3];
  } else {
    payload = buf.subarray(off, off + len);
  }
  return { opcode, payload, consumed: off + len };
}

// encodeText — frame a server→client text message (unmasked, FIN set).
function encodeText(text) {
  const data = Buffer.from(text, "utf8");
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}
