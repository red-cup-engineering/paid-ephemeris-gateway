/**
 * web/test/smoke-chutes-reels.test.mts — real HTTP round-trips against `web/server.mjs`, scoped
 * to Chutes & Ladders and Fair Spin, the sibling of `smoke.test.mts`'s pig/farkle/yacht coverage.
 * Same in-process real-`node:http` pattern (`PORT=0`, no mocking) as that file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..'); // parlor-service/

async function fetchWithRetry(url, attempts = 10) {
  let lastErr;
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

test('web/server.mjs serves the chutes and reels faces, their engine modules, and the vendored kernel subpaths each importmap needs', async () => {
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  const { server } = await import(pathToFileURL(path.join(ROOT, 'web', 'server.mjs')).href);

  await new Promise((resolve) => {
    if (server.listening) return resolve(undefined);
    server.once('listening', () => resolve(undefined));
  });

  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

  try {
    const shelfRes = await fetchWithRetry(`${base}/`);
    assert.equal(shelfRes.status, 200);
    const shelfBody = await shelfRes.text();
    assert.match(shelfBody, /Chutes/);
    assert.match(shelfBody, /Fair Spin/);

    for (const game of ['chutes', 'reels']) {
      const pageRes = await fetch(`${base}/${game}/`);
      assert.equal(pageRes.status, 200, `${game}/ should serve its index.html`);
      const body = await pageRes.text();
      assert.match(body, /importmap/, `${game}/ should carry the parlor-kernel importmap`);
      assert.doesNotMatch(
        body,
        /<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i,
        `${game}/ should load no remote script/stylesheet`,
      );

      const appRes = await fetch(`${base}/js/app-${game}.mjs`);
      assert.equal(appRes.status, 200);
      assert.match(appRes.headers.get('content-type') ?? '', /javascript/);

      const kernelRes = await fetch(`${base}/js/kernel-${game}.mjs`);
      assert.equal(kernelRes.status, 200);

      const engineRes = await fetch(`${base}/src/games/${game}/engine.mts`);
      assert.equal(engineRes.status, 200);
      const engineBody = await engineRes.text();
      assert.match(engineBody, /export function createEngine/);
      assert.doesNotMatch(engineBody, /:\s*(readonly|Record<|Cartridge<)/, 'type annotations should be stripped');
    }

    // Chutes-specific vendored subpaths its importmap points at.
    for (const subpath of ['seed', 'dice', 'board']) {
      const res = await fetch(`${base}/vendor/parlor-kernel/${subpath}.mjs`);
      assert.equal(res.status, 200, `/vendor/parlor-kernel/${subpath}.mjs should serve`);
    }
    // Reels-specific vendored subpaths.
    for (const subpath of ['reels', 'odds', 'disclosure']) {
      const res = await fetch(`${base}/vendor/parlor-kernel/${subpath}.mjs`);
      assert.equal(res.status, 200, `/vendor/parlor-kernel/${subpath}.mjs should serve`);
    }
    const cartridgeSeedRes = await fetch(`${base}/vendor/cartridge/seed.mjs`);
    assert.equal(cartridgeSeedRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
});

test('the chutes and reels pages vendor the shelf chrome and carry the required honesty copy', async () => {
  const chutesHtml = await readFile(path.join(ROOT, 'web', 'chutes', 'index.html'), 'utf8');
  assert.match(chutesHtml, /shelf-chrome\.css/);
  assert.match(chutesHtml, /shelf-mark/);
  assert.match(chutesHtml, /Part of the.*561 shelf/s);
  // The bot-is-a-die joke/lesson must actually be stated in the face copy, not just true in the
  // engine.
  assert.match(chutesHtml, /bot is a die/i);
  assert.doesNotMatch(chutesHtml, /deposit|real money|bet now|place your bet|wager real|withdraw/i);

  const reelsHtml = await readFile(path.join(ROOT, 'web', 'reels', 'index.html'), 'utf8');
  assert.match(reelsHtml, /shelf-chrome\.css/);
  assert.match(reelsHtml, /shelf-mark/);
  assert.match(reelsHtml, /Part of the.*561 shelf/s);
  assert.match(reelsHtml, /PRACTICE BANKROLL ONLY/);
  assert.doesNotMatch(reelsHtml, /deposit real|real money|withdraw|cash out/i);
});

test('no dark patterns, structurally: the reels page never hides the disclosure panel behind a click (no <details>/hidden wrapper around #disclosure-panel)', async () => {
  const reelsHtml = await readFile(path.join(ROOT, 'web', 'reels', 'index.html'), 'utf8');
  const beforePanel = reelsHtml.slice(0, reelsHtml.indexOf('id="disclosure-panel"'));
  const openDetails = (beforePanel.match(/<details/g) ?? []).length;
  const closedDetails = (beforePanel.match(/<\/details>/g) ?? []).length;
  assert.equal(openDetails, closedDetails, 'the permanent disclosure panel must not be nested inside an unclosed <details> (i.e. not hidden behind a click)');
});
