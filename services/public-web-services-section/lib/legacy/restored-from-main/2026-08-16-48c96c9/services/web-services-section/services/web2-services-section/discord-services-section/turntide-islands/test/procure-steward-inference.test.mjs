import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSIDERATION_POLICY,
  SUPPLIER_ADMISSIONS,
  TTI_ACTOR,
  procureStewardAnswer,
  stewardAnswerFromProcurement,
  stewardInferenceMarket,
} from "../lib/management/procure-steward-inference.mjs";
import { readFileSync } from "node:fs";

test("the supplier roster is the plate record, never code", () => {
  const market = stewardInferenceMarket();
  const plate = readFileSync(SUPPLIER_ADMISSIONS, "utf8");
  for (const supplier of market.suppliers) {
    assert.ok(plate.includes(`<${supplier.actor}>`), `${supplier.actor} must be seated on the plate`);
    assert.ok(plate.includes(`<${supplier.agentCard}>`), "each supplier's agent card comes from the plate");
  }
  assert.ok(market.suppliers.length >= 1, "the seeded plate admits at least one supplier");
});

test("the consideration policy is the settlement's own validated record", () => {
  const market = stewardInferenceMarket();
  const record = JSON.parse(readFileSync(CONSIDERATION_POLICY, "utf8"));
  assert.equal(market.considerationPolicy?.type, "ConsiderationPolicy");
  assert.deepEqual(market.considerationPolicy, record);
});

test("market access refuses with typed reasons while identity and services are unprovisioned, never silently", async () => {
  const market = stewardInferenceMarket();
  assert.ok(market.refusals.some((reason) => reason.startsWith("sovereign-account-not-provisioned")), "absent eip155-5615611 binding is a named refusal");
  assert.ok(market.refusals.some((reason) => reason.startsWith("customer-services-not-admitted")), "empty customer-service plate is a named refusal");
  const procurement = await procureStewardAnswer("probe", {});
  assert.equal(procurement.type, "TTIStewardInferenceRefusal");
  assert.equal(procurement.disposition, "market-not-admitted");
  assert.deepEqual(procurement.refusals, market.refusals);
  assert.equal(stewardAnswerFromProcurement(procurement), null);
});

test("a fully admitted market reaches competitive solicitation without any endpoint of its own", async () => {
  const solicited = [];
  const market = Object.freeze({
    suppliers: [
      { actor: "urn:test:supplier-one", id: "one", agentCard: "https://one.test/.well-known/agent-card.json", async exchange(activity) { solicited.push(this.actor); return { type: "Reject", object: { reason: "test-refusal" }, inReplyTo: activity.id }; } },
      { actor: "urn:test:supplier-two", id: "two", agentCard: "https://two.test/.well-known/agent-card.json", async exchange(activity) { solicited.push(this.actor); return { type: "Reject", object: { reason: "test-refusal" }, inReplyTo: activity.id }; } },
    ],
    considerationPolicy: stewardInferenceMarket().considerationPolicy,
    customerServices: {},
    caller: { actor: TTI_ACTOR, account: "eip155:5615611:0x0000000000000000000000000000000000000001" },
    refusals: Object.freeze([]),
  });
  const procurement = await procureStewardAnswer("probe", { market, record: false });
  assert.equal(solicited.length, 2, "every admitted supplier is solicited — the market competes, no provider is pinned");
  assert.equal(procurement.disposition, "no-admissible-provider-offer");
  assert.equal(procurement.market.refused.length, 2);
  assert.equal(stewardAnswerFromProcurement(procurement), null);
});

test("stewardAnswerFromProcurement returns text only from an accepted assay", () => {
  assert.equal(stewardAnswerFromProcurement({ disposition: "candidate-pending-customer-assay", settlement: { completion: "The tide holds." } }), null);
  assert.equal(stewardAnswerFromProcurement({ disposition: "candidate-pending-customer-assay", assay: { accepted: false, problems: ["schema"], candidateValue: "The tide holds." } }), null);
  assert.equal(stewardAnswerFromProcurement({ disposition: "candidate-pending-customer-assay", assay: { accepted: true, candidateValue: "The tide holds." } }), "The tide holds.");
  assert.equal(stewardAnswerFromProcurement({ disposition: "candidate-pending-customer-assay", assay: { accepted: true, candidateValue: "  " } }), null);
});
