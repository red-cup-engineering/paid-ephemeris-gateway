#!/usr/bin/env node
/**
 * serve.mjs -- zero-dependency static file server for play.561.group.
 *
 * Serves this directory (index.html, catalog.json, css/, js/) over plain node:http.
 * No frameworks, no external packages. Matches the house convention used by
 * lantern-service/web/server.mjs and solitaire-service/web/server.mjs.
 *
 * Run: node serve.mjs [port]
 * Env: PORT (default 8561), HOST (default 127.0.0.1)
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8561);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function contentTypeFor(filePath) {
  return MIME[path.extname(filePath)] ?? 'application/octet-stream';
}

/** Resolves a request path to a file under ROOT, refusing to escape it. */
async function resolveFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  if (rel === '/' || rel === '') rel = '/index.html';

  const resolved = path.normalize(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT)) return null; // path traversal guard

  try {
    const st = await stat(resolved);
    if (st.isDirectory()) {
      return resolveFile(path.posix.join(rel, 'index.html'));
    }
    return resolved;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveFile(req.url ?? '/');
    if (!filePath) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 not found');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': contentTypeFor(filePath),
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`500 internal error: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`play.561.group serving http://${HOST}:${PORT}/`);
});

export { server, resolveFile };
