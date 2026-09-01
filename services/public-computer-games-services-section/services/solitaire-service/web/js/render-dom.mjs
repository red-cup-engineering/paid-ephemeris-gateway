/**
 * `render-dom` — the only module in this service that touches `document`.
 *
 * It consumes exactly the plain-data `RenderModel` shape `project.mjs` builds (plus small,
 * DOM-only, ephemeral UI extras like the keyboard cursor's current pile) and never imports
 * `kernel.mjs` or reads a `GameState`/`VariantSpec` directly — so the only way the picture on
 * screen can diverge from the rules engine is for it to diverge from `project.mjs`'s projection,
 * which is exactly the thing `web/test/smoke.test.mts` checks without a DOM in the loop.
 *
 * Pile grouping into rows is computed from each `PileSpec`'s declared `kind` (`stock` / `waste`
 * / `freecell` -> the "upper-left" row, `foundation` -> "upper-right", `tableau` -> the scrollable
 * tableau row) — never from a variant id or pile-count assumption, so Klondike (7 tableau, 4
 * foundations), FreeCell (8 tableau, 4 freecells, 4 foundations), and Spider (10 tableau, 8
 * foundations, no waste) all lay out from the same code.
 */
import { cardFaceMarkup, cardBackMarkup, emptyPileMarkup } from './cards-svg.mjs';

const KIND_LABEL = {
  stock: 'Stock',
  waste: 'Waste',
  freecell: 'Free Cell',
  foundation: 'Foundation',
  tableau: '',
};

/** Group a variant's piles into layout rows purely by declared `kind` — see module doc. */
function layoutGroups(variant) {
  const upperLeft = [];
  const upperRight = [];
  const tableau = [];
  for (const p of variant.piles) {
    if (p.kind === 'tableau') tableau.push(p);
    else if (p.kind === 'foundation') upperRight.push(p);
    else upperLeft.push(p); // stock, waste, freecell
  }
  return { upperLeft, upperRight, tableau };
}

/** A small, stable per-card tilt: two cards with the same suit+rank always tilt the same way,
 *  every reload, in every theme — a deterministic "hand-dealt" variance (same technique as
 *  lantern's per-hall hue hash), never real randomness (`Math.random()` would make the tableau
 *  visibly re-shuffle its look on every re-render, which is what `celebrateWin`'s confetti below
 *  is for, not this). Range kept small (+/-1.6deg) so it reads as a table's imperfection, not a
 *  messy deal. */
function cardTiltDeg(card) {
  const key = `${card.suit}${card.rank}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return ((hash % 33) - 16) / 10; // -1.6 .. 1.6, in 0.1deg steps
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function buildPileEl(spec) {
  const compact = spec.kind !== 'tableau' && spec.kind !== 'waste';
  const pile = el('div', `pile${compact ? ' compact' : ''}`, {
    'data-pile-id': spec.id,
    'data-kind': spec.kind,
    tabindex: '-1',
    role: 'group',
    'aria-label': KIND_LABEL[spec.kind] || spec.id,
  });
  pile.appendChild(el('div', 'pile-cursor-ring'));
  const label = KIND_LABEL[spec.kind];
  if (label) {
    const l = el('div', 'pile-label');
    l.textContent = label;
    pile.appendChild(l);
  }
  if (spec.kind === 'stock') {
    const badge = el('div', 'stock-count-badge');
    pile.appendChild(badge);
  }
  const slots = el('div', 'pile-slots');
  pile.appendChild(slots);
  return pile;
}

/**
 * Mount a variant's table skeleton into `rootEl` once. Returns `{ update, pileElements,
 * onCardEvent, onPileEvent }` — `update(model, extras)` is called on every state change;
 * `onCardEvent`/`onPileEvent` register input-layer listeners without `render-dom` knowing
 * anything about click/drag/keyboard semantics (that's `input.mjs`'s job).
 */
export function mountTable(rootEl, variant) {
  rootEl.innerHTML = '';
  rootEl.className = 'game-board';
  const { upperLeft, upperRight, tableau } = layoutGroups(variant);

  const upperRow = el('div', 'pile-row spread');
  const leftGroup = el('div', 'pile-row');
  const rightGroup = el('div', 'pile-row');
  upperRow.appendChild(leftGroup);
  upperRow.appendChild(rightGroup);

  const tableauRow = el('div', 'pile-row scrollable');

  /** @type {Map<string, HTMLElement>} */
  const pileElements = new Map();
  for (const spec of upperLeft) {
    const p = buildPileEl(spec);
    leftGroup.appendChild(p);
    pileElements.set(spec.id, p);
  }
  for (const spec of upperRight) {
    const p = buildPileEl(spec);
    rightGroup.appendChild(p);
    pileElements.set(spec.id, p);
  }
  for (const spec of tableau) {
    const p = buildPileEl(spec);
    tableauRow.appendChild(p);
    pileElements.set(spec.id, p);
  }

  rootEl.appendChild(upperRow);
  rootEl.appendChild(tableauRow);

  function renderPileCards(pileEl, renderPile) {
    const slots = pileEl.querySelector('.pile-slots');
    slots.innerHTML = '';
    const kind = renderPile.kind;
    const cards = renderPile.cards;

    if (cards.length === 0) {
      const showAceHint = kind === 'foundation' && variant.win === 'all-foundations-full';
      slots.appendChild(el('div', 'card-slot'));
      slots.lastChild.innerHTML = emptyPileMarkup(showAceHint ? 'A' : '');
      return;
    }

    if (kind === 'tableau') {
      cards.forEach((c, i) => {
        const slot = el('div', `card-slot${c.selected ? ' is-selected' : ''}`, {
          'data-pile-id': renderPile.id,
          'data-index': String(i),
        });
        slot.style.setProperty('--i', String(i));
        // Face-down cards stay flush (a tidy stock-like stack); only the played, face-up run
        // gets the per-card tilt, so the variance reads as "cards someone dealt," not board noise.
        if (c.faceUp) slot.style.setProperty('--tilt', `${cardTiltDeg(c)}deg`);
        slot.innerHTML = c.faceUp ? cardFaceMarkup(c) : cardBackMarkup();
        slots.appendChild(slot);
      });
      return;
    }

    if (kind === 'waste') {
      const fan = cards.slice(-3);
      const offset = cards.length - fan.length;
      fan.forEach((c, i) => {
        const slot = el('div', `card-slot${c.selected ? ' is-selected' : ''}`, {
          'data-pile-id': renderPile.id,
          'data-index': String(offset + i),
        });
        slot.style.setProperty('--i', String(i));
        slot.innerHTML = c.faceUp ? cardFaceMarkup(c) : cardBackMarkup();
        slots.appendChild(slot);
      });
      return;
    }

    // stock / foundation / freecell: only the top card is ever meaningfully interactive/visible.
    const top = cards[cards.length - 1];
    const slot = el('div', `card-slot${top.selected ? ' is-selected' : ''}`, {
      'data-pile-id': renderPile.id,
      'data-index': String(cards.length - 1),
    });
    slot.style.setProperty('--i', '0');
    slot.innerHTML = top.faceUp ? cardFaceMarkup(top) : cardBackMarkup();
    slots.appendChild(slot);
  }

  function update(model, extras = {}) {
    const cursorPile = extras.cursorPile ?? null;
    for (const [id, pileEl] of pileElements) {
      const renderPile = model.piles[id];
      renderPileCards(pileEl, renderPile);
      pileEl.classList.toggle('is-legal-target', !!renderPile.isLegalTarget);
      pileEl.classList.toggle('is-cursor', cursorPile === id);
      pileEl.setAttribute('aria-selected', renderPile.cards.some((c) => c.selected) ? 'true' : 'false');
      if (pileEl.dataset.kind === 'stock') {
        const badge = pileEl.querySelector('.stock-count-badge');
        if (badge) badge.textContent = renderPile.count > 0 ? `${renderPile.count} left` : 'empty';
      }
    }
  }

  return { update, pileElements, groups: { upperLeft, upperRight, tableau } };
}

/** Fire a short burst of CSS-only confetti (skips entirely under `prefers-reduced-motion`, per
 * DESIGN.md's "win animation (CSS only, respects prefers-reduced-motion)"). */
export function celebrateWin(rootEl) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e08a4b', '#6fbf95', '#d69a2d', '#a3222c', '#2f6b4f', '#f1ede2'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}
