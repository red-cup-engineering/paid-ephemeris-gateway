import assert from "node:assert/strict";
import test from "node:test";

import { planDCityLiquidSimRecovery, statesAgree } from "../src/recovery.mjs";

const STATE = Object.freeze({
  account: "michael561",
  observedAt: "2026-07-22T01:40:00.000Z",
  simBalance: "34426.820",
  swapHiveBalance: "13.05352195",
  simPrecision: 3,
  swapHivePrecision: 8,
  tokenPair: "SWAP.HIVE:SIM",
  baseQuantity: "6261.30641990",
  quoteQuantity: "130318140.61526257",
  nftCount: 15,
  nftLockedSim: "300.000",
});

test("dCity recovery prices the exact full liquid balance and preserves NFTs", () => {
  const plan = planDCityLiquidSimRecovery(STATE);
  assert.equal(plan.kind, "ready");
  assert.equal(plan.quote.quantitySim, "34426.820");
  assert.equal(plan.quote.expectedSwapHive, "1.64951195");
  assert.equal(plan.quote.minimumSwapHive, "1.63301683");
  assert.deepEqual(plan.quote.operation, ["custom_json", {
    id: "ssc-mainnet-hive",
    required_auths: ["michael561"],
    required_posting_auths: [],
    json: '{"contractName":"marketpools","contractAction":"swapTokens","contractPayload":{"tokenPair":"SWAP.HIVE:SIM","tokenSymbol":"SIM","tokenAmount":"34426.820","tradeType":"exactInput","minAmountOut":"1.63301683"}}',
  }]);
  // The plan never mentions or moves CITY NFTs; the state's NFT fields pass through untouched.
  assert.equal(STATE.nftCount, 15);
  assert.equal(STATE.nftLockedSim, "300.000");
});

test("dCity recovery refuses empty balances, changed precision, and excessive slippage", () => {
  assert.equal(planDCityLiquidSimRecovery({ ...STATE, simBalance: "0.000" }).kind, "refuse");
  assert.match(planDCityLiquidSimRecovery({ ...STATE, simPrecision: 8 }).reason, /precision changed/);
  assert.match(planDCityLiquidSimRecovery(STATE, 501).reason, /slippage policy/);
});

test("dCity independent observations must agree on all economic evidence", () => {
  assert.equal(statesAgree(STATE, { ...STATE, observedAt: "2026-07-22T01:40:01.000Z" }), true);
  assert.equal(statesAgree(STATE, { ...STATE, baseQuantity: "6261.30641989" }), false);
  assert.equal(statesAgree(STATE, { ...STATE, simBalance: "34426.819" }), false);
});
