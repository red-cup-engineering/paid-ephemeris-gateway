// Tests js/catalog.mjs's site-owned binding: liveSubdomainsFromProbes and the wrapped
// catalogModel, against small fixtures (no network, no disk).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveSubdomainsFromProbes, catalogModel } from '../js/catalog.mjs';

const ENTRIES = [
  { id: 'farstone', displayName: 'Farstone', subdomain: 'farstone', status: 'playable', entryPoints: { browser: '/' }, keywords: ['mud'], liveProbe: { ok: false, httpStatus: 500 } },
  { id: 'tidepool', displayName: 'Tidepool', subdomain: 'tidepool', status: 'playable', entryPoints: { browser: '/' }, keywords: ['mud'], liveProbe: { ok: true, httpStatus: 200 } },
  { id: 'aletheon', displayName: 'Aletheon', subdomain: 'aletheon', status: 'playable', entryPoints: { browser: '/' }, keywords: ['mmorpg'], liveProbe: null },
];

test('liveSubdomainsFromProbes includes only entries whose own liveProbe.ok is true', () => {
  assert.deepEqual(liveSubdomainsFromProbes(ENTRIES), new Set(['tidepool']));
});

test('liveSubdomainsFromProbes on an all-offline catalog is the empty set, never inferring from status alone', () => {
  const allOffline = ENTRIES.map((e) => ({ ...e, liveProbe: { ok: false, httpStatus: 500 } }));
  assert.deepEqual(liveSubdomainsFromProbes(allOffline), new Set());
});

test('catalogModel gates confidence and the play-link body by the probe-derived set, not catalog status', () => {
  const model = catalogModel(ENTRIES);
  const byId = Object.fromEntries(model.tiles.map((t) => [t.id, t]));
  assert.equal(byId.farstone.confidence, 'low');
  assert.match(byId.farstone.html, /Not yet deployed/);
  assert.equal(byId.tidepool.confidence, 'high');
  assert.match(byId.tidepool.html, /Play at tidepool\.561\.group/);
  assert.equal(byId.aletheon.confidence, 'low', 'a null liveProbe must never be treated as live');
});
