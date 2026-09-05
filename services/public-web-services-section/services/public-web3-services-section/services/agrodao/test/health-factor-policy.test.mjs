import assert from "node:assert/strict";
import test from "node:test";

import { selectHealthFactorTarget } from "../src/health-factor-policy.mjs";

const WAD = 10n ** 18n;

function market(symbol, suppliedUnderlyingRaw, borrowedUnderlyingRaw, overrides = {}) {
  return {
    symbol, suppliedUnderlyingRaw: String(suppliedUnderlyingRaw), borrowedUnderlyingRaw: String(borrowedUnderlyingRaw),
    underlyingDecimals: 18, underlyingPriceMantissa: WAD.toString(), collateralFactorMantissa: WAD.toString(), entered: true,
    ...overrides,
  };
}

test("sets 1.2 for a BTC-denominated core with minor non-BTC collateral and dust debt", () => {
  const target = selectHealthFactorTarget([
    market("mLBTC", 8_100n * WAD, 0n), market("mUSDC", 1_000n * WAD, 0n), market("mVIRTUAL", 1_000n * WAD, 0n),
    market("mcbBTC", 0n, 10_000n * WAD), market("mWETH", 0n, WAD),
  ]);
  assert.equal(target.mantissa, "1200000000000000000");
  assert.equal(target.classification, "btc-denominated-core");
  assert.equal(target.evidence.btcCollateralShareBps, "8019");
  assert.equal(target.evidence.btcDebtShareBps, "9999");
  assert.equal(target.thresholds.minimumBtcDebtShareBps, "9999");
  assert.equal(target.thresholds.minimumBtcCollateralShareBps, "8000");
});

test("classifies the fixed-block BTC core despite minor collateral and WETH debt dust", () => {
  const target = selectHealthFactorTarget([
    market("mLBTC", 209918490160650794043n * WAD, 0n),
    market("mUSDC", 3017029135444068800n * WAD, 0n),
    market("mVIRTUAL", 9049035855762332377n * WAD, 0n),
    market("mcbBTC", 0n, 211793630685532915800n * WAD),
    market("mWETH", 0n, 82032452765n * WAD),
  ]);
  assert.equal(target.mantissa, "1200000000000000000");
  assert.equal(target.classification, "btc-denominated-core");
  assert.equal(target.evidence.collateralValueMantissa, "221984555151857195220");
  assert.equal(target.evidence.debtValueMantissa, "211793630767565368565");
  assert.equal(target.evidence.btcCollateralShareBps, "9456");
  assert.equal(target.evidence.btcDebtShareBps, "9999");
});

test("uses the exact debt and collateral dominance boundaries", () => {
  const debtBoundary = selectHealthFactorTarget([
    market("mLBTC", 10_000n * WAD, 0n), market("mcbBTC", 0n, 9_999n * WAD), market("mWETH", 0n, WAD),
  ]);
  assert.equal(debtBoundary.mantissa, "1200000000000000000");
  const debtBelow = selectHealthFactorTarget([
    market("mLBTC", 10_000n * WAD, 0n), market("mcbBTC", 0n, 9_998n * WAD), market("mWETH", 0n, 2n * WAD),
  ]);
  assert.equal(debtBelow.mantissa, "1500000000000000000");
  const collateralBoundary = selectHealthFactorTarget([
    market("mLBTC", 8_000n * WAD, 0n), market("mUSDC", 2_000n * WAD, 0n), market("mcbBTC", 0n, WAD),
  ]);
  assert.equal(collateralBoundary.mantissa, "1200000000000000000");
  const collateralBelow = selectHealthFactorTarget([
    market("mLBTC", 7_999n * WAD, 0n), market("mUSDC", 2_001n * WAD, 0n), market("mcbBTC", 0n, WAD),
  ]);
  assert.equal(collateralBelow.mantissa, "1500000000000000000");
});

test("keeps the strict target for unknown valuation or materially mixed debt", () => {
  for (const markets of [
    [market("mLBTC", WAD, 0n), market("mcbBTC", 0n, WAD), { ...market("mWETH", 0n, 1n), underlyingPriceMantissa: undefined }],
    [market("mLBTC", WAD, 0n), market("mUSDC", 0n, WAD)],
    [market("mLBTC", WAD, 0n)], [],
  ]) {
    const target = selectHealthFactorTarget(markets);
    assert.equal(target.mantissa, "1500000000000000000");
    assert.equal(target.classification, "strict-default");
  }
});
