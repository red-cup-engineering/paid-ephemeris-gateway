#!/usr/bin/env node

import { fetchGmxCandles } from "../src/obsmetrologia-causal-sheaf-backtest.mjs";
import { recordCurvatureReleaseResearchAssay }
  from "../src/obsmetrologia-curvature-release-backtest.mjs";

try {
  const observed = await fetchGmxCandles({ tokenSymbol: "BTC", period: "4h", limit: 10_000 });
  const recorded = await recordCurvatureReleaseResearchAssay(observed, { backtest: { costs: {
    positionFeeRate: 0.0006,
    impactSpreadBps: 3,
    borrowFundingAnnualBps: 2_000,
    executionUsdPerOrder: 0.25,
    startingEquityUsd: 10_000,
    maintenanceMarginRate: 0.05,
  } } });
  process.stdout.write(`${JSON.stringify({
    source: observed.source,
    candleDigest: observed.candleDigest,
    sourceDisclosures: observed.sourceDisclosures,
    candleCount: observed.candles.length,
    assay: recorded.result,
    projection: {
      digest: recorded.projection.digest,
      documentNi: recorded.projection.documentNi,
      networkReference: recorded.projection.reference,
    },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`backtest-obsmetrologia-curvature-release: ${error.message}\n`);
  process.exitCode = 1;
}
