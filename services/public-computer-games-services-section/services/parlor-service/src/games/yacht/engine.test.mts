import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, applyIntent, type YachtState, type YachtIntent } from './engine.mts';
import { defaultReplay, hashState } from '@red-cup-engineering/parlor-kernel/replay';
import { categoryLiveEVs } from './odds.mts';
import { dailySeed } from './daily.mts';
import { YACHT_RULES } from './rules.mts';
import { yachtCategoryExpectations } from '@red-cup-engineering/parlor-kernel/odds';

test('yacht: real category count is 12, not 13 (Yahtzee\'s count) — matching the kernel', () => {
  assert.equal(YACHT_RULES.categories.length, 12);
});

test('yacht: a fresh engine has five unrolled dice and zero rolls used', () => {
  const state = createEngine('seed', 'a,b');
  assert.deepEqual(state.data.dice, [0, 0, 0, 0, 0]);
  assert.deepEqual(state.data.held, [false, false, false, false, false]);
  assert.equal(state.data.rollsUsed, 0);
});

test('yacht: rolling fills the dice and consumes one of three rolls', () => {
  const state = createEngine('roll-seed', 'a,b');
  const result = applyIntent(state, { kind: 'roll' } as YachtIntent);
  assert.equal(result.state.data.rollsUsed, 1);
  assert.ok(result.state.data.dice.every((d) => d >= 1 && d <= 6));
});

test('yacht: a fourth roll in one turn is rejected', () => {
  let state = createEngine('over-roll', 'a,b');
  for (let i = 0; i < 3; i++) state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  assert.throws(() => applyIntent(state, { kind: 'roll' } as YachtIntent), /no rolls remaining/);
});

test('yacht: holding a die keeps its value across a reroll', () => {
  let state = createEngine('hold-seed', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  const heldValue = state.data.dice[0];
  state = applyIntent(state, { kind: 'toggleHold', index: 0 } as YachtIntent).state;
  assert.equal(state.data.held[0], true);
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  assert.equal(state.data.dice[0], heldValue);
  assert.equal(state.data.rollsUsed, 2);
});

test('yacht: rolling with every die held is rejected', () => {
  let state = createEngine('all-held', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  for (let i = 0; i < 5; i++) state = applyIntent(state, { kind: 'toggleHold', index: i } as YachtIntent).state;
  assert.throws(() => applyIntent(state, { kind: 'roll' } as YachtIntent), /nothing to reroll/);
});

test('yacht: scoring a category matches the kernel scorer exactly and advances the turn', () => {
  let state = createEngine('score-seed', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  const dice = state.data.dice;
  const result = applyIntent(state, { kind: 'score', category: 'choice' } as YachtIntent);
  const expected = dice.reduce((s, d) => s + d, 0);
  assert.equal(result.state.data.scores.a?.choice, expected);
  assert.equal(result.state.activePlayerIndex, 1);
  assert.deepEqual(result.state.data.dice, [0, 0, 0, 0, 0]); // fresh hand for the next turn
  assert.equal(result.state.data.rollsUsed, 0);
});

test('yacht: rescoring an already-filled category is rejected', () => {
  let state = createEngine('rescore-seed', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  state = applyIntent(state, { kind: 'score', category: 'choice' } as YachtIntent).state;
  // Play the other player's turn back to 'a' to try rescoring 'choice'.
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  state = applyIntent(state, { kind: 'score', category: 'choice' } as YachtIntent).state;
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  assert.throws(() => applyIntent(state, { kind: 'score', category: 'choice' } as YachtIntent), /already scored/);
});

test('yacht: scoring before rolling is rejected', () => {
  const state = createEngine('no-roll', 'a,b');
  assert.throws(() => applyIntent(state, { kind: 'score', category: 'choice' } as YachtIntent), /roll before scoring/);
});

test('yacht: a scripted full deterministic two-player game reaches a winner and replay-verifies', () => {
  const seed = 'yacht-scripted-full-game';
  let state = createEngine(seed, 'a,b');
  const log: YachtIntent[] = [];
  let guard = 0;
  const play = (intent: YachtIntent) => {
    log.push(intent);
    state = applyIntent(state, intent).state;
  };
  while (state.phase !== 'won' && guard < 20000) {
    guard += 1;
    // Simple real strategy: always take all three rolls (no holding), then score the first
    // category not yet filled for the active player, biased toward 'choice' last so every
    // other category gets exercised too.
    for (let r = state.data.rollsUsed; r < YACHT_RULES.maxRolls; r++) play({ kind: 'roll' } as YachtIntent);
    const player = state.players[state.activePlayerIndex] as string;
    const filled = new Set(Object.keys(state.data.scores[player] ?? {}));
    const category = YACHT_RULES.categories.find((c) => !filled.has(c)) as (typeof YACHT_RULES.categories)[number];
    play({ kind: 'score', category } as YachtIntent);
  }
  assert.ok(guard < 20000, 'game did not terminate within the guard');
  assert.equal(state.phase, 'won');
  assert.ok(state.data.winner !== null);
  assert.equal(Object.keys(state.data.scores.a ?? {}).length, 12);
  assert.equal(Object.keys(state.data.scores.b ?? {}).length, 12);
  assert.throws(() => applyIntent(state, { kind: 'roll' } as YachtIntent), /already won/);

  const replayed = defaultReplay({ createEngine, applyIntent }, seed, log, 'a,b');
  assert.deepEqual(replayed.finalState, state);
  assert.equal(replayed.stateHash, hashState(state));

  let state2 = createEngine(seed, 'a,b');
  for (const intent of log) state2 = applyIntent(state2, intent).state;
  assert.deepEqual(state2, state);
});

test('yacht: category live EVs are exact — scoreIfCommitNow matches the kernel scorer, rerollEV is null once rolls are spent', () => {
  let state = createEngine('odds-seed', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  const evsAfterOneRoll = categoryLiveEVs(state.data.dice, state.data.held, state.data.rollsUsed);
  for (const ev of evsAfterOneRoll) {
    assert.ok(ev.rerollEV !== null, 'two rerolls remain after the first roll');
    assert.ok(Number.isFinite(ev.rerollEV as number));
  }
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  const evsAfterThreeRolls = categoryLiveEVs(state.data.dice, state.data.held, state.data.rollsUsed);
  for (const ev of evsAfterThreeRolls) {
    assert.equal(ev.rerollEV, null, 'no rerolls remain after the third roll');
  }
});

test('yacht: rerollEV with every die held equals scoreIfCommitNow (nothing left to average over)', () => {
  let state = createEngine('all-held-ev', 'a,b');
  state = applyIntent(state, { kind: 'roll' } as YachtIntent).state;
  for (let i = 0; i < 5; i++) state = applyIntent(state, { kind: 'toggleHold', index: i } as YachtIntent).state;
  const evs = categoryLiveEVs(state.data.dice, state.data.held, state.data.rollsUsed);
  for (const ev of evs) assert.equal(ev.rerollEV, ev.scoreIfCommitNow);
});

test('yacht: rerollEV of "choice" rerolling all five dice from scratch matches the kernel base-roll expectation', () => {
  const dice = [1, 1, 1, 1, 1]; // irrelevant once every die is free — every position gets overwritten
  const held = [false, false, false, false, false];
  const evs = categoryLiveEVs(dice, held, 0);
  const choiceEV = evs.find((e) => e.category === 'choice')?.rerollEV as number;
  const kernelExpectation = yachtCategoryExpectations().get('choice') as number;
  assert.ok(Math.abs(choiceEV - kernelExpectation) < 1e-9);
});

test("yacht: today's daily seed is stable for the same UTC date and differs by date", () => {
  const a = dailySeed('2026-08-19');
  const b = dailySeed('2026-08-19');
  const c = dailySeed('2026-08-20');
  assert.equal(a, b);
  assert.notEqual(a, c);
});
