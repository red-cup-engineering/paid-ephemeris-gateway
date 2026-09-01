// Regression coverage for two real bugs: (1) playUrl(entry) used to hardcode the bare origin,
// ignoring entryPoints.browser; (2) a live play link used to render for ANY playable entry
// with a browser entry point regardless of whether that subdomain is actually routed. The fix
// is a `LIVE_SUBDOMAINS` set gating the live-link path (now shared, parameterized logic in
// @red-cup-engineering/games-catalog-storefront); this file checks it never drifts from the
// router, the real, single source of truth for what resolves at *.561.group.

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

/** The shared router's own routes (pre-2026-08-31-migration shape): every hostname the
 *  Cloudflare worker still forwards to a Cloud Run origin, per its own source. Kept as one of
 *  two sources -- see `liveHostnames` below -- because not every game has migrated off the
 *  router yet. */
async function routerHostnames(): Promise<Set<string>> {
  const src = await readFile(path.join(ROUTER_ROOT, 'src', 'index.mjs'), 'utf8');
  // Matches ORIGIN_BY_HOST as either a plain object literal ({"host": origin, ...}) or a
  // Map ([["host", origin], ...]) -- only the hostnames on the left of each entry matter here.
  const match = src.match(/ORIGIN_BY_HOST\s*=\s*(?:new Map\()?[[{]([\s\S]*?)\n[\]}]\)?;/);
  assert.ok(match, 'expected an ORIGIN_BY_HOST object or Map literal in the router source');
  const hosts = [...(match[1] as string).matchAll(/"([a-z0-9.-]+\.561\.group)"/g)].map((m) => m[1] as string);
  return new Set(hosts);
}

/** 2026-08-31 free-tier pivot: a migrated game gets its OWN `wrangler.jsonc` with its own
 *  `custom_domain` route and is deliberately REMOVED from the shared router (the router shrinks
 *  toward deletion as properties migrate -- see the router's own module doc). So "routed" can no
 *  longer mean "present in the router's ORIGIN_BY_HOST" alone; a repo-wide scan for any OTHER
 *  `wrangler.jsonc` declaring a `*.561.group` custom_domain route is the other half of the real,
 *  live routing table. Excludes the router's own wrangler.jsonc (already covered above) and
 *  node_modules/.wrangler (never a source of truth).
 * @returns {Promise<Set<string>>}
 */
async function dedicatedWorkerHostnames(): Promise<Set<string>> {
  const { readdir } = await import('node:fs/promises');
  const { execFileSync } = await import('node:child_process');
  const repoRoot = execFileSync('git', ['-C', ROOT, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const found = new Set<string>();

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.wrangler')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === 'wrangler.jsonc' && full !== path.join(ROUTER_ROOT, 'wrangler.jsonc')) {
        try {
          const text = await readFile(full, 'utf8');
          for (const m of text.matchAll(/"pattern"\s*:\s*"([a-z0-9.-]+\.561\.group)"[\s\S]{0,80}?"custom_domain"\s*:\s*true/g)) {
            found.add(m[1] as string);
          }
        } catch {
          // unreadable/malformed wrangler.jsonc -- not this test's concern, skip
        }
      }
    }
  }

  await walk(repoRoot);
  return found;
}

/** The real, live routing table this catalog cares about: the union of the shared router's
 *  remaining routes and every migrated game's own dedicated-Worker route.
 * @returns {Promise<Set<string>>}
 */
async function liveHostnames(): Promise<Set<string>> {
  const [routed, dedicated] = await Promise.all([routerHostnames(), dedicatedWorkerHostnames()]);
  const hosts = new Set([...routed, ...dedicated]);
  assert.ok(hosts.size > 0, 'expected at least one routed hostname');
  return hosts;
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
// backing service is actually safe to send a player to. This set is the mechanism for that
// case: add a hostname here with a comment saying why, and only add it to LIVE_SUBDOMAINS once
// that reason is actually resolved.
// 2026-08-31 free-tier pivot: GCP billing on five-six-one-group-dev is PERMANENTLY off
// (founder-ruled) -- every one of these seven is still ONLY in the shared router, which still
// proxies to a now-dead Cloud Run origin (measured 500 live 2026-08-31). Remove one entry here
// only once that game gets its own dedicated Worker (see the migrated games above it).
const ROUTED_BUT_NOT_LINK_SAFE = new Set<string>([
  'ruinfold', 'farstone', 'durante', 'aletheon', 'equivo', 'tidepool', 'casino',
]);

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
  // canPlayLive's real implementation now lives in @red-cup-engineering/games-catalog-storefront
  // (must reference hasBrowser(...) and liveSubdomains.has(...), not just status); js/catalog.mjs
  // must still wire it to THIS site's own LIVE_SUBDOMAINS, not silently drop the binding.
  const packageSrc = await readFile(
    path.join(ROOT, 'node_modules', '@red-cup-engineering', 'games-catalog-storefront', 'src', 'catalog.mjs'),
    'utf8',
  );
  assert.match(packageSrc, /function canPlayLive\(entry, liveSubdomains[\s\S]*?\)\s*\{[\s\S]*?liveSubdomains\.has\(entry\.subdomain\)[\s\S]*?\}/);

  const catalogSrc = await readFile(path.join(ROOT, 'js', 'catalog.mjs'), 'utf8');
  assert.match(catalogSrc, /import\s*\{\s*LIVE_SUBDOMAINS\s*\}\s*from\s*'\.\/live-subdomains\.mjs'/);
  assert.match(catalogSrc, /canPlayLiveBase\(entry, LIVE_SUBDOMAINS\)/);
});

test("playUrl(entry) builds its path from the manifest's own entryPoints.browser, not a hardcoded bare origin", async () => {
  // Real implementation now in the shared package -- read the vendored copy this site ships.
  const packageSrc = await readFile(
    path.join(ROOT, 'node_modules', '@red-cup-engineering', 'games-catalog-storefront', 'src', 'catalog.mjs'),
    'utf8',
  );
  const match = packageSrc.match(/function playUrl\(entry\)\s*\{([\s\S]*?)\n\}/);
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
