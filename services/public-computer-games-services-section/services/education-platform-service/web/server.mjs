/**
 * Development-only static server for the self-contained `web/` root. `/` redirects to
 * `/index.html` so path-relative assets resolve correctly. Production uses Cloudflare assets.
 */
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sirv from 'sirv';

const ROOT = dirname(fileURLToPath(import.meta.url));

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

export function createStaticServer() {
  const serveStatic = sirv(ROOT, { dev: true, etag: true, extensions: ['html'] });

  return createServer((req, res) => {
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

    serveStatic(req, res, () => {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not Found');
    });
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
