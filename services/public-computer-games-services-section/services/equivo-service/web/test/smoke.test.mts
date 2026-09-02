/**
 * `smoke` -- exercises the real static server (`web/server.mjs`) over real HTTP, against the real
 * built `web/` directory (`npm run build:web` must have run first -- `verify:web` does this).
 * Confirms the face actually serves: the shell page, styles, the app module, the compiled world
 * data, and the vendored checker/math modules the browser loads at runtime -- plus the security
 * headers and path-traversal refusal `server.mjs`'s own header documents.
 */
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createStaticServer } from '../server.mjs';

let server;
let base;

before(async () => {
  server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  await new Promise((resolve) => setImmediate(resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('/ redirects (302) to /index.html, never a same-URL rewrite', async () => {
  const res = await fetch(`${base}/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/index.html');
});

test('/index.html serves the real shell page', async () => {
  const res = await fetch(`${base}/index.html`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(res.headers.get('cache-control'), 'no-cache');
  const body = await res.text();
  assert.match(body, /Equivo/);
  assert.match(body, /js\/equivo-app\.js/);
  assert.match(body, /<script type="importmap">/);
});

test('/css/style.css serves with the right content type', async () => {
  const res = await fetch(`${base}/css/style.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/css/);
});

test('/js/app.js serves as JavaScript', async () => {
  const res = await fetch(`${base}/js/app.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
});

test('/js/equivo-app.js serves the thin theme bootstrap', async () => {
  const res = await fetch(`${base}/js/equivo-app.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
});

test('/data/equivo-world.json serves real, non-empty compiled course data', async () => {
  const res = await fetch(`${base}/data/equivo-world.json`);
  assert.equal(res.status, 200);
  const world = await res.json();
  assert.ok(world.rooms.length > 0);
  assert.ok(world.exercises.length > 0);
});

test('every module the import map / app.js references actually serves', async () => {
  const paths = [
    '/js/state.js',
    '/js/equivo-app.js',
    '/js/equivo-adapter.js',
    '/js/markdown.js',
    '/js/vendor/src/checker.js',
    '/js/vendor/src/register.js',
    '/js/vendor/src/srs.js',
    '/js/vendor/src/session.js',
    '/js/vendor/src/persistence.js',
    '/js/vendor/src/mastery.js',
    '/js/vendor/themes/equivo/registry.js',
    '/js/vendor/themes/equivo/registers/index.js',
    '/js/vendor/themes/equivo/registers/obsmetrologia.js',
    '/js/vendor/themes/equivo/registers/semiotics.js',
    '/js/vendor/themes/equivo/registers/relationality.js',
    '/js/vendor/themes/equivo/registers/lakotaean.js',
    '/js/vendor/math/bilattice/index.mjs',
    '/js/vendor/math/obstruction/cochain.mjs',
    '/js/vendor/math/obstruction/settling.mjs',
  ];
  for (const p of paths) {
    const res = await fetch(`${base}${p}`);
    assert.equal(res.status, 200, `${p} did not serve (got ${res.status})`);
  }
});

test('security headers are present on every response', async () => {
  const res = await fetch(`${base}/index.html`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
});

test('an unknown path 404s', async () => {
  const res = await fetch(`${base}/does/not/exist.html`);
  assert.equal(res.status, 404);
});

test('path traversal outside web/ is refused, not served', async () => {
  const res = await fetch(`${base}/..%2f..%2fpackage.json`, { redirect: 'manual' });
  assert.notEqual(res.status, 200);
});

test('POST is rejected -- this server only ever serves static GET/HEAD', async () => {
  const res = await fetch(`${base}/index.html`, { method: 'POST' });
  assert.equal(res.status, 405);
});
