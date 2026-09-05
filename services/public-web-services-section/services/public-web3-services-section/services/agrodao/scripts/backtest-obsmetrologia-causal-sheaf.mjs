#!/usr/bin/env node

import { anchoredWalkForwardBacktest, fetchGmxCandles } from "../src/obsmetrologia-causal-sheaf-backtest.mjs";

try {
  const observed = await fetchGmxCandles({ tokenSymbol: "BTC", period: "4h", limit: 10_000 });
  const result = anchoredWalkForwardBacktest(observed.candles, { costs: { positionFeeRate: 0.0006,
    impactSpreadBps: 3, borrowFundingAnnualBps: 2_000, executionUsdPerOrder: 0.25,
    startingEquityUsd: 10_000 } });
  process.stdout.write(`${JSON.stringify({ source: observed.source, candleDigest: observed.candleDigest,
    sourceDisclosures: observed.sourceDisclosures,
    candleCount: observed.candles.length, ...result }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`backtest-obsmetrologia-causal-sheaf: ${error.message}\n`);
  process.exitCode = 1;
}
