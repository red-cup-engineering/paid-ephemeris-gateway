/**
 * ev.test.mts — sanity checks on the house-math seam (`computeHouseMath`, `shoeComposition`)
 * against the textbook borderline decisions `@red-cup-engineering/card-table/blackjack`'s own
 * README/tests already establish for the underlying `handEV`: hard 16 vs. dealer 10 favors
 * hitting (barely) over standing, a two-card 11 favors doubling over both standing and hitting,
 * and a hard 20 never prefers hitting. This file exercises the *casino-service* seam around
 * that function — real `Shoe`/`BlackjackHand` shapes, the `allowDouble`/`allowSplit` rule gating
 * `handEV` itself doesn't know about — not `handEV`'s own math, which is card-table's to test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '@red-cup-engineering/card-table/deck';
import type { Shoe } from '@red-cup-engineering/card-table/shoe';
import { computeHouseMath, shoeComposition } from './ev.mts';
import { resolveRules } from './rules.mts';
import type { BlackjackHand } from './engine.mts';

const RULES = resolveRules('default');

/** A hand-built `Shoe` whose "already dealt" prefix (`cards.slice(0, cursor)`) is exactly the
 *  ranks the caller wants removed from the composition — the rest of the array only needs to
 *  exist (padded with an arbitrary card), since `shoeComposition` never reads past `cursor`. */
function fakeShoe(dealtRanks: number[]): Shoe {
  const dealt: Card[] = dealtRanks.map((rank) => ({ suit: 'S', rank, faceUp: true }));
  const filler: Card[] = Array.from({ length: RULES.decks * 52 - dealt.length }, () => ({ suit: 'S', rank: 2, faceUp: false }));
  return { cards: [...dealt, ...filler], cursor: dealt.length, cutIndex: Math.floor(RULES.decks * 52 * RULES.penetration), decks: RULES.decks, penetration: RULES.penetration };
}

function activeHand(cards: number[], bet = 100): BlackjackHand {
  return { cards: cards.map((rank) => ({ suit: 'H', rank, faceUp: true })), bet, status: 'active', fromSplit: false, isSplitAces: false };
}

test('shoeComposition: excludes every already-dealt rank, hidden or not', () => {
  const shoe = fakeShoe([10, 6, 10, 2]); // player 10/6, dealer up 10, dealer hole 2 (hidden)
  const composition = shoeComposition(shoe, RULES.decks);
  // one ten-bucket card removed for the player's ten, one for the dealer's up ten: 16*decks - 2.
  assert.equal(composition[9], 16 * RULES.decks - 2);
  assert.equal(composition[5], 4 * RULES.decks - 1); // the "6" bucket (index 5) down by one
  assert.equal(composition[1], 4 * RULES.decks - 1); // the "2" bucket (index 1) down by one — the hidden hole card still counts
});

test('house math: hard 16 vs. dealer 10 favors hitting (weakly) over standing — the textbook borderline', () => {
  const shoe = fakeShoe([10, 6, 10]);
  const math = computeHouseMath(activeHand([10, 6]), 10, shoe, RULES, { allowDouble: true, allowSplit: false });
  assert.ok(math !== null);
  assert.ok(math.ev.stand < 0);
  assert.ok(math.ev.hit < 0);
  assert.ok(math.ev.hit >= math.ev.stand);
  assert.equal(math.bestAction, 'hit');
});

test('house math: a two-card 11 favors doubling over both standing and hitting', () => {
  const shoe = fakeShoe([5, 6, 7]);
  const math = computeHouseMath(activeHand([5, 6]), 7, shoe, RULES, { allowDouble: true, allowSplit: false });
  assert.ok(math !== null);
  assert.ok(math.ev.double !== null);
  assert.ok(math.ev.double! > math.ev.hit);
  assert.ok(math.ev.double! > math.ev.stand);
  assert.equal(math.bestAction, 'double');
});

test('house math: a hard 20 never prefers hitting, regardless of the dealer\'s upcard', () => {
  for (const upcard of [2, 6, 7, 10, 1]) {
    const shoe = fakeShoe([10, 10, upcard]);
    const math = computeHouseMath(activeHand([10, 10]), upcard, shoe, RULES, { allowDouble: true, allowSplit: false });
    assert.ok(math !== null);
    assert.ok(math.ev.stand > math.ev.hit, `upcard ${upcard}: stand (${math.ev.stand}) should beat hit (${math.ev.hit})`);
    assert.notEqual(math.bestAction, 'hit');
  }
});

test('house math: double/split are reported null when the table\'s own rules forbid them here, even if handEV alone would allow them', () => {
  const shoe = fakeShoe([8, 8, 6]);
  const math = computeHouseMath(activeHand([8, 8]), 6, shoe, RULES, { allowDouble: false, allowSplit: false });
  assert.ok(math !== null);
  assert.equal(math.ev.double, null);
  assert.equal(math.ev.split, null);
  assert.notEqual(math.bestAction, 'double');
  assert.notEqual(math.bestAction, 'split');
});

test('house math: a splittable pair reports a real (non-null) split EV when the rules allow it', () => {
  const shoe = fakeShoe([8, 8, 6]);
  const math = computeHouseMath(activeHand([8, 8]), 6, shoe, RULES, { allowDouble: true, allowSplit: true });
  assert.ok(math !== null);
  assert.notEqual(math.ev.split, null);
});

test('house math: a finished hand (not active) has nothing to price', () => {
  const shoe = fakeShoe([10, 9, 6]);
  const bustHand: BlackjackHand = { cards: [{ suit: 'H', rank: 10, faceUp: true }, { suit: 'H', rank: 9, faceUp: true }], bet: 100, status: 'bust', fromSplit: false, isSplitAces: false };
  const math = computeHouseMath(bustHand, 6, shoe, RULES, { allowDouble: true, allowSplit: true });
  assert.equal(math, null);
});
