/**
 * `engine.test` — per DESIGN.md's test plan: engine genericity across every `VariantSpec`,
 * determinism, undo/redo invariants, auto-finish correctness, and a random-legal-move fuzz that
 * never corrupts state. Move-log replay equivalence is folded into the undo/redo tests (`replay`
 * is the function both are built on — see `engine.mts#replayTo`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card, Suit } from './cards.mts';
import { rngFrom } from './cards.mts';
import type { GameState, Move, VariantSpec } from './engine.mts';
import {
  FORTY_THIEVES,
  FREECELL,
  GOLF,
  KLONDIKE_DRAW1,
  KLONDIKE_DRAW3,
  PYRAMID,
  SPIDER_1SUIT,
  SPIDER_2SUIT,
  SPIDER_4SUIT,
  TRIPEAKS,
  VARIANT_LIST,
  YUKON,
  applyMove,
  autoFinishAvailable,
  autoFinishSequence,
  checkWin,
  dealTable,
  drawFromStock,
  legalTargets,
  redealStock,
  redo,
  replay,
  undo,
} from './engine.mts';

function card(suit: Suit, rank: number, faceUp = true): Card {
  return { suit, rank, faceUp };
}

/** Build a bare `GameState` for `variant` with only the named piles populated — every other
 * declared pile starts empty. Lets legality fixtures target a `BuildRule` directly instead of
 * fishing for the right cards out of a real seeded deal. */
function fixtureState(variant: VariantSpec, pileCards: Record<string, Card[]>): GameState {
  const piles: Record<string, Card[]> = {};
  for (const p of variant.piles) piles[p.id] = (pileCards[p.id] ?? []).map((c) => ({ ...c }));
  return { seed: 'fixture', variantId: variant.id, piles, log: [], cursor: 0, redealsUsed: 0 };
}

// -------------------------------------------------------------------------------------------
// genericity: deal composition and determinism across every declared variant
// -------------------------------------------------------------------------------------------

test('dealTable deals exactly decks*52 cards, for every declared variant', () => {
  for (const v of VARIANT_LIST) {
    const s = dealTable('genericity-seed', v);
    const total = Object.values(s.piles).reduce((sum, p) => sum + p.length, 0);
    assert.equal(total, v.decks * 52, `${v.id}: card count mismatch`);
  }
});

test('dealTable(seed, variant) is byte-identical across repeated calls, for every variant', () => {
  for (const v of VARIANT_LIST) {
    const a = dealTable('determinism-seed', v);
    const b = dealTable('determinism-seed', v);
    assert.deepEqual(a.piles, b.piles, `${v.id}: repeated deal diverged`);
  }
});

test('dealTable produces a fixed, exact layout snapshot for a pinned seed (klondike-draw1)', () => {
  const s = dealTable('snapshot-seed-1', KLONDIKE_DRAW1);
  const top = (id: string) => {
    const pile = s.piles[id]!;
    return pile.length ? `${pile[pile.length - 1]!.rank}${pile[pile.length - 1]!.suit}` : null;
  };
  // Pinned once from an actual run; any future change to hashSeed/rngFrom/dealTable's algorithm
  // would silently reshuffle every seed in production, which is exactly what this guards against.
  assert.deepEqual(
    KLONDIKE_DRAW1.dealOrder.map(top),
    ['6D', '10H', '6S', '6C', '7C', '7D', '8H'],
  );
  assert.equal(s.piles['stock']!.length, 24);
  assert.equal(s.piles['waste']!.length, 0);
});

test('each tableau pile deals exactly its declared dealFaceUp count face up, rest face down', () => {
  for (const v of VARIANT_LIST) {
    const s = dealTable('faceup-check', v);
    for (const id of v.dealOrder) {
      const spec = v.piles.find((p) => p.id === id)!;
      const pile = s.piles[id]!;
      const faceUpCount = pile.filter((c) => c.faceUp).length;
      assert.equal(faceUpCount, spec.dealFaceUp, `${v.id}/${id}: face-up count`);
      assert.equal(pile.length, spec.dealFaceUp + spec.dealFaceDown, `${v.id}/${id}: total count`);
    }
  }
});

// -------------------------------------------------------------------------------------------
// move legality per variant — known-legal / known-illegal fixtures
// -------------------------------------------------------------------------------------------

test('klondike tableauBuild: descending, alternating color, king-only on empty', () => {
  const s = fixtureState(KLONDIKE_DRAW1, {
    'tableau-0': [card('S', 13)], // KS alone
    'tableau-1': [card('C', 9)], // 9C (black)
    'tableau-2': [card('H', 10)], // 10H (red)
    'tableau-3': [card('C', 10)], // 10C (black)
    'tableau-4': [], // empty
  });
  // 9C (black) onto 10H (red): descending + alternating -> legal
  assert.ok(legalTargets(KLONDIKE_DRAW1, s, 'tableau-1', 1).includes('tableau-2'));
  // 9C (black) onto 10C (black): same color -> illegal
  assert.ok(!legalTargets(KLONDIKE_DRAW1, s, 'tableau-1', 1).includes('tableau-3'));
  // KS onto empty pile: king-only base -> legal
  assert.ok(legalTargets(KLONDIKE_DRAW1, s, 'tableau-0', 1).includes('tableau-4'));
  // 9C onto empty pile: not a king -> illegal
  assert.ok(!legalTargets(KLONDIKE_DRAW1, s, 'tableau-1', 1).includes('tableau-4'));
});

test('klondike foundationBuild: ace-only base, ascending same-suit thereafter', () => {
  const s = fixtureState(KLONDIKE_DRAW1, {
    'tableau-0': [card('H', 1)], // AH
    'tableau-1': [card('H', 2)], // 2H
    'foundation-0': [],
  });
  assert.ok(legalTargets(KLONDIKE_DRAW1, s, 'tableau-0', 1).includes('foundation-0')); // ace onto empty
  assert.ok(!legalTargets(KLONDIKE_DRAW1, s, 'tableau-1', 1).includes('foundation-0')); // 2 onto empty: illegal

  const s2 = fixtureState(KLONDIKE_DRAW1, {
    'foundation-0': [card('H', 1)],
    'tableau-0': [card('H', 2)], // correct suit, next rank
    'tableau-1': [card('D', 2)], // wrong suit
    'tableau-2': [card('H', 3)], // right suit, wrong rank
  });
  assert.ok(legalTargets(KLONDIKE_DRAW1, s2, 'tableau-0', 1).includes('foundation-0'));
  assert.ok(!legalTargets(KLONDIKE_DRAW1, s2, 'tableau-1', 1).includes('foundation-0'));
  assert.ok(!legalTargets(KLONDIKE_DRAW1, s2, 'tableau-2', 1).includes('foundation-0'));
});

test('klondike any-legal-run: a valid 2-run moves as a group; an invalid run cannot', () => {
  const valid = fixtureState(KLONDIKE_DRAW1, {
    'tableau-0': [card('H', 10), card('C', 9)], // 10H under 9C: descending, alternating -> valid run
    'tableau-1': [card('S', 11)], // JS (black) — 10H (red) may land on it
  });
  const targets = legalTargets(KLONDIKE_DRAW1, valid, 'tableau-0', 2);
  assert.ok(targets.includes('tableau-1'));

  const brokenRun = fixtureState(KLONDIKE_DRAW1, {
    'tableau-0': [card('H', 10), card('C', 8)], // not consecutive: not a valid run
    'tableau-1': [card('S', 11)],
  });
  assert.deepEqual(legalTargets(KLONDIKE_DRAW1, brokenRun, 'tableau-0', 2), []);
});

test('klondike draw3 draws min(3, stock.length) face-up cards onto waste, in order', () => {
  const s = dealTable('draw3-seed', KLONDIKE_DRAW3);
  const stockBefore = s.piles['stock']!.length;
  const drawn = drawFromStock(KLONDIKE_DRAW3, s);
  assert.equal(drawn.piles['waste']!.length, Math.min(3, stockBefore));
  assert.ok(drawn.piles['waste']!.every((c) => c.faceUp));
  assert.equal(drawn.piles['stock']!.length, stockBefore - drawn.piles['waste']!.length);
});

test('klondike redeal recycles waste back to stock face down and respects the limit', () => {
  let s = fixtureState(KLONDIKE_DRAW1, { stock: [], waste: [card('H', 1), card('S', 5)] });
  s = redealStock(KLONDIKE_DRAW1, s);
  assert.equal(s.piles['waste']!.length, 0);
  assert.equal(s.piles['stock']!.length, 2);
  assert.ok(s.piles['stock']!.every((c) => !c.faceUp));
  assert.equal(s.redealsUsed, 1);

  const limited: VariantSpec = { ...KLONDIKE_DRAW1, redeal: { stockRecycles: 1 } };
  const t = fixtureState(limited, { stock: [], waste: [card('H', 1)] });
  const afterOneRedeal = redealStock(limited, t); // redealsUsed: 0 -> 1, at the limit
  // simulate having drawn the (now-recycled) stock back out to waste, to make a second redeal legal-shaped
  const readyForAnother = { ...afterOneRedeal, piles: { ...afterOneRedeal.piles, stock: [], waste: afterOneRedeal.piles['stock']! } };
  assert.throws(() => redealStock(limited, readyForAnother), /redeal limit reached/);
});

test('freecell tableauBuild: empty-accepts-any (unlike klondike\'s king-only)', () => {
  const s = fixtureState(FREECELL, { 'tableau-0': [card('D', 5)], 'tableau-1': [] });
  assert.ok(legalTargets(FREECELL, s, 'tableau-0', 1).includes('tableau-1'));
});

test('freecell supermove: capacity is (empty freecells + 1) x (empty tableau columns + 1)', () => {
  // FreeCell has 8 tableau columns (tableau-0..7) — every column not deliberately left empty must
  // be filled with a filler card, or it would silently count as a spare empty column and inflate
  // the cap past what the test name claims to be checking.
  const filler = (rank: number) => [card('C', rank)];

  // 1 empty freecell, 1 empty tableau column besides the destination -> cap = 2*2 = 4
  const roomy = fixtureState(FREECELL, {
    'tableau-0': [card('S', 8), card('H', 7), card('S', 6)], // valid 3-run
    'tableau-1': [card('D', 9)], // accepts the 8S head
    'tableau-2': [], // the one spare empty column
    'tableau-3': filler(11),
    'tableau-4': filler(12),
    'tableau-5': filler(13),
    'tableau-6': filler(10),
    'tableau-7': filler(9),
    'freecell-0': [],
    'freecell-1': [card('D', 2)],
    'freecell-2': [card('D', 3)],
    'freecell-3': [card('D', 4)],
  });
  assert.ok(legalTargets(FREECELL, roomy, 'tableau-0', 3).includes('tableau-1'));

  // 0 empty freecells, 0 empty tableau columns besides destination -> cap = 1*1 = 1: only single-card moves
  const cramped = fixtureState(FREECELL, {
    'tableau-0': [card('S', 8), card('H', 7)], // valid 2-run: head of the pair is 8S, lone top is 7H
    'tableau-1': [card('D', 9)], // accepts the 2-run's head (8S)
    'tableau-2': [card('C', 8)], // black 8: accepts the lone top card (red 7H) for the single-card check below
    'tableau-3': filler(11),
    'tableau-4': filler(12),
    'tableau-5': filler(13),
    'tableau-6': filler(10),
    'tableau-7': filler(9),
    'freecell-0': [card('D', 3)],
    'freecell-1': [card('D', 4)],
    'freecell-2': [card('D', 5)],
    'freecell-3': [card('D', 6)],
  });
  assert.ok(!legalTargets(FREECELL, cramped, 'tableau-0', 2).includes('tableau-1'));
  assert.ok(legalTargets(FREECELL, cramped, 'tableau-0', 1).includes('tableau-2')); // single card still fine
});

test('freecell: freecell pile accepts a single card only while empty', () => {
  const s = fixtureState(FREECELL, { 'tableau-0': [card('D', 5)], 'freecell-0': [], 'freecell-1': [card('S', 2)] });
  assert.ok(legalTargets(FREECELL, s, 'tableau-0', 1).includes('freecell-0'));
  assert.ok(!legalTargets(FREECELL, s, 'tableau-0', 1).includes('freecell-1'));
});

for (const spiderVariant of [SPIDER_1SUIT, SPIDER_2SUIT, SPIDER_4SUIT]) {
  test(`${spiderVariant.id}: tableauBuild ignores suit/color, only rank matters for a single drop`, () => {
    const s = fixtureState(spiderVariant, {
      'tableau-0': [card('H', 10)],
      'tableau-1': [card('S', 9)], // black 9 onto red 10: fine, spider doesn't care about color
      'tableau-2': [card('H', 9)], // same suit as target too: also fine
    });
    assert.ok(legalTargets(spiderVariant, s, 'tableau-1', 1).includes('tableau-0'));
    assert.ok(legalTargets(spiderVariant, s, 'tableau-2', 1).includes('tableau-0'));
  });

  test(`${spiderVariant.id}: runBuild requires same-suit for a group pickup, stricter than tableauBuild`, () => {
    const sameSuit = fixtureState(spiderVariant, {
      'tableau-0': [card('S', 10), card('S', 9)], // same-suit descending: valid group
      'tableau-1': [card('H', 11)], // any suit accepts the rank-10 head
    });
    assert.ok(legalTargets(spiderVariant, sameSuit, 'tableau-0', 2).includes('tableau-1'));

    const mixedSuit = fixtureState(spiderVariant, {
      'tableau-0': [card('S', 10), card('H', 9)], // descending but NOT same suit: invalid group
      'tableau-1': [card('H', 11)], // rank 11: would accept a rank-10 head (the 2-card case)
      'tableau-2': [card('D', 10)], // rank 10: accepts the lone top card (9H) directly
    });
    assert.deepEqual(legalTargets(spiderVariant, mixedSuit, 'tableau-0', 2), []);
    // the lone top card is still a legal single-card move, though:
    assert.ok(legalTargets(spiderVariant, mixedSuit, 'tableau-0', 1).includes('tableau-2'));
  });

  test(`${spiderVariant.id}: foundation piles are never a manual move target`, () => {
    const s = fixtureState(spiderVariant, { 'tableau-0': [card('S', 13)], 'foundation-0': [] });
    assert.ok(!legalTargets(spiderVariant, s, 'tableau-0', 1).includes('foundation-0'));
  });
}

test('spider: a completed K..A same-suit run auto-clears to a foundation pile as a side effect of any move', () => {
  const ranksDescending = Array.from({ length: 13 }, (_, i) => card('S', 13 - i));
  const s = fixtureState(SPIDER_1SUIT, {
    'tableau-0': ranksDescending, // K,Q,J,...,A of spades, already a complete valid run
    'tableau-1': [card('S', 5)],
    'tableau-2': [], // empty, accepts anything
  });
  const after = applyMove(SPIDER_1SUIT, s, { from: 'tableau-1', to: 'tableau-2', count: 1 });
  assert.equal(after.piles['tableau-0']!.length, 0);
  const foundationLens = SPIDER_1SUIT.piles.filter((p) => p.kind === 'foundation').map((p) => after.piles[p.id]!.length);
  assert.ok(foundationLens.includes(13));
});

test('spider: dealing a row is illegal while any tableau pile is empty', () => {
  const s = fixtureState(SPIDER_4SUIT, {
    stock: Array.from({ length: 20 }, () => card('C', 5, false)),
    ...Object.fromEntries(SPIDER_4SUIT.dealOrder.slice(1).map((id) => [id, [card('C', 5)]])),
    // dealOrder[0] left empty on purpose
  });
  assert.throws(() => drawFromStock(SPIDER_4SUIT, s), /tableau pile is empty/);
});

// -------------------------------------------------------------------------------------------
// Yukon: dealt shape, any-faceup-group movement, full-completion via autoFinish
// -------------------------------------------------------------------------------------------

test('yukon deal shape: pile i has i face-down cards under 5 face-up (pile 0: 1 face-up, none down)', () => {
  const s = dealTable('yukon-shape-seed', YUKON);
  for (let i = 0; i < 7; i++) {
    const pile = s.piles[`tableau-${i}`]!;
    const expectedDown = i === 0 ? 0 : i;
    const expectedUp = i === 0 ? 1 : 5;
    assert.equal(pile.length, expectedDown + expectedUp, `tableau-${i}: total count`);
    assert.equal(pile.filter((c) => c.faceUp).length, expectedUp, `tableau-${i}: face-up count`);
  }
  assert.equal(s.piles['stock'], undefined); // Yukon has no stock pile at all
});

test('yukon any-faceup-group: an out-of-order face-up clump still moves together as one group', () => {
  const s = fixtureState(YUKON, {
    // 8S then 2D on top: NOT a valid descending-alternating run, but both are face up.
    'tableau-0': [card('S', 8), card('D', 2)],
    'tableau-1': [card('H', 9)], // red 9: accepts the group's bottom card (8S, black)
  });
  const targets = legalTargets(YUKON, s, 'tableau-0', 2);
  assert.ok(targets.includes('tableau-1'));
  const after = applyMove(YUKON, s, { from: 'tableau-0', to: 'tableau-1', count: 2 });
  assert.deepEqual(
    after.piles['tableau-1']!.map((c) => `${c.rank}${c.suit}`),
    ['9H', '8S', '2D'],
  );
});

test('yukon: a face-down card can never be part of a moved group, even with faceup-group movement', () => {
  const s = fixtureState(YUKON, {
    'tableau-0': [card('S', 8, false), card('D', 2)], // bottom card is face down
    'tableau-1': [card('H', 9)], // would accept an 8-headed group, but not the buried 8S
    'tableau-2': [card('S', 3)], // 2D (red) descends from black 3S: a legal single-card target
  });
  assert.deepEqual(legalTargets(YUKON, s, 'tableau-0', 2), []); // would require moving the face-down 8S too
  assert.ok(legalTargets(YUKON, s, 'tableau-0', 1).includes('tableau-2')); // the lone face-up 2D moves fine on its own
});

test('yukon: autoFinishSequence reaches all-foundations-full from a near-complete board (reuses Klondike-shaped foundations)', () => {
  const s = fixtureState(YUKON, {
    'foundation-0': foundationRun('C', 13),
    'foundation-1': foundationRun('S', 13),
    'foundation-2': foundationRun('D', 11),
    'foundation-3': foundationRun('H', 11),
    'tableau-0': [card('D', 12)],
    'tableau-1': [card('D', 13)],
    'tableau-2': [card('H', 12)],
    'tableau-3': [card('H', 13)],
  });
  assert.ok(autoFinishAvailable(YUKON, s));
  const finished = autoFinishSequence(YUKON, s);
  assert.ok(checkWin(YUKON, finished));
});

// -------------------------------------------------------------------------------------------
// Forty Thieves: deal shape, strict same-suit tableau build, full completion
// -------------------------------------------------------------------------------------------

test('forty-thieves deal shape: 10 columns of 4 face-up cards, 8 foundations, 64 cards left in stock', () => {
  const s = dealTable('forty-thieves-shape-seed', FORTY_THIEVES);
  for (let i = 0; i < 10; i++) {
    const pile = s.piles[`tableau-${i}`]!;
    assert.equal(pile.length, 4, `tableau-${i}: count`);
    assert.ok(pile.every((c) => c.faceUp), `tableau-${i}: all face up`);
  }
  assert.equal(s.piles['stock']!.length, 64);
  assert.equal(FORTY_THIEVES.piles.filter((p) => p.kind === 'foundation').length, 8);
});

test('forty-thieves tableauBuild: descending SAME-SUIT (not alternating color, unlike Klondike/Yukon)', () => {
  const s = fixtureState(FORTY_THIEVES, {
    'tableau-0': [card('H', 9)], // 9H
    'tableau-1': [card('D', 8)], // 8D: red, same rank-fit but wrong suit
    'tableau-2': [card('H', 8)], // 8H: same suit as 9H -> legal
  });
  assert.ok(!legalTargets(FORTY_THIEVES, s, 'tableau-1', 1).includes('tableau-0'));
  assert.ok(legalTargets(FORTY_THIEVES, s, 'tableau-2', 1).includes('tableau-0'));
});

test('forty-thieves: a scripted sequence completes all eight foundations and wins', () => {
  const foundationSpecs = FORTY_THIEVES.piles.filter((p) => p.kind === 'foundation');
  const suits: Suit[] = ['C', 'D', 'H', 'S'];
  const pileCards: Record<string, Card[]> = {};
  foundationSpecs.forEach((p, i) => {
    pileCards[p.id] = foundationRun(suits[i % 4]!, 12); // ace..queen; king still on the board
  });
  foundationSpecs.forEach((_p, i) => {
    pileCards[`tableau-${i}`] = [card(suits[i % 4]!, 13)];
  });
  let s = fixtureState(FORTY_THIEVES, pileCards);
  assert.ok(!checkWin(FORTY_THIEVES, s));
  for (let i = 0; i < foundationSpecs.length; i++) {
    s = applyMove(FORTY_THIEVES, s, { from: `tableau-${i}`, to: foundationSpecs[i]!.id, count: 1 });
  }
  assert.ok(checkWin(FORTY_THIEVES, s));
});

// -------------------------------------------------------------------------------------------
// Golf: never-a-target tableau, adjacent-rank waste play, tableau-cleared win
// -------------------------------------------------------------------------------------------

test('golf deal shape: 7 columns of 5 face-up cards, a 1-card waste starter, 16 cards left in stock', () => {
  const s = dealTable('golf-shape-seed', GOLF);
  for (let i = 0; i < 7; i++) {
    const pile = s.piles[`tableau-${i}`]!;
    assert.equal(pile.length, 5, `tableau-${i}: count`);
    assert.ok(pile.every((c) => c.faceUp), `tableau-${i}: all face up`);
  }
  assert.equal(s.piles['waste']!.length, 1);
  assert.ok(s.piles['waste']![0]!.faceUp);
  assert.equal(s.piles['stock']!.length, 16);
});

test('golf tableauBuild is order: "none" — a tableau column never accepts a drop, even a rank-adjacent one', () => {
  const s = fixtureState(GOLF, {
    'tableau-0': [card('H', 6)],
    'tableau-1': [card('S', 5)], // rank-adjacent to 6H and would be legal on a waste-shaped pile
    waste: [card('C', 11)], // present but rank-mismatched, so the only thing under test is tableau-0
  });
  assert.ok(!legalTargets(GOLF, s, 'tableau-1', 1).includes('tableau-0'));
});

test('golf foundationBuild ("adjacent" on the waste pile): one rank away in EITHER direction, no wraparound', () => {
  const s = fixtureState(GOLF, {
    waste: [card('H', 6)],
    'tableau-0': [card('S', 5)], // one below: legal
    'tableau-1': [card('D', 7)], // one above: legal
    'tableau-2': [card('C', 8)], // two away: illegal
    'tableau-3': [card('H', 6)], // same rank: illegal
  });
  assert.ok(legalTargets(GOLF, s, 'tableau-0', 1).includes('waste'));
  assert.ok(legalTargets(GOLF, s, 'tableau-1', 1).includes('waste'));
  assert.ok(!legalTargets(GOLF, s, 'tableau-2', 1).includes('waste'));
  assert.ok(!legalTargets(GOLF, s, 'tableau-3', 1).includes('waste'));
  const wrap = fixtureState(GOLF, { waste: [card('S', 13)], 'tableau-0': [card('D', 1)] }); // King then Ace: no wraparound
  assert.ok(!legalTargets(GOLF, wrap, 'tableau-0', 1).includes('waste'));
});

test('golf: checkWin ("tableau-cleared") ignores stock/waste contents entirely', () => {
  const s = fixtureState(GOLF, {
    waste: [card('H', 5)],
    stock: [card('C', 2, false), card('D', 3, false)], // cards still sitting in the stock
  });
  assert.ok(checkWin(GOLF, s)); // every tableau-* pile is empty (unspecified -> [])
});

test('golf: a scripted sequence clears the tableau and wins', () => {
  const s = fixtureState(GOLF, {
    waste: [card('H', 5)],
    'tableau-0': [card('S', 6)], // adjacent to waste top (5): legal
    'tableau-1': [card('D', 7)], // adjacent to the new waste top (6): legal
  });
  assert.ok(!checkWin(GOLF, s));
  let cur = applyMove(GOLF, s, { from: 'tableau-0', to: 'waste', count: 1 });
  cur = applyMove(GOLF, cur, { from: 'tableau-1', to: 'waste', count: 1 });
  assert.ok(checkWin(GOLF, cur));
});

// -------------------------------------------------------------------------------------------
// TriPeaks: blockedBy exposure gating, adjacent-rank waste play, tableau-cleared win
// -------------------------------------------------------------------------------------------

test('tripeaks deal shape: 28 pyramid piles + 1 waste starter dealt face up, 23 cards left in stock', () => {
  const s = dealTable('tripeaks-shape-seed', TRIPEAKS);
  const pyramidIds = TRIPEAKS.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
  assert.equal(pyramidIds.length, 28);
  for (const id of pyramidIds) {
    assert.equal(s.piles[id]!.length, 1, `${id}: exactly one card`);
    assert.ok(s.piles[id]![0]!.faceUp, `${id}: dealt face up`);
  }
  assert.equal(s.piles['waste']!.length, 1);
  assert.equal(s.piles['stock']!.length, 23);
});

test('tripeaks blockedBy: a peak apex is exposed only once BOTH cards under it are cleared', () => {
  const s = fixtureState(TRIPEAKS, {
    waste: [card('D', 8)], // adjacent to 9C, the card covering the apex
    'peak0-0': [card('S', 10)], // the apex: adjacent to 9 (the waste top once 9C is played), not to 8
    'peak0-1-0': [card('C', 9)], // still covering the apex
    'peak0-1-1': [], // this half already cleared
  });
  assert.deepEqual(legalTargets(TRIPEAKS, s, 'peak0-0', 1), []); // blocked: peak0-1-0 still has a card
  const afterClear = applyMove(TRIPEAKS, s, { from: 'peak0-1-0', to: 'waste', count: 1 }); // legal: 9C is adjacent to waste-top 8D
  assert.deepEqual(s.piles['peak0-1-0'], [card('C', 9)]); // applyMove is pure: the original state is untouched
  assert.ok(legalTargets(TRIPEAKS, afterClear, 'peak0-0', 1).includes('waste')); // both blockers now empty, and 10 is adjacent to the new waste top (9)
});

test('tripeaks foundationBuild ("adjacent" on the waste pile) behaves exactly like Golf\'s', () => {
  const s = fixtureState(TRIPEAKS, { waste: [card('H', 6)], 'base-0': [card('S', 7)], 'base-1': [card('D', 9)] });
  assert.ok(legalTargets(TRIPEAKS, s, 'base-0', 1).includes('waste'));
  assert.ok(!legalTargets(TRIPEAKS, s, 'base-1', 1).includes('waste'));
});

test('tripeaks: a scripted sequence clears the tableau and wins', () => {
  const s = fixtureState(TRIPEAKS, {
    waste: [card('C', 5)],
    'base-0': [card('H', 6)], // adjacent to 5: legal
    'base-1': [card('D', 7)], // adjacent to the new waste top (6): legal
  });
  assert.ok(!checkWin(TRIPEAKS, s));
  let cur = applyMove(TRIPEAKS, s, { from: 'base-0', to: 'waste', count: 1 });
  cur = applyMove(TRIPEAKS, cur, { from: 'base-1', to: 'waste', count: 1 });
  assert.ok(checkWin(TRIPEAKS, cur)); // every OTHER pyramid pile is empty by fixtureState's default
});

// -------------------------------------------------------------------------------------------
// Pyramid: blockedBy exposure gating, sum-to-13 waste-anchored pairing, tableau-cleared win
// -------------------------------------------------------------------------------------------

test('pyramid deal shape: 28 triangle piles dealt face up (row 0: 1 card ... row 6: 7 cards), waste starts empty, 24 cards left in stock', () => {
  const s = dealTable('pyramid-shape-seed', PYRAMID);
  const pyramidIds = PYRAMID.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
  assert.equal(pyramidIds.length, 28);
  for (const id of pyramidIds) {
    assert.equal(s.piles[id]!.length, 1, `${id}: exactly one card`);
    assert.ok(s.piles[id]![0]!.faceUp, `${id}: dealt face up`);
  }
  assert.equal(s.piles['waste']!.length, 0);
  assert.equal(s.piles['stock']!.length, 24);
});

test('pyramid blockedBy: row-0 apex exposed only once both row-1 cards beneath it are cleared', () => {
  const s = fixtureState(PYRAMID, {
    waste: [card('H', 6)],
    'pyr-0-0': [card('S', 7)], // apex: 6+7=13, would be a legal pair once exposed
    'pyr-1-0': [card('C', 4)],
    'pyr-1-1': [card('D', 9)], // 6+9 != 13, but presence alone (not legality) is what blocks the apex
  });
  assert.deepEqual(legalTargets(PYRAMID, s, 'pyr-0-0', 1), []);
});

test('pyramid foundationBuild ("sum-to-13"): a pair sums to 13, or a King is discarded alone regardless of the waste top', () => {
  const s = fixtureState(PYRAMID, {
    waste: [card('H', 4)],
    'pyr-6-0': [card('S', 9)], // 4+9=13: legal
    'pyr-6-1': [card('D', 8)], // 4+8=12: illegal
    'pyr-6-2': [card('C', 13)], // King: always legal, regardless of the waste top
  });
  assert.ok(legalTargets(PYRAMID, s, 'pyr-6-0', 1).includes('waste'));
  assert.ok(!legalTargets(PYRAMID, s, 'pyr-6-1', 1).includes('waste'));
  assert.ok(legalTargets(PYRAMID, s, 'pyr-6-2', 1).includes('waste'));
});

test('pyramid: a non-King card cannot be discarded to an empty waste (nothing to pair with yet)', () => {
  const s = fixtureState(PYRAMID, { 'pyr-6-0': [card('S', 9)] }); // waste unspecified -> empty
  assert.deepEqual(legalTargets(PYRAMID, s, 'pyr-6-0', 1), []);
  const withKing = fixtureState(PYRAMID, { 'pyr-6-0': [card('S', 13)] });
  assert.ok(legalTargets(PYRAMID, withKing, 'pyr-6-0', 1).includes('waste')); // Kings are the one exception
});

test('pyramid: a scripted sequence clears the tableau and wins', () => {
  const s = fixtureState(PYRAMID, {
    waste: [card('C', 4)],
    'pyr-6-0': [card('H', 9)], // 4+9=13: legal pair
    'pyr-6-1': [card('D', 13)], // King: removable alone regardless of the (now different) waste top
  });
  assert.ok(!checkWin(PYRAMID, s));
  let cur = applyMove(PYRAMID, s, { from: 'pyr-6-0', to: 'waste', count: 1 });
  cur = applyMove(PYRAMID, cur, { from: 'pyr-6-1', to: 'waste', count: 1 });
  assert.ok(checkWin(PYRAMID, cur));
});

// -------------------------------------------------------------------------------------------
// undo/redo and replay
// -------------------------------------------------------------------------------------------

test('undo/redo round-trips to the identical state at every log position', () => {
  let s = dealTable('undo-redo-seed', KLONDIKE_DRAW1);
  s = drawFromStock(KLONDIKE_DRAW1, s);
  s = drawFromStock(KLONDIKE_DRAW1, s);
  const fullyForward = s;
  let undone = fullyForward;
  const pilesAtEachCursor: unknown[] = [];
  for (let i = fullyForward.cursor; i >= 0; i--) {
    pilesAtEachCursor.unshift(undone.piles);
    if (i > 0) undone = undo(KLONDIKE_DRAW1, undone);
  }
  // walk forward with redo and confirm we retrace the exact same sequence of states
  let redone = undone;
  for (let i = 0; i < pilesAtEachCursor.length; i++) {
    assert.deepEqual(redone.piles, pilesAtEachCursor[i]);
    redone = redo(KLONDIKE_DRAW1, redone);
  }
  assert.deepEqual(redone.piles, fullyForward.piles);
});

test('undo past seq=0 and redo past the log tip are no-ops, not errors', () => {
  let s = dealTable('undo-edge-seed', KLONDIKE_DRAW1);
  s = drawFromStock(KLONDIKE_DRAW1, s);
  const atStart = undo(KLONDIKE_DRAW1, { ...s, cursor: 0, log: s.log });
  assert.equal(atStart.cursor, 0);
  const stillAtStart = undo(KLONDIKE_DRAW1, atStart);
  assert.deepEqual(stillAtStart, atStart);

  const atTip = s;
  const stillAtTip = redo(KLONDIKE_DRAW1, atTip);
  assert.deepEqual(stillAtTip, atTip);
});

test('a new move played after an undo truncates the redo tail rather than branching', () => {
  let s = dealTable('truncate-seed', KLONDIKE_DRAW1);
  s = drawFromStock(KLONDIKE_DRAW1, s); // seq 0
  s = drawFromStock(KLONDIKE_DRAW1, s); // seq 1
  s = undo(KLONDIKE_DRAW1, s); // cursor back to 1, log still has 2 entries (redo available)
  assert.equal(s.cursor, 1);
  assert.equal(s.log.length, 2);
  s = drawFromStock(KLONDIKE_DRAW1, s); // a fresh move: must truncate the old seq-1 entry
  assert.equal(s.log.length, 2);
  assert.equal(s.cursor, 2);
  // redo is now a no-op: the old branch is gone
  const afterRedo = redo(KLONDIKE_DRAW1, s);
  assert.deepEqual(afterRedo, s);
});

test('replay(seed, variant, log) reproduces the exact final state a live session ended in', () => {
  let s = dealTable('replay-seed', KLONDIKE_DRAW1);
  s = drawFromStock(KLONDIKE_DRAW1, s);
  s = drawFromStock(KLONDIKE_DRAW1, s);
  const target = legalTargets(KLONDIKE_DRAW1, s, 'waste', 1);
  if (target.length > 0) {
    s = applyMove(KLONDIKE_DRAW1, s, { from: 'waste', to: target[0]!, count: 1 });
  }
  const replayed = replay('replay-seed', KLONDIKE_DRAW1, s.log);
  assert.deepEqual(replayed.piles, s.piles);
  assert.equal(replayed.cursor, s.cursor);
});

// -------------------------------------------------------------------------------------------
// auto-finish
// -------------------------------------------------------------------------------------------

function foundationRun(suit: Suit, uptoRank: number): Card[] {
  return Array.from({ length: uptoRank }, (_, i) => card(suit, i + 1));
}

test('autoFinishAvailable is true once no face-down cards remain and every remaining card is safe', () => {
  const s = fixtureState(KLONDIKE_DRAW1, {
    'foundation-0': foundationRun('C', 13),
    'foundation-1': foundationRun('S', 13),
    'foundation-2': foundationRun('D', 11),
    'foundation-3': foundationRun('H', 11),
    'tableau-0': [card('D', 12)],
    'tableau-1': [card('D', 13)],
    'tableau-2': [card('H', 12)],
    'tableau-3': [card('H', 13)],
  });
  assert.ok(autoFinishAvailable(KLONDIKE_DRAW1, s));
  const finished = autoFinishSequence(KLONDIKE_DRAW1, s);
  assert.ok(checkWin(KLONDIKE_DRAW1, finished));
  // every move played was an ordinary logged move, not a special jump
  assert.ok(finished.log.every((e) => e.kind === 'move'));
});

test('autoFinishAvailable is false while any card is still face down, regardless of ranks', () => {
  const s = fixtureState(KLONDIKE_DRAW1, {
    'foundation-0': foundationRun('C', 13),
    'foundation-1': foundationRun('S', 13),
    'foundation-2': foundationRun('D', 13),
    'tableau-0': [card('H', 1, false)], // face down
  });
  assert.ok(!autoFinishAvailable(KLONDIKE_DRAW1, s));
});

test('autoFinishAvailable is false when a remaining card is not yet safe (just below threshold)', () => {
  // Opposite suits of H are C,S; both only at rank 2, so a 6H is not yet safe to send home.
  const s = fixtureState(KLONDIKE_DRAW1, {
    'foundation-0': foundationRun('C', 2),
    'foundation-1': foundationRun('S', 2),
    'tableau-0': [card('H', 6)],
  });
  assert.ok(!autoFinishAvailable(KLONDIKE_DRAW1, s));
});

test('autoFinishAvailable is false for spider variants (no manual foundation autoplay concept)', () => {
  const s = fixtureState(SPIDER_1SUIT, { 'tableau-0': [card('S', 1)] });
  assert.ok(!autoFinishAvailable(SPIDER_1SUIT, s));
});

// -------------------------------------------------------------------------------------------
// full random-playout fuzz: 1000 random legal moves per variant never corrupt state
// -------------------------------------------------------------------------------------------

interface Action {
  readonly kind: 'move' | 'draw' | 'redeal';
  readonly move?: Move;
}

function collectActions(variant: VariantSpec, s: GameState): Action[] {
  const actions: Action[] = [];
  for (const p of variant.piles) {
    const pile = s.piles[p.id] ?? [];
    for (let count = 1; count <= pile.length; count++) {
      for (const to of legalTargets(variant, s, p.id, count)) {
        actions.push({ kind: 'move', move: { from: p.id, to, count } });
      }
    }
  }
  const hasWaste = variant.piles.some((p) => p.kind === 'waste');
  const hasStock = variant.piles.some((p) => p.kind === 'stock');
  if (hasStock && (s.piles['stock']?.length ?? 0) > 0) {
    if (!hasWaste) {
      // spider deal-row also needs no empty tableau pile; only offer it when legal
      const tableauIds = variant.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
      const stockLen = s.piles['stock']!.length;
      if (stockLen >= tableauIds.length && tableauIds.every((id) => (s.piles[id]?.length ?? 0) > 0)) {
        actions.push({ kind: 'draw' });
      }
    } else {
      actions.push({ kind: 'draw' });
    }
  }
  if (variant.redeal && (s.piles['stock']?.length ?? 0) === 0 && (s.piles['waste']?.length ?? 0) > 0) {
    if (variant.redeal.stockRecycles === 'unlimited' || s.redealsUsed < variant.redeal.stockRecycles) {
      actions.push({ kind: 'redeal' });
    }
  }
  return actions;
}

for (const v of VARIANT_LIST) {
  test(`${v.id}: 1000 random legal moves never corrupt state`, () => {
    const rng = rngFrom(0x5eed0000 + v.id.length);
    let s = dealTable(`fuzz-${v.id}`, v);
    const expectedTotal = v.decks * 52;
    let steps = 0;
    for (; steps < 1000; steps++) {
      const actions = collectActions(v, s);
      if (actions.length === 0) break; // stuck deal — not a failure, just nothing left to do
      const chosen = actions[rng.int(0, actions.length - 1)]!;
      s =
        chosen.kind === 'move'
          ? applyMove(v, s, chosen.move!)
          : chosen.kind === 'draw'
            ? drawFromStock(v, s)
            : redealStock(v, s);

      const total = Object.values(s.piles).reduce((sum, p) => sum + p.length, 0);
      assert.equal(total, expectedTotal, `${v.id}: card count changed after a move (step ${steps})`);
      assert.equal(s.cursor, s.log.length, `${v.id}: cursor/log length diverged mid-playout (step ${steps})`);
      if (checkWin(v, s)) break; // nothing left to legally do once won
    }
    assert.ok(steps > 0, `${v.id}: fuzz driver made zero moves — collectActions is likely broken`);
  });
}

test('applyMove is pure: identical arguments give byte-identical states (house rule: no wall clock in domain logic)', async () => {
  const s = dealTable('purity-seed', KLONDIKE_DRAW1);
  const drawn = drawFromStock(KLONDIKE_DRAW1, s);
  // find any legal move from the dealt position
  let move: Move | undefined;
  for (const [pileId, pile] of Object.entries(drawn.piles)) {
    if (pile.length === 0) continue;
    const targets = legalTargets(KLONDIKE_DRAW1, drawn, pileId, 1);
    if (targets.length > 0) {
      move = { from: pileId, to: targets[0]!, count: 1 };
      break;
    }
  }
  assert.ok(move, 'expected at least one legal move from a fresh deal');
  const a = applyMove(KLONDIKE_DRAW1, drawn, move!);
  await new Promise((r) => setTimeout(r, 15));
  const b = applyMove(KLONDIKE_DRAW1, drawn, move!);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
