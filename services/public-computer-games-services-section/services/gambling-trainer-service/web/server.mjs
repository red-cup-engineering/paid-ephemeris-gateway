#!/usr/bin/env node
/**
 * `server` — a plain `node:http` static file server, zero dependencies at runtime (house style:
 * onestone/crucible/solitaire's `web/server.mjs`, no framework).
 *
 * Two things this file does beyond serving bytes, both carried over from crucible-service's
 * `server.mjs`:
 *
 *   1. Any request whose path ends in `.mts` is read as source, run through `node:module`'s
 *      built-in `stripTypeScriptTypes`, and served as `text/javascript`. That is what lets the
 *      browser load `src/engine.mts`, `src/kelly.mts`, etc. — the real engine, unmodified,
 *      un-duplicated — directly as ES modules, while Node (this file, `web/test/*.test.mts`,
 *      `npm test`) loads the identical files through the same native type-stripping already used
 *      for `src/*.test.mts`.
 *
 *   2. Any request under `/vendor/red-cup-engineering-cartridge/` is served straight out of
 *      `node_modules/@red-cup-engineering/cartridge/` (already plain `.mjs`, no stripping needed).
 *      `daily.mts`, `replay.mts`, `manifest.mts`, `cartridge.mts` all import the bare specifiers
 *      `@red-cup-engineering/cartridge/seed`, `@red-cup-engineering/cartridge/replay`,
 *      `@red-cup-engineering/cartridge/manifest`, and `@red-cup-engineering/cartridge/intent-log` — a browser's
 *      native ESM loader cannot resolve bare specifiers on its own, so `web/index.html` carries a
 *      `<script type="importmap">` mapping exactly those subpaths to the paths this server serves
 *      them at. `manifest.mts` and `cartridge.mts` themselves are Node/server-side-only concerns
 *      (see `web/js/kernel.mjs`'s header) and are never requested by the browser client, but the
 *      import map still needs every subpath any `.mts` file under `src/` could reach so that
 *      `node --check`-equivalent browser loading never 404s on a bare specifier.
 *
 * The document root is this package's directory (the parent of `web/`), not `web/` alone, so a
 * browser-relative import like `../../src/engine.mts` from `/web/js/kernel.mjs` resolves to the
 * real `/src/engine.mts` on disk — URLs mirror the filesystem layout exactly.
 *
 * The front door (`/`) is a real HTTP redirect to `/web/index.html`, not an internal rewrite
 * that serves that file's bytes while leaving the browser's address bar at `/`. `web/index.html`'s
 * own references (`css/style.css`, `js/app.mjs`, ...) are written path-relative with no leading
 * slash — correct only when the document's own URL is `/web/index.html`; served as an internal
 * rewrite, a browser visiting `/` resolves those same strings against `/` and 404s on all of
 * them, silently (solitaire-service's `web/server.mjs` module doc has the full production repro
 * of this exact bug class). See `web/test/frontdoor.test.mts` for the regression coverage.
 *
 * Run: `node web/server.mjs [port]` (default port 8787), then open
 * `http://localhost:<port>/` (redirects to `/web/index.html`).
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // gambling-trainer-service/ — parent of both web/ and src/
// `@red-cup-engineering/cartridge`'s own subpath exports (`./seed`, `./replay`, etc.) resolve to
// files under its package `src/` directory, not at the package root (see its own
// package.json#exports — `"./seed": {"default": "./src/seed.mjs"}` etc.), so the vendor root
// below points at that `src/` directory, not the package root.
const VENDOR_CARTRIDGE_ROOT = path.join(ROOT, 'node_modules', '@red-cup-engineering', 'cartridge', 'src');
const VENDOR_PREFIX = '/vendor/red-cup-engineering-cartridge/';
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mts': 'text/javascript; charset=utf-8', // stripped before serving — see module doc
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function contentTypeFor(filePath) {
  return MIME[path.extname(filePath)] ?? 'application/octet-stream';
}

function resolveInside(base, rel) {
  const filePath = path.normalize(path.join(base, rel));
  if (filePath !== base && !filePath.startsWith(base + path.sep)) return null; // traversal guard
  return filePath;
}

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.startsWith(VENDOR_PREFIX)) {
    return resolveInside(VENDOR_CARTRIDGE_ROOT, decoded.slice(VENDOR_PREFIX.length));
  }
  return resolveInside(ROOT, decoded);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/' || url.pathname === '') {
      // Real redirect, not an internal rewrite — see module doc above.
      res.writeHead(302, { Location: '/web/index.html' });
      res.end();
      return;
    }
    const filePath = await resolveFile(url.pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const raw = await readFile(filePath);
    const ext = path.extname(filePath);
    const body = ext === '.mts' ? Buffer.from(stripTypeScriptTypes(raw.toString('utf8'), { mode: 'strip' })) : raw;
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(body);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`server error: ${err instanceof Error ? err.message : String(err)}`);
  }
});

server.listen(PORT, () => {
  console.log(`gambling-trainer-service serving ${ROOT} at http://localhost:${PORT}/web/index.html`);
});
