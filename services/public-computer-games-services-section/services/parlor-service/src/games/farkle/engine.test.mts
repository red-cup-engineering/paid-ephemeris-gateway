import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, applyIntent, type FarkleState, type FarkleIntent } from './engine.mts';
import { defaultReplay, hashState } from '@red-cup-engineering/parlor-kernel/replay';
import { farkleOddsForDecision, averageRollScore } from './odds.mts';
import { farkleBotDecision } from './bot.mts';
import { dailySeed } from './daily.mts';
import { FARKLE_RULES } from './rules.mts';
import { farkleBustProbability } from '@red-cup-engineering/parlor-kernel/odds';

test('farkle: a fresh engine starts with a full dice pool and zero scores', () => {
  const state = createEngine('seed', 'a,b');
  assert.deepEqual(state.data.scores, { a: 0, b: 0 });
  assert.equal(state.data.diceRemaining, FARKLE_RULES.diceCount);
  assert.equal(state.data.currentRoll, null);
  assert.equal(state.phase, 'rolling');
});

test('farkle: rolling puts dice on the table and moves to the choosing phase (or busts)', () => {
  const state = createEngine('roll-probe', 'a,b');
  const result = applyIntent(state, { kind: 'roll' } as FarkleIntent);
  if (result.events.some((e) => e.kind === 'bust')) {
    assert.equal(result.state.phase, 'rolling'); // bust ends the turn straight back to rolling for the next player
    assert.equal(result.state.data.turnPoints, 0);
    assert.equal(result.state.activePlayerIndex, 1);
  } else {
    assert.equal(result.state.phase, 'choosing');
    assert.notEqual(result.state.data.currentRoll, null);
  }
});

test('farkle: choosing a non-scoring selection is rejected (kernel-validated, no trash dice)', () => {
  // Search for a seed whose first roll contains at least one non-scoring die alongside a
  // scoring one, so the rejection is exercised against real rolled dice, not synthetic ones.
  for (let i = 0; i < 500; i++) {
    const state = createEngine(`select-probe-${i}`, 'a,b');
    const rolled = applyIntent(state, { kind: 'roll' } as FarkleIntent);
    if (rolled.state.phase !== 'choosing') continue;
    const dice = rolled.state.data.currentRoll as number[];
    // A single non-scoring face (2, 3, 4, or 6 that isn't part of a triple) selected alone
    // must be rejected.
    const badIndex = dice.findIndex((v) => v !== 1 && v !== 5);
    if (badIndex === -1) continue; // this roll happens to be all 1s/5s — try another seed
    // Confirm it's genuinely non-scoring alone before asserting rejection (it could be part of
    // a triple-or-better, which *would* score).
    const counts = dice.filter((v) => v === dice[badIndex]).length;
    if (counts >= 3) continue;
    assert.throws(
      () => applyIntent(rolled.state, { kind: 'choose', indices: [badIndex] } as FarkleIntent),
      /valid scoring set/,
    );
    return;
  }
  assert.fail('expected to find a probe seed with a non-scoring die to test rejection against');
});

test('farkle: hot dice refills the pool to a full hand without losing turn points', () => {
  // Construct a choosing-phase state by hand where the whole roll scores (all 1s), forcing hot
  // dice deterministically rather than hunting for a seed.
  let state: FarkleState = createEngine('hot-dice-setup', 'a,b');
  state = { ...state, phase: 'choosing', data: { ...state.data, diceRemaining: 3, currentRoll: [1, 1, 1] } };
  const result = applyIntent(state, { kind: 'choose', indices: [0, 1, 2] } as FarkleIntent);
  assert.equal(result.state.data.diceRemaining, FARKLE_RULES.diceCount);
  assert.equal(result.state.data.turnPoints, 1000);
  assert.ok(result.events.some((e) => e.kind === 'hot-dice'));
});

test('farkle: banking below the entry threshold while not on board is rejected', () => {
  let state: FarkleState = createEngine('entry-setup', 'a,b');
  state = { ...state, data: { ...state.data, turnPoints: 100 } };
  assert.throws(() => applyIntent(state, { kind: 'bank' } as FarkleIntent), /entry threshold/);
});

test('farkle: banking at or above the entry threshold gets a player on the board', () => {
  let state: FarkleState = createEngine('entry-setup-2', 'a,b');
  state = { ...state, data: { ...state.data, turnPoints: 550 } };
  const result = applyIntent(state, { kind: 'bank' } as FarkleIntent);
  assert.equal(result.state.data.scores.a, 550);
  assert.equal(result.state.data.turnPoints, 0);
  assert.equal(result.state.data.diceRemaining, FARKLE_RULES.diceCount);
  assert.equal(result.state.activePlayerIndex, 1);
});

test('farkle: banking at or above target wins immediately without advancing the turn', () => {
  let state: FarkleState = createEngine('win-setup', 'a,b');
  state = { ...state, data: { ...state.data, scores: { a: 9800, b: 0 }, turnPoints: 300 } };
  const result = applyIntent(state, { kind: 'bank' } as FarkleIntent);
  assert.equal(result.state.phase, 'won');
  assert.equal(result.state.data.winner, 'a');
  assert.equal(result.state.data.scores.a, 10100);
  assert.throws(() => applyIntent(result.state, { kind: 'roll' } as FarkleIntent), /already won/);
});

test('farkle: a full bot-vs-bot game always terminates with a legal winner, across many seeds', () => {
  for (let i = 0; i < 15; i++) {
    let state = createEngine(`bot-vs-bot-farkle-${i}`, 'you,bot');
    let guard = 0;
    while (state.phase !== 'won' && guard < 5000) {
      guard += 1;
      const decision = farkleBotDecision(state);
      const intent: FarkleIntent =
        decision.action === 'choose'
          ? ({ kind: 'choose', indices: decision.indices } as FarkleIntent)
          : ({ kind: decision.action } as FarkleIntent);
      state = applyIntent(state, intent).state;
    }
    assert.ok(guard < 5000, `seed ${i}: game did not terminate`);
    assert.ok(state.data.winner !== null);
    assert.ok((state.data.scores[state.data.winner as string] as number) >= FARKLE_RULES.targetScore);
  }
});

test('farkle: a scripted seed plays a full deterministic bot-vs-bot game, replay-verified', () => {
  const seed = 'farkle-scripted-full-game';
  let state = createEngine(seed, 'you,bot');
  const log: FarkleIntent[] = [];
  let guard = 0;
  while (state.phase !== 'won' && guard < 5000) {
    guard += 1;
    const decision = farkleBotDecision(state);
    const intent: FarkleIntent =
      decision.action === 'choose'
        ? ({ kind: 'choose', indices: decision.indices } as FarkleIntent)
        : ({ kind: decision.action } as FarkleIntent);
    log.push(intent);
    state = applyIntent(state, intent).state;
  }
  assert.ok(guard < 5000);
  assert.equal(state.phase, 'won');

  const replayed = defaultReplay({ createEngine, applyIntent }, seed, log, 'you,bot');
  assert.deepEqual(replayed.finalState, state);
  assert.equal(replayed.stateHash, hashState(state));
});

test('farkle: odds are computed by exact enumeration, cross-checked against the kernel bust probability', () => {
  const odds6 = farkleOddsForDecision(6, 0);
  assert.ok(Math.abs(odds6.bustProbability - farkleBustProbability(6)) < 1e-15);
  // Averaging over all 6-dice rolls, the mean score must be strictly positive (most rolls
  // score something) and finite.
  assert.ok(odds6.averageScore > 0 && Number.isFinite(odds6.averageScore));
  // rollAgainEV with zero turnPoints at risk reduces to the average score exactly.
  assert.ok(Math.abs(odds6.rollAgainEV - odds6.averageScore) < 1e-12);
  // With turnPoints at risk, rollAgainEV must be strictly less than the risk-free average.
  const risked = farkleOddsForDecision(6, 2000);
  assert.ok(risked.rollAgainEV < odds6.averageScore);
  // averageRollScore is memoized but must be consistent across repeated calls.
  assert.equal(averageRollScore(3), averageRollScore(3));
});

test('farkle: bot chooses the maximal scoring set and never selects a non-scoring die', () => {
  const state = createEngine('bot-choose-check', 'you,bot');
  const rolled = { ...state, phase: 'choosing' as const, data: { ...state.data, currentRoll: [1, 1, 1, 2, 5, 6] } };
  const decision = farkleBotDecision(rolled);
  assert.equal(decision.action, 'choose');
  if (decision.action === 'choose') {
    const chosenValues = decision.indices.map((i) => rolled.data.currentRoll![i]);
    assert.deepEqual(chosenValues.sort(), [1, 1, 1, 5]); // the triple of 1s and the lone 5; the 2 and 6 don't score
  }
});

test("farkle: today's daily seed is stable for the same UTC date and differs by date", () => {
  const a = dailySeed('2026-08-19');
  const b = dailySeed('2026-08-19');
  const c = dailySeed('2026-08-20');
  assert.equal(a, b);
  assert.notEqual(a, c);
});
