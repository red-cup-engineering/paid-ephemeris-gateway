// Behavioral tests for the shared catalog-entry -> TUFTE-tile shaping, against small
// synthetic fixtures (this package has no catalog.json of its own -- that data belongs to
// each consuming site). Site-specific regression coverage (real catalog.json, drift against
// the real router) stays in each site's own test suite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esc,
  statusLabel,
  playUrl,
  hasHeadless,
  hasBrowser,
  canPlayLive,
  catalogEntryToTile,
  catalogModel,
  shelfValues,
  matchesSearch,
  filterEntries,
  normalizeFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  entriesWithAnyKeyword,
} from '../src/catalog.mjs';

const MUD_ENTRY = {
  id: 'farstone',
  displayName: 'Farstone',
  description: 'A walkable harbor town.',
  subdomain: 'farstone',
  entryPoints: { browser: '/', headless: 'POST /connect' },
  status: 'playable',
  shelf: 'Deep',
  keywords: ['mud', 'text-adventure', 'feltos'],
};

const UNROUTED_ENTRY = {
  id: 'onestone',
  displayName: 'TileSlots',
  description: 'A tessellation match-3.',
  subdomain: 'onestone',
  entryPoints: { browser: '/' },
  status: 'playable',
  shelf: 'Puzzle Den',
  keywords: ['match-3', 'puzzle'],
};

const IN_DEV_ENTRY = {
  id: 'unbuilt',
  displayName: 'Unbuilt Thing',
  description: 'Not shipped yet.',
  subdomain: 'unbuilt',
  status: 'in-development',
  shelf: 'Puzzle Den',
  keywords: ['idle-game'],
};

test('esc escapes the five HTML-significant characters and nothing else', () => {
  assert.equal(esc(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('statusLabel maps playable/other to the two honest labels', () => {
  assert.equal(statusLabel('playable'), 'Playable');
  assert.equal(statusLabel('in-development'), 'In development');
});

test('playUrl reads entryPoints.browser, defaulting to "/" when absent', () => {
  assert.equal(playUrl(MUD_ENTRY), 'https://farstone.561.group/');
  assert.equal(playUrl({ subdomain: 'crucible', entryPoints: { browser: '/web/index.html' } }), 'https://crucible.561.group/web/index.html');
  assert.equal(playUrl({ subdomain: 'bare' }), 'https://bare.561.group/');
});

test('hasHeadless/hasBrowser read entryPoints honestly', () => {
  assert.equal(hasHeadless(MUD_ENTRY), true);
  assert.equal(hasHeadless(UNROUTED_ENTRY), false);
  assert.equal(hasBrowser(MUD_ENTRY), true);
  assert.equal(hasBrowser({ id: 'x' }), false);
});

test('canPlayLive requires playable status, a browser entry point, AND caller-supplied liveSubdomains membership', () => {
  const live = new Set(['farstone']);
  assert.equal(canPlayLive(MUD_ENTRY, live), true);
  assert.equal(canPlayLive(UNROUTED_ENTRY, live), false, 'routed elsewhere is not this caller\'s live set');
  assert.equal(canPlayLive(IN_DEV_ENTRY, new Set(['unbuilt'])), false, 'in-development never links out even if routed');
  assert.equal(canPlayLive(MUD_ENTRY), false, 'default liveSubdomains is empty -- no accidental live claim');
});

test('catalogEntryToTile: confidence and the play-link body both honestly track the passed-in liveSubdomains, not a fixed constant', () => {
  const tileLive = catalogEntryToTile(MUD_ENTRY, new Set(['farstone']));
  const tileNotLive = catalogEntryToTile(MUD_ENTRY, new Set());
  assert.equal(tileLive.confidence, 'high');
  assert.match(tileLive.html, /Play at farstone\.561\.group/);
  assert.equal(tileNotLive.confidence, 'low');
  assert.match(tileNotLive.html, /Not yet deployed/);
  assert.equal(tileLive.id, 'farstone');
  assert.equal(tileLive.title, 'Farstone');
  assert.equal(tileLive.role, undefined);
});

test('catalogModel produces one tile per entry, in order, each gated by the same liveSubdomains set', () => {
  const model = catalogModel([MUD_ENTRY, UNROUTED_ENTRY], new Set(['farstone']));
  assert.deepEqual(model.tiles.map((t) => t.id), ['farstone', 'onestone']);
  assert.equal(model.tiles[0].confidence, 'high');
  assert.equal(model.tiles[1].confidence, 'low');
});

test('shelfValues/matchesSearch/filterEntries compose over an entries array', () => {
  const entries = [MUD_ENTRY, UNROUTED_ENTRY, IN_DEV_ENTRY];
  assert.deepEqual(shelfValues(entries), ['Deep', 'Puzzle Den']);
  assert.equal(matchesSearch(MUD_ENTRY, 'harbor'), true);
  assert.equal(matchesSearch(MUD_ENTRY, 'nonexistent'), false);
  assert.deepEqual(filterEntries(entries, { status: 'playable' }).map((e) => e.id), ['farstone', 'onestone']);
  assert.deepEqual(filterEntries(entries, { shelf: 'Deep' }).map((e) => e.id), ['farstone']);
});

test('normalizeFilters/filtersFromSearchParams/filtersToSearchParams round-trip and reject unknown values', () => {
  const entries = [MUD_ENTRY];
  assert.deepEqual(normalizeFilters({ status: 'not-a-status', shelf: 'not-a-shelf' }, entries), { term: '', status: 'all', shelf: 'all' });
  const restored = filtersFromSearchParams(new URLSearchParams('q=harbor&status=playable&shelf=Deep'), entries);
  assert.deepEqual(restored, { term: 'harbor', status: 'playable', shelf: 'Deep' });
  assert.equal(filtersToSearchParams(restored).toString(), 'q=harbor&status=playable&shelf=Deep');
  assert.equal(filtersToSearchParams({ term: '', status: 'all', shelf: 'all' }).toString(), '');
});

test('entriesWithAnyKeyword selects by keyword membership, with no id allowlist to maintain', () => {
  const entries = [MUD_ENTRY, UNROUTED_ENTRY, IN_DEV_ENTRY];
  assert.deepEqual(entriesWithAnyKeyword(entries, ['mud', 'mmorpg']).map((e) => e.id), ['farstone']);
  assert.deepEqual(entriesWithAnyKeyword(entries, ['idle-game']).map((e) => e.id), ['unbuilt']);
  assert.deepEqual(entriesWithAnyKeyword(entries, ['nonexistent-keyword']), []);
});
