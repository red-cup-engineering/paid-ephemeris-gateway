import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_ACTION_ADMISSION_PRODUCT,
  MarketActionAdmissionRefusal,
  evaluateMarketActionAdmission,
  normalizeMarketActionAdmissionRequest,
} from "../src/market-action-admission.mjs";

const SNAPSHOT = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const VENUE = "urn:venue:gmx-v2:eip155:42161";
const INSTRUMENT = "urn:instrument:gmx:eth-usd-perpetual";

function evidence(overrides = {}) {
  return {
    id: "a-funding-rate",
    type: "CustomerDeclaredMarketObservation",
    snapshot: SNAPSHOT,
    metric: "funding-rate-bps",
    value: "12",
    unit: "bps",
    observedAt: "2026-07-22T18:00:00.000Z",
    source: "https://example.com/public-market-snapshot",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    type: "MarketActionAdmissionRequest",
    version: 1,
    candidate: {
      type: "CandidateMarketAction",
      action: "SELL",
      venue: VENUE,
      instrument: INSTRUMENT,
      side: "LONG",
      notionalUsdMicros: "25000000",
      leverageBps: "20000",
    },
    anchor: {
      type: "ImmutableMarketDecisionAnchor",
      snapshot: SNAPSHOT,
      decisionAt: "2026-07-22T18:00:30.000Z",
      expiresAt: "2026-07-22T18:05:30.000Z",
    },
    evidence: [evidence()],
    policy: {
      type: "MarketActionAdmissionPolicy",
      version: 1,
      clauses: [
        { id: "a-action", type: "ActionIn", actions: ["SELL"] },
        { id: "b-venue", type: "VenueIn", venues: [VENUE] },
        { id: "c-instrument", type: "InstrumentIn", instruments: [INSTRUMENT] },
        { id: "d-notional", type: "NotionalUsdMicrosAtMost", value: "50000000" },
        { id: "e-leverage", type: "LeverageBpsAtMost", value: "30000" },
        { id: "f-funding-floor", type: "EvidenceAtLeast", evidenceId: "a-funding-rate", threshold: "-20", unit: "bps" },
        { id: "g-funding-cap", type: "EvidenceAtMost", evidenceId: "a-funding-rate", threshold: "25", unit: "bps" },
        { id: "h-fresh", type: "EvidenceFreshWithin", evidenceId: "a-funding-rate", seconds: "60" },
      ],
    },
    receiptProfile: "full-v1",
    ...overrides,
  };
}

test("admits a candidate only when every exact condition passes", () => {
  const receipt = evaluateMarketActionAdmission(request());
  assert.equal(receipt.verdict, "ADMIT");
  assert.equal(receipt.clauseResults.length, 8);
  assert.ok(receipt.clauseResults.every((result) => result.disposition === "PASS"));
  assert.equal(receipt.evidenceReferences.length, 1);
  assert.match(receipt.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.deepEqual(receipt.forbiddenEffects, {
    credentials: false, custody: false, marketDataFetch: false, prediction: false,
    transactionAssembly: false, signing: false, orderPlacement: false, broadcast: false, stateMutation: false,
  });
});

test("REFUSE takes precedence over ESCALATE", () => {
  const value = request();
  value.candidate.notionalUsdMicros = "50000001";
  value.policy.clauses[5].evidenceId = "missing-evidence";
  const receipt = evaluateMarketActionAdmission(value);
  assert.equal(receipt.verdict, "REFUSE");
  assert.ok(receipt.clauseResults.some((result) => result.disposition === "FAIL"));
  assert.ok(receipt.clauseResults.some((result) => result.disposition === "ESCALATE"));
});

test("missing referenced evidence escalates without inventing a fact", () => {
  const value = request();
  value.policy.clauses = [{ id: "a-required", type: "EvidenceAtMost",
    evidenceId: "missing-evidence", threshold: "10", unit: "bps" }];
  const receipt = evaluateMarketActionAdmission(value);
  assert.equal(receipt.verdict, "ESCALATE");
  assert.equal(receipt.clauseResults[0].actual, null);
  assert.deepEqual(receipt.clauseResults[0].evidenceReferences, []);
});

test("unit mismatch escalates and preserves both units", () => {
  const value = request();
  value.policy.clauses = [{ id: "a-cap", type: "EvidenceAtMost",
    evidenceId: "a-funding-rate", threshold: "20", unit: "ppm" }];
  const receipt = evaluateMarketActionAdmission(value);
  assert.equal(receipt.verdict, "ESCALATE");
  assert.deepEqual(receipt.clauseResults[0].actual, { value: "12", unit: "bps" });
  assert.deepEqual(receipt.clauseResults[0].expected, { value: "20", unit: "ppm" });
});

test("freshness is replayed against decisionAt rather than wall-clock time", () => {
  const value = request();
  value.policy.clauses = [{ id: "a-fresh", type: "EvidenceFreshWithin",
    evidenceId: "a-funding-rate", seconds: "29" }];
  const receipt = evaluateMarketActionAdmission(value);
  assert.equal(receipt.verdict, "REFUSE");
  assert.deepEqual(receipt.clauseResults[0].actual, { seconds: "30" });
});

test("signed evidence quantities compare exactly without floating point", () => {
  const value = request();
  value.evidence[0].value = "-12";
  value.policy.clauses = [
    { id: "a-floor", type: "EvidenceAtLeast", evidenceId: "a-funding-rate", threshold: "-13", unit: "bps" },
    { id: "b-cap", type: "EvidenceAtMost", evidenceId: "a-funding-rate", threshold: "-12", unit: "bps" },
  ];
  assert.equal(evaluateMarketActionAdmission(value).verdict, "ADMIT");
});

test("identical requests produce identical frozen receipts", () => {
  const first = evaluateMarketActionAdmission(request());
  const second = evaluateMarketActionAdmission(request());
  assert.equal(first.id, second.id);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.replay.normalizedRequest), true);
  assert.throws(() => { first.verdict = "REFUSE"; }, /read only|Cannot assign/u);
});

test("refuses secrets and execution authority at any nesting depth", () => {
  const withSecret = request();
  withSecret.policy.privateKey = "not-a-key";
  assert.throws(() => normalizeMarketActionAdmissionRequest(withSecret), (error) =>
    error instanceof MarketActionAdmissionRefusal && error.code === "forbidden-authority" && error.path === "$.policy.privateKey");
  const withOrder = request();
  withOrder.candidate.orderPlacement = true;
  assert.throws(() => normalizeMarketActionAdmissionRequest(withOrder), /forbidden field 'orderPlacement'/u);
});

test("refuses noncanonical order, duplicate ids, floats, and negative zero", () => {
  const unsorted = request();
  unsorted.policy.clauses = [unsorted.policy.clauses[1], unsorted.policy.clauses[0]];
  assert.throws(() => normalizeMarketActionAdmissionRequest(unsorted), /clauses must have unique ids and be sorted/u);
  const duplicate = request();
  duplicate.evidence.push(evidence());
  assert.throws(() => normalizeMarketActionAdmissionRequest(duplicate), /evidence ids must be unique/u);
  const floating = request();
  floating.candidate.notionalUsdMicros = "1.5";
  assert.throws(() => normalizeMarketActionAdmissionRequest(floating), /not canonical/u);
  const negativeZero = request();
  negativeZero.evidence[0].value = "-0";
  assert.throws(() => normalizeMarketActionAdmissionRequest(negativeZero), /not canonical/u);
});

test("refuses inconsistent anchors, future evidence, and oversized decision windows", () => {
  const expired = request();
  expired.anchor.expiresAt = expired.anchor.decisionAt;
  assert.throws(() => normalizeMarketActionAdmissionRequest(expired), /expiry must follow/u);
  const tooLong = request();
  tooLong.anchor.expiresAt = "2026-07-24T18:00:30.000Z";
  assert.throws(() => normalizeMarketActionAdmissionRequest(tooLong), /no more than 86400/u);
  const future = request();
  future.evidence[0].observedAt = "2026-07-22T18:00:31.000Z";
  assert.throws(() => normalizeMarketActionAdmissionRequest(future), /cannot follow decisionAt/u);
  const drifted = request();
  drifted.evidence[0].snapshot = "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
  assert.throws(() => normalizeMarketActionAdmissionRequest(drifted), /snapshot must equal/u);
});

test("HOLD requires no directional side", () => {
  const value = request();
  value.candidate.action = "HOLD";
  assert.throws(() => normalizeMarketActionAdmissionRequest(value), /HOLD requires side NONE/u);
  value.candidate.side = "NONE";
  value.policy.clauses = [{ id: "a-action", type: "ActionIn", actions: ["HOLD"] }];
  assert.equal(evaluateMarketActionAdmission(value).verdict, "ADMIT");
});

test("declares a deployment-neutral broker decision product without payout identity", () => {
  assert.equal(MARKET_ACTION_ADMISSION_PRODUCT.provider, "urn:ame:blockchain-trashpanda");
  assert.equal(MARKET_ACTION_ADMISSION_PRODUCT.skill.id, "admit-market-action");
  assert.equal(MARKET_ACTION_ADMISSION_PRODUCT.inference, false);
  assert.equal(MARKET_ACTION_ADMISSION_PRODUCT.execution, "none");
  assert.equal(Object.hasOwn(MARKET_ACTION_ADMISSION_PRODUCT, "payTo"), false);
});
