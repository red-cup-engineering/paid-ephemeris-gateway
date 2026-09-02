// Tests js/game-page.mjs's pure per-game detail-page shaping against fixtures -- no disk,
// no network. The real generated pages are exercised end-to-end by test/smoke.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  entryPointsHtml, livenessHtml, howToJoinHtml, gamePageHtml, gamePagePath,
} from '../js/game-page.mjs';

const BASE_ENTRY = {
  id: 'farstone',
  displayName: 'Farstone',
  description: 'A walkable harbor town.',
  subdomain: 'farstone',
  status: 'playable',
  statusNote: 'The harbor sleeps between visits.',
  keywords: ['mud', 'text-adventure'],
  entryPoints: {
    browser: '/',
    headless: 'POST /connect, POST /command (JSON-over-HTTP)',
  },
};

test('gamePagePath is games/<id>/ for every entry', () => {
  assert.equal(gamePagePath(BASE_ENTRY), 'games/farstone/');
});

test('entryPointsHtml lists every declared entry-point kind verbatim, including non-browser kinds', () => {
  const html = entryPointsHtml(BASE_ENTRY);
  assert.match(html, /<dt>browser<\/dt>/);
  assert.match(html, /<dt>headless<\/dt>/);
  assert.match(html, /POST \/connect, POST \/command/);
});

test('entryPointsHtml renders a generic future entry-point kind (e.g. telnet) with no hardcoded kind list', () => {
  const entry = { ...BASE_ENTRY, entryPoints: { telnet: 'telnet farstone.561.group 4000' } };
  const html = entryPointsHtml(entry);
  assert.match(html, /<dt>telnet<\/dt>/);
  assert.match(html, /telnet farstone\.561\.group 4000/);
});

test('entryPointsHtml is honest about an entry declaring none', () => {
  const html = entryPointsHtml({ ...BASE_ENTRY, entryPoints: {} });
  assert.match(html, /No entry points declared/);
});

test('livenessHtml reports the dated checkedAt and HTTP status when reachable', () => {
  const entry = { ...BASE_ENTRY, liveProbe: { checkedAt: '2026-08-31T22:42:35.186Z', httpStatus: 200, ok: true, error: null } };
  const html = livenessHtml(entry);
  assert.match(html, /2026-08-31T22:42:35\.186Z/);
  assert.match(html, /reachable \(HTTP 200\)/);
});

test('livenessHtml states the checked-at, HTTP status, and stated cause when the probe failed', () => {
  const entry = { ...BASE_ENTRY, liveProbe: { checkedAt: '2026-08-31T22:42:35.186Z', httpStatus: 500, ok: false, error: null } };
  const html = livenessHtml(entry);
  assert.match(html, /2026-08-31T22:42:35\.186Z/);
  assert.match(html, /unreachable \(HTTP 500\)/);
  assert.match(html, /GCP project has billing permanently off/);
});

test('livenessHtml states a network-error cause distinctly from an HTTP status', () => {
  const entry = { ...BASE_ENTRY, liveProbe: { checkedAt: '2026-08-31T22:42:35.186Z', httpStatus: null, ok: false, error: 'fetch failed' } };
  const html = livenessHtml(entry);
  assert.match(html, /network error: fetch failed/);
});

test('livenessHtml is honest when no probe has run yet', () => {
  const html = livenessHtml({ ...BASE_ENTRY, liveProbe: null });
  assert.match(html, /No live probe result recorded yet/);
});

test('howToJoinHtml links straight to the play URL only when the entry is in the live-subdomains set', () => {
  const live = howToJoinHtml(BASE_ENTRY, new Set(['farstone']));
  assert.match(live, /href="https:\/\/farstone\.561\.group\/"/);

  const notLive = howToJoinHtml(BASE_ENTRY, new Set());
  assert.doesNotMatch(notLive, /href="https:\/\/farstone\.561\.group\//);
  assert.match(notLive, /Not reachable in a browser right now/);
});

test('gamePageHtml embeds the entry title, description, entry points, and liveness, and loads no remote asset', () => {
  const entry = { ...BASE_ENTRY, liveProbe: { checkedAt: '2026-08-31T22:42:35.186Z', httpStatus: 500, ok: false, error: null } };
  const html = gamePageHtml(entry, new Set());
  assert.match(html, /<h1>Farstone<\/h1>/);
  assert.match(html, /A walkable harbor town\./);
  assert.match(html, /<dt>headless<\/dt>/);
  assert.match(html, /unreachable \(HTTP 500\)/);
  assert.match(html, /href="\.\.\/\.\.\/"/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
});
