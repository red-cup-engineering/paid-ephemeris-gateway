/**
 * Crucible is the first house service to serve a real *dependency* to the browser (ANATOMY
 * digest — not in any of the three sibling examples). This test starts a real
 * `web/server.mjs` instance, fetches every URL `index.html`'s import map points at, and asserts
 * a real 200 with non-empty JavaScript content — so a missed or renamed subpath fails CI, not a
 * player's browser console.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // crucible-service/
const PORT = 8799;
// IPv6 loopback, not "localhost"/"127.0.0.1": in some sandboxed CI environments IPv4 loopback
// connect() is refused for non-curl processes even though the server is listening (confirmed by
// hand: `curl http://127.0.0.1:PORT` and `curl http://localhost:PORT` both work, but Node's own
// `fetch`/`net.connect` to the same IPv4 address gets ECONNREFUSED there, while `[::1]` works
// from both) — using `[::1]` here keeps this test meaningful in that environment and is exactly
// as valid an integration check anywhere else, since `web/server.mjs` listens on all interfaces.
const BASE = `http://[::1]:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | undefined;

before(async () => {
  serverProcess = spawn(process.execPath, [path.join(ROOT, 'web', 'server.mjs'), String(PORT)], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 5000);
    serverProcess?.stdout?.on('data', (chunk) => {
      if (chunk.toString().includes('serving')) {
        clearTimeout(timer);
        resolve();
      }
    });
    serverProcess?.on('error', reject);
  });
});

after(() => {
  serverProcess?.kill();
});

async function extractImportMapUrls(): Promise<string[]> {
  const html = await readFile(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html must carry an importmap script block');
  const map = JSON.parse(match[1] as string);
  return Object.values(map.imports) as string[];
}

test('every importmap-mapped URL is discoverable in index.html', async () => {
  const urls = await extractImportMapUrls();
  assert.ok(urls.length >= 3, 'expected at least the three bare specifiers obstruction.mts needs');
  for (const u of urls) assert.ok(u.startsWith('/vendor/lenticule-science-metrologic/'), `unexpected mapped URL shape: ${u}`);
});

test('every importmap-mapped URL responds 200 with non-empty JavaScript from the running server', async () => {
  const urls = await extractImportMapUrls();
  for (const u of urls) {
    const res = await fetch(`${BASE}${u}`);
    assert.equal(res.status, 200, `${u} responded ${res.status}`);
    const contentType = res.headers.get('content-type') ?? '';
    assert.ok(contentType.includes('javascript'), `${u} content-type was "${contentType}"`);
    const body = await res.text();
    assert.ok(body.length > 0, `${u} returned an empty body`);
    assert.ok(body.includes('export'), `${u} does not look like an ES module (no "export")`);
  }
});

test('the obstruction.mts specifiers it actually imports are exactly covered by the import map', async () => {
  const src = await readFile(path.join(ROOT, 'src', 'obstruction.mts'), 'utf8');
  const specifiers = [...src.matchAll(/from ['"](@561-group\/math\/[^'"]+)['"]/g)].map((m) => m[1]);
  const urls = await extractImportMapUrls();
  const html = await readFile(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const map = JSON.parse((match as RegExpMatchArray)[1] as string).imports as Record<string, string>;
  for (const spec of specifiers) {
    assert.ok(spec in map, `obstruction.mts imports "${spec}" but the importmap does not cover it`);
  }
  void urls;
});

test('web/index.html itself is served', async () => {
  const res = await fetch(`${BASE}/web/index.html`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(body.includes('<title>'));
});

test('a real engine .mts file is served type-stripped and loadable as JS', async () => {
  const res = await fetch(`${BASE}/src/engine.mts`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.ok(!body.includes(': Tangle'), 'type annotations should have been stripped');
  assert.ok(body.includes('export function applyMove'));
});
