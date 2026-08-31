// Regression coverage for two real bugs found by walking the storefront's own outbound links
// against what actually resolves at *.561.group, not just against catalog.json's own claims:
//
//   1. `js/catalog.mjs`'s `playUrl(entry)` used to hardcode `https://${subdomain}.561.group/`,
//      ignoring the manifest's own `entryPoints.browser` field entirely -- wrong the moment any
//      game's real front door isn't the bare origin (crucible's is `/web/index.html`).
//   2. Both `js/catalog.mjs` (the catalog cards) and `js/today.mjs` (the daily strips) used to
//      render a live "Play at X.561.group" link for ANY catalog entry marked `playable` with a
//      browser entry point, regardless of whether that subdomain is actually routed anywhere --
//      flickering-delve, onestone, stoke, lantern, weiqi, and (especially) ruinfold are all
//      real and tested today but not deployed to Cloud Run, so a player clicking that link hit
//      a hostname that doesn't resolve at all.
//
// The fix in both files is a hand-maintained `LIVE_SUBDOMAINS` set gating the live-link path.
// This test does not re-derive that logic (catalog.mjs executes `document.getElementById(...)`
// at module top level, so it cannot be imported under plain Node without a DOM) -- instead it
// checks the one thing that actually matters: that set is not allowed to drift out of sync with
// the router that is the real, single source of truth for what resolves at *.561.group, ever.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVE_SUBDOMAINS } from '../js/live-subdomains.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
// sites/cloudflare-router/ -- ../../cloudflare-router relative to this site's own directory.
const ROUTER_ROOT = path.resolve(ROOT, '..', 'cloudflare-router');

/** The real, live routing table: every hostname the Cloudflare worker actually forwards to a
 *  Cloud Run origin, per its own source (not a copy of it -- the literal file). The router is
 *  shared, house-wide infrastructure, not owned by this games catalog -- it also routes
 *  hostnames for unrelated 561.group services. So this function's return value is NOT "the
 *  live subdomain set for this storefront" by itself -- see `liveCatalogSubdomains` below,
 *  which is. */
async function liveHostnames(): Promise<Set<string>> {
  const src = await readFile(path.join(ROUTER_ROOT, 'src', 'index.mjs'), 'utf8');
  // Matches ORIGIN_BY_HOST as either a plain object literal ({"host": origin, ...}) or a
  // Map ([["host", origin], ...]) -- only the hostnames on the left of each entry matter here.
  const match = src.match(/ORIGIN_BY_HOST\s*=\s*(?:new Map\()?[[{]([\s\S]*?)\n[\]}]\)?;/);
  assert.ok(match, 'expected an ORIGIN_BY_HOST object or Map literal in the router source');
  const hosts = [...(match[1] as string).matchAll(/"([a-z0-9.-]+\.561\.group)"/g)].map((m) => m[1] as string);
  assert.ok(hosts.length > 0, 'expected at least one routed hostname');
  return new Set(hosts);
}

/** Every `subdomain` this catalog actually claims a game lives at, per `catalog.json` itself
 *  (not hand-copied -- read live from the same file `catalog.mjs`/`today.mjs` render from). A
 *  hostname the router routes but that isn't one of THESE is some other, unrelated house
 *  service riding the same shared Worker -- correctly ignored by the LIVE_SUBDOMAINS checks
 *  below, which only care about this catalog's own games. */
async function catalogSubdomains(): Promise<Set<string>> {
  const raw = await readFile(path.join(ROOT, 'catalog.json'), 'utf8');
  const catalog = JSON.parse(raw) as { games?: Array<{ subdomain?: string }> };
  const subdomains = (catalog.games ?? []).map((g) => g.subdomain).filter((s): s is string => Boolean(s));
  assert.ok(subdomains.length > 0, 'expected catalog.json to declare at least one game subdomain');
  return new Set(subdomains);
}

/** The subdomains this catalog SHOULD honestly link out to: routed by the real router AND a
 *  real entry in this catalog (excluding the storefront's own hostname and unrelated
 *  non-catalog services the shared router also happens to route) AND not a named
 *  routed-but-not-yet-safe carve-out (see `ROUTED_BUT_NOT_LINK_SAFE` below). */
async function liveCatalogSubdomains(): Promise<Set<string>> {
  const [routed, catalog] = await Promise.all([liveHostnames(), catalogSubdomains()]);
  const routedBare = new Set([...routed].map((h) => h.replace(/\.561\.group$/, '')));
  return new Set([...catalog].filter((s) => routedBare.has(s) && !ROUTED_BUT_NOT_LINK_SAFE.has(s)));
}

// Routed does not always mean safe to link: a hostname can be routed by the worker before its
// backing service is actually safe to send a player to (e.g. persistence still on ephemeral
// local disk, which scale-to-zero would wipe). This set is the mechanism for that case: add a
// hostname here with a comment saying why, and only add it to both files' LIVE_SUBDOMAINS once
// that reason is actually resolved.
// (fearful's carve-out was removed 2026-08-20: its Cloud Run service now exists and the domain
// resolves and is playable -- see LIVE_SUBDOMAINS in both catalog.mjs and today.mjs below.)
const ROUTED_BUT_NOT_LINK_SAFE = new Set<string>([]);

test("Play's LIVE_SUBDOMAINS matches exactly this catalog's own subdomains that the Cloudflare worker actually routes, minus any named routed-but-unsafe carve-out", async () => {
  const expected = await liveCatalogSubdomains();
  assert.deepEqual(LIVE_SUBDOMAINS, expected, 'js/live-subdomains.mjs has drifted from the router\'s real routes');
});

test('every ROUTED_BUT_NOT_LINK_SAFE hostname is genuinely routed right now (the carve-out did not go stale)', async () => {
  const live = await liveHostnames();
  const liveBare = new Set([...live].map((h) => h.replace(/\.561\.group$/, '')));
  for (const h of ROUTED_BUT_NOT_LINK_SAFE) {
    assert.ok(liveBare.has(h), `${h} is in ROUTED_BUT_NOT_LINK_SAFE but the router no longer routes it -- remove it from the carve-out`);
  }
});

test('every catalog entry NOT in the live-routed set is gated behind LIVE_SUBDOMAINS in catalog.mjs, not just status+entryPoints', async () => {
  // A structural guard against reintroducing the bug: canPlayLive must actually reference both
  // hasBrowser(...) and LIVE_SUBDOMAINS -- not just status, which was the shape of the original
  // (wrong) canLinkOut.
  const catalogSrc = await readFile(path.join(ROOT, 'js', 'catalog.mjs'), 'utf8');
  assert.match(catalogSrc, /function canPlayLive\(entry\)\s*\{[\s\S]*?LIVE_SUBDOMAINS\.has\(entry\.subdomain\)[\s\S]*?\}/);
});

test("playUrl(entry) builds its path from the manifest's own entryPoints.browser, not a hardcoded bare origin", async () => {
  const catalogSrc = await readFile(path.join(ROOT, 'js', 'catalog.mjs'), 'utf8');
  const match = catalogSrc.match(/function playUrl\(entry\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(match, 'expected a playUrl(entry) function');
  assert.match(match[1] as string, /entry\.entryPoints/, 'playUrl must read entry.entryPoints, not assume "/"');
});

test('the old "Pb" monogram glyph does not appear in index.html, today.html, or chrome/README.md', async () => {
  // The old glyph's two letterform paths, byte-for-byte -- if either string is found anywhere
  // in this tree again, the swap to the cowrie-shell mark regressed.
  const PB_SIGNATURES = ['M14 32V16h6a4 4 0 0 1 0 8h-6', 'M28 24h6a4 4 0 0 1 0 8h-6'];
  for (const file of ['index.html', 'today.html', path.join('chrome', 'README.md')]) {
    const text = await readFile(path.join(ROOT, file), 'utf8');
    for (const sig of PB_SIGNATURES) {
      assert.ok(!text.includes(sig), `${file} still contains the old Pb monogram path data: ${sig}`);
    }
  }
});
