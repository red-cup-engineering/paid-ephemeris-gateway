// http-wiring — the outer `http.Server` `serve.mts` listens on (own end-to-end test:
// http-wiring.test.mts). A SEPARATE wrapper, not an async wrap of `MudServer` itself: http.mjs
// (vendored) calls its methods synchronously and JSON.stringifies the result same-tick, so an
// async wrap would silently serialize a bare Promise as `{}` (see world-runtime.mts). Extracts
// http.mjs's request listener and wraps it: preRequestCatchUp() before every request,
// postRequestFlush() after MUTATING_ROUTES. PUSH TRANSPORT, ADDITIVE: `opts.room` attaches
// qwzspace's WS 'upgrade' listener to this same server, composing with 'request' untouched;
// mirrors Tidepool's own http-wiring.mts.

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { createMudHttpServer } from "@red-cup-engineering/feltos/http";
import type { WorldRuntime } from "./world-runtime.mts";

export interface FarstoneRoomLike {
  attach: (server: Server) => void;
  stepOnce?: () => Promise<unknown>;
}

export interface FarstoneHttpServerOptions {
  tickIntervalMs: number;
  onCatchUpError?: (error: unknown) => void;
  onFlushError?: (error: unknown) => void;
  /** The qwzspace room (farstone-room.mts's `createFarstoneRoom(...).room`), for the WS push
   *  transport. Omit to keep the server exactly as it was before this option existed — JSON API
   *  only, no 'upgrade' listener attached. */
  room?: FarstoneRoomLike;
  /** TUFTE/QwzSpace browser surface. Omit both fields for the historical headless API shape. */
  pageHtml?: string;
  staticFiles?: Record<string, string>;
}

// POST /talk (http.mjs's control-plane counterpart to telnet's handleLine — who/whoami/finger/
// chat/tell/register/login/quit) joins the mutating set: register/login mutate engine().world
// synchronously, same reason /connect is here. The other five never touch engine().world, so
// flushing after them is a harmless no-op.
const MUTATING_ROUTES = new Set(["POST /connect", "POST /tick", "POST /talk"]);

function defaultErrorLog(label: string) {
  return (error: unknown) => {
    process.stderr.write(`Farstone ${label} failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  };
}

/** `mud` must be the RAW, synchronous `MudServer` — see this module's header for why. */
export function createFarstoneHttpServer(
  mud: { tick(): unknown; connect(name: unknown): unknown; enqueue(actor: unknown, command: unknown): void; drain(actor: unknown): unknown; metrics(): unknown },
  runtime: WorldRuntime,
  opts: FarstoneHttpServerOptions,
): Server {
  const innerHttpServer = createMudHttpServer(mud);
  const innerRequestListener = innerHttpServer.listeners("request")[0] as
    (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
  const onCatchUpError = opts.onCatchUpError ?? defaultErrorLog("pre-request catch-up");
  const onFlushError = opts.onFlushError ?? defaultErrorLog("post-request flush");

  const server = createServer(async (request, response) => {
    try {
      await runtime.preRequestCatchUp();
    } catch (error) {
      onCatchUpError(error);
    }

    const url = new URL(request.url ?? "/", "http://feltos.invalid");
    const routeKey = `${request.method} ${url.pathname}`;

    if (routeKey === "GET /" && opts.pageHtml !== undefined) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      response.end(opts.pageHtml);
      return;
    }

    const staticPath = request.method === "GET" ? opts.staticFiles?.[url.pathname] : undefined;
    if (staticPath !== undefined) {
      try {
        const body = await readFile(staticPath);
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" });
        response.end(body);
      } catch {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "not-found" }));
      }
      return;
    }

    if (routeKey === "POST /qwzspace/tick" && opts.room?.stepOnce) {
      // The command arrives over WebSocket while this tick request arrives over HTTP. Give the
      // socket frame one event-loop turn to reach the authoritative queue before advancing it.
      await new Promise((resolve) => setTimeout(resolve, 25));
      await opts.room.stepOnce();
      await runtime.postRequestFlush(opts.tickIntervalMs);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    await innerRequestListener(request, response);

    if (MUTATING_ROUTES.has(routeKey)) {
      try {
        await runtime.postRequestFlush(routeKey === "POST /tick" ? opts.tickIntervalMs : 0);
      } catch (error) {
        onFlushError(error);
      }
    }
  });

  if (opts.room) {
    server.on("upgrade", () => {
      void runtime.preRequestCatchUp().catch((error) => onCatchUpError(error));
    });
    opts.room.attach(server);
  }

  return server;
}
