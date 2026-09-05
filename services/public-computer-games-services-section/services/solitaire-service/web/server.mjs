#!/usr/bin/env node
/**
 * `server` — a plain `node:http` static file server for this service, in the same house style
 * as the sibling `onestone-service` (`node src/server.mts`, no framework). Zero dependencies.
 *
 * The one thing it does beyond serving bytes: any request whose path ends in `.mts` is read as
 * source, run through `node:module`'s built-in `stripTypeScriptTypes`, and served as
 * `text/javascript`. That is the entire mechanism that lets the browser load `src/cards.mts`,
 * `src/engine.mts`, and `src/daily.mts` — the real rules engine, unmodified, un-duplicated —
 * directly as ES modules, while Node (this file, `web/test/*.test.mts`, `npm test`) loads the
 * identical files through the same native type-stripping it already uses for `src/*.test.mts`.
 * See `web/js/kernel.mjs`'s module doc for the other half of this story.
 *
 * The document root is this package's directory (the parent of `web/`), not `web/` alone, so
 * that a browser-relative import like `../../src/engine.mts` from `/web/js/kernel.mjs` resolves
 * to the real `/src/engine.mts` on disk — URLs mirror the filesystem layout exactly.
 *
 * The front door (`/`) is a real HTTP redirect to `/web/index.html`, not an internal rewrite
 * that serves that file's bytes while leaving the browser's address bar at `/`. That distinction
 * is the whole story of a real bug found in production: `web/index.html`'s own references
 * (`css/style.css`, `js/landing.mjs`, `table.html?...`) are written path-relative with no leading
 * slash — correct only when the document's own URL is `/web/index.html`. Served as an internal
 * rewrite, a browser visiting `/` resolves those same strings against `/` and 404s on all of
 * them, silently, with `landing.mjs` never running — see `web/test/frontdoor.test.mts` for the
 * regression coverage (and its header comment for the full repro chain, including the daily-deal
 * click that used to dead-end on a 404).
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
const ROOT = path.resolve(HERE, '..'); // solitaire-service/ — parent of both web/ and src/
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

async function resolveFile(pathname) {
  const rel = decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT, rel));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    return null; // path traversal guard — stay inside the package directory
  }
  return filePath;
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
  console.log(`solitaire-service serving ${ROOT} at http://localhost:${PORT}/web/index.html`);
});
