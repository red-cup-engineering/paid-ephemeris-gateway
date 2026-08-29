import assert from "node:assert/strict";
import test from "node:test";

import { operate, roundTripRequest, selectOpportunity } from "../scripts/automatic-arbitrage-cycle.mjs";

const opportunity = { symbol: "SHARD", pool: "SWAP.HIVE:SHARD", policyAdmitted: true,
  exact: { admitted: true, quote: { quantity: "400.00", maxInputSwapHive: "0.12748943",
    limitSellPriceSwapHive: "0.00032200", worstCaseProfitSwapHive: "0.00131057" } } };
const scan = { status: "certified", account: "sigmund-vexler", providerKnowledge: { value: "true" },
  observedAt: "2026-07-26T00:00:00.000Z", admittedCount: 1, certifyingProviders: ["a", "b"], opportunities: [opportunity] };

test("only Sigmund's certified policy-admitted route is selected", () => {
  assert.equal(selectOpportunity(scan)?.symbol, "SHARD");
  assert.equal(selectOpportunity({ ...scan, account: "michael561" }), null);
  assert.equal(selectOpportunity({ ...scan, providerKnowledge: { value: "both" } }), null);
});

test("the automatic cycle emits the exact bounded round-trip envelope", () => {
  const request = roundTripRequest(opportunity, "/opaque/active.wif");
  assert.equal(request.account, "sigmund-vexler");
  const calls = JSON.parse(request.operation[1].json);
  assert.equal(calls[0].contractPayload.maxAmountIn, "0.12748943");
  assert.equal(calls[1].contractPayload.price, "0.00032200");
  assert.equal(calls[1].contractPayload.expiration, 300);
});

test("Michael's autonomous lane cannot use Sigmund's authority", () => {
  const request = roundTripRequest(opportunity, "cold-red-gate:michael561/active", "michael561");
  assert.equal(request.account, "michael561");
  assert.deepEqual(request.operation[1].required_auths, ["michael561"]);
});

test("the cloud signer cannot pretend the Hive Engine BEED burn costs zero", async () => {
  const receipt = await operate({ account: "michael561", executeOne: true, coldRedGateSigner: true, scan: async () => ({ ...scan, account: "michael561" }),
    submit: async () => { throw new Error("must not submit"); } });
  assert.equal(receipt.status, "unpriced-resource-cost-model");
});

test("execution needs a full non-BEED resource-cost witness and refuses to call a gross SWAP delta profit", async () => {
  const unpriced = await operate({ executeOne: true, keyFile: "/opaque/key", scan: async () => scan,
    submit: async () => { throw new Error("must not submit"); } });
  assert.equal(unpriced.status, "unpriced-resource-cost-model");

  const completed = await operate({ executeOne: true, keyFile: "/opaque/key", scan: async () => scan,
    economicCostWitness: { status: "witnessed-net-cost", totalSwapHive: "0.00010000",
      resources: ["Hive Engine BEED market fee", "Hive RC", "signer", "runner/paymaster"] },
    submit: async () => ({ id: "a".repeat(40), economicEffect: { status: "confirmed", realizedPnlSwapHive: 0.00194485 } }) });
  assert.equal(completed.status, "round-trip-confirmed-unpriced-resource-costs");
  assert.equal(completed.economicEffect.realizedPnlSwapHive, 0.00194485);
});
