/**
 * `server` — Lantern face's static file server. Zero dependencies: `node:http` + `node:fs`
 * only. Serves everything under this file's own directory (`web/`), which is fully
 * self-contained (see `build/build-layout.mts`'s header — the compiled world JSON is copied
 * in at build time, so this server never needs to reach outside its own root).
 *
 * Run: `node web/server.mjs` (env `PORT`, default 8080; `HOST`, default 127.0.0.1).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

/** Resolve a request path to a file under ROOT, refusing anything that normalizes outside it
 * (path traversal via `..`) or through a symlink escape. */
async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const normalized = normalize(p).replace(/^(\.\.[/\\])+/, '');
  const full = join(ROOT, normalized);
  if (!full.startsWith(ROOT + sep) && full !== ROOT) return null;
  try {
    const st = await stat(full);
    if (st.isDirectory()) return resolveFile(p.endsWith('/') ? p + 'index.html' : p + '/index.html');
    return full;
  } catch {
    return null;
  }
}

export function createStaticServer() {
  return createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }
    const file = await resolveFile(req.url ?? '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    try {
      const body = await readFile(file);
      const ext = extname(file);
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
}

function main() {
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? '127.0.0.1';
  const server = createStaticServer();
  server.listen(port, host, () => {
    process.stdout.write(`VaultMaze face serving ${ROOT} at http://${host}:${port}/\n`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
