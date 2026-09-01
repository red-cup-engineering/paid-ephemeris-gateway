import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEngine,
  applyIntent,
  canSpin,
  canCollect,
  playOneSpin,
  playRound,
  MAX_BONUS_SPINS_PER_ROUND,
  type SlotsState,
} from './engine.mts';
import { resolveSlotsRules, totalBetFor, type SlotsRules } from './rules.mts';
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import { createReel } from '@red-cup-engineering/parlor-kernel/reels';

const RULES = resolveSlotsRules('default');

// ── determinism / purity (the cartridge replay contract) ──────────────────────────────────────

test('createEngine: pure function of (seed, configId) — identical arguments, byte-identical state', () => {
  const a = createEngine('seed-alpha', 'default');
  const b = createEngine('seed-alpha', 'default');
  assert.deepEqual(a, b);
});

test('applyIntent: same seed + same intent sequence replays to byte-identical state, forever', () => {
  const intents = [{ kind: 'spin', betPerLine: 5 }, { kind: 'collect' }, { kind: 'spin', betPerLine: 3 }] as const;
  function replay() {
    let state: SlotsState = createEngine('replay-seed', 'default');
    for (const intent of intents) state = applyIntent(state, intent as never).state;
    return state;
  }
  assert.deepEqual(replay(), replay());
});

test('applyIntent: never mutates its input state', () => {
  const state = createEngine('purity-seed', 'default');
  const before = JSON.parse(JSON.stringify(state));
  applyIntent(state, { kind: 'spin', betPerLine: 5 });
  assert.deepEqual(state, before);
});

test('different seeds diverge (spins are not coincidentally identical)', () => {
  const a = applyIntent(createEngine('seed-one', 'default'), { kind: 'spin', betPerLine: 5 }).state;
  const b = applyIntent(createEngine('seed-two', 'default'), { kind: 'spin', betPerLine: 5 }).state;
  assert.notDeepEqual(a.lastResult?.base.grid, b.lastResult?.base.grid);
});

// ── phase guards ────────────────────────────────────────────────────────────────────────────

test('canSpin/canCollect: a fresh machine can spin, not collect', () => {
  const state = createEngine('guard-seed', 'default');
  assert.equal(canSpin(state), true);
  assert.equal(canCollect(state), false);
});

test('spin then collect then spin again: phases alternate correctly', () => {
  let state = createEngine('phase-seed', 'default');
  state = applyIntent(state, { kind: 'spin', betPerLine: 5 }).state;
  assert.equal(canSpin(state), false);
  assert.equal(canCollect(state), true);
  state = applyIntent(state, { kind: 'collect' }).state;
  assert.equal(canSpin(state), true);
  assert.equal(state.lastResult, null);
  state = applyIntent(state, { kind: 'spin', betPerLine: 5 }).state;
  assert.equal(canCollect(state), true);
});

test('spinning twice without collecting is rejected', () => {
  let state = createEngine('double-spin-seed', 'default');
  state = applyIntent(state, { kind: 'spin', betPerLine: 5 }).state;
  assert.throws(() => applyIntent(state, { kind: 'spin', betPerLine: 5 }), Error);
});

test('collecting with nothing to collect is rejected', () => {
  const state = createEngine('collect-seed', 'default');
  assert.throws(() => applyIntent(state, { kind: 'collect' }), Error);
});

test('an unrecognized intent kind throws', () => {
  const state = createEngine('bad-kind-seed', 'default');
  assert.throws(() => applyIntent(state, { kind: 'bogus' } as never), TypeError);
});

// ── bet bounds ──────────────────────────────────────────────────────────────────────────────

test('spin rejects a bet below minBetPerLine, above maxBetPerLine, or non-integer', () => {
  const state = createEngine('bet-seed', 'default');
  assert.throws(() => applyIntent(state, { kind: 'spin', betPerLine: RULES.minBetPerLine - 1 }), RangeError);
  assert.throws(() => applyIntent(state, { kind: 'spin', betPerLine: RULES.maxBetPerLine + 1 }), RangeError);
  assert.throws(() => applyIntent(state, { kind: 'spin', betPerLine: 2.5 }), RangeError);
});

test('a spin at the default bet charges betPerLine x paylines.length as totalBet', () => {
  const state = applyIntent(createEngine('total-bet-seed', 'default'), { kind: 'spin', betPerLine: RULES.defaultBetPerLine }).state;
  assert.equal(state.lastResult?.totalBet, totalBetFor(RULES, RULES.defaultBetPerLine));
});

// ── arithmetic consistency over real spins (statistical, not a specific outcome) ───────────────

test('over many real spins: totalPayout always equals base + every bonus spin\'s own payout, and totalFreeSpinsAwarded matches the trigger/retrigger trail', () => {
  let triggeredAtLeastOnce = false;
  for (let seq = 1; seq <= 500; seq++) {
    const { result } = playRound(`stat-seed`, seq, RULES, RULES.defaultBetPerLine, totalBetFor(RULES, RULES.defaultBetPerLine));
    const expectedTotal = result.base.totalPayout + result.bonusSpins.reduce((s, o) => s + o.totalPayout, 0);
    assert.equal(result.totalPayout, expectedTotal);
    const expectedFreeSpins = result.base.freeSpinsAwarded + result.bonusSpins.reduce((s, o) => s + o.freeSpinsAwarded, 0);
    assert.equal(result.totalFreeSpinsAwarded, expectedFreeSpins);
    if (result.totalFreeSpinsAwarded > 0) triggeredAtLeastOnce = true;
    // every bonus spin really is flagged as a bonus spin, and the base spin never is
    assert.equal(result.base.isBonusSpin, false);
    for (const bonus of result.bonusSpins) assert.equal(bonus.isBonusSpin, true);
  }
  assert.ok(triggeredAtLeastOnce, 'expected at least one free-spin trigger across 500 spins at ~4.9% trigger probability');
});

// ── deterministic fixtures for jackpot / free-spin mechanics (see playOneSpin/playRound's own
// header: hand-crafted single-symbol reels make the outcome 100% predictable, no brute-force
// seed search needed for a rare real-game event) ───────────────────────────────────────────────

function tinyRules(overrides: Partial<SlotsRules> = {}): SlotsRules {
  return {
    id: 'test-fixture',
    displayName: 'test fixture',
    rows: 1,
    reelCount: 5,
    reels: overrides.reels ?? Array.from({ length: 5 }, () => createReel(['wild'])),
    paylines: [[0, 0, 0, 0, 0]],
    paytable: { wild: { 5: 100 } },
    scatterPaytable: {},
    wilds: ['wild'],
    scatter: 'scatter',
    scatterTriggerCount: 99, // unreachable with these fixtures unless explicitly overridden
    freeSpinAwards: { 3: 2, 4: 2, 5: 2 },
    freeSpinMultiplier: 2,
    jackpotPattern: [0, 0, 0, 0, 0],
    jackpotSymbol: 'wild',
    minBetPerLine: 1,
    maxBetPerLine: 100,
    defaultBetPerLine: 1,
    ...overrides,
  };
}

test('playOneSpin: a deterministic all-wild reel set always hits the jackpot pattern and pays the wild line', () => {
  const rules = tinyRules();
  const rng = makeRng('jackpot-fixture-seed');
  const outcome = playOneSpin(rng, rules, 1, 1, false);
  assert.equal(outcome.jackpotHit, true);
  assert.equal(outcome.lineWins.length, 1);
  assert.equal(outcome.lineWins[0]?.payout, 100);
  assert.equal(outcome.totalPayout, 100);
});

test('playOneSpin: a reel set that can never show the jackpot symbol never hits it', () => {
  const rules = tinyRules({ reels: Array.from({ length: 5 }, () => createReel(['wave'])), paytable: { wave: { 5: 10 } } });
  const rng = makeRng('no-jackpot-fixture-seed');
  const outcome = playOneSpin(rng, rules, 1, 1, false);
  assert.equal(outcome.jackpotHit, false);
});

test('playOneSpin: a bonus spin doubles the payout exactly per freeSpinMultiplier', () => {
  const rules = tinyRules();
  const base = playOneSpin(makeRng('mult-seed'), rules, 1, 1, false);
  const bonus = playOneSpin(makeRng('mult-seed'), rules, 1, 1, true);
  assert.equal(bonus.totalPayout, base.totalPayout * rules.freeSpinMultiplier);
});

test('playRound: a base trigger that does not retrigger awards exactly its own free-spin count, no more', () => {
  // A 3-symbol reel (scatter with probability 1/3 per reel, ES ~= 0.42 < 1 at this award/threshold
  // combination — see the math in this test's own search below) makes triggers common enough to
  // find quickly by a small, bounded, fully-deterministic search over spinSeq, without ever
  // risking the "never converges" case (wrapped defensively regardless).
  const reels = Array.from({ length: 5 }, () => createReel(['scatter', 'wave', 'wave']));
  const rules = tinyRules({ reels, scatterTriggerCount: 3, freeSpinAwards: { 3: 2, 4: 2, 5: 2 }, paytable: {} });
  let found: ReturnType<typeof playRound>['result'] | null = null;
  for (let seq = 1; seq <= 300 && found === null; seq++) {
    let attempt;
    try {
      attempt = playRound('no-retrigger-search-seed', seq, rules, 1, 1);
    } catch {
      continue; // a rare ES>=1 realization for this seed — skip it, not what this fixture is testing
    }
    if (attempt.result.base.freeSpinsAwarded > 0 && attempt.result.bonusSpins.length === attempt.result.base.freeSpinsAwarded) {
      found = attempt.result;
    }
  }
  assert.ok(found !== null, 'expected to find a trigger-without-retrigger spin within 300 tries');
  assert.equal(found!.totalFreeSpinsAwarded, found!.base.freeSpinsAwarded);
  assert.equal(found!.bonusSpins.length, found!.base.freeSpinsAwarded);
  for (const bonus of found!.bonusSpins) assert.equal(bonus.freeSpinsAwarded, 0);
});

test('playRound: a ruleset whose free-spin math never converges (ES >= 1) fails loudly via the safety cap rather than hanging', () => {
  // Every reel is a fixed single symbol: scatter on 3 of the 5 reels, non-scatter on the other 2
  // — every spin (base AND every bonus, since bonus plays the identical deterministic reels)
  // scatters exactly 3, at/above the trigger threshold, forever. This is deliberately the
  // pathological case `MAX_BONUS_SPINS_PER_ROUND` exists for.
  const reels = [
    createReel(['scatter']),
    createReel(['scatter']),
    createReel(['scatter']),
    createReel(['wave']),
    createReel(['wave']),
  ];
  const rules = tinyRules({ reels, scatterTriggerCount: 3, freeSpinAwards: { 3: 2, 4: 2, 5: 2 }, paytable: {} });
  assert.throws(() => playRound('never-converges-seed', 1, rules, 1, 1), /MAX_BONUS_SPINS_PER_ROUND/);
});

test('MAX_BONUS_SPINS_PER_ROUND: the real default ruleset never comes remotely close (ES < 1 by design)', () => {
  // A sanity check on the actual game data, not the fixture above: across many real spins, no
  // round should ever play more than a small handful of bonus spins.
  let maxSeen = 0;
  for (let seq = 1; seq <= 1000; seq++) {
    const { result } = playRound('cap-sanity-seed', seq, RULES, RULES.defaultBetPerLine, totalBetFor(RULES, RULES.defaultBetPerLine));
    maxSeen = Math.max(maxSeen, result.bonusSpins.length);
  }
  assert.ok(maxSeen < MAX_BONUS_SPINS_PER_ROUND / 10, `expected real free-spin rounds to stay small; saw ${maxSeen}`);
});
