/**
 * `web/test/smoke.test.mts` — plays a scripted 50-move FreeCell game through the real rules
 * engine (`web/js/kernel.mjs`, which is a straight re-export of `src/engine.mts` — see that
 * file's module doc) and, at every step, checks that `web/js/project.mjs`'s pure
 * state-projection function stays consistent with the `GameState` it was built from: no card
 * gained or lost, its `isLegalTarget` flags matching `engine.legalTargets` exactly, and its
 * `selected` markers landing on the right cards. This is the DOM-free half of "the renderer
 * doesn't drift from the kernel" — `render-dom.mjs` consumes only what this projection produces,
 * so a bug here is the only way that could happen (see `project.mjs`'s module doc).
 *
 * Runs under plain `node --test`: `kernel.mjs` re-exports `../../src/*.mts`, which Node loads
 * through its native TypeScript type-stripping exactly as it does for `src/*.test.mts` itself —
 * no browser, no server, involved.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FREECELL, dealTable, legalTargets, applyMove, undo, redo } from '../js/kernel.mjs';
import { projectState } from '../js/project.mjs';
import { KEYMAP, LOG_ENTRY_KINDS, keymapCoversAllMoveKinds } from '../js/game-controller.mjs';
import { cardFaceMarkup, cardBackMarkup, emptyPileMarkup, rankLabel } from '../js/cards-svg.mjs';

const SEED = 'smoke-1';
const MOVE_COUNT = 50;

/** Deterministic scripted player: largest-run-first, first pile in declared order, first legal
 * target in declared order. Verified empirically (see the module's implementation notes in the
 * task log) to reach 50 moves without stalling on this seed. */
function findScriptedMove(variant, state) {
  for (const p of variant.piles) {
    const pile = state.piles[p.id] ?? [];
    for (let count = pile.length; count >= 1; count--) {
      const targets = legalTargets(variant, state, p.id, count);
      if (targets.length > 0) return { from: p.id, to: targets[0], count };
    }
  }
  return null;
}

function totalCardsIn(model) {
  return Object.values(model.piles).reduce((sum, p) => sum + p.count, 0);
}

test('scripted 50-move FreeCell playthrough keeps the projection consistent with the kernel', () => {
  let state = dealTable(SEED, FREECELL);
  const totalCards = FREECELL.decks * 52;

  // Deal-time sanity: the projection agrees with the kernel before a single move is played.
  const dealModel = projectState(FREECELL, state);
  assert.equal(dealModel.totalCards, totalCards);
  assert.equal(totalCardsIn(dealModel), totalCards);
  assert.equal(dealModel.cardsInPlay, totalCards);
  assert.equal(dealModel.moveCount, 0);
  assert.equal(dealModel.canUndo, false);

  for (let step = 0; step < MOVE_COUNT; step++) {
    const move = findScriptedMove(FREECELL, state);
    assert.ok(move, `scripted player found no legal move at step ${step} (seed "${SEED}")`);

    // Project the pre-move state with that move's source selected, and check the projection's
    // legal-target set matches `engine.legalTargets` exactly, and that exactly the top `count`
    // cards of `from` are marked selected.
    const preModel = projectState(FREECELL, state, { selected: { pile: move.from, count: move.count } });
    const expectedTargets = new Set(legalTargets(FREECELL, state, move.from, move.count));
    const projectedTargets = new Set(
      Object.values(preModel.piles)
        .filter((p) => p.isLegalTarget)
        .map((p) => p.id),
    );
    assert.deepEqual(projectedTargets, expectedTargets, `step ${step}: legal-target mismatch`);
    assert.equal(projectedTargets.has(move.to), true, `step ${step}: scripted target must be legal`);

    const fromPile = preModel.piles[move.from];
    const selectedCount = fromPile.cards.filter((c) => c.selected).length;
    assert.equal(selectedCount, move.count, `step ${step}: wrong number of cards marked selected`);
    assert.ok(
      fromPile.cards.slice(-move.count).every((c) => c.selected),
      `step ${step}: selection must land on the top ${move.count} card(s)`,
    );
    assert.ok(
      fromPile.cards.slice(0, fromPile.cards.length - move.count).every((c) => !c.selected),
      `step ${step}: cards below the selection must not be marked selected`,
    );

    state = applyMove(FREECELL, state, move);

    const postModel = projectState(FREECELL, state);
    assert.equal(totalCardsIn(postModel), totalCards, `step ${step}: card count drifted after applying a move`);
    assert.equal(postModel.cardsInPlay, totalCards);
    assert.equal(postModel.moveCount, step + 1);
    assert.equal(postModel.canUndo, true);
    assert.equal(postModel.canRedo, false);
  }

  assert.equal(state.cursor, MOVE_COUNT);
  assert.equal(state.log.length, MOVE_COUNT);

  // Undo/redo round-trip: the projection right after redo must be identical (deep) to the one
  // right before undo, since replay-from-seed is deterministic (engine.mts's `replayTo`).
  const beforeUndo = projectState(FREECELL, state);
  const afterUndo = undo(FREECELL, state);
  const undoModel = projectState(FREECELL, afterUndo);
  assert.equal(undoModel.moveCount, MOVE_COUNT - 1);
  assert.equal(undoModel.canRedo, true);
  assert.equal(totalCardsIn(undoModel), totalCards);

  const afterRedo = redo(FREECELL, afterUndo);
  const redoModel = projectState(FREECELL, afterRedo);
  assert.deepEqual(redoModel, beforeUndo, 'redo after undo must reproduce the exact prior projection');
});

test('KEYMAP covers every engine LogEntry kind (move, draw, redeal, deal-row)', () => {
  assert.equal(keymapCoversAllMoveKinds(), true);
  assert.ok(KEYMAP.length > 0);
  // The coverage check itself must be non-vacuous: dropping the 'move' binding should fail it.
  const withoutMove = KEYMAP.filter((k) => k.kind !== 'move');
  assert.equal(keymapCoversAllMoveKinds(withoutMove), false);
  // 'deal-row' has no key of its own by design — it's reached by the same key as 'draw' (see
  // game-controller.mjs's module doc) — so LOG_ENTRY_KINDS must still list it as a real kind.
  assert.ok(LOG_ENTRY_KINDS.includes('deal-row'));
  assert.ok(LOG_ENTRY_KINDS.includes('redeal'));
});

test('card-svg renderer produces well-formed, distinct SVG for faces, backs, and empty piles', () => {
  const ace = cardFaceMarkup({ suit: 'S', rank: 1, faceUp: true });
  const king = cardFaceMarkup({ suit: 'H', rank: 13, faceUp: true });
  const back = cardBackMarkup();
  const empty = emptyPileMarkup('A');

  for (const markup of [ace, king, back, empty]) {
    assert.match(markup, /^<svg /);
    assert.match(markup, /<\/svg>$/);
    assert.ok(markup.includes('viewBox="0 0 100 140"'));
  }
  assert.notEqual(ace, king);
  assert.notEqual(ace, back);
  assert.ok(ace.includes('suit-black'));
  assert.ok(king.includes('suit-red'));
  assert.equal(rankLabel(1), 'A');
  assert.equal(rankLabel(10), '10');
  assert.equal(rankLabel(13), 'K');
});
