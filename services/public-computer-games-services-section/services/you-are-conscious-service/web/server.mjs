#!/usr/bin/env node
/**
 * `server` — a plain `node:http` static file server, zero runtime dependencies, ported from
 * stoke-service's own `web/server.mjs` (same three responsibilities: strip `.mts` types on the
 * fly for the browser, vendor `@red-cup-engineering/cartridge` straight out of `node_modules`, and serve
 * `GET /api/manifest` from the real `cartridge.manifest.mts`).
 *
 * Run: `node web/server.mjs [port]` (default port 8797), then open `http://localhost:<port>/`.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { manifest } from "../src/cartridge.manifest.mts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."); // you-are-conscious-service/ — parent of both web/ and src/
const VENDOR_CARTRIDGE_ROOT = path.join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src");
const VENDOR_PREFIX = "/vendor/red-cup-engineering-cartridge/";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8797);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mts": "text/javascript; charset=utf-8", // stripped before serving — see module doc
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function contentTypeFor(filePath) {
  return MIME[path.extname(filePath)] ?? "application/octet-stream";
}

/** Traversal guard: the resolved path must stay inside `base`. */
function resolveInside(base, rel) {
  const filePath = path.normalize(path.join(base, rel));
  if (filePath !== base && !filePath.startsWith(base + path.sep)) return null;
  return filePath;
}

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.startsWith(VENDOR_PREFIX)) {
    return resolveInside(VENDOR_CARTRIDGE_ROOT, decoded.slice(VENDOR_PREFIX.length));
  }
  let rel = decoded;
  if (rel === "/" || rel === "") rel = "/web/index.html";
  return resolveInside(ROOT, rel);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/api/manifest") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(manifest, null, 2));
        return;
      }
      const filePath = await resolveFile(url.pathname);
      if (!filePath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("forbidden");
        return;
      }
      const raw = await readFile(filePath);
      const ext = path.extname(filePath);
      const body = ext === ".mts" ? Buffer.from(stripTypeScriptTypes(raw.toString("utf8"), { mode: "strip" })) : raw;
      res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
      res.end(body);
    } catch (err) {
      if (err && err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`server error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, () => {
    console.log(`you-are-conscious-service serving ${ROOT} at http://localhost:${PORT}/`);
  });
}
