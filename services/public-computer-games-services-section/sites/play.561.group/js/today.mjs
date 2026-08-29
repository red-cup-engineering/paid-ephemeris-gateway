// play.561.group -- today.html renderer.
// Zero third-party runtime dependencies (TUFTE is a rendering/patching engine, not a
// framework). Every strip's seed below is computed live from a real UTC calendar date.
// Each game's own daily-seed function is small enough to port faithfully; every port below
// carries a header naming its real source file, per house vendoring doctrine (vendor a copy,
// not a live cross-service import -- these are separate node services, each with its own
// server). Only games with a daily-utc seed policy in catalog.json get a strip here
// (test/smoke.test.mts enforces that this file's game list matches catalog.json's
// daily-utc entries).
//
// This module is split the same way js/catalog.mjs is:
//   - Everything above initTodayPage() is pure and Node-safe (including the seed math --
//     crypto.subtle is a real Node global, not a browser-only API). build.mjs calls
//     computeTodayModel() with the real build-time date to server-render today.html with
//     genuinely correct content, not a placeholder -- a real improvement for a no-JS
//     visitor or a crawler over the previous fully-client-rendered page. The date-math
//     itself is never trusted as authoritative, though: initTodayPage() always recomputes
//     against the visitor's own real "now" on load and replaces the SSR content with it, so
//     nobody ever sees yesterday's build baked into today's page.
//   - initTodayPage() is the browser-only bootstrap.

import { GLYPHS, FALLBACK_GLYPH, EXTERNAL_LINK_ICON } from './glyphs.mjs';

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** `YYYY-MM-DD` for `date`'s UTC calendar day -- the same timezone-independent formatter
 *  every game's own `utcDateString`/`todayUTC` uses (solitaire-service/src/daily.mts,
 *  crucible-service/src/daily.mts, ruinfold's src/server/dates.mts#formatUTCDate). */
export function utcDateString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---- ruinfold: dailySeed + buildDaily's floor count -----------------------------------------
// Ported from apps/ruinfold/src/engine/{daily.mts,prng.mts,dungeon.mts}. dailySeed hashes
// `ruinfold-daily:<date>` with SHA-256 and reads the first 4 bytes big-endian (daily.mts);
// mulberry32 + the first intBetween(rng,0,3) draw reproduce dungeon.mts's floorCount exactly.
// No other draw from this rng is replicated -- only the one value shown here.
export async function ruinfoldDailySeedHex(dateStr) {
  const bytes = new TextEncoder().encode(`ruinfold-daily:${dateStr}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const n = new DataView(digest).getUint32(0, false);
  return { hex: `0x${n.toString(16).padStart(8, '0')}`, seedInt: n };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ruinfoldFloorCount(seedInt) {
  const rng = mulberry32(seedInt);
  return 4 + Math.floor(rng() * 4); // intBetween(rng, 0, 3), dungeon.mts's first draw
}

// ---- durante: dailySeed (identical shape to ruinfold's own, different namespace) --------------
// Ported from apps/durante/src/daily.mjs verbatim: SHA-256 of "durante-daily:<date>", first 4
// bytes read big-endian as the 32-bit seed. Unlike ruinfold's floor count, durante's daily strip
// shows only the seed itself -- deriving the demon count/maze shape here would mean porting
// daily-arena.mjs's full recursive-backtracker generator, real work with no storefront payoff
// (the strip's job is "prove today's seed is real and the same for everyone", not preview the maze).
export async function duranteDailySeedHex(dateStr) {
  const bytes = new TextEncoder().encode(`durante-daily:${dateStr}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const n = new DataView(digest).getUint32(0, false);
  return `0x${n.toString(16).padStart(8, '0')}`;
}

// ---- crucible / solitaire / gambling-trainer: plain string seeds ------------------------------
// These three never hash anything at this layer -- the composed string itself IS the seed,
// handed downstream to each game's own hashSeed+mulberry32 pipeline. Ported from
// crucible-service/src/daily.mts, solitaire-service/src/daily.mts, and
// gambling-trainer-service/src/daily.mts (itself a thin wrapper over
// @red-cup-engineering/cartridge/seed's dailySeed(gameId, date, configId)).
export const crucibleDailySeed = (dateStr) => `crucible-daily:${dateStr}`;
export const solitaireDailySeed = (dateStr, variantId) => `solitaire-daily:${variantId}:${dateStr}`;
export const gamblingTrainerDailySeed = (dateStr, configId) => `gambling-trainer-daily:${configId}:${dateStr}`;

// DEV_HOST: every game's own server.mts/server.mjs defaults to the same local port (8787,
// or RUINFOLD_PORT for ruinfold, which also defaults to 8787) -- house convention is one
// game running locally at a time, so the same base URL works across all four.
const DEV_HOST = 'http://localhost:8787';

// Subdomains actually routed to a live Cloud Run service by the Cloudflare worker -- see
// js/catalog.mjs's identical constant (and its comment) for the source of truth this mirrors.
export const LIVE_SUBDOMAINS = new Set(['crucible', 'solitaire', 'gambling-trainer', 'ruinfold', 'durante', 'farstone', 'aletheon', 'weiqi', 'equivo', 'you-are-conscious', 'stoke', 'parlor', 'tidepool', 'fearful']);

// Hand-authored per-strip copy -- the ask, subdomain, and dev path are each game's own
// storefront-facing description, not derived from catalog.json's more generic description
// field. Kept here, not in catalog.json, because this copy is specific to "today's ritual"
// framing, distinct from the catalog card's own description.
const STRIP_DEFS = [
  { id: 'ruinfold', name: 'Ruinfold', subdomain: 'ruinfold', subdomainPath: '/play', devPath: '/play' },
  { id: 'crucible', name: 'Crucible', subdomain: 'crucible', subdomainPath: '/web/index.html', devPath: '/web/index.html' },
  { id: 'solitaire', name: 'Solitaire', subdomain: 'solitaire', subdomainPath: '/web/table.html?variant=klondike-draw1&daily=1', devPath: '/web/table.html?variant=klondike-draw1&daily=1' },
  { id: 'gambling-trainer', name: "Kelly's Wager", subdomain: 'gambling-trainer', subdomainPath: '/', devPath: '/web/index.html' },
  { id: 'durante', name: 'Durante', subdomain: 'durante', subdomainPath: '/', devPath: '/' },
];

/** Today's ask copy per strip -- separated from STRIP_DEFS above only because ruinfold's ask
 *  is dynamic (it names today's real floor count); every other strip's ask is static. */
function askFor(id, { floors }) {
  switch (id) {
    case 'ruinfold':
      return `Descend today's ${floors}-floor keep and risk the five-way bilattice death, for a place on today's leaderboard.`;
    case 'crucible':
      return "Settle today's tangle to zero-H¹ -- merge, split, rebond, catalyze -- before the furnace energy runs out.";
    case 'solitaire':
      return "Today's solver-certified deal -- pick Klondike, FreeCell, or Spider, everyone gets the same shuffle.";
    case 'gambling-trainer':
      return "Today's practice bankroll run -- grade every stake against the real Kelly optimum, novice track.";
    case 'durante':
      return "Today's seeded arena -- walk the maze, shoot the demons, land on today's leaderboard next to anyone (human or agent) who played the same seed.";
    default:
      return '';
  }
}

/** Pure: every daily-utc strip's full data (name, ask, seed label/value, routing) for one
 *  real UTC date. Node-safe (crypto.subtle is a real Node global) -- called both by
 *  build.mjs with the real build-time date and by initTodayPage() with the visitor's own
 *  `new Date()`, so SSR and CSR are two calls to the exact same function, never two
 *  different implementations of the same math. */
export async function computeTodayStrips(date) {
  const dateStr = utcDateString(date);
  const { hex: ruinfoldSeed, seedInt } = await ruinfoldDailySeedHex(dateStr);
  const floors = ruinfoldFloorCount(seedInt);
  const duranteSeed = await duranteDailySeedHex(dateStr);

  return STRIP_DEFS.map((def) => {
    const seedValue = {
      ruinfold: ruinfoldSeed,
      crucible: crucibleDailySeed(dateStr),
      solitaire: solitaireDailySeed(dateStr, 'klondike-draw1'),
      'gambling-trainer': gamblingTrainerDailySeed(dateStr, 'novice'),
      durante: duranteSeed,
    }[def.id];
    const seedLabel = def.id === 'solitaire' ? "Today's seed (Klondike Draw-1)" : "Today's seed";
    return { ...def, ask: askFor(def.id, { floors }), seedLabel, seedValue };
  });
}

/** One strip's tile body -- glyph, "Live daily" badge, ask copy, seed, play/dev links.
 *  No title/heading: TUFTE's own tile header renders `tile.title` (see todayEntryToTile). */
function todayStripBodyHtml(strip) {
  const glyph = GLYPHS[strip.id] || FALLBACK_GLYPH;
  const isLive = LIVE_SUBDOMAINS.has(strip.subdomain);
  const playLink = isLive
    ? `<a class="play-link" href="https://${esc(strip.subdomain)}.561.group${esc(strip.subdomainPath)}">${EXTERNAL_LINK_ICON} Play at ${esc(strip.subdomain)}.561.group</a>`
    : `<span class="play-link" aria-disabled="true">Not yet deployed -- run it locally</span>`;
  return `
    <div class="strip-head">
      <span class="card-glyph">${glyph}</span>
      <span class="badge playable">Live daily</span>
    </div>
    <p class="strip-ask">${esc(strip.ask)}</p>
    <p class="strip-seed"><span class="seed-label">${esc(strip.seedLabel)}</span> <code>${esc(strip.seedValue)}</code></p>
    <div class="strip-links">
      ${playLink}
      <a class="dev-link" href="${esc(DEV_HOST + strip.devPath)}">${esc(DEV_HOST + strip.devPath)} <span class="dev-hint">(local dev)</span></a>
    </div>
  `;
}

/** Storefront-owned shaping: one computed strip -> one TUFTE tile.
 *
 *  role: 'rail' for every strip -- today's strips are genuinely one-per-row today
 *  (the previous flex-column .strip-list), so role=rail's grid-column:span 12 reproduces
 *  that exactly. A real, page-level fact reused consistently, not per-tile theater.
 *
 *  confidence: the same LIVE_SUBDOMAINS.has(subdomain) rule catalog.mjs's canPlayLive
 *  uses -- one confidence rule, two pages.
 *
 *  lifecycle: always 'present' -- a strip only exists at all for a shipped daily-utc game;
 *  nothing about a rendered strip is "imminent". */
function todayEntryToTile(strip) {
  return {
    id: strip.id,
    title: strip.name,
    role: 'rail',
    lifecycle: 'present',
    confidence: LIVE_SUBDOMAINS.has(strip.subdomain) ? 'high' : 'low',
    html: todayStripBodyHtml(strip),
  };
}

/** Pure: the full TUFTE model for today.html, for one real UTC date. */
export async function computeTodayModel(date) {
  const strips = await computeTodayStrips(date);
  return { tiles: strips.map(todayEntryToTile) };
}

// ---------------------------------------------------------------------------------------
// Browser-only bootstrap below this line. Nothing above here touches `document`.
// ---------------------------------------------------------------------------------------

/** Wires up today.html: renders the real, current-UTC-date model on load (replacing
 *  whatever build.mjs server-rendered for the build-time date -- correct even if the page
 *  was deployed on a previous UTC day), then wires the "Check for updates" button to
 *  re-fetch catalog.json, recompute, diff against the last-rendered projection, and patch
 *  only the tiles that actually changed. No setInterval, no background timer -- every diff
 *  here is computed in direct response to either the one-time load or an explicit click,
 *  never a poll. */
export async function initTodayPage() {
  const gridWrapper = document.getElementById('today-list');
  if (!gridWrapper) return; // not on today.html -- safe no-op import elsewhere

  const { renderTufteFragment, normalizeTufteModel, diffTufteProjection } = await import('@red-cup-engineering/web-tufte-gui-services-section');
  const { applyTufteProjectionPatch } = await import('@red-cup-engineering/web-tufte-gui-services-section/browser');

  const DATE_LABEL = document.getElementById('today-date');
  const REFRESH_BUTTON = document.getElementById('today-refresh');

  let lastProjection = null;

  async function renderFresh(date) {
    const model = await computeTodayModel(date);
    const projection = normalizeTufteModel(model);
    gridWrapper.innerHTML = renderTufteFragment(model);
    lastProjection = projection;
    DATE_LABEL.textContent = `${utcDateString(date)} UTC`;
  }

  async function refresh() {
    if (!lastProjection) return renderFresh(new Date());
    let entries;
    try {
      const res = await fetch('catalog.json', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`catalog.json responded ${res.status}`);
      const catalog = await res.json();
      entries = Array.isArray(catalog.games) ? catalog.games : [];
    } catch {
      // catalog.json is unreachable -- leave the last-known-good grid on screen rather
      // than blanking it; the button simply has nothing new to show this click.
      return;
    }
    const dailyIds = new Set(entries.filter((g) => g.seedPolicy && g.seedPolicy.kind === 'daily-utc').map((g) => g.id));
    const strips = await computeTodayStrips(new Date());
    const model = { tiles: strips.filter((s) => dailyIds.has(s.id)).map(todayEntryToTile) };
    const nextProjection = normalizeTufteModel(model);
    applyTufteProjectionPatch(gridWrapper, diffTufteProjection(lastProjection, nextProjection));
    lastProjection = nextProjection;
    DATE_LABEL.textContent = `${utcDateString(new Date())} UTC`;
  }

  DATE_LABEL.textContent = "Computing today's UTC date…";
  try {
    await renderFresh(new Date());
  } catch (err) {
    gridWrapper.innerHTML = `<p class="empty-state">Could not compute today's seeds: ${esc(err.message)}</p>`;
    return;
  }

  if (REFRESH_BUTTON) REFRESH_BUTTON.addEventListener('click', () => { refresh(); });
}

if (typeof document !== 'undefined' && document.getElementById('today-list')) {
  initTodayPage();
}
