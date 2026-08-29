#!/usr/bin/env node
/**
 * `server` — a plain `node:http` static file server for the whole parlor-service shelf, zero
 * runtime dependencies (house style: onestone/crucible/gambling-trainer's `web/server.mjs`, no
 * framework). Deliberately game-agnostic: it serves the service's directory tree exactly as it
 * sits on disk, so adding another game under `web/<game>/` or `src/games/<game>/` needs no
 * edit here — this file has no per-game logic in it at all.
 *
 * Two things this file does beyond serving bytes, carried over from gambling-trainer-service's
 * `server.mjs`:
 *
 *   1. Any request whose path ends in `.mts` is read as source, run through `node:module`'s
 *      built-in `stripTypeScriptTypes`, and served as `text/javascript` — the browser loads the
 *      real `src/games/<game>/*.mts` engine files directly, unmodified, un-duplicated.
 *
 *   2. `@red-cup-engineering/parlor-kernel` and `@red-cup-engineering/cartridge` are *already* plain `.mjs`
 *      (no stripping needed) — requests under `/vendor/parlor-kernel/` and `/vendor/cartridge/`
 *      are served straight out of each package's own `node_modules/.../src/` directory. Every
 *      `.mts` file under `src/games/` that imports the bare specifiers
 *      `@red-cup-engineering/parlor-kernel/*` or `@red-cup-engineering/cartridge/*` is resolved by each
 *      game page's own `<script type="importmap">` to these vendor paths — a browser's native
 *      ESM loader cannot resolve bare specifiers on its own.
 *
 * The document root is this package's directory (the parent of `web/`), not `web/` alone, so a
 * browser-relative import like `../../src/games/pig/engine.mts` from `/web/js/kernel-pig.mjs`
 * resolves to the real `/src/games/pig/engine.mts` on disk — URLs mirror the filesystem layout.
 *
 * Run: `node web/server.mjs [port]` (default port 8871), then open
 * `http://localhost:<port>/`.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // parlor-service/ — parent of both web/ and src/
const VENDOR_ROOTS = {
  '/vendor/parlor-kernel/': path.join(ROOT, 'node_modules', '@red-cup-engineering', 'parlor-kernel', 'src'),
  '/vendor/cartridge/': path.join(ROOT, 'node_modules', '@red-cup-engineering', 'cartridge', 'src'),
};
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8871);
// Explicit IPv4 loopback, not the '::'/dual-stack default `server.listen(port)` alone would
// bind to — some sandboxed network namespaces (this house's own test sandbox among them) route
// IPv4 127.0.0.1 and the IPv6 wildcard inconsistently, so a test (or a person) connecting to
// `127.0.0.1` can get ECONNREFUSED against a socket that genuinely is listening, just not on
// that family. Matches `sites/play.561.group/serve.mjs`'s own `HOST` convention.
const HOST = process.env.HOST ?? '127.0.0.1';

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

const WEB_ROOT = path.join(ROOT, 'web');

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  for (const [prefix, base] of Object.entries(VENDOR_ROOTS)) {
    if (decoded.startsWith(prefix)) return resolveInside(base, decoded.slice(prefix.length));
  }
  // Fully-qualified requests (the engine source itself, or an explicit /web/... asset path)
  // resolve straight under ROOT, mirroring the filesystem exactly.
  if (decoded.startsWith('/src/') || decoded.startsWith('/web/')) {
    return resolveInside(ROOT, decoded);
  }
  // Every pretty game URL (`/`, `/pig/`, `/farkle/`, `/yacht/`, …) resolves under web/ instead —
  // that's where every game's own index.html actually lives on disk.
  let rel = decoded;
  if (rel === '/' || rel === '') rel = '/index.html';
  else if (rel.endsWith('/')) rel = `${rel}index.html`;
  return resolveInside(WEB_ROOT, rel);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
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

server.listen(PORT, HOST, () => {
  const boundPort = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  console.log(`parlor-service serving ${ROOT} at http://${HOST}:${boundPort}/`);
});

export { server, resolveFile };
