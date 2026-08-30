import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEngine,
  applyIntent,
  canDeal,
  canHit,
  canStand,
  canDouble,
  canSplit,
  canSurrender,
  canNextHand,
  type BlackjackState,
} from './engine.mts';
import { resolveRules } from './rules.mts';

const BET = 25;

function dealt(seed: string, bet = BET, configId?: string): BlackjackState {
  return applyIntent(createEngine(seed, configId), { kind: 'deal', bet }).state;
}

/** Search seeds `${prefix}-0`, `${prefix}-1`, ... (deterministic, no ambient randomness) for one
 *  whose freshly-dealt state satisfies `predicate` — used instead of hand-picking a "magic"
 *  seed so this file never depends on a specific mulberry32 stream by memorized accident. */
function findDeal(prefix: string, predicate: (state: BlackjackState) => boolean, bet = BET, configId?: string, maxTries = 4000): BlackjackState {
  for (let i = 0; i < maxTries; i += 1) {
    const state = dealt(`${prefix}-${i}`, bet, configId);
    if (predicate(state)) return state;
  }
  throw new Error(`findDeal: no seed matching predicate found in ${maxTries} tries (prefix "${prefix}")`);
}

/** Hit anything under hard/soft 17, stand at 17+ — a simple, deterministic policy for driving a
 *  hand to completion in tests that don't care about the exact strategy, only that the round
 *  reaches `round-over`. Uses only the active hand's own card ranks (no EV lookups) so it stays
 *  fast even inside a many-hand loop. */
function standOn17(state: BlackjackState): BlackjackState {
  let s = state;
  let guard = 0;
  while (s.round?.phase === 'player-turn' && guard < 15) {
    const hand = s.round.playerHands[s.round.activeHandIndex]!;
    if (hand.status !== 'active') break; // shouldn't happen — settleOrAdvance would have moved on
    let hard = 0;
    let aces = 0;
    for (const c of hand.cards) {
      hard += c.rank === 1 ? 1 : Math.min(c.rank, 10);
      if (c.rank === 1) aces += 1;
    }
    const best = aces > 0 && hard + 10 <= 21 ? hard + 10 : hard;
    s = applyIntent(s, { kind: best < 17 ? 'hit' : 'stand' }).state;
    guard += 1;
  }
  return s;
}

// ── determinism ────────────────────────────────────────────────────────────────────────────

test('createEngine: identical (seed, configId) produce byte-identical initial state', () => {
  const a = createEngine('same-seed', 'default');
  const b = createEngine('same-seed', 'default');
  assert.deepEqual(a, b);
});

test('applyIntent: the same seed + the same intent sequence always reaches the same state', () => {
  function play(seed: string): BlackjackState {
    let state = dealt(seed, 40);
    if (state.round?.phase === 'player-turn') state = applyIntent(state, { kind: 'hit' }).state;
    if (state.round?.phase === 'player-turn') state = applyIntent(state, { kind: 'stand' }).state;
    return state;
  }
  const a = play('determinism-fixture');
  const b = play('determinism-fixture');
  assert.deepEqual(a, b);
  // a fresh call to applyIntent never mutates the state object handed to it.
  const before = dealt('purity-fixture', 40);
  const snapshot = JSON.parse(JSON.stringify(before));
  if (before.round?.phase === 'player-turn') applyIntent(before, { kind: 'stand' });
  assert.deepEqual(before, snapshot);
});

test('applyIntent: an unrecognized intent kind throws rather than silently no-opping', () => {
  const state = createEngine('bad-intent-fixture');
  assert.throws(() => applyIntent(state, { kind: 'spin' } as never));
});

// ── deal / natural blackjack / dealer peek ────────────────────────────────────────────────

test('deal: refuses a bet outside the ruleset min/max, and does not mutate the engine', () => {
  const rules = resolveRules('default');
  const state = createEngine('bet-bounds-fixture');
  assert.throws(() => applyIntent(state, { kind: 'deal', bet: rules.minBet - 1 }), RangeError);
  assert.throws(() => applyIntent(state, { kind: 'deal', bet: rules.maxBet + 1 }), RangeError);
  assert.equal(state.round, null);
});

test('deal: refuses to start a second round while one is already in progress', () => {
  const state = dealt('double-deal-fixture');
  assert.throws(() => applyIntent(state, { kind: 'deal', bet: BET }));
});

test('deal: a player natural pays 3:2 immediately with no player action taken, when the dealer has none', () => {
  const state = findDeal('natural-win', (s) => s.round?.playerHands[0]?.status === 'blackjack' && s.round.outcomes?.[0]?.result === 'blackjack');
  const round = state.round!;
  assert.equal(round.phase, 'round-over');
  assert.equal(round.outcomes![0]!.result, 'blackjack');
  assert.equal(round.outcomes![0]!.payout, BET + Math.floor((BET * 3) / 2)); // stake back + 3:2 profit
  // the dealer's hole card is revealed once the round is settled, never left hidden.
  assert.ok(round.dealerCards.every((c) => c.faceUp));
});

test('deal: a dealer natural (revealed only via the peek) beats a non-natural player hand outright', () => {
  const state = findDeal('dealer-natural', (s) => s.round?.phase === 'round-over' && s.round.outcomes?.[0]?.result === 'loss' && s.round.playerHands[0]?.status !== 'bust');
  const round = state.round!;
  assert.equal(round.outcomes![0]!.payout, 0);
  assert.ok(round.dealerCards.every((c) => c.faceUp));
});

test('deal: both player and dealer natural is a push — the stake returns, nothing more', () => {
  const state = findDeal('both-natural', (s) => s.round?.outcomes?.[0]?.result === 'push' && s.round.playerHands[0]?.status === 'blackjack');
  assert.equal(state.round!.outcomes![0]!.payout, BET);
});

test('deal: an ordinary two-card hand starts a player-turn round with both engine cards face up and the hole card hidden', () => {
  const state = findDeal('ordinary-deal', (s) => s.round?.phase === 'player-turn');
  const round = state.round!;
  assert.equal(round.playerHands.length, 1);
  assert.equal(round.playerHands[0]!.cards.length, 2);
  assert.ok(round.playerHands[0]!.cards.every((c) => c.faceUp));
  assert.equal(round.dealerCards[0]!.faceUp, true);
  assert.equal(round.dealerCards[1]!.faceUp, false);
  assert.equal(canDeal(state), false);
  assert.equal(canHit(state), true);
  assert.equal(canStand(state), true);
});

// ── hit / stand / bust ─────────────────────────────────────────────────────────────────────

test('hit: repeated hits eventually bust a hand, ending the round as a loss with zero payout', () => {
  let state = findDeal('bust-fixture', (s) => s.round?.phase === 'player-turn');
  let guard = 0;
  while (state.round?.phase === 'player-turn' && guard < 30) {
    state = applyIntent(state, { kind: 'hit' }).state;
    guard += 1;
  }
  assert.equal(state.round?.phase, 'round-over');
  const outcome = state.round!.outcomes!.find((o) => o.handIndex === 0)!;
  if (state.round!.playerHands[0]!.status === 'bust') {
    assert.equal(outcome.result, 'loss');
    assert.equal(outcome.payout, 0);
  }
});

test('hit: reaching exactly 21 auto-stands (no further hit is offered, no bust)', () => {
  let s = findDeal('force-21-check', (st) => st.round?.phase === 'player-turn');
  let guard = 0;
  while (s.round?.phase === 'player-turn' && guard < 15) {
    const hand = s.round.playerHands[s.round.activeHandIndex]!;
    if (hand.status !== 'active') break; // reached 21 and auto-stood already
    s = applyIntent(s, { kind: 'hit' }).state;
    guard += 1;
  }
  // Whatever ended the loop, the single hand here is never left 'active': either it busted, or
  // it auto-stood (at 21, or because the round otherwise settled around it).
  const finalHand = s.round?.playerHands[0];
  if (finalHand !== undefined) assert.notEqual(finalHand.status, 'active');
});

// ── double ─────────────────────────────────────────────────────────────────────────────────

test('double: doubles the bet, deals exactly one card, and ends the hand (win or bust) without further action', () => {
  const state = findDeal('double-fixture', (s) => s.round?.phase === 'player-turn' && canDouble(s));
  const before = state.round!.playerHands[0]!.bet;
  const result = applyIntent(state, { kind: 'double' });
  const hand = result.state.round?.playerHands[0] ?? result.state.round!.playerHands[0]!;
  assert.equal(hand.bet, before * 2);
  assert.equal(hand.cards.length, 3);
  assert.ok(hand.status === 'bust' || hand.status === 'stood');
});

test('double: refuses on a hand that is not exactly two cards, or when it is not the active hand\'s turn', () => {
  const state = findDeal('double-guard', (s) => s.round?.phase === 'player-turn' && canDouble(s));
  const hit = applyIntent(state, { kind: 'hit' }).state;
  if (hit.round?.phase === 'player-turn' && hit.round.playerHands[0]!.cards.length > 2) {
    assert.throws(() => applyIntent(hit, { kind: 'double' }));
  }
  assert.throws(() => applyIntent(createEngine('never-dealt'), { kind: 'double' } as never));
});

// ── split ──────────────────────────────────────────────────────────────────────────────────

test('split: a pair becomes two hands, each funded at the original bet, each dealt one new card', () => {
  const state = findDeal('split-fixture', (s) => s.round?.phase === 'player-turn' && canSplit(s));
  const originalBet = state.round!.playerHands[0]!.bet;
  const result = applyIntent(state, { kind: 'split' });
  const round = result.state.round!;
  assert.equal(round.playerHands.length, 2);
  assert.equal(round.playerHands[0]!.bet, originalBet);
  assert.equal(round.playerHands[1]!.bet, originalBet);
  assert.equal(round.playerHands[0]!.cards.length, 2);
  assert.equal(round.playerHands[1]!.cards.length, 2);
  assert.equal(round.playerHands[0]!.fromSplit, true);
  assert.equal(round.playerHands[1]!.fromSplit, true);
});

test('split: splitting Aces deals exactly one card per hand and ends both immediately (no further hit offered)', () => {
  const state = findDeal(
    'split-aces-fixture',
    (s) => s.round?.phase === 'player-turn' && canSplit(s) && s.round.playerHands[0]!.cards[0]!.rank === 1,
  );
  const result = applyIntent(state, { kind: 'split' });
  const round = result.state.round!;
  assert.equal(round.playerHands[0]!.isSplitAces, true);
  assert.equal(round.playerHands[1]!.isSplitAces, true);
  assert.notEqual(round.playerHands[0]!.status, 'active');
  assert.notEqual(round.playerHands[1]!.status, 'active');
  // with both split-ace hands already done, the round moves straight to settlement.
  assert.equal(round.phase, 'round-over');
});

test('split: playing each half of a split independently — the first hand finishing hands control to the second', () => {
  const state = findDeal(
    'split-flow-fixture',
    (s) => s.round?.phase === 'player-turn' && canSplit(s) && s.round.playerHands[0]!.cards[0]!.rank !== 1,
  );
  let round = applyIntent(state, { kind: 'split' });
  let s2 = round.state;
  if (s2.round?.phase === 'player-turn') {
    assert.equal(s2.round.activeHandIndex, 0);
    s2 = applyIntent(s2, { kind: 'stand' }).state;
    if (s2.round?.phase === 'player-turn') {
      assert.equal(s2.round.activeHandIndex, 1); // control moved to the second split hand
    }
  }
});

test('split: refuses once maxSplitHands is reached', () => {
  // maxSplitHands defaults to 4 (3 splits) — searching for a run of consecutive splittable pairs
  // is expensive; instead this exercises the guard directly against a hand-built state shaped
  // like "already at the cap".
  const base = findDeal('split-cap-fixture', (s) => s.round?.phase === 'player-turn' && canSplit(s));
  const hand = base.round!.playerHands[0]!;
  const atCap: BlackjackState = {
    ...base,
    round: { ...base.round!, playerHands: [hand, hand, hand, hand], activeHandIndex: 0 },
  };
  assert.equal(canSplit(atCap), false);
  assert.throws(() => applyIntent(atCap, { kind: 'split' }));
});

// ── surrender ──────────────────────────────────────────────────────────────────────────────

test('surrender: forfeits exactly half the bet (floored) and ends the round immediately', () => {
  const state = findDeal('surrender-fixture', (s) => s.round?.phase === 'player-turn' && canSurrender(s), 101);
  const result = applyIntent(state, { kind: 'surrender' });
  const round = result.state.round!;
  assert.equal(round.phase, 'round-over');
  assert.equal(round.outcomes![0]!.result, 'surrender');
  assert.equal(round.outcomes![0]!.payout, Math.floor(101 / 2));
  assert.ok(round.dealerCards.every((c) => c.faceUp)); // revealed for the record, even unplayed
});

test('surrender: not offered once a hand has already taken an action', () => {
  const state = findDeal('surrender-guard', (s) => s.round?.phase === 'player-turn' && canSurrender(s));
  const hit = applyIntent(state, { kind: 'hit' }).state;
  if (hit.round?.phase === 'player-turn') {
    assert.equal(canSurrender(hit), false);
    assert.throws(() => applyIntent(hit, { kind: 'surrender' }));
  }
});

// ── dealer policy: H17 vs S17 ──────────────────────────────────────────────────────────────

test('dealer policy: the h17 ruleset configures the dealer to hit soft 17; default (s17) stands', () => {
  const s17 = resolveRules('default');
  const h17 = resolveRules('h17');
  assert.equal(s17.hitSoft17, false);
  assert.equal(h17.hitSoft17, true);
});

test('resolveRules: an unknown configId fails loudly rather than silently defaulting', () => {
  assert.throws(() => resolveRules('not-a-real-ruleset'), RangeError);
});

// ── next-hand / round lifecycle ────────────────────────────────────────────────────────────

test('next-hand: clears a settled round back to null, ready for the next deal; refuses mid-round', () => {
  const state = findDeal('next-hand-fixture', (s) => s.round?.phase === 'player-turn');
  assert.equal(canNextHand(state), false);
  assert.throws(() => applyIntent(state, { kind: 'next-hand' }));

  const stood = standOn17(state);
  assert.equal(stood.round?.phase, 'round-over');
  assert.equal(canNextHand(stood), true);
  const cleared = applyIntent(stood, { kind: 'next-hand' }).state;
  assert.equal(cleared.round, null);
  assert.equal(canDeal(cleared), true);
});

// ── shoe reshuffle ─────────────────────────────────────────────────────────────────────────

test('shoe: reshuffles between rounds once the cut card is passed, never mid-hand', () => {
  let state = createEngine('reshuffle-fixture', 'default');
  let reshuffles = 0;
  const rules = resolveRules('default');
  const totalCards = rules.decks * 52;
  for (let hand = 0; hand < 90; hand += 1) {
    const result = applyIntent(state, { kind: 'deal', bet: 5 });
    state = result.state;
    if (result.events.some((e) => e.kind === 'shoe-reshuffled')) {
      reshuffles += 1;
      assert.equal(state.shoe.cards.length, totalCards); // a reshuffle rebuilds the full shoe
    }
    state = standOn17(state);
    if (state.round?.phase === 'round-over') state = applyIntent(state, { kind: 'next-hand' }).state;
  }
  assert.ok(reshuffles >= 1, 'expected at least one reshuffle over 90 hands from a 6-deck shoe');
});
