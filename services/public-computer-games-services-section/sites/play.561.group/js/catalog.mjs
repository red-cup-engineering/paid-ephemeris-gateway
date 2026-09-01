// play.561.group -- catalog renderer.
// The pure catalog-entry -> TUFTE-tile shaping moved to
// @red-cup-engineering/games-catalog-storefront the day mud.561.group became a second
// consumer of the identical rules -- see that package's src/catalog.mjs. This file now binds
// those shared functions to THIS site's own LIVE_SUBDOMAINS and owns the browser-only DOM
// bootstrap below initCatalogPage(), exactly as before. build.mjs and
// test/tufte-tiles.test.mts still import from this same path, unchanged.

import {
  esc,
  statusLabel,
  playUrl,
  hasHeadless,
  hasBrowser,
  canPlayLive as canPlayLiveBase,
  catalogCardBodyHtml as catalogCardBodyHtmlBase,
  catalogEntryToTile as catalogEntryToTileBase,
  catalogModel as catalogModelBase,
  STATUS_FILTERS,
  shelfValues,
  matchesSearch,
  filterEntries,
  normalizeFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '@red-cup-engineering/games-catalog-storefront';
import { LIVE_SUBDOMAINS } from './live-subdomains.mjs';

export {
  esc, statusLabel, playUrl, hasHeadless, hasBrowser, STATUS_FILTERS,
  shelfValues, matchesSearch, filterEntries, normalizeFilters,
  filtersFromSearchParams, filtersToSearchParams,
};

// canPlayLive/catalogCardBodyHtml/catalogEntryToTile/catalogModel bound to this site's own
// LIVE_SUBDOMAINS -- same call shape every caller here used before the extraction.
export const canPlayLive = (entry) => canPlayLiveBase(entry, LIVE_SUBDOMAINS);
export const catalogCardBodyHtml = (entry) => catalogCardBodyHtmlBase(entry, LIVE_SUBDOMAINS);
export const catalogEntryToTile = (entry) => catalogEntryToTileBase(entry, LIVE_SUBDOMAINS);
export const catalogModel = (entries) => catalogModelBase(entries, LIVE_SUBDOMAINS);

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
