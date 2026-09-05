import assert from "node:assert/strict";
import test from "node:test";

import { anchoredWalkForwardBacktest, causalSheafSignal, causalWindowFeatures,
  diffractionConcentration, fetchGmxCandles, normalizeGmxCandles,
  simulateFrozenSignals } from "../src/obsmetrologia-causal-sheaf-backtest.mjs";

function candles(count = 300, transform = (index) => 100 + index * 0.2 + Math.sin(index / 7)) {
  return Array.from({ length: count }, (_, index) => {
    const open = transform(index); const close = transform(index + 0.8);
    return [1_700_000_000 + index * 14_400, open, Math.max(open, close) + 0.2,
      Math.min(open, close) - 0.2, close];
  });
}

test("causal ordering distinguishes chains and inversion energy", () => {
  const up = causalWindowFeatures([1, 2, 3, 4]);
  const down = causalWindowFeatures([4, 3, 2, 1]);
  assert.equal(up.bullishOrderingFraction, 1);
  assert.equal(up.directionScore, 1);
  assert.equal(up.freeEnergy, 0);
  assert.equal(down.bearishOrderingFraction, 1);
  assert.equal(down.directionScore, -1);
});

test("finite diffraction concentration is bounded", () => {
  const value = diffractionConcentration(Array.from({ length: 16 }, (_, index) => 100 + Math.sin(index / 8)));
  assert.ok(value >= 0 && value <= 1);
});

test("sheaf gluing admits one direction and curvature refuses disagreement", () => {
  const section = (score, energy = 0.1, previous = 0.2) => ({ directionScore: score, freeEnergy: energy,
    previousFreeEnergy: previous, diffractionConcentration: 0.9 });
  const parameters = { minimumStrength: 0.2, maximumDispersion: 0.1, minimumDiffraction: 0.5, energyTolerance: 0 };
  const flat = causalSheafSignal({ sections: [section(0.6), section(0.62), section(0.65)] }, parameters);
  assert.equal(flat.position, 1); assert.equal(flat.regime, "flat-rank-zero");
  const curved = causalSheafSignal({ sections: [section(0.6), section(-0.62), section(0.65)] }, parameters);
  assert.equal(curved.position, 0); assert.equal(curved.regime, "curved-rank-none");
});

test("normalizes descending GMX candles and rejects duplicates", () => {
  const rows = candles(3).reverse();
  const normalized = normalizeGmxCandles(rows);
  assert.ok(normalized[0].timestamp < normalized[2].timestamp);
  const repaired = normalizeGmxCandles([[1, 10, 9, 8, 9], [2, 9, 10, 8, 9], [3, 9, 10, 8, 9]]);
  assert.equal(repaired[0].high, 10);
  assert.throws(() => normalizeGmxCandles([rows[0], rows[0], rows[1]]), /unique/);
});

test("fetch adapter binds the official response period", async () => {
  const fetchImpl = async (url) => ({ ok: true, json: async () => ({ period: "4h", candles: candles(3).reverse() }),
    status: 200, url: String(url) });
  const result = await fetchGmxCandles({ tokenSymbol: "BTC", period: "4h", limit: 3 }, fetchImpl);
  assert.match(result.source, /^https:\/\/arbitrum-api\.gmxinfra\.io\/prices\/candles\?/u);
  assert.equal(result.candles.length, 3);
  assert.match(result.candleDigest, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("walk-forward choice is determined before validation and test", () => {
  const grid = [
    { minimumStrength: 0.05, maximumDispersion: 0.4, minimumDiffraction: 0.1, energyTolerance: 0.01 },
    { minimumStrength: 0.9, maximumDispersion: 0.01, minimumDiffraction: 0.99, energyTolerance: 0 },
  ];
  const base = candles(360);
  const changedTest = base.map((row, index) => {
    if (index < 252) return row;
    const close = row[1] * (1 + 0.02 * Math.sin(index));
    return [row[0], row[1], Math.max(row[1], close) + 2, Math.min(row[1], close) - 2, close];
  });
  const options = { windows: [8, 16], lowFrequencyBins: 1, parameterGrid: grid, minimumTrainTrades: 1,
    minimumOosTrades: 1, costs: { positionFeeRate: 0, impactSpreadBps: 0,
      borrowFundingAnnualBps: 0, executionUsdPerOrder: 0, startingEquityUsd: 10_000 } };
  const first = anchoredWalkForwardBacktest(base, options);
  const second = anchoredWalkForwardBacktest(changedTest, options);
  assert.deepEqual(first.selectedParameters, second.selectedParameters);
  assert.equal(first.transactionAssembly, false);
  assert.equal(first.gate.executionAdmitted, false);
});

test("a close signal executes at the next open and cannot capture the intervening gap", () => {
  const rows = [[1, 100, 100, 100, 100], [2, 200, 200, 200, 200], [3, 220, 220, 220, 220]];
  const metrics = simulateFrozenSignals(rows, [1, 1, 0], 1, 3, { positionFeeRate: 0,
    impactSpreadBps: 0, borrowFundingAnnualBps: 0, executionUsdPerOrder: 0, startingEquityUsd: 10_000 });
  assert.ok(Math.abs(metrics.netReturn - 0.1) < 1e-12);
  assert.ok(Math.abs(metrics.grossReturn - 0.1) < 1e-12);
});

test("cost stress cannot improve the same frozen test path", () => {
  const result = anchoredWalkForwardBacktest(candles(360), { windows: [8, 16], lowFrequencyBins: 1,
    parameterGrid: [{ minimumStrength: 0.05, maximumDispersion: 0.4, minimumDiffraction: 0.1, energyTolerance: 0.01 }],
    minimumTrainTrades: 1, minimumOosTrades: 1, costs: { positionFeeRate: 0.0006, impactSpreadBps: 3,
      borrowFundingAnnualBps: 100, executionUsdPerOrder: 0.1, startingEquityUsd: 10_000 } });
  assert.ok(result.stressedTest.netReturn <= result.test.netReturn);
  assert.equal(result.initialLeverage, 1);
  assert.equal(result.signerMaterialAccepted, false);
});

test("adverse intrabar marks liquidate leverage even when the candle closes unchanged", () => {
  const rows = [[1, 100, 100, 100, 100], [2, 100, 101, 40, 100], [3, 100, 100, 100, 100]];
  const metrics = simulateFrozenSignals(rows, [1, 1, 0], 1, 3, { positionFeeRate: 0,
    impactSpreadBps: 0, borrowFundingAnnualBps: 0, executionUsdPerOrder: 0,
    startingEquityUsd: 10_000, leverage: 2, maintenanceMarginRate: 0.1 });
  assert.equal(metrics.liquidated, true);
  assert.equal(metrics.liquidationIndex, 1);
  assert.equal(metrics.endingEquityUsd, 0);
  assert.ok(metrics.minimumMarginRatio <= 0.1);
});
