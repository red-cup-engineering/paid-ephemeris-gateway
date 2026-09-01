import assert from "node:assert/strict";
import test from "node:test";
import { assessBeedFeeWitness } from "../src/integrations/hive-engine/hiveEngineConfirmation.mjs";

const state = { balance: "0.0062", bids: [{ quantity: "0.0757", price: "13.21180000" }] };
test("BEED fee witness requires two matching views and a net edge after executable fee value", () => {
  const admitted = assessBeedFeeWitness({ account: "michael561", worstCaseProfitSwapHive: "0.01630565", states: [state, state] });
  assert.equal(admitted.status, "witnessed-net-cost");
  assert.equal(admitted.totalSwapHive, "0.01321180");
  const refused = assessBeedFeeWitness({ account: "michael561", worstCaseProfitSwapHive: "0.00100000", states: [state, state] });
  assert.equal(refused.status, "unpriced-resource-cost-model");
});
