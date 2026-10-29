import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formUnionMediaCurrentOperationsNeed, observeUnionMediaLocalNeeds, UNION_MEDIA_BUSINESS_EVIDENCE_CATEGORY, UNION_MEDIA_LOCAL_NEEDS_POLICY_CATEGORY, UNION_MEDIA_RESOURCE_NEED_CATEGORY } from "../lib/management/observe-union-media-local-needs.mjs";

const product = JSON.parse(readFileSync(new URL("../content/products/union-media-syndication.json", import.meta.url), "utf8"));
const solicitation = JSON.parse(readFileSync(new URL("../content/solicitations/union-media-activitypub-and-hosting.json", import.meta.url), "utf8"));
const recordedAt = "2026-07-22T02:00:00.000Z";
const probe = { host: "turntide-islands.561.group", status: "unresolvable", evidence: "dns-enotfound" };

function memoryStore() {
  const categories = new Map();
  return {
    async record({ category, record }) { const rows = categories.get(category) ?? []; rows.push(structuredClone(record)); categories.set(category, rows); },
    records(category) { return structuredClone(categories.get(category) ?? []); },
  };
}

test("current Union Media operations need is evidence-bound and locally scoped", () => {
  const { evidence, observation } = formUnionMediaCurrentOperationsNeed({ product, solicitation, publicOriginProbe: probe, recordedAt });
  assert.match(evidence.id, /^ni:\/\/\/sha-256;/u);
  assert.equal(evidence.publicOriginStatus, "unresolvable");
  assert.equal(evidence.acceptedProviderCount, 0);
  assert.equal(observation.resourceClass, "operations");
  assert.equal(observation.businessImpactClass, "ENABLES_QUALIFIED_DEMAND_EXPERIMENT");
  assert.equal(observation.businessEvidence.evidenceId, evidence.id);
  assert.equal(observation.unit, "accepted-carrier-origin-hour");
  assert.equal(observation.minimumUsableQuantity, 1);
  assert.equal(observation.maximumUsefulQuantity, 1);
});

test("observer records evidence and observation before deriving and recording policy", async () => {
  const store = memoryStore();
  const receipt = await observeUnionMediaLocalNeeds({ product, solicitation, publicOriginProbe: probe, recordedAt, store });
  assert.equal(receipt.type, "TTIUnionMediaLocalNeedsObservationReceipt");
  assert.equal(receipt.resourceClass, "operations");
  assert.equal(receipt.cashRevenueRecognized, false);
  assert.equal(receipt.monetaryProfitRecognized, false);
  assert.equal(store.records(UNION_MEDIA_BUSINESS_EVIDENCE_CATEGORY)[0].id, receipt.evidenceId);
  assert.equal(store.records(UNION_MEDIA_RESOURCE_NEED_CATEGORY)[0].id, receipt.observationId);
  const policy = store.records(UNION_MEDIA_LOCAL_NEEDS_POLICY_CATEGORY)[0];
  assert.equal(policy.id, receipt.policyId);
  assert.deepEqual(policy.needs.map((need) => need.resourceClass), ["operations"]);
  assert.equal(policy.globalValueClaim, false);
  assert.equal(policy.currency, false);
  assert.equal(policy.operatorNumericRanksAccepted, false);
});

test("observer refuses stale product claims and malformed origin probes", () => {
  assert.throws(() => formUnionMediaCurrentOperationsNeed({ product: { ...product, launchExperiment: { ...product.launchExperiment, status: "closed" } }, solicitation, publicOriginProbe: probe, recordedAt }), /not live/u);
  assert.throws(() => formUnionMediaCurrentOperationsNeed({ product, solicitation, publicOriginProbe: { host: "wrong.example", status: "unresolvable", evidence: "dns-enotfound" }, recordedAt }), /probe/u);
  assert.throws(() => formUnionMediaCurrentOperationsNeed({ product, solicitation: { ...solicitation, lots: [...solicitation.lots].reverse() }, publicOriginProbe: probe, recordedAt }), /three-lot/u);
  assert.throws(() => formUnionMediaCurrentOperationsNeed({ product, solicitation, publicOriginProbe: { ...probe, evidence: "operator-assertion" }, recordedAt }), /probe evidence/u);
});

test("temporary DNS uncertainty fails closed instead of becoming scarcity evidence", async () => {
  const error = Object.assign(new Error("temporary DNS failure"), { code: "EAI_AGAIN" });
  const { probeUnionMediaPublicOrigin } = await import("../lib/management/observe-union-media-local-needs.mjs");
  await assert.rejects(() => probeUnionMediaPublicOrigin({ lookup: async () => { throw error; } }), /temporary DNS failure/u);
});
