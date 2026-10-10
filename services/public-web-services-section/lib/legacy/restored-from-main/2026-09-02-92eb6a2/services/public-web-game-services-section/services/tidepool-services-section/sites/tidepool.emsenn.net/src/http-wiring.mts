import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import sirv from "sirv";
import type { WorldRuntime } from "./tidepool-runtime.mts";

export interface TidepoolRoomLike {
  attach: (server: Server) => void;
}

export interface CreateTidepoolHttpServerOptions {
  webRoot: string | null;
  metrics: () => Record<string, unknown>;
}

const QWZSPACE_BROWSER_FILES = new Set(["client-browser.mjs", "client.mjs", "protocol.mjs"]);
const qwzspaceBrowserDir = dirname(fileURLToPath(import.meta.resolve("@red-cup-engineering/qwzspace/client-browser")));

type StaticHandler = (req: IncomingMessage, res: ServerResponse, next?: () => void) => void;

function serveMounted(handler: StaticHandler, pathname: string, req: IncomingMessage, res: ServerResponse): void {
  const originalUrl = req.url;
  req.url = pathname;
  handler(req, res, () => res.writeHead(404).end("not found"));
  req.url = originalUrl;
}

export function createTidepoolHttpServer(room: TidepoolRoomLike, runtime: WorldRuntime, opts: CreateTidepoolHttpServerOptions): Server {
  const serveStatic = opts.webRoot === null ? null : sirv(opts.webRoot, { dev: true, etag: true });
  const serveQwzspace = sirv(qwzspaceBrowserDir, { dev: true, etag: true });

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      await runtime.preRequestCatchUp();
    } catch (error) {
      // an ops-plane catch-up/flush failure (e.g. the bucket unreachable) is logged loudly but
      // never takes the route itself down — reads still run against whatever's in memory.
      process.stderr.write(`tidepool: preRequestCatchUp failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    }
    const url = new URL(req.url ?? "/", "http://tidepool.invalid");
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, ...opts.metrics() }));
      return;
    }
    const vendorName = url.pathname.startsWith("/vendor/qwzspace/")
      ? url.pathname.slice("/vendor/qwzspace/".length)
      : null;
    if (vendorName !== null) {
      if (!QWZSPACE_BROWSER_FILES.has(vendorName)) return void res.writeHead(404).end("not found");
      serveMounted(serveQwzspace, `/${vendorName}${url.search}`, req, res);
      return;
    }
    if (serveStatic !== null) {
      serveStatic(req, res, () => res.writeHead(404).end("not found"));
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
