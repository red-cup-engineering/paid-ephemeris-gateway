/**
 * web/test/smoke.test.mts — real HTTP round-trips against `web/server.mjs`, scoped to the dice
 * trio (Pig, Farkle, Yacht) and the shared server/vendor plumbing every parlor game depends on.
 * Imports `server.mjs` in-process with `PORT=0` (an ephemeral port, real `node:http`, no mocking)
 * rather than spawning a child process, so `fetch` in this same process can reach it over real
 * loopback TCP.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // parlor-service/

test('web/server.mjs serves the pig, farkle, and yacht faces, their engine modules, vendored kernel/cartridge, and shared assets over real HTTP', async () => {
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  const { server } = await import(pathToFileURL(path.join(ROOT, 'web', 'server.mjs')).href);

  await new Promise((resolve) => {
    if (server.listening) return resolve(undefined);
    server.once('listening', () => resolve(undefined));
  });

  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

  async function fetchWithRetry(url: string, attempts = 10): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await fetch(url);
      } catch (err) {
        lastErr = err;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    throw lastErr;
  }

  try {
    // The shelf front door.
    const shelfRes = await fetchWithRetry(`${base}/`);
    assert.equal(shelfRes.status, 200);
    assert.match(shelfRes.headers.get('content-type') ?? '', /text\/html/);
    const shelfBody = await shelfRes.text();
    assert.match(shelfBody, /Pig/);
    assert.match(shelfBody, /Farkle/);
    assert.match(shelfBody, /Yacht/);

    for (const game of ['pig', 'farkle', 'yacht']) {
      const pageRes = await fetch(`${base}/${game}/`);
      assert.equal(pageRes.status, 200, `${game}/ should serve its index.html`);
      const body = await pageRes.text();
      assert.match(body, /importmap/, `${game}/ should carry the parlor-kernel importmap`);
      // No remote script/stylesheet host — a plain <a href="https://..."> (the shelf footer
      // link) is fine and expected; only <script src=...> / <link href=...> pointing off-host
      // would be a real violation.
      assert.doesNotMatch(
        body,
        /<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i,
        `${game}/ should load no remote script/stylesheet`,
      );

      const appRes = await fetch(`${base}/web/js/app-${game}.mjs`);
      assert.equal(appRes.status, 200);
      assert.match(appRes.headers.get('content-type') ?? '', /javascript/);

      const kernelRes = await fetch(`${base}/web/js/kernel-${game}.mjs`);
      assert.equal(kernelRes.status, 200);
      assert.match(kernelRes.headers.get('content-type') ?? '', /javascript/);

      // The real .mts engine source, served type-stripped — not a duplicated browser copy.
      const engineRes = await fetch(`${base}/src/games/${game}/engine.mts`);
      assert.equal(engineRes.status, 200);
      const engineBody = await engineRes.text();
      assert.doesNotMatch(engineBody, /:\s*(PigState|FarkleState|YachtState|string|number|boolean)\b/, 'type annotations should be stripped');
      assert.match(engineBody, /export function createEngine/);
    }

    // Vendored kernel + cartridge subpaths (bare specifiers the importmaps point at).
    const kernelSeedRes = await fetch(`${base}/vendor/parlor-kernel/seed.mjs`);
    assert.equal(kernelSeedRes.status, 200);
    assert.match(kernelSeedRes.headers.get('content-type') ?? '', /javascript/);

    const cartridgeReplayRes = await fetch(`${base}/vendor/cartridge/replay.mjs`);
    assert.equal(cartridgeReplayRes.status, 200);

    const cssRes = await fetch(`${base}/web/css/style.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get('content-type') ?? '', /text\/css/);

    const chromeRes = await fetch(`${base}/web/css/shelf-chrome.css`);
    assert.equal(chromeRes.status, 200);

    const missingRes = await fetch(`${base}/does-not-exist.html`);
    assert.equal(missingRes.status, 404);

    const traversalRes = await fetch(`${base}/../../etc/passwd`);
    assert.notEqual(traversalRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
});

test('every pig/farkle/yacht page vendors the shelf chrome (mark + footer line) and carries no dark-pattern hidden-fee language', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const game of ['pig', 'farkle', 'yacht']) {
    const html = await readFile(path.join(ROOT, 'web', game, 'index.html'), 'utf8');
    assert.match(html, /shelf-chrome\.css/, `${game}: must link the vendored shelf chrome`);
    assert.match(html, /shelf-mark/, `${game}: must carry the shelf mark`);
    assert.match(html, /Part of the.*561 shelf/s, `${game}: must carry the footer line`);
    assert.match(html, /Practice scorekeeping only/, `${game}: must carry the earn-only banner`);
    // "no wagering" / "not wagered" are the honest disclosure itself — only flag language that
    // would actually invite a real-money action.
    assert.doesNotMatch(html, /deposit|real money|bet now|place your bet|wager real|withdraw/i, `${game}: must never imply real wagering`);
  }
  const chromeCss = await readFile(path.join(ROOT, 'web', 'css', 'shelf-chrome.css'), 'utf8');
  assert.match(chromeCss, /vendored verbatim from/, 'shelf-chrome.css must carry its provenance header');
});
