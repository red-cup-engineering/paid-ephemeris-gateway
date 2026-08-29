/**
 * `cards-svg` — the card renderer: a small vector vocabulary (one rank glyph, four suit-glyph
 * paths, one back pattern) composed into inline SVG markup strings. No raster image asset exists
 * anywhere in this service; every card, in every theme, is these same paths recolored through CSS
 * custom properties (`--suit-red`, `--suit-black`, `--card-face`, `--card-back-*`) — a re-theme is
 * a stylesheet change, never a re-export (DESIGN.md, "SVG cards, themed via CSS custom
 * properties"). Pure string-building, no `document` access, so it loads and is callable the same
 * way under Node (tests) and in a real browser.
 */

const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

/** Rank label for the corner index: "A", "2".."10", "J", "Q", "K". */
export function rankLabel(rank) {
  return RANK_LABEL[rank] ?? String(rank);
}

export function suitColorClass(suit) {
  return suit === 'H' || suit === 'D' ? 'suit-red' : 'suit-black';
}

// Each glyph lives in a shared local box (0 0 40 46) so corner and center placement math is one
// formula for all four suits, even though hearts/diamonds only use the top ~38 units of it.
const GLYPH_PATH = {
  H: 'M20,38 C5,28 0,18 0,12 C0,5 6,0 13,2 C17,3 19,6 20,10 C21,6 23,3 27,2 C34,0 40,5 40,12 C40,18 35,28 20,38 Z',
  D: 'M20,0 L40,19 L20,38 L0,19 Z',
  S: 'M20,0 C35,10 40,18 40,26 C40,33 34,38 27,36 C23,35 21,32 20,28 C19,32 17,35 13,36 C6,38 0,33 0,26 C0,18 5,10 20,0 Z M17,32 L23,32 L20,46 Z',
  C: 'M20,0 A10,10 0 1 1 19.99,0 Z M10,14 A10,10 0 1 1 9.99,14 Z M30,14 A10,10 0 1 1 29.99,14 Z M17,26 L23,26 L23,42 L17,42 Z',
};

function glyphPath(suit, extraAttrs = '') {
  return `<path d="${GLYPH_PATH[suit]}" ${extraAttrs}/>`;
}

/** One corner index: rank text over a small suit glyph, used top-left and (rotated) bottom-right. */
function cornerIndex(card) {
  return (
    `<g class="card-index">` +
    `<text x="0" y="13" class="card-rank-text">${rankLabel(card.rank)}</text>` +
    `<g transform="translate(1,17) scale(0.32)">${glyphPath(card.suit)}</g>` +
    `</g>`
  );
}

/** Face-up card markup: rounded face, two mirrored corner indices, one large center glyph. */
export function cardFaceMarkup(card) {
  const cls = `card-face-svg ${suitColorClass(card.suit)}`;
  return (
    `<svg viewBox="0 0 100 140" class="${cls}" role="img" aria-label="${rankLabel(card.rank)} of ${suitName(card.suit)}">` +
    `<rect x="1.5" y="1.5" width="97" height="137" rx="9" class="card-face-bg"/>` +
    `<g transform="translate(8,8)">${cornerIndex(card)}</g>` +
    `<g transform="rotate(180 50 70) translate(8,8)">${cornerIndex(card)}</g>` +
    `<g transform="translate(30,52)">${glyphPath(card.suit, 'class="card-center-glyph"')}</g>` +
    `</svg>`
  );
}

/** Face-down back markup: a themeable lattice pattern, entirely `--card-back-*` custom properties. */
export function cardBackMarkup() {
  return (
    `<svg viewBox="0 0 100 140" class="card-back-svg" role="img" aria-label="face-down card">` +
    `<rect x="1.5" y="1.5" width="97" height="137" rx="9" class="card-back-bg"/>` +
    `<rect x="8" y="8" width="84" height="124" rx="5" class="card-back-inset"/>` +
    `<g class="card-back-lattice">` +
    Array.from({ length: 6 }, (_, i) => `<line x1="${14 + i * 14}" y1="10" x2="${14 + i * 14}" y2="130"/>`).join('') +
    Array.from({ length: 9 }, (_, i) => `<line x1="10" y1="${14 + i * 14}" x2="90" y2="${14 + i * 14}"/>`).join('') +
    `</g>` +
    `</svg>`
  );
}

/** Empty-pile placeholder markup: a dashed outline, no card at all (distinct from a face-down back). */
export function emptyPileMarkup(label = '') {
  return (
    `<svg viewBox="0 0 100 140" class="card-empty-svg" role="img" aria-label="${label || 'empty pile'}">` +
    `<rect x="1.5" y="1.5" width="97" height="137" rx="9" class="card-empty-outline"/>` +
    (label ? `<text x="50" y="75" class="card-empty-label">${label}</text>` : '') +
    `</svg>`
  );
}

export function cardMarkup(card) {
  return card.faceUp ? cardFaceMarkup(card) : cardBackMarkup();
}

function suitName(suit) {
  return { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' }[suit] ?? suit;
}
