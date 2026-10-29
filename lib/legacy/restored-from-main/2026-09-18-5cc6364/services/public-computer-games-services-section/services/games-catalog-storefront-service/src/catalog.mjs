// games-catalog-storefront -- shared catalog-entry -> TUFTE-tile shaping. Extracted from
// play.561.group/js/catalog.mjs (its origin site) to keep the shaping rules reusable. Pure,
// Node/browser dual-safe, no DOM, no fetch, no
// site branding. canPlayLive/catalogCardBodyHtml/catalogEntryToTile/catalogModel take an
// explicit `liveSubdomains` Set (each caller's own honest routed-and-safe subdomains) rather
// than a fixed module constant -- see README.md for why.

import { GLYPHS, FALLBACK_GLYPH, EXTERNAL_LINK_ICON, TERMINAL_ICON } from './glyphs.mjs';

export { GLYPHS, FALLBACK_GLYPH, EXTERNAL_LINK_ICON, TERMINAL_ICON };

export function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function statusLabel(status) {
  return status === 'playable' ? 'Playable' : 'In development';
}

/** The public host is part of a game's presentation contract. Legacy manifests identify a
 * single-label subdomain; sites in the Play hierarchy can declare their full hostname. */
export function hostname(entry) {
  return entry.hostname || `${entry.subdomain}.561.group`;
}

export function playUrl(entry) {
  // Respect the manifest's own declared entry point (e.g. crucible's is "/web/index.html", not
  // "/") rather than assuming every game's front door is the bare origin.
  const entryPath = (entry.entryPoints && entry.entryPoints.browser) || '/';
  return `https://${hostname(entry)}${entryPath}`;
}

export function hasHeadless(entry) {
  return Boolean(entry.entryPoints && entry.entryPoints.headless);
}

export function hasBrowser(entry) {
  return Boolean(entry.entryPoints && entry.entryPoints.browser);
}

// Whether this catalog entry can honestly link straight out to its subdomain right now: real
// browser entry point AND the caller's own `liveSubdomains` set names it. Routed does not
// always mean safe to link -- see each site's own routed-but-not-yet-safe carve-out.
export function canPlayLive(entry, liveSubdomains = new Set()) {
  return entry.status === 'playable' && hasBrowser(entry)
    && liveSubdomains.has(entry.hostname || entry.subdomain);
}

/** The catalog card's own body markup -- glyph, description, badges, statusNote, keyword
 *  pills, action link, subdomain hint. Deliberately does NOT render a title/heading: once
 *  this is handed to TUFTE as `tile.html`, TUFTE's own tile header already renders
 *  `tile.title` as an <h2> -- repeating the title inside the body would be a duplicate. */
export function catalogCardBodyHtml(entry, liveSubdomains = new Set()) {
  const glyph = GLYPHS[entry.id] || FALLBACK_GLYPH;
  const playable = entry.status === 'playable';
  const canLinkOut = canPlayLive(entry, liveSubdomains);
  const keywords = (entry.keywords || [])
    .slice(0, 6)
    .map((k) => `<li class="keyword">${esc(k)}</li>`)
    .join('');

  const headlessBadge = hasHeadless(entry)
    ? `<span class="badge headless" title="${esc(entry.entryPoints.headless)}">${TERMINAL_ICON} API / terminal play</span>`
    : '';

  const actionLink = canLinkOut
    ? `<a class="play-link" href="${esc(playUrl(entry))}">${EXTERNAL_LINK_ICON} Play at ${esc(hostname(entry))}</a>`
    : `<span class="play-link" aria-disabled="true">Not yet deployed</span>`;

  const subdomainHint = `<span class="subdomain-hint">${esc(hostname(entry))}</span>`;

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

/** Storefront-owned shaping: one catalog.json entry -> one TUFTE tile. role/span/side are
 *  deliberately left unset (TUFTE's own neutral defaults): catalog cards are peers in a
 *  repeating grid, not a hero/aside/rail layout. */
export function catalogEntryToTile(entry, liveSubdomains = new Set()) {
  return {
    id: entry.id,
    title: entry.displayName,
    eyebrow: entry.shelf,
    lifecycle: entry.status === 'in-development' ? 'imminent' : 'present',
    confidence: canPlayLive(entry, liveSubdomains) ? 'high' : 'low',
    html: catalogCardBodyHtml(entry, liveSubdomains),
  };
}

/** Pure: the full, unfiltered TUFTE model for a catalog.json games array, honestly gated by
 *  the caller's own `liveSubdomains` set. */
export function catalogModel(entries, liveSubdomains = new Set()) {
  return { tiles: entries.map((entry) => catalogEntryToTile(entry, liveSubdomains)) };
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

// Any catalog entry whose `keywords` include at least one of `anyOf`. The generic predicate a
// keyword-scoped storefront property filters catalog.json with, so a new matching game shows
// up the moment its own catalog-entry.json
// is tagged -- no hand-maintained id list to drift.
export function entriesWithAnyKeyword(entries, anyOf) {
  const wanted = new Set(anyOf);
  return entries.filter((entry) => (entry.keywords || []).some((k) => wanted.has(k)));
}
