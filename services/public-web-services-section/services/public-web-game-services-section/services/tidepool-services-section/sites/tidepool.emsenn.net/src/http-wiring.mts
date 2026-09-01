// http-wiring — one plain `node:http` server that does four things: (1) runs
// `runtime.preRequestCatchUp()` before every plain HTTP request (health checks, and — because a
// browser always fetches the page before its WebSocket connects — the common case that keeps
// the web/terminal faces fresh); (2) serves `web/` as static files (qwzspace's own
// `staticHandler`, http-ws-server.mjs); (3) serves qwzspace's own isomorphic browser client
// (`client-browser.mjs`/`client.mjs`/`protocol.mjs`) at `/vendor/qwzspace/*` — LIVE, straight out
// of the installed `@red-cup-engineering/qwzspace` package on disk, never copied/forked into
// `web/`, so the served bytes can never drift from the pinned dependency `package.json` already
// tracks; (4) attaches qwzspace's room for the WebSocket upgrade (`room.attach`), with a
// best-effort catch-up fired on 'upgrade' too — HONEST RACE, disclosed: Node dispatches
// 'upgrade' listeners synchronously to every registered listener without awaiting any of them,
// so a client connecting directly (skipping the web page entirely, e.g. the reference bot) may
// receive its opening snapshot from a cache that is at most one `tickIntervalMs` stale; the very
// next tick's delta (run by whichever request next catches up, including the interval backstop
// in `serve.mts`) reconciles it. This is the same "bounded, honest, never silent" posture
// `world-runtime.mts`'s own header documents for the flush model.

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { staticHandler } from "@red-cup-engineering/qwzspace/http-ws-server";
import type { WorldRuntime } from "./tidepool-runtime.mts";

export interface TidepoolRoomLike {
  attach: (server: Server) => void;
}

export interface CreateTidepoolHttpServerOptions {
  webRoot: string | null;
  metrics: () => Record<string, unknown>;
}

// Exactly the three isomorphic (no `node:` import, no DOM) files client-browser.mjs's own module
// graph touches, per its own header claim — an allowlist, not a directory listing, so this route
// can never accidentally expose anything else from the installed package.
const QWZSPACE_BROWSER_FILES = Object.freeze(["client-browser.mjs", "client.mjs", "protocol.mjs"]);
let qwzspaceBrowserDir: string | null = null;

async function serveQwzspaceBrowserAsset(name: string, res: ServerResponse): Promise<void> {
  if (!QWZSPACE_BROWSER_FILES.includes(name)) {
    res.writeHead(404).end("not found");
    return;
  }
  if (qwzspaceBrowserDir === null) {
    const resolved = import.meta.resolve("@red-cup-engineering/qwzspace/client-browser"); // synchronous since Node 20.6
    qwzspaceBrowserDir = dirname(fileURLToPath(resolved));
  }
  try {
    const body = await readFile(join(qwzspaceBrowserDir, name));
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}

export function createTidepoolHttpServer(room: TidepoolRoomLike, runtime: WorldRuntime, opts: CreateTidepoolHttpServerOptions): Server {
  const serveStatic = opts.webRoot === null ? null : staticHandler(opts.webRoot);

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      await runtime.preRequestCatchUp();
    } catch (error) {
      // an ops-plane catch-up/flush failure (e.g. the bucket unreachable) is logged loudly but
      // never takes the route itself down — reads still run against whatever's in memory.
      process.stderr.write(`tidepool: preRequestCatchUp failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    }
    const url = (req.url ?? "/").split("?")[0];
    if (url === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, ...opts.metrics() }));
      return;
    }
    if (url.startsWith("/vendor/qwzspace/")) {
      await serveQwzspaceBrowserAsset(url.slice("/vendor/qwzspace/".length), res);
      return;
    }
    if (serveStatic !== null) {
      await serveStatic(req, res);
      return;
    }
    res.writeHead(404).end("not found");
  }

  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  server.on("upgrade", () => {
    void runtime.preRequestCatchUp().catch((error) => {
      process.stderr.write(`tidepool: pre-upgrade catch-up failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    });
  });

  room.attach(server);
  return server;
}

export function listenTidepoolHttpServer(server: Server, { host, port }: { host: string; port: number }): Promise<{ origin: string }> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const actualPort = typeof address === "object" && address !== null ? address.port : port;
      resolve({ origin: `http://${host}:${actualPort}` });
    });
  });
}

export function closeTidepoolHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
