#!/usr/bin/env node

import { fetchGmxCandles } from "../src/obsmetrologia-causal-sheaf-backtest.mjs";
import { recordCausalTransportCapitalDecision, recordCausalTransportResearchAssay, selectBtcCausalTransportModel }
  from "../src/obsmetrologia-causal-transport-backtest.mjs";

const costs = {
  positionFeeRate: 0.0006,
  impactSpreadBps: 3,
  borrowFundingAnnualBps: 2_000,
  executionUsdPerOrder: 0.25,
  startingEquityUsd: 10_000,
  maintenanceMarginRate: 0.05,
};

try {
  const btc = await fetchGmxCandles({ tokenSymbol: "BTC", period: "4h", limit: 10_000 });
  const frozenSelection = selectBtcCausalTransportModel(btc.candles, { costs });
  if (frozenSelection.selectedParameters == null) throw new Error("BTC development produced no eligible frozen model");
  const eth = await fetchGmxCandles({ tokenSymbol: "ETH", period: "4h", limit: 10_000 });
  const recorded = await recordCausalTransportResearchAssay({ btc, eth }, frozenSelection,
    { backtest: { costs } });
  const capitalDecision = await recordCausalTransportCapitalDecision(recorded.result);
  process.stdout.write(`${JSON.stringify({
    sources: { btc: btc.source, eth: eth.source },
    candleDigests: { btc: btc.candleDigest, eth: eth.candleDigest },
    sourceDisclosures: { btc: btc.sourceDisclosures, eth: eth.sourceDisclosures },
    candleCounts: { btc: btc.candles.length, eth: eth.candles.length },
    frozenSelection,
    assay: recorded.result,
    projection: { digest: recorded.projection.digest, documentNi: recorded.projection.documentNi,
      networkReference: recorded.projection.reference },
    capitalDecision: { disposition: capitalDecision.decision.disposition,
      digest: capitalDecision.projection.digest, networkReference: capitalDecision.projection.reference },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`backtest-obsmetrologia-causal-transport: ${error.message}\n`);
  process.exitCode = 1;
}
