// http-sse-server — the Server-Sent-Events transport: a pure node:http surface. LIFTED from
// apps/games/ruinfold/server/{http,sse}.mjs and generalized. SSE is a one-way stream (server →
// browser) of plain text over a never-closing HTTP response: exactly the shape of "push every
// client the world as it changes." The whole transport is `res.write("data: …\n\n")` — zero server
// dependencies, no bundling, it just serves the handful of static client files and the event stream.
//
// It wraps a node:http response into the broadcast-hub's client shape `{ send(obj):bool, heartbeat }`
// (the hub owns the client SET; this file owns the SSE wire), and routes exactly three things plus
// static assets:
//   GET  /            -> the client shell (clientDir/index.html)
//   GET  /<path>      -> static client modules/assets (traversal-guarded), 404 otherwise
//   GET  /events      -> the SSE stream: the full world once, then deltas/events
//   POST /act         -> queue ONE validated intent (the tick applies it — single-writer)
//
// The handler is transport-side ONLY: a POST never touches the world, it validates-and-queues
// (queue.push); the tick-driver is the single writer. A fresh client gets the full snapshot once on
// connect, then the hub streams it deltas. Interest filtering is per-subscriber: if a snapshot
// manager is supplied, each /events connection is bound to its own subscriber handle.

import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glsl": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const MAX_BODY = 64 * 1024; // an intent is tiny; cap the POST body to refuse abuse

// sseClient — wrap a node:http response into a broadcast-hub client. send() serializes an object as
// one SSE event; heartbeat() writes a comment line to keep idle/half-open sockets alive. Both are
// best-effort: a write error returns false so the hub drops the client.
export function sseClient(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable proxy buffering so events flush immediately
  });
  res.write(": connected\n\n"); // a comment line opens the stream
  return {
    res,
    lastSeq: 0,
    send(obj) {
      try {
        return res.write(`data: ${JSON.stringify(obj)}\n\n`);
      } catch {
        return false;
      }
    },
    heartbeat() {
      try {
        return res.write(": ping\n\n");
      } catch {
        return false;
      }
    },
  };
}

// createSseHandler — the node:http request handler. `hub` is a broadcast-hub; `queue` is an
// intent-queue; `snapshot` is a snapshot-manager; `tickNow()` reads the current tick; `clientDir`
// (optional) roots static serving; `eventsPath`/`actPath` (optional) override the routes.
export function createSseHandler({ hub, queue, snapshot, tickNow, clientDir = null, eventsPath = "/events", actPath = "/act" }) {
  async function serveStatic(res, urlPath) {
    if (!clientDir) return notFound(res);
    // Map "/" to index.html; sanitize so the path cannot escape clientDir.
    const rel = urlPath === "/" ? "index.html" : normalize(urlPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
    const file = join(clientDir, rel);
    if (!file.startsWith(clientDir)) return notFound(res); // traversal guard
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      notFound(res);
    }
  }

  function notFound(res) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }

  return async function handler(req, res) {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    if (req.method === "GET" && path === eventsPath) {
      const client = sseClient(res);
      const remove = hub.add(client);
      // bind a per-subscriber interest view if the snapshot manager supports it, then send the full
      // opening frame (this client's interest set, or the whole cache if unfiltered).
      let opening;
      if (snapshot && typeof snapshot.subscribe === "function") {
        const subscriber = snapshot.subscribe(res); // res is a stable per-connection key
        hub.bind(client, subscriber);
        opening = subscriber.full(tickNow());
      } else {
        opening = snapshot.full(tickNow());
      }
      hub.send(client, opening);
      req.on("close", remove);
      return;
    }

    if (req.method === "POST" && path === actPath) {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          res.writeHead(413).end();
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => {
        try {
          const raw = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          const intent = queue.push(raw); // validate-and-queue ONLY; the tick is the writer
          res.writeHead(intent ? 204 : 400).end();
        } catch {
          res.writeHead(400).end();
        }
      });
      return;
    }

    if (req.method === "GET") return serveStatic(res, path);

    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("method not allowed");
  };
}
