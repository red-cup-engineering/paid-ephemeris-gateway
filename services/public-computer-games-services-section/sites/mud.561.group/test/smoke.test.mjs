// End-to-end: the real, generated catalog.json only lists mud/mmorpg-keyword games, and
// serve.mjs actually serves index.html/catalog.json/css over real HTTP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/test$/, '');

test('catalog.json on disk lists only entries matching catalog-filter.json, each carrying a liveProbe', async () => {
  const [catalog, filter] = await Promise.all([
    readFile(path.join(ROOT, 'catalog.json'), 'utf8').then(JSON.parse),
    readFile(path.join(ROOT, 'catalog-filter.json'), 'utf8').then(JSON.parse),
  ]);
  assert.ok(Array.isArray(catalog.games) && catalog.games.length > 0, 'expected at least one MUD/MMO game');
  const wanted = new Set(filter.includeIfAnyKeyword);
  for (const game of catalog.games) {
    assert.ok((game.keywords || []).some((k) => wanted.has(k)), `${game.id} has none of ${[...wanted]}`);
    assert.ok('liveProbe' in game, `${game.id} is missing its liveProbe field`);
  }
});

test('index.html renders one tile per catalog.json entry and loads no remote asset', async () => {
  const [catalog, html] = await Promise.all([
    readFile(path.join(ROOT, 'catalog.json'), 'utf8').then(JSON.parse),
    readFile(path.join(ROOT, 'index.html'), 'utf8'),
  ]);
  for (const game of catalog.games) {
    assert.ok(html.includes(game.displayName), `index.html is missing a tile for ${game.displayName}`);
  }
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
});

test('serve.mjs serves index.html, catalog.json, catalog-filter.json, and css over real HTTP', async () => {
  // serve.mjs auto-listens on import (house convention, matching play.561.group's own
  // serve.mjs) -- discover its real bound address rather than calling .listen() again.
  const { server } = await import(pathToFileURL(path.join(ROOT, 'serve.mjs')).href);
  await new Promise((resolve) => {
    if (server.listening) return resolve(undefined);
    server.once('listening', () => resolve(undefined));
  });
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

  try {
    const indexRes = await fetch(`${base}/`);
    assert.equal(indexRes.status, 200);
    assert.match((await indexRes.text()), /mud<span class="domain">\.561\.group<\/span>/);

    const catalogRes = await fetch(`${base}/catalog.json`);
    assert.equal(catalogRes.status, 200);
    assert.ok(Array.isArray((await catalogRes.json()).games));

    const filterRes = await fetch(`${base}/catalog-filter.json`);
    assert.equal(filterRes.status, 200);

    const cssRes = await fetch(`${base}/css/style.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get('content-type') ?? '', /text\/css/);

    const missingRes = await fetch(`${base}/does-not-exist.html`);
    assert.equal(missingRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
});
