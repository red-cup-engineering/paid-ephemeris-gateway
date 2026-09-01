/**
 * `project` — the state-projection function: `(variant, state, ui) -> RenderModel`.
 *
 * Pure and DOM-free on purpose: this is the module `web/test/smoke.test.mts` imports directly
 * (alongside `kernel.mjs`) to play a scripted game through the real rules engine and check the
 * projection stays consistent with it at every step, with no browser involved. `render-dom.mjs`
 * is the only module that touches `document`; it consumes exactly the `RenderModel` shape built
 * here and never reads `GameState` or a `VariantSpec` on its own — so the DOM layer cannot drift
 * from the rules engine except by drifting from this file, which is the thing under test.
 *
 * A `RenderModel` never carries a `GameState` or `VariantSpec` value inside it — only plain,
 * serializable data (strings, numbers, booleans, arrays) — so it is trivially diffable, loggable,
 * and comparable in a test without reaching back into kernel internals.
 */
import { legalTargets, checkWin, autoFinishAvailable } from './kernel.mjs';

/**
 * @typedef {{ suit: string, rank: number, faceUp: boolean, selected: boolean }} RenderCard
 * @typedef {{ id: string, kind: string, cards: RenderCard[], count: number, isLegalTarget: boolean }} RenderPile
 */

/**
 * @param {import('./kernel.mjs').VariantSpec} variant
 * @param {import('./kernel.mjs').GameState} state
 * @param {{ selected?: { pile: string, count: number } | null }} [ui]
 * @returns {{
 *   variantId: string, seed: string, totalCards: number, cardsInPlay: number,
 *   piles: Record<string, RenderPile>, pileOrder: string[],
 *   selected: { pile: string, count: number } | null,
 *   canUndo: boolean, canRedo: boolean, won: boolean, autoFinish: boolean,
 *   hasStock: boolean, hasWaste: boolean, redealAllowed: boolean,
 *   moveCount: number, redealsUsed: number,
 * }}
 */
export function projectState(variant, state, ui = {}) {
  const selected = ui.selected ?? null;
  const legal = selected ? new Set(legalTargets(variant, state, selected.pile, selected.count)) : new Set();

  /** @type {Record<string, RenderPile>} */
  const piles = {};
  let cardsInPlay = 0;
  for (const spec of variant.piles) {
    const cards = state.piles[spec.id] ?? [];
    cardsInPlay += cards.length;
    const selectedHere = selected && selected.pile === spec.id ? selected.count : 0;
    piles[spec.id] = {
      id: spec.id,
      kind: spec.kind,
      count: cards.length,
      isLegalTarget: legal.has(spec.id),
      cards: cards.map((c, i) => ({
        suit: c.suit,
        rank: c.rank,
        faceUp: c.faceUp,
        selected: selectedHere > 0 && i >= cards.length - selectedHere,
      })),
    };
  }

  const hasStock = variant.piles.some((p) => p.kind === 'stock');
  const hasWaste = variant.piles.some((p) => p.kind === 'waste');
  const redealAllowed =
    !!variant.redeal &&
    (state.piles['stock']?.length ?? 0) === 0 &&
    (state.piles['waste']?.length ?? 0) > 0 &&
    (variant.redeal.stockRecycles === 'unlimited' || state.redealsUsed < variant.redeal.stockRecycles);

  return {
    variantId: variant.id,
    seed: state.seed,
    totalCards: variant.decks * 52,
    cardsInPlay,
    piles,
    pileOrder: variant.piles.map((p) => p.id),
    selected,
    canUndo: state.cursor > 0,
    canRedo: state.cursor < state.log.length,
    won: checkWin(variant, state),
    autoFinish: autoFinishAvailable(variant, state),
    hasStock,
    hasWaste,
    redealAllowed,
    moveCount: state.cursor,
    redealsUsed: state.redealsUsed,
  };
}
