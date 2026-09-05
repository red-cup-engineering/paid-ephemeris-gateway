import assert from "node:assert/strict";
import test from "node:test";

import {
  anchoredCurvatureReleaseBacktest,
  curvatureReleaseEvent,
  curvatureReleaseSignalSeries,
  defaultCurvatureReleaseGrid,
  recordCurvatureReleaseResearchAssay,
} from "../src/obsmetrologia-curvature-release-backtest.mjs";

function section(directionScore, freeEnergy, diffractionConcentration = 0.8) {
  return { directionScore, freeEnergy, diffractionConcentration };
}

function feature(scores, energy) {
  return { sections: scores.map((score) => section(score, energy)) };
}

const PARAMETERS = {
  minimumStrength: 0.1,
  maximumResolvedDispersion: 0.1,
  minimumPriorDispersion: 0.3,
  minimumEnergyDrop: 0.05,
  minimumDiffraction: 0.5,
  holdBars: 3,
  cooldownBars: 2,
};

function candles(count = 360) {
  return Array.from({ length: count }, (_, index) => {
    const cycle = index % 24;
    const regime = cycle < 8 ? (cycle % 2 === 0 ? 2.5 : -2.5)
      : cycle < 16 ? (cycle - 8) * 0.7 : (24 - cycle) * 0.45;
    const open = 100 + (index * 0.08) + regime;
    const nextCycle = (index + 0.8) % 24;
    const nextRegime = nextCycle < 8 ? (Math.floor(nextCycle) % 2 === 0 ? 2.5 : -2.5)
      : nextCycle < 16 ? (nextCycle - 8) * 0.7 : (24 - nextCycle) * 0.45;
    const close = 100 + ((index + 0.8) * 0.08) + nextRegime;
    return [1_700_000_000 + index * 14_400, open, Math.max(open, close) + 0.4,
      Math.min(open, close) - 0.4, close];
  });
}

test("curvature release requires prior disagreement, present gluing, energy drop, and diffraction", () => {
  const previous = feature([0.8, 0.2, -0.4], 0.45);
  const current = feature([0.6, 0.62, 0.65], 0.25);
  const released = curvatureReleaseEvent(previous, current, PARAMETERS);
  assert.equal(released.release, true);
  assert.equal(released.position, 1);
  assert.equal(released.priorCurved, true);
  assert.equal(released.resolved, true);
  const noCurvature = curvatureReleaseEvent(feature([0.6, 0.62, 0.65], 0.45), current, PARAMETERS);
  assert.equal(noCurvature.release, false);
  const noEnergyDrop = curvatureReleaseEvent(previous, feature([0.6, 0.62, 0.65], 0.44), PARAMETERS);
  assert.equal(noEnergyDrop.release, false);
});

test("a release holds for a bounded interval and exits early on opposing short order", () => {
  const values = [null, feature([0.8, 0.2, -0.4], 0.45), feature([0.6, 0.62, 0.65], 0.25),
    feature([0.55, 0.6, 0.62], 0.24), feature([-0.7, 0.5, 0.55], 0.3), feature([0.5, 0.52, 0.54], 0.2)];
  const result = curvatureReleaseSignalSeries(values, PARAMETERS);
  assert.deepEqual(result.signals, [0, 0, 1, 1, 0, 0]);
  assert.equal(result.releases.length, 1);
  assert.equal(result.releases[0].index, 2);
});

test("future features cannot alter an already emitted signal prefix", () => {
  const prefix = [null, feature([0.8, 0.2, -0.4], 0.45), feature([0.6, 0.62, 0.65], 0.25),
    feature([0.55, 0.6, 0.62], 0.24)];
  const first = curvatureReleaseSignalSeries([...prefix, feature([0.5, 0.52, 0.54], 0.2)], PARAMETERS);
  const second = curvatureReleaseSignalSeries([...prefix, feature([-0.9, -0.8, -0.7], 0.1)], PARAMETERS);
  assert.deepEqual(first.signals.slice(0, prefix.length), second.signals.slice(0, prefix.length));
});

test("the bounded default grid is deterministic and contains genuinely transitional thresholds", () => {
  const first = defaultCurvatureReleaseGrid();
  const second = defaultCurvatureReleaseGrid();
  assert.equal(first.length, 192);
  assert.deepEqual(first, second);
  assert.ok(first.every(({ minimumPriorDispersion, holdBars, cooldownBars }) => minimumPriorDispersion > 0
    && holdBars > 0 && cooldownBars > 0));
});

test("train-only selection is frozen against validation and test mutation", () => {
  const grid = [
    { minimumStrength: 0.01, maximumResolvedDispersion: 1, minimumPriorDispersion: 0,
      minimumEnergyDrop: 0, minimumDiffraction: 0, holdBars: 4, cooldownBars: 2 },
    { minimumStrength: 1, maximumResolvedDispersion: 0, minimumPriorDispersion: 1,
      minimumEnergyDrop: 1, minimumDiffraction: 1, holdBars: 2, cooldownBars: 2 },
  ];
  const base = candles();
  const changed = base.map((row, index) => index < 180 ? row
    : [row[0], row[1], row[1] * 1.08, row[1] * 0.92, row[1] * (1 + 0.04 * Math.sin(index))]);
  const options = { windows: [4, 8], lowFrequencyBins: 1, parameterGrid: grid,
    minimumTrainTrades: 1, minimumOosTrades: 1,
    costs: { positionFeeRate: 0, impactSpreadBps: 0, borrowFundingAnnualBps: 0,
      executionUsdPerOrder: 0, startingEquityUsd: 10_000, maintenanceMarginRate: 0.05 } };
  const first = anchoredCurvatureReleaseBacktest(base, options);
  const second = anchoredCurvatureReleaseBacktest(changed, options);
  assert.deepEqual(first.selectedParameters, second.selectedParameters);
  assert.deepEqual(first.partitions, second.partitions);
  assert.equal(first.transactionAssembly, false);
  assert.equal(first.gate.executionAdmitted, false);
  assert.equal(first.gate.leverageAdmitted, false);
});

test("cost and funding stress cannot improve a frozen curvature-release test path", () => {
  const result = anchoredCurvatureReleaseBacktest(candles(), { windows: [4, 8], lowFrequencyBins: 1,
    parameterGrid: [{ minimumStrength: 0.01, maximumResolvedDispersion: 1, minimumPriorDispersion: 0,
      minimumEnergyDrop: 0, minimumDiffraction: 0, holdBars: 4, cooldownBars: 2 }], minimumTrainTrades: 1,
    minimumOosTrades: 1, costs: { positionFeeRate: 0.0006, impactSpreadBps: 3,
      borrowFundingAnnualBps: 100, executionUsdPerOrder: 0.1, startingEquityUsd: 10_000,
      maintenanceMarginRate: 0.05 } });
  assert.ok(result.stressedTest.netReturn <= result.test.netReturn);
  assert.deepEqual(result.leverageAssays.map(({ leverage }) => leverage), [1, 1.5, 2]);
  assert.ok(result.leverageAssays.every(({ modelAdmits }) => typeof modelAdmits === "boolean"));
  assert.equal(result.gate.leverageAdmitted, false);
});

test("records source-digest-bound research only through AGRODAO's settlement store", async () => {
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return {
    digest: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }; } };
  const backtest = { windows: [4, 8], lowFrequencyBins: 1,
    parameterGrid: [{ minimumStrength: 0.01, maximumResolvedDispersion: 1, minimumPriorDispersion: 0,
      minimumEnergyDrop: 0, minimumDiffraction: 0, holdBars: 4, cooldownBars: 2 }],
    minimumTrainTrades: 1, minimumOosTrades: 1 };
  const observed = { source: "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=BTC&period=4h&limit=360",
    tokenSymbol: "BTC", period: "4h",
    candleDigest: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    sourceDisclosures: { nonstandardIntervalCount: 0 }, candles: candles() };
  const recorded = await recordCurvatureReleaseResearchAssay(observed, {
    recordedAt: "2026-07-22T13:30:00.000Z", store, backtest,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.obsmetrologia-curvature-release-research-assay");
  assert.equal(writes[0].record.assay.id, recorded.result.id);
  assert.equal(writes[0].record.decisionBoundary.leverageAdmitted, false);
  assert.equal(Object.hasOwn(writes[0].record.evidence, "candles"), false);
  await assert.rejects(() => recordCurvatureReleaseResearchAssay(observed, {
    recordedAt: "2026-07-22T13:30:00.000Z", store: { ...store, actor: "urn:ame:not-agrodao" }, backtest,
  }), /AGRODAO's contracted settlement store/u);
});
