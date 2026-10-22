import assert from "node:assert/strict";
import test from "node:test";
import { assessBeedFeeWitness } from "../src/integrations/hive-engine/hiveEngineConfirmation.mjs";

const state = { balance: "0.0062", bids: [{ quantity: "0.0757", price: "13.21180000" }] };
// Same executable BEED-market fee mark as `state` (0.01321500 vs 0.01321180)
// reached through a different bid-book shape: two bids instead of one, in a
// different order and quantities. Live nodes never agree byte-for-byte.
const stateDifferentShape = { balance: "0.0062", bids: [
  { quantity: "0.0400", price: "13.21500000" },
  { quantity: "0.0400", price: "13.20000000" },
] };
const stateFarMark = { balance: "0.0062", bids: [{ quantity: "0.0757", price: "20.00000000" }] };
const stateLowReserve = { balance: "0.0005", bids: [{ quantity: "0.0757", price: "13.21180000" }] };
const stateShallowBook = { balance: "0.0062", bids: [{ quantity: "0.0001", price: "13.21180000" }] };

test("BEED fee witness agrees on the derived fee mark within tolerance, not on byte-identical states", () => {
  const admitted = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, stateDifferentShape] });
  assert.equal(admitted.status, "witnessed-net-cost");
  assert.equal(admitted.totalSwapHive, "0.01321500");
  assert.deepEqual(admitted.resources, ["Hive Engine BEED market fee", "Hive RC", "signer", "runner/paymaster"]);
  assert.deepEqual(admitted.overheads, { signerSwapHive: "0.00000000", runnerSwapHive: "0.00000000" });
});

test("BEED fee witness refuses net-floor-not-met with profit and cost rendered when the margin is too thin", () => {
  const refused = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.00100000", states: [state, state] });
  assert.equal(refused.status, "unpriced-resource-cost-model");
  assert.equal(refused.reason, "net-floor-not-met");
  assert.equal(refused.profit, "0.00100000");
  assert.equal(refused.cost, "0.01321180");
});

test("BEED fee witness refuses fee-witnesses-disagree with both marks rendered when nodes disagree past tolerance", () => {
  const refused = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, stateFarMark] });
  assert.equal(refused.status, "unpriced-resource-cost-model");
  assert.equal(refused.reason, "fee-witnesses-disagree");
  assert.deepEqual(refused.marks, ["0.01321180", "0.02000000"]);
});

test("BEED fee witness refuses single-witness when fewer than two states arrive", () => {
  const oneState = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state] });
  assert.equal(oneState.status, "unpriced-resource-cost-model");
  assert.equal(oneState.reason, "single-witness");

  const noStates = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, null] });
  assert.equal(noStates.status, "unpriced-resource-cost-model");
  assert.equal(noStates.reason, "single-witness");
});

test("BEED fee witness refuses beed-reserve-insufficient when a node's BEED balance is below the fee reserve", () => {
  const refused = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, stateLowReserve] });
  assert.equal(refused.status, "unpriced-resource-cost-model");
  assert.equal(refused.reason, "beed-reserve-insufficient");
});

test("BEED fee witness refuses beed-bid-depth-insufficient when a node's bid book cannot fill the fee quantity", () => {
  const refused = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, stateShallowBook] });
  assert.equal(refused.status, "unpriced-resource-cost-model");
  assert.equal(refused.reason, "beed-bid-depth-insufficient");
});

test("BEED fee witness prices signer/runner overheads as inputs and can refuse net-floor-not-met once they are added", () => {
  const withoutOverheads = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, state] });
  assert.equal(withoutOverheads.status, "witnessed-net-cost");

  const withOverheads = assessBeedFeeWitness({
    worstCaseProfitSwapHive: "0.01630565", states: [state, state],
    overheads: { signerSwapHive: "0.00500000", runnerSwapHive: "0.00500000" },
  });
  assert.equal(withOverheads.status, "unpriced-resource-cost-model");
  assert.equal(withOverheads.reason, "net-floor-not-met");
  assert.equal(withOverheads.cost, "0.02321180");
  assert.deepEqual(withOverheads.overheads, { signerSwapHive: "0.00500000", runnerSwapHive: "0.00500000" });
});

test("BEED fee witness treats Hive RC as a capacity floor: refuses rc-insufficient, does not refuse when rc is absent", () => {
  const rcInsufficient = assessBeedFeeWitness({
    worstCaseProfitSwapHive: "0.01630565", states: [state, state],
    rc: { available: "100", required: "500" },
  });
  assert.equal(rcInsufficient.status, "unpriced-resource-cost-model");
  assert.equal(rcInsufficient.reason, "rc-insufficient");
  assert.deepEqual(rcInsufficient.rc, { available: "100", required: "500" });

  const rcSufficient = assessBeedFeeWitness({
    worstCaseProfitSwapHive: "0.01630565", states: [state, state],
    rc: { available: "500", required: "500" },
  });
  assert.equal(rcSufficient.status, "witnessed-net-cost");

  const rcAbsent = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.01630565", states: [state, state] });
  assert.equal(rcAbsent.status, "witnessed-net-cost");
  assert.ok(rcAbsent.resources.includes("Hive RC"));

  const refusedWithoutRc = assessBeedFeeWitness({ worstCaseProfitSwapHive: "0.00100000", states: [state, state] });
  assert.ok(refusedWithoutRc.resources.includes("Hive RC"));
});
