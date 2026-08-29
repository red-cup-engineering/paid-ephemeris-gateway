// http-wiring — builds the outer `http.Server` `serve.mts` listens on. Split out of
// `serve.mts` (which has no exports of its own — it's a run-on-import entrypoint) so this
// specific piece of wiring gets its own direct end-to-end HTTP test
// (`http-wiring.test.mts`) instead of only being exercised by actually running the process.
//
// See `world-runtime.mts`'s header for why this exists as a SEPARATE outer server rather than
// wrapping the `MudServer` object handed to `createMudHttpServer`: `http.mjs` (vendored,
// untouched) calls `mudServer.connect()`/`.tick()`/etc. synchronously and JSON-serializes the
// return value in the same tick — an async-returning wrapper would have `JSON.stringify`
// silently serialize a bare `Promise` as `{}`, corrupting every route but `/health` without
// throwing. This factory instead extracts `http.mjs`'s own request listener (never modifying
// or copying its file) and wraps THAT: `runtime.preRequestCatchUp()` before every request,
// `runtime.postRequestFlush()` after the two routes that mutate engine state.
//
// PUSH TRANSPORT, ADDITIVE: when `opts.room` is supplied (serve.mts wires this, farstone-room.mts
// builds it), qwzspace's WebSocket upgrade handling attaches to this SAME `http.Server` via
// `room.attach(server)` — a plain `'upgrade'` event listener, which composes with the JSON API's
// own `'request'` listener above without touching it (Node dispatches 'request' and 'upgrade' to
// entirely separate listener sets; nothing here changes for a client that never upgrades). A
// best-effort catch-up also fires on 'upgrade', mirroring Tidepool's own http-wiring.mts: Node
// dispatches 'upgrade' listeners synchronously without awaiting any of them, so a client
// connecting directly over WS (skipping any HTTP page load first) may receive its opening
// snapshot from a cache that is at most one `tickIntervalMs` stale — the next tick (run by
// whichever request next catches up, including the interval backstop in serve.mts) reconciles it.
// Same disclosed, bounded honesty as the flush model's own.

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

const MUTATING_ROUTES = new Set(["POST /connect", "POST /tick"]);

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
