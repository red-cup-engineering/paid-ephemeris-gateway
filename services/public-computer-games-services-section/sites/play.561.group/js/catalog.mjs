// play.561.group -- catalog renderer.
// Zero third-party runtime dependencies (TUFTE is a rendering/patching engine, not a
// framework -- see docs at @red-cup-engineering/web-tufte-gui-services-section/docs/handbook.md).
// Reads catalog.json (one cartridge-manifest-shaped entry per game) and renders game
// cards as TUFTE tiles. Nothing here knows a game's State/Intent/GameEvent shapes --
// per the spec, the storefront only ever touches the manifest's string-keyed surface.
//
// This module is deliberately split in two:
//   - Everything above initCatalogPage() is a pure, Node-safe function: no top-level DOM
//     reference, nothing that requires a browser to import. build.mjs imports these same
//     functions to server-render index.html's catalog grid; test/tufte-tiles.test.mts
//     imports them to test the catalog -> tile shaping directly, with no fake DOM needed.
//   - initCatalogPage() is the browser-only bootstrap: DOM lookups, fetch, event wiring.
//     It runs automatically when this file loads as index.html's own <script type="module">,
//     and is a no-op import anywhere else (guarded by a real #catalog-grid check, not just
//     a `typeof document` check, so importing this file from a page that happens to have a
//     `document` global but no catalog markup -- e.g. a future test harness -- still can't
//     accidentally trigger a live fetch).

import { GLYPHS, FALLBACK_GLYPH, EXTERNAL_LINK_ICON, TERMINAL_ICON } from './glyphs.mjs';

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function statusLabel(status) {
  return status === 'playable' ? 'Playable' : 'In development';
}

// Subdomains actually routed to a live Cloud Run service by the Cloudflare worker -- see
// sites/cloudflare-router/src/index.mjs's `ORIGIN_BY_HOST` for what resolves at
// *.561.group right now. A catalog entry can be real, tested, and "playable" with a
// genuine browser entry point while still not being one of these -- a game not yet
// deployed and routed would otherwise get a "Play at X.561.group" link to a hostname
// that doesn't resolve.
// Kept in sync by hand (house doctrine: vendor/mirror across service trees, not a live
// cross-service import) -- update this alongside the router's own route list.
// (test/honest-links.test.mts checks this set against the router's real routes.)
export const LIVE_SUBDOMAINS = new Set(['crucible', 'solitaire', 'gambling-trainer', 'ruinfold', 'durante', 'farstone', 'aletheon', 'weiqi', 'equivo', 'you-are-conscious', 'stoke', 'parlor', 'tidepool', 'fearful']);

export function playUrl(entry) {
  // Respect the manifest's own declared entry point (e.g. crucible's is "/web/index.html", not
  // "/") rather than assuming every game's front door is the bare origin.
  const entryPath = (entry.entryPoints && entry.entryPoints.browser) || '/';
  return `https://${entry.subdomain}.561.group${entryPath}`;
}

export function hasHeadless(entry) {
  return Boolean(entry.entryPoints && entry.entryPoints.headless);
}

export function hasBrowser(entry) {
  return Boolean(entry.entryPoints && entry.entryPoints.browser);
}

/** Whether this catalog entry can honestly link straight out to its subdomain right now — real
 *  browser entry point AND that subdomain is one the worker actually routes. See
 *  LIVE_SUBDOMAINS's comment above for why "playable" alone is not enough. */
export function canPlayLive(entry) {
  return entry.status === 'playable' && hasBrowser(entry) && LIVE_SUBDOMAINS.has(entry.subdomain);
}

/** The catalog card's own body markup -- glyph, description, badges, statusNote, keyword
 *  pills, action link, subdomain hint. Deliberately does NOT render a title/heading: once
 *  this is handed to TUFTE as `tile.html`, TUFTE's own tile header already renders
 *  `tile.title` as an <h2> (with an automatic aria-labelledby linking the tile to it) --
 *  repeating the title inside the body would be a duplicate, not a fallback. */
export function catalogCardBodyHtml(entry) {
  const glyph = GLYPHS[entry.id] || FALLBACK_GLYPH;
  const playable = entry.status === 'playable';
  const canLinkOut = canPlayLive(entry);
  const keywords = (entry.keywords || [])
    .slice(0, 6)
    .map((k) => `<li class="keyword">${esc(k)}</li>`)
    .join('');

  const headlessBadge = hasHeadless(entry)
    ? `<span class="badge headless" title="${esc(entry.entryPoints.headless)}">${TERMINAL_ICON} API / terminal play</span>`
    : '';

  const actionLink = canLinkOut
    ? `<a class="play-link" href="${esc(playUrl(entry))}">${EXTERNAL_LINK_ICON} Play at ${esc(entry.subdomain)}.561.group</a>`
    : `<span class="play-link" aria-disabled="true">Not yet deployed</span>`;

  const subdomainHint = `<span class="subdomain-hint">${esc(entry.subdomain)}.561.group</span>`;

  return `
    <div class="card-head">
      <span class="card-glyph">${glyph}</span>
    </div>
    <p class="desc">${esc(entry.description)}</p>
    <div class="badges">
      <span class="badge ${playable ? 'playable' : 'in-development'}">${statusLabel(entry.status)}</span>
      ${headlessBadge}
    </div>
    ${entry.statusNote ? `<p class="status-note">${esc(entry.statusNote)}</p>` : ''}
    <ul class="keywords">${keywords}</ul>
    <div class="card-actions">
      ${actionLink}
      ${subdomainHint}
    </div>
  `;
}

/** Storefront-owned shaping: one catalog.json entry -> one TUFTE tile. This is the whole
 *  boundary the package's own README asks for -- "domain vocabularies stay OUTSIDE this
 *  package" -- TUFTE never sees a subdomain, a status string, or an entry point; it only
 *  ever receives the already-computed lifecycle/confidence token values this produces.
 *
 *  role/span/side are deliberately left unset (TUFTE's own neutral defaults): catalog
 *  cards are peers in a repeating grid, not a hero/aside/rail layout, and no catalog fact
 *  honestly maps to a physical "side". Stretching TUFTE's vocabulary to fake distinctions
 *  a dozen peer cards don't actually have would be exactly the "structure the situation
 *  doesn't call for" anti-pattern the package's own design rationale rejects by name. */
export function catalogEntryToTile(entry) {
  return {
    id: entry.id,
    title: entry.displayName,
    eyebrow: entry.shelf,
    lifecycle: entry.status === 'in-development' ? 'imminent' : 'present',
    confidence: canPlayLive(entry) ? 'high' : 'low',
    html: catalogCardBodyHtml(entry),
  };
}

/** Pure: the full, unfiltered TUFTE model for a catalog.json games array. What
 *  build.mjs server-renders and what a from-scratch client render reproduces. */
export function catalogModel(entries) {
  return { tiles: entries.map(catalogEntryToTile) };
}

export function matchesSearch(entry, term) {
  if (!term) return true;
  const haystack = [
    entry.displayName,
    entry.description,
    entry.id,
    ...(entry.keywords || []),
  ].join(' ').toLowerCase();
  return haystack.includes(term.toLowerCase());
}

/** Pure: apply the search term + status filter to a catalog.json games array. */
export function filterEntries(entries, { term = '', status = 'all' } = {}) {
  return entries.filter((entry) => {
    const statusOk = status === 'all' || entry.status === status;
    return statusOk && matchesSearch(entry, term);
  });
}

// ---------------------------------------------------------------------------------------
// Browser-only bootstrap below this line. Nothing above here touches `document`.
// ---------------------------------------------------------------------------------------

function renderEmptyState(gridWrapper) {
  gridWrapper.innerHTML = '<div class="tufte-grid"><p class="empty-state">No games match your filters.</p></div>';
}

/** Wires up index.html: fetches catalog.json once (needed so search/filter has entry data
 *  to work with -- the grid itself is already correct straight out of build.mjs's SSR, so
 *  this does NOT re-render the unfiltered view on load, only on an actual filter change),
 *  then renders every filtered view through the same catalogModel()/renderTufteFragment()
 *  path SSR used, so CSR and SSR never diverge into two different renderers. */
export async function initCatalogPage() {
  const gridWrapper = document.getElementById('catalog-grid');
  if (!gridWrapper) return; // not on index.html -- safe no-op import elsewhere

  const { renderTufteFragment } = await import('@red-cup-engineering/web-tufte-gui-services-section');

  const COUNT = document.getElementById('result-count');
  const SEARCH = document.getElementById('search');
  const STATUS_BUTTONS = Array.from(document.querySelectorAll('.status-filter button'));

  function render(entries) {
    if (entries.length) {
      gridWrapper.innerHTML = renderTufteFragment(catalogModel(entries));
    } else {
      renderEmptyState(gridWrapper);
    }
    COUNT.textContent = `${entries.length} game${entries.length === 1 ? '' : 's'}`;
  }

  let allEntries = [];
  let hydrated = false;

  function applyFilters() {
    const term = SEARCH.value.trim();
    const activeStatus = STATUS_BUTTONS.find((b) => b.getAttribute('aria-pressed') === 'true');
    const status = activeStatus ? activeStatus.dataset.status : 'all';
    render(filterEntries(allEntries, { term, status }));
  }

  try {
    const res = await fetch('catalog.json', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`catalog.json responded ${res.status}`);
    const catalog = await res.json();
    allEntries = Array.isArray(catalog.games) ? catalog.games : [];
    hydrated = true;
  } catch (err) {
    // The grid build.mjs already server-rendered stays visible and fully readable --
    // losing live search/filter on a fetch failure is a real degradation, but it is
    // never a blank page the way a full client-only render used to be.
    if (SEARCH) {
      SEARCH.disabled = true;
      SEARCH.placeholder = `Search unavailable (${err.message})`;
    }
    STATUS_BUTTONS.forEach((btn) => { btn.disabled = true; });
    return;
  }

  if (!hydrated) return;

  SEARCH.addEventListener('input', applyFilters);
  STATUS_BUTTONS.forEach((btn) => {
    btn.addEventListener('click', () => {
      STATUS_BUTTONS.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      applyFilters();
    });
  });
}

if (typeof document !== 'undefined' && document.getElementById('catalog-grid')) {
  initCatalogPage();
}
