// Generates mud.561.group's catalog.json by filtering play.561.group's own generated
// catalog.json against catalog-filter.json's keyword list -- never a second scan of every
// game's catalog-entry.json, never a hand-typed id list (house law: a public property is a
// JSON parameter over a shared upstream, never a forked copy). Each selected entry also
// carries a real, dated `liveProbe` (a live HTTP check of its own playUrl, not a
// router-membership guess) -- js/catalog.mjs turns liveProbe.ok entries into the
// `liveSubdomains` Set it hands the shared package's canPlayLive(), so the retired GCP
// Cloud Run lane (billing permanently off, 2026-08-31 ruling) shows an "offline" note, not a hopeful 500.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { playUrl } from '@red-cup-engineering/games-catalog-storefront';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.join(HERE, '..');
const PLAY_CATALOG_PATH = path.join(SITE_ROOT, '..', 'play.561.group', 'catalog.json');
const FILTER_PATH = path.join(SITE_ROOT, 'catalog-filter.json');

/** Pure: entries whose `keywords` include at least one of `anyOf`, in catalog order. Kept
 *  local (not re-imported from the shared package) only because it is this one line -- the
 *  package's own entriesWithAnyKeyword is the identical implementation, exercised directly
 *  by the shared package's own tests; duplicating the CALL here is not duplicating the RULE. */
function selectByKeyword(entries, anyOf) {
  const wanted = new Set(anyOf);
  return entries.filter((entry) => (entry.keywords || []).some((k) => wanted.has(k)));
}

/** One real HTTP check of `entry`'s own playUrl(). Never trusts a router table or a catalog
 *  status field -- the whole point of a live probe is to catch exactly this case (routed,
 *  claimed playable, but the Cloud Run origin behind it is permanently retired, GCP billing
 *  permanently off per the 2026-08-31 founder ruling). `fetchImpl`/`timeoutMs` are injected so tests can exercise this
 *  without real network (see test/build-mud-catalog.test.mjs). Never throws: every outcome
 *  (2xx, non-2xx, network error, timeout) resolves to a plain result object. */
export async function probeEntry(entry, { fetchImpl = fetch, timeoutMs = 8000, now = () => new Date() } = {}) {
  const checkedAt = now().toISOString();
  const url = playUrl(entry);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: 'GET', signal: controller.signal });
    return { checkedAt, url, httpStatus: res.status, ok: res.status >= 200 && res.status < 300, error: null };
  } catch (err) {
    return { checkedAt, url, httpStatus: null, ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Pure assembly: given the upstream catalog's full games array, the filter keywords, and one
 *  liveProbe result per selected entry (already computed -- this function does no I/O),
 *  produce mud.561.group's own catalog object/JSON. Exported so
 *  test/build-mud-catalog.test.mjs can assert the shape without touching the network or disk. */
export function assembleMudCatalog({ upstreamEntries, includeIfAnyKeyword, probesById, generatedDate }) {
  const selected = selectByKeyword(upstreamEntries, includeIfAnyKeyword);
  const games = selected.map((entry) => ({ ...entry, liveProbe: probesById.get(entry.id) ?? null }));
  const catalog = {
    $schemaNote:
      "mud.561.group's own catalog.json: exactly play.561.group's catalog.json entries whose keywords match catalog-filter.json's includeIfAnyKeyword, each carrying an additional liveProbe result (a real, dated HTTP check of its own playUrl -- see scripts/build-mud-catalog.mjs#probeEntry). Never hand-edit; regenerate with npm run generate-catalog.",
    generated: generatedDate ?? new Date().toISOString().slice(0, 10),
    games,
  };
  return { catalog, json: JSON.stringify(catalog, null, 2) + '\n' };
}

async function main() {
  const [upstreamRaw, filterRaw] = await Promise.all([
    readFile(PLAY_CATALOG_PATH, 'utf8'),
    readFile(FILTER_PATH, 'utf8'),
  ]);
  const upstreamEntries = JSON.parse(upstreamRaw).games ?? [];
  const { includeIfAnyKeyword } = JSON.parse(filterRaw);
  const selected = selectByKeyword(upstreamEntries, includeIfAnyKeyword);

  const probesById = new Map();
  for (const entry of selected) {
    // Sequential, not Promise.all: this is a build-time, human-triggered generation step for a
    // three-to-a-dozen-entry directory, not a hot path -- sequential keeps the console output
    // (below) readable in the order the catalog will actually render.
    const probe = await probeEntry(entry);
    probesById.set(entry.id, probe);
    process.stdout.write(`${entry.id}: ${probe.ok ? 'OK' : `offline (${probe.httpStatus ?? probe.error})`}\n`);
  }

  const { catalog, json } = assembleMudCatalog({ upstreamEntries, includeIfAnyKeyword, probesById });
  await writeFile(path.join(SITE_ROOT, 'catalog.json'), json, 'utf8');
  process.stdout.write(`wrote ${path.join(SITE_ROOT, 'catalog.json')} (${catalog.games.length} MUD/MMO games)\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
