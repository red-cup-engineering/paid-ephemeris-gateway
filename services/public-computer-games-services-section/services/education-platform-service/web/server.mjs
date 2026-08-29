/**
 * `server` -- the education platform's static file server, house pattern (vendored, logic
 * byte-identical in shape, from `lantern-service/web/server.mjs`; zero dependencies, `node:http` +
 * `node:fs` only). Serves everything under this file's own directory (`web/`), which is fully
 * self-contained after `npm run build:web` (compiled world JSON + vendored browser modules both
 * copied in at build time -- this server never reaches outside its own root).
 *
 * Deploy-runbook front-door convention: `/` is a real 302 redirect to `/index.html`, never a
 * same-URL rewrite (the bug three sibling services shipped once, per the runbook's own note) --
 * a same-URL rewrite would serve index.html's bytes at `/` without changing the URL, breaking
 * every path-relative asset reference the moment a browser resolves them against the real `/`.
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

/** Resolve a request path to a file under ROOT, refusing anything that normalizes outside it. */
async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') return null; // handled by the redirect in the request handler, never served directly
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

    const urlPath = (req.url ?? '/').split('?')[0];
    if (urlPath === '/') {
      res.writeHead(302, { location: '/index.html' });
      res.end();
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
  const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
  const host = process.env.HOST ?? '127.0.0.1';
  const server = createStaticServer();
  server.listen(port, host, () => {
    process.stdout.write(`Equivo face serving ${ROOT} at http://${host}:${port}/\n`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
