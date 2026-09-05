import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const MAX_BODY = 64 * 1024;

export function createHandler({ hub, queue, snapshot, clientDir, tickNow }) {
  function finish(res, status, body = "") { res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }); res.end(body); }
  async function serve(res, pathname) {
    const relative = pathname === "/" ? "index.html" : normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
    const file = join(clientDir, relative);
    if (!file.startsWith(clientDir)) return finish(res, 404, "not found");
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch { finish(res, 404, "not found"); }
  }
  return async function handler(req, res) {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (req.method === "GET" && pathname === "/events") {
      const remove = hub.add(res);
      hub.send(res, snapshot.full(tickNow()));
      req.on("close", remove);
      return;
    }
    if (req.method === "POST" && pathname === "/act") {
      let size = 0; const chunks = [];
      req.on("data", (chunk) => { size += chunk.length; if (size <= MAX_BODY) chunks.push(chunk); });
      req.on("end", () => {
        if (size > MAX_BODY) return finish(res, 413);
        try { finish(res, queue.push(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")) ? 204 : 400); }
        catch { finish(res, 400); }
      });
      return;
    }
    if (req.method === "GET") return serve(res, pathname);
    finish(res, 405, "method not allowed");
  };
}
