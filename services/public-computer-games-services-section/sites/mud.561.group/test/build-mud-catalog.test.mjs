// Pure-logic tests for scripts/build-mud-catalog.mjs: the keyword filter/assembly (no I/O)
// and probeEntry's real-fetch call shape (with an injected fake fetch, no real network).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleMudCatalog, probeEntry } from '../scripts/build-mud-catalog.mjs';

const UPSTREAM = [
  { id: 'farstone', displayName: 'Farstone', subdomain: 'farstone', entryPoints: { browser: '/' }, keywords: ['mud', 'text-adventure'] },
  { id: 'tidepool', displayName: 'Tidepool', subdomain: 'tidepool', entryPoints: { browser: '/' }, keywords: ['mud', 'websocket'] },
  { id: 'aletheon', displayName: 'Aletheon', subdomain: 'aletheon', entryPoints: { browser: '/' }, keywords: ['mmorpg', '3d'] },
  { id: 'onestone', displayName: 'TileSlots', subdomain: 'onestone', entryPoints: { browser: '/' }, keywords: ['match-3', 'puzzle'] },
  { id: 'durante', displayName: 'Durante', subdomain: 'durante', entryPoints: { browser: '/' }, keywords: ['fps', 'raycaster'] },
];

test('assembleMudCatalog selects only mud/mmorpg-keyword entries, dropping unrelated games', () => {
  const { catalog } = assembleMudCatalog({
    upstreamEntries: UPSTREAM,
    includeIfAnyKeyword: ['mud', 'mmorpg'],
    probesById: new Map(),
    generatedDate: '2026-08-31',
  });
  assert.deepEqual(catalog.games.map((g) => g.id), ['farstone', 'tidepool', 'aletheon']);
  assert.equal(catalog.generated, '2026-08-31');
});

test('assembleMudCatalog attaches each entry\'s own liveProbe result (or null when absent), never a shared object', () => {
  const probesById = new Map([
    ['farstone', { checkedAt: '2026-08-31T00:00:00.000Z', httpStatus: 500, ok: false, error: null }],
    ['tidepool', { checkedAt: '2026-08-31T00:00:00.000Z', httpStatus: 200, ok: true, error: null }],
  ]);
  const { catalog } = assembleMudCatalog({
    upstreamEntries: UPSTREAM,
    includeIfAnyKeyword: ['mud', 'mmorpg'],
    probesById,
  });
  const byId = Object.fromEntries(catalog.games.map((g) => [g.id, g]));
  assert.equal(byId.farstone.liveProbe.ok, false);
  assert.equal(byId.tidepool.liveProbe.ok, true);
  assert.equal(byId.aletheon.liveProbe, null, 'no probe recorded -> honestly null, never inferred');
});

test('assembleMudCatalog never mutates the upstream entries it reads', () => {
  const before = JSON.stringify(UPSTREAM);
  assembleMudCatalog({ upstreamEntries: UPSTREAM, includeIfAnyKeyword: ['mud'], probesById: new Map() });
  assert.equal(JSON.stringify(UPSTREAM), before);
});

test('probeEntry: a 200 response is ok:true and records the checked URL/time', async () => {
  const fakeFetch = async () => new Response('ok', { status: 200 });
  const result = await probeEntry(UPSTREAM[0], { fetchImpl: fakeFetch, now: () => new Date('2026-08-31T12:00:00.000Z') });
  assert.equal(result.ok, true);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.url, 'https://farstone.561.group/');
  assert.equal(result.checkedAt, '2026-08-31T12:00:00.000Z');
  assert.equal(result.error, null);
});

test('probeEntry: a 500 response is ok:false, not thrown or dropped', async () => {
  const fakeFetch = async () => new Response('err', { status: 500 });
  const result = await probeEntry(UPSTREAM[0], { fetchImpl: fakeFetch });
  assert.equal(result.ok, false);
  assert.equal(result.httpStatus, 500);
  assert.equal(result.error, null);
});

test('probeEntry: a network failure (fetch throws) resolves ok:false with the error message, never rejects', async () => {
  const fakeFetch = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
  const result = await probeEntry(UPSTREAM[0], { fetchImpl: fakeFetch });
  assert.equal(result.ok, false);
  assert.equal(result.httpStatus, null);
  assert.match(result.error, /ENOTFOUND/);
});
