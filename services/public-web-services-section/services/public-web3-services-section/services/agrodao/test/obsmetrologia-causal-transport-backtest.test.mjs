import assert from "node:assert/strict";
import test from "node:test";

import {
  causalTransportSignal,
  causalTransportSignalSeries,
  defaultCausalTransportGrid,
  evaluateFrozenCausalTransport,
  recordCausalTransportCapitalDecision,
  recordCausalTransportResearchAssay,
  returnCochainFeature,
  selectBtcCausalTransportModel,
} from "../src/obsmetrologia-causal-transport-backtest.mjs";

function candles(count = 600, phase = 0, drift = 0.0004) {
  let close = 100;
  return Array.from({ length: count }, (_, index) => {
    const open = close;
    const wave = 0.006 * Math.sin((index + phase) / 8) + 0.003 * Math.sin((index + phase) / 21);
    close = open * Math.exp(drift + wave);
    return [1_700_000_000 + index * 14_400, open, Math.max(open, close) * 1.003,
      Math.min(open, close) * 0.997, close];
  });
}

const PERSISTENT = { lookback: 12, mode: "persistent-trend", phaseThreshold: 0.4,
  minimumDirectionalStrength: 0.25, minimumOrderingDominance: 0.5, deadband: 0,
  holdBars: 2, cooldownBars: 1 };
const ALTERNATING = { ...PERSISTENT, mode: "alternating-contrarian", phaseThreshold: 0.6 };

test("return cochain exposes phase defects and normalized-return ordering without future data", () => {
  const persistent = returnCochainFeature([100, 101, 102.1, 103.3, 104.7, 106.2, 107.8], 0);
  const alternating = returnCochainFeature([100, 102, 100, 102, 100, 102, 100], 0);
  assert.ok(persistent.phaseDefectRate < alternating.phaseDefectRate);
  assert.equal(persistent.persistentDirection, 1);
  assert.equal(alternating.latestSign, -1);
  assert.ok(persistent.orderingDominance >= 0.5);
});

test("persistent convention follows cochain mass while alternating convention fades the last sign", () => {
  const persistentFeature = returnCochainFeature([100, 101, 102.1, 103.3, 104.7, 106.2, 107.8], 0);
  const alternatingFeature = returnCochainFeature([100, 102, 100, 103, 100, 104, 100], 0);
  assert.equal(causalTransportSignal(persistentFeature, PERSISTENT).position, 1);
  assert.equal(causalTransportSignal(alternatingFeature, ALTERNATING).position, 1);
});

test("future candles cannot alter an emitted signal prefix", () => {
  const base = candles(100);
  const first = causalTransportSignalSeries(base, PERSISTENT).signals;
  const changed = [...base.slice(0, 80), ...candles(20, 300, -0.002).map((row, index) => [
    base[80 + index][0], row[1], row[2], row[3], row[4]])];
  const second = causalTransportSignalSeries(changed, PERSISTENT).signals;
  assert.deepEqual(first.slice(0, 80), second.slice(0, 80));
});

test("the predeclared grid is bounded, deterministic, and contains both conventions", () => {
  const first = defaultCausalTransportGrid();
  assert.equal(first.length, 192);
  assert.deepEqual(first, defaultCausalTransportGrid());
  assert.deepEqual([...new Set(first.map(({ mode }) => mode))].sort(),
    ["alternating-contrarian", "persistent-trend"]);
});

test("BTC selection is independent of ETH and ignores the BTC diagnostic partition", () => {
  const grid = [PERSISTENT, ALTERNATING];
  const btc = candles();
  const mutatedDiagnostic = btc.map((row, index) => index < 420 ? row
    : [row[0], row[1], row[1] * 1.2, row[1] * 0.8, row[1] * Math.exp(0.08 * Math.sin(index))]);
  const options = { parameterGrid: grid, minimumDevelopmentTrades: 1,
    costs: { positionFeeRate: 0, impactSpreadBps: 0, borrowFundingAnnualBps: 0,
      executionUsdPerOrder: 0, startingEquityUsd: 10_000, maintenanceMarginRate: 0.05 } };
  const first = selectBtcCausalTransportModel(btc, options);
  const second = selectBtcCausalTransportModel(mutatedDiagnostic, options);
  assert.deepEqual(first.selectedParameters, second.selectedParameters);
  assert.deepEqual(first.selectedDevelopment, second.selectedDevelopment);
  assert.notEqual(first.id, second.id, "diagnostic evidence remains bound even though it cannot select");
  const objectCandles = btc.map(([timestamp, open, high, low, close]) => ({ timestamp, open, high, low, close }));
  assert.deepEqual(selectBtcCausalTransportModel(objectCandles, options).selectedParameters,
    first.selectedParameters);
});

test("frozen model evaluates fixed ETH 80/20 partitions and stress cannot improve returns", () => {
  const costs = { positionFeeRate: 0.0006, impactSpreadBps: 3, borrowFundingAnnualBps: 100,
    executionUsdPerOrder: 0.1, startingEquityUsd: 10_000, maintenanceMarginRate: 0.05 };
  const selection = selectBtcCausalTransportModel(candles(), { parameterGrid: [PERSISTENT],
    minimumDevelopmentTrades: 1, costs });
  const result = evaluateFrozenCausalTransport(selection, candles(600, 3), {
    costs, minimumHoldoutTrades: 1, leverageGrid: [1, 2] });
  assert.deepEqual(result.partitions, { transportValidation: [13, 480], temporalHoldout: [480, 600] });
  assert.deepEqual(result.leverageAssays.map(({ leverage }) => leverage), [1, 2]);
  for (const assay of result.leverageAssays) {
    assert.ok(assay.stressedTransportValidation.netReturn <= assay.transportValidation.netReturn);
    assert.ok(assay.stressedTemporalHoldout.netReturn <= assay.temporalHoldout.netReturn);
  }
  assert.equal(result.gate.leverageAdmitted, false);
  assert.equal(result.gate.executionAdmitted, false);
  assert.equal(result.transactionAssembly, false);
});

test("records two-digest frozen research through only AGRODAO's settlement store", async () => {
  const costs = { positionFeeRate: 0, impactSpreadBps: 0, borrowFundingAnnualBps: 0,
    executionUsdPerOrder: 0, startingEquityUsd: 10_000, maintenanceMarginRate: 0.05 };
  const btcCandles = candles();
  const ethCandles = candles(600, 2);
  const selection = selectBtcCausalTransportModel(btcCandles, { parameterGrid: [PERSISTENT],
    minimumDevelopmentTrades: 1, costs });
  const assay = evaluateFrozenCausalTransport(selection, ethCandles, { costs,
    minimumHoldoutTrades: 1, leverageGrid: [1] });
  const observed = {
    btc: { source: "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=BTC&period=4h&limit=600",
      tokenSymbol: "BTC", period: "4h", candleDigest: `ni:///sha-256;${"B".repeat(43)}`,
      sourceDisclosures: {}, candles: btcCandles },
    eth: { source: "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=ETH&period=4h&limit=600",
      tokenSymbol: "ETH", period: "4h", candleDigest: `ni:///sha-256;${"E".repeat(43)}`,
      sourceDisclosures: {}, candles: ethCandles },
  };
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return {
    digest: `ni:///sha-256;${"A".repeat(43)}` }; } };
  const recorded = await recordCausalTransportResearchAssay(observed, selection, {
    store, recordedAt: "2026-07-22T18:00:00.000Z",
    backtest: { costs, minimumHoldoutTrades: 1, leverageGrid: [1] } });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.obsmetrologia-causal-transport-research-assay");
  assert.equal(Object.hasOwn(writes[0].record.evidence.btc, "candles"), false);
  assert.equal(Object.hasOwn(writes[0].record.evidence.eth, "candles"), false);
  assert.equal(recorded.result.frozenSelectionId, selection.id);
  await assert.rejects(() => recordCausalTransportResearchAssay(observed, selection, {
    store: { ...store, actor: "urn:ame:not-agrodao" }, recordedAt: "2026-07-22T18:00:00.000Z",
    backtest: { costs, minimumHoldoutTrades: 1, leverageGrid: [1] } }),
  /AGRODAO's contracted settlement store/u);
  const forged = { ...selection, selectedParameters: ALTERNATING };
  assert.throws(() => evaluateFrozenCausalTransport(forged, ethCandles, { costs }),
    /identity does not match/u);
  const capital = await recordCausalTransportCapitalDecision(recorded.result, {
    store, recordedAt: "2026-07-22T18:01:00.000Z" });
  assert.equal(capital.decision.disposition, "reject-capital-admission");
  assert.equal(capital.decision.leverageAdmitted, false);
  assert.equal(writes[1].category, "agrodao.strategy-capital-admission-decision");
});
