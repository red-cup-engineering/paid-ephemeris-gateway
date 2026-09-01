#!/usr/bin/env node
/**
 * `server` — a plain `node:http` static file server, zero runtime dependencies (house style:
 * gambling-trainer-service's/crucible-service's `web/server.mjs`, no framework).
 *
 * Three things this file does beyond serving bytes:
 *
 *   1. Any request whose path ends in `.mts` is read as source, run through `node:module`'s
 *      built-in `stripTypeScriptTypes`, and served as `text/javascript`. That is what lets the
 *      browser load `src/graph.mts`, `src/eigen.mts`, etc. — the real domain engine, unmodified,
 *      un-duplicated — directly as ES modules, while Node (this file, `web/test/*.test.mts`,
 *      `npm test`) loads the identical files through the same native type-stripping already used
 *      for `src/*.test.mts`.
 *
 *   2. Any request under `/vendor/red-cup-engineering-cartridge/` is served straight out of
 *      `node_modules/@red-cup-engineering/cartridge/` (already plain `.mjs`, no stripping needed).
 *      `web/index.html` carries a `<script type="importmap">` mapping the `@red-cup-engineering/cartridge/*`
 *      bare specifiers `src/cartridge.mts` actually imports at the VALUE level (not `import type`,
 *      which type-stripping erases before the browser ever sees it) to the paths served here.
 *
 *   3. `GET /api/manifest` returns `src/cartridge.manifest.mts`'s `manifest` as JSON — a small,
 *      honest way for the running service to say what cartridge it is, without duplicating the
 *      manifest's fields into a second, hand-maintained copy anywhere in `web/`.
 *
 * The document root is this package's directory (the parent of `web/`), not `web/` alone, so a
 * browser-relative import like `../../src/graph.mts` from `/web/js/kernel.mjs` resolves to the
 * real `/src/graph.mts` on disk — URLs mirror the filesystem layout exactly.
 *
 * The front door (`/`) is a real HTTP redirect to `/web/index.html`, not an internal rewrite
 * that serves that file's bytes while leaving the browser's address bar at `/`. `web/index.html`'s
 * own references (`css/style.css`, `js/app.mjs`) are written path-relative with no leading
 * slash — correct only when the document's own URL is `/web/index.html`; served as an internal
 * rewrite, a browser visiting `/` resolves those same strings against `/` and 404s on all of
 * them, silently (crucible-service's/solitaire-service's `web/server.mjs` module docs have the
 * full production repro of this exact bug class). See `web/test/frontdoor.test.mts` for the
 * regression coverage.
 *
 * Run: `node web/server.mjs [port]` (default port 8794), then open
 * `http://localhost:<port>/` (redirects to `/web/index.html`).
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { manifest } from "../src/cartridge.manifest.mts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."); // stoke-service/ — parent of both web/ and src/
// `@red-cup-engineering/cartridge`'s package.json exports map points every subpath at
// `./src/*.mjs` (confirmed by reading it directly, not assumed) — the vendor root has to be
// that `src/` directory, not the package root, or every vendored request 404s.
const VENDOR_CARTRIDGE_ROOT = path.join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src");
const VENDOR_PREFIX = "/vendor/red-cup-engineering-cartridge/";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8794);

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

/** Traversal guard: the resolved path must stay inside `base`, whether the attempt is a literal
 *  `../` or a URL-encoded variant `decodeURIComponent` already unwrapped upstream. */
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
  return resolveInside(ROOT, decoded);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/" || url.pathname === "") {
        // Real redirect, not an internal rewrite — see module doc above.
        res.writeHead(302, { Location: "/web/index.html" });
        res.end();
        return;
      }
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

// Only boot a listening server when run directly (`node web/server.mjs`), not when imported by
// `web/test/server.test.mts` — the same "importable, not just runnable" shape `createServer`
// above exists to support.
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, () => {
    console.log(`stoke-service serving ${ROOT} at http://localhost:${PORT}/`);
  });
}
