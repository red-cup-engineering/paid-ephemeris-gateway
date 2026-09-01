// Tests build.mjs's pure indexHtml(fragment, entries) shaping against fixtures -- no disk,
// no network. The real end-to-end build (against the real generated catalog.json) is
// exercised by test/smoke.test.mjs instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexHtml } from '../build.mjs';

const LIVE_ENTRY = { id: 'tidepool', displayName: 'Tidepool', liveProbe: { ok: true, httpStatus: 200 } };
const OFFLINE_ENTRY = { id: 'farstone', displayName: 'Farstone', liveProbe: { ok: false, httpStatus: 500 } };

test('indexHtml shows an honest offline banner naming every game whose liveProbe failed', () => {
  const html = indexHtml('<div class="tile"></div>', [LIVE_ENTRY, OFFLINE_ENTRY]);
  assert.match(html, /Offline right now: Farstone/);
  assert.doesNotMatch(html, /Offline right now:[^<]*Tidepool/);
});

test('indexHtml renders no offline banner when every listed game is currently live', () => {
  const html = indexHtml('<div class="tile"></div>', [LIVE_ENTRY]);
  assert.doesNotMatch(html, /offline-banner/);
});

test('indexHtml reports an honest world count and embeds the given TUFTE fragment verbatim', () => {
  const html = indexHtml('<div class="tile" data-marker="xyz"></div>', [LIVE_ENTRY, OFFLINE_ENTRY]);
  assert.match(html, />2 worlds</);
  assert.match(html, /data-marker="xyz"/);
});

test('indexHtml loads no remote script or stylesheet', () => {
  const html = indexHtml('<div></div>', [LIVE_ENTRY]);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
});
