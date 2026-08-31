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
import { LIVE_SUBDOMAINS } from './live-subdomains.mjs';

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function statusLabel(status) {
  return status === 'playable' ? 'Playable' : 'In development';
}

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

export const STATUS_FILTERS = new Set(['all', 'playable', 'in-development']);

/** The catalog's own shelf names, kept in their first appearance order. */
export function shelfValues(entries) {
  return [...new Set(entries.map((entry) => entry.shelf).filter(Boolean))];
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

/** Pure: apply the search term + status + shelf filters to catalog entries. */
export function filterEntries(entries, { term = '', status = 'all', shelf = 'all' } = {}) {
  return entries.filter((entry) => {
    const statusOk = status === 'all' || entry.status === status;
    const shelfOk = shelf === 'all' || entry.shelf === shelf;
    return statusOk && shelfOk && matchesSearch(entry, term);
  });
}

/** Normalizes URL/UI filter values against the catalog currently in hand. */
export function normalizeFilters({ term = '', status = 'all', shelf = 'all' } = {}, entries = []) {
  const normalizedStatus = STATUS_FILTERS.has(status) ? status : 'all';
  const normalizedShelf = shelf === 'all' || shelfValues(entries).includes(shelf) ? shelf : 'all';
  return { term: String(term).trim(), status: normalizedStatus, shelf: normalizedShelf };
}

/** Parses the shareable query form: `?q=…&status=…&shelf=…`. */
export function filtersFromSearchParams(params, entries) {
  return normalizeFilters({
    term: params.get('q') || '',
    status: params.get('status') || 'all',
    shelf: params.get('shelf') || 'all',
  }, entries);
}

/** Serializes only active filters, keeping the unfiltered shelf URL clean. */
export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  if (filters.term) params.set('q', filters.term);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.shelf && filters.shelf !== 'all') params.set('shelf', filters.shelf);
  return params;
}

// ---------------------------------------------------------------------------------------
// Browser-only bootstrap below this line. Nothing above here touches `document`.
// ---------------------------------------------------------------------------------------

function renderEmptyState(gridWrapper) {
  gridWrapper.innerHTML = '<div class="tufte-grid"><p class="empty-state">No games match your filters.</p></div>';
}

/** Wires up index.html's progressively enhanced search/status/shelf controls. The static
 *  SSR grid remains readable without JavaScript; with JavaScript, the current filter is
 *  represented in the URL so it can be shared and restored by browser history. */
export async function initCatalogPage() {
  const gridWrapper = document.getElementById('catalog-grid');
  if (!gridWrapper) return; // not on index.html -- safe no-op import elsewhere

  const { renderTufteFragment } = await import('@red-cup-engineering/web-tufte-gui-services-section');

  const COUNT = document.getElementById('result-count');
  const SEARCH = document.getElementById('search');
  const SHELF = document.getElementById('shelf-filter');
  const STATUS_BUTTONS = Array.from(document.querySelectorAll('.status-filter button'));

  if (!COUNT || !SEARCH || !SHELF || !STATUS_BUTTONS.length) return;

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

  function selectedFilters() {
    const activeStatus = STATUS_BUTTONS.find((b) => b.getAttribute('aria-pressed') === 'true');
    return normalizeFilters({
      term: SEARCH.value,
      status: activeStatus?.dataset.status || 'all',
      shelf: SHELF.value,
    }, allEntries);
  }

  function applyFilters() {
    render(filterEntries(allEntries, selectedFilters()));
  }

  function restoreControlsFromUrl() {
    const filters = filtersFromSearchParams(new URLSearchParams(window.location.search), allEntries);
    SEARCH.value = filters.term;
    SHELF.value = filters.shelf;
    STATUS_BUTTONS.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.status === filters.status));
    });
  }

  function updateUrl(mode) {
    const query = filtersToSearchParams(selectedFilters()).toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history[mode](null, '', nextUrl);
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
    SHELF.disabled = true;
    return;
  }

  if (!hydrated) return;

  restoreControlsFromUrl();
  applyFilters();

  SEARCH.addEventListener('input', () => {
    applyFilters();
    updateUrl('replaceState');
  });
  STATUS_BUTTONS.forEach((btn) => {
    btn.addEventListener('click', () => {
      STATUS_BUTTONS.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      applyFilters();
      updateUrl('pushState');
    });
  });
  SHELF.addEventListener('change', () => {
    applyFilters();
    updateUrl('pushState');
  });
  window.addEventListener('popstate', () => {
    restoreControlsFromUrl();
    applyFilters();
  });
}

if (typeof document !== 'undefined' && document.getElementById('catalog-grid')) {
  initCatalogPage();
}
