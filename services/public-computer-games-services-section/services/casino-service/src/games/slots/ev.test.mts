import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeHouseMath } from './ev.mts';
import { resolveSlotsRules, freeSpinAwardFor } from './rules.mts';
import { computeMultiLineSlotRTP, computeJackpotOdds } from '@red-cup-engineering/parlor-kernel/paylines';
import { symbolHitOdds } from '@red-cup-engineering/parlor-kernel/reels';
import { DEFAULT_JACKPOT_RAKE_BPS } from '../../economy/config.mts';

const RULES = resolveSlotsRules('default');

test('computeHouseMath: matches a from-scratch re-derivation via the same parlor-kernel calls, not a hand-typed number', () => {
  const math = computeHouseMath(RULES);
  const enumerated = computeMultiLineSlotRTP(RULES.reels, RULES.rows, RULES.paylines, RULES.paytable, {
    wilds: RULES.wilds,
    scatter: RULES.scatter,
    scatterPaytable: RULES.scatterPaytable,
    betPerLine: 1,
    scatterTriggerCount: RULES.scatterTriggerCount,
  });
  assert.equal(math.reelRTP, enumerated.rtp);
  assert.equal(math.combinations, enumerated.combinations);
  assert.equal(math.scatterTriggerProbability, enumerated.scatterTriggerProbability);

  const jackpotOdds = computeJackpotOdds(RULES.reels, RULES.rows, RULES.jackpotPattern, RULES.jackpotSymbol);
  assert.equal(math.jackpotOdds, jackpotOdds);

  const symbolOdds = symbolHitOdds(RULES.reels[0] as readonly string[]);
  for (const { symbol, probability } of math.perSymbolOdds) {
    assert.equal(probability, symbolOdds.get(symbol));
  }
});

test('computeHouseMath: is memoized — a second call for the same ruleset returns the identical cached object', () => {
  const a = computeHouseMath(RULES);
  const b = computeHouseMath(RULES);
  assert.equal(a, b);
});

test('computeHouseMath: the shared reel strip is exactly 16 symbols, so the enumeration walks 16**5 combinations exactly', () => {
  const math = computeHouseMath(RULES);
  assert.equal(math.combinations, 16 ** 5);
});

test('computeHouseMath: jackpot odds are exactly (1/16)**5, the shared strip carrying exactly one wild', () => {
  const math = computeHouseMath(RULES);
  assert.ok(Math.abs(math.jackpotOdds - (1 / 16) ** 5) < 1e-15);
  assert.equal(math.jackpotOddsOneIn, Math.round(1 / (1 / 16) ** 5));
});

test('computeHouseMath: the free-spin RTP contribution is the exact closed form, not a hand-typed number', () => {
  const math = computeHouseMath(RULES);
  let expectedNewFreeSpinsPerSpinPlayed = 0;
  let triggerProbability = 0;
  let expectedInitialAward = 0;
  for (const { count, probability } of math.scatterCountDistribution) {
    if (count < RULES.scatterTriggerCount) continue;
    const award = freeSpinAwardFor(RULES, count);
    expectedNewFreeSpinsPerSpinPlayed += probability * award;
    expectedInitialAward += probability * award;
    triggerProbability += probability;
  }
  expectedInitialAward = expectedInitialAward / triggerProbability;
  const expectedFreeSpinsPerTrigger = expectedInitialAward / (1 - expectedNewFreeSpinsPerSpinPlayed);
  assert.ok(Math.abs(math.expectedFreeSpinsPerTrigger - expectedFreeSpinsPerTrigger) < 1e-9);
  const expectedContribution = triggerProbability * expectedFreeSpinsPerTrigger * math.reelRTP * RULES.freeSpinMultiplier;
  assert.ok(Math.abs(math.freeSpinRTPContribution - expectedContribution) < 1e-9);
  assert.ok(Math.abs(math.overallRTP - (math.reelRTP + math.freeSpinRTPContribution)) < 1e-12);
});

test('computeHouseMath: overall RTP lands in the honest-but-commercial ~92-96% band before the jackpot-rake recycling estimate', () => {
  const math = computeHouseMath(RULES);
  assert.ok(math.overallRTP >= 0.92 && math.overallRTP <= 0.96, `overallRTP was ${math.overallRTP}`);
});

test('computeHouseMath: effectiveRTPWithJackpotRecycling is the documented steady-state estimate, exactly overallRTP*(1-rake)+rake', () => {
  const math = computeHouseMath(RULES);
  const rakeFraction = DEFAULT_JACKPOT_RAKE_BPS / 10_000;
  const expected = math.overallRTP * (1 - rakeFraction) + rakeFraction;
  assert.ok(Math.abs(math.effectiveRTPWithJackpotRecycling - expected) < 1e-12);
  assert.equal(math.jackpotRakeBps, DEFAULT_JACKPOT_RAKE_BPS);
});

test('computeHouseMath: scatterCountDistribution sums to 1 and expectedLossPer100SpinsAtDefaultBet is consistent with overallRTP', () => {
  const math = computeHouseMath(RULES);
  const total = math.scatterCountDistribution.reduce((s, e) => s + e.probability, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  const stake = RULES.defaultBetPerLine * RULES.paylines.length * 100;
  assert.ok(Math.abs(math.expectedLossPer100SpinsAtDefaultBet - (1 - math.overallRTP) * stake) < 1e-9);
});
