import assert from "node:assert/strict";
import test from "node:test";

import { assayLegacyCapitalRecoveryPreflight, recordLegacyCapitalRecoveryPreflight }
  from "../src/legacy-capital-recovery-preflight.mjs";

const ID = (character) => `ni:///sha-256;${character.repeat(43)}`;

function candidate(overrides = {}) {
  const value = {
    candidateId: "sigmund-dexfi-38a280",
    wallet: "SIGMUND",
    protocol: "DexFi",
    chain: { caip2: "eip155:8453" },
    baseline: { assayId: ID("A"), disposition: "recover-now", snapshotBlock: "1000",
      snapshotTimestamp: "1000", netMicroUsdAfterFeeCeiling: "2000000" },
    current: { headBlock: "1100", headTimestamp: "1900", observedAt: "1950",
      fixedForkBlock: "1100", fixedForkTimestamp: "1900", fixedForkSimulationComplete: true,
      positionObservationComplete: true, positionStillOwned: true, outputVerified: true, gasEstimated: true,
      contractFingerprintObservationComplete: true,
      priceTimestamp: "1850", grossMicroUsdFloor: "2000000", executionFeeMicroUsdCeil: "100000",
      netMicroUsdAfterFeeCeiling: "1900000", contractFingerprintBaseline: ID("B"),
      contractFingerprintCurrent: ID("B"), legalScopeDeterminationCompleted: true, legalRecordId: ID("L"),
      legalAcceptanceRequired: false, legalAcceptanceCompleted: false,
      taxScopeDeterminationCompleted: true, taxReviewRequired: true, taxReviewCompleted: true,
      taxRecordId: ID("T") },
    policy: { maximumHeadAgeSeconds: "100", maximumPriceAgeSeconds: "100",
      maximumAssayDelaySeconds: "100", executionWindowSeconds: "300", minimumNetRetentionBps: "9000",
      maximumDragBps: "1000", minimumCurrentNetMicroUsd: "100000" },
    sourceUrls: ["https://base.blockscout.com/blocks/1100", "https://docs.dexfi.com/dexvaults/asset-deposits-withdrawals"],
  };
  return { ...value, ...overrides, baseline: { ...value.baseline, ...overrides.baseline },
    current: { ...value.current, ...overrides.current }, policy: { ...value.policy, ...overrides.policy } };
}

function fixture(...candidates) {
  return { profile: "org.emsenn.agrodao.legacy-capital-recovery-preflight.v1", assayedAt: "2000",
    authority: { publicEvidenceOnly: true, fixedForkEvidenceOnly: true, liveMutation: false,
      transactionAssembly: false, signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: candidates.length === 0 ? [candidate()] : candidates };
}

test("fresh same-head evidence can become expiring human-review-ready without execution authority", () => {
  const result = assayLegacyCapitalRecoveryPreflight(fixture());
  const row = result.candidates[0];
  assert.equal(row.disposition, "human-review-ready");
  assert.equal(row.expiresAt, "2300");
  assert.equal(row.economics.dragBpsCeil, "500");
  assert.equal(row.economics.netRetentionBpsFloor, "9500");
  assert.equal(row.gate.humanReviewReady, true);
  assert.equal(row.gate.executionAdmitted, false);
  assert.equal(result.gate.executionAdmitted, false);
});

test("disposition precedence is position, contract, staleness, legal, tax, evidence, then economics", () => {
  const rows = [
    candidate({ candidateId: "position-missing", current: { positionStillOwned: false,
      contractFingerprintCurrent: ID("C"), fixedForkBlock: "1099" } }),
    candidate({ candidateId: "contract-changed", current: { contractFingerprintCurrent: ID("C"),
      fixedForkBlock: "1099" } }),
    candidate({ candidateId: "stale-evidence", current: { fixedForkBlock: "1099" },
      currentMarker: "ignored" }),
    candidate({ candidateId: "legal-blocked", current: { legalAcceptanceRequired: true,
      legalAcceptanceCompleted: false } }),
    candidate({ candidateId: "tax-review-blocked", current: { taxReviewCompleted: false } }),
    candidate({ candidateId: "further-assay", current: { outputVerified: false } }),
    candidate({ candidateId: "economics-degraded", current: { grossMicroUsdFloor: "200000",
      executionFeeMicroUsdCeil: "100000", netMicroUsdAfterFeeCeiling: "100000" } }),
  ];
  const result = assayLegacyCapitalRecoveryPreflight(fixture(...rows));
  assert.deepEqual(Object.fromEntries(result.candidates.map(({ candidateId, disposition }) => [candidateId, disposition])), {
    "position-missing": "position-missing",
    "contract-changed": "contract-changed",
    "stale-evidence": "stale-evidence",
    "legal-blocked": "legal-blocked",
    "tax-review-blocked": "tax-review-blocked",
    "further-assay": "further-assay",
    "economics-degraded": "economics-degraded",
  });
});

test("an incomplete position observation cannot falsely claim the position is missing", () => {
  const result = assayLegacyCapitalRecoveryPreflight(fixture(candidate({
    current: { positionObservationComplete: false, positionStillOwned: false },
  })));
  assert.equal(result.candidates[0].disposition, "further-assay");
});

test("incomplete contract, legal-scope, and tax-scope evidence cannot become human-review-ready", () => {
  const rows = [
    candidate({ candidateId: "contract-incomplete", current: { contractFingerprintObservationComplete: false } }),
    candidate({ candidateId: "legal-scope-incomplete", current: { legalScopeDeterminationCompleted: false,
      legalRecordId: "" } }),
    candidate({ candidateId: "tax-scope-incomplete", current: { taxScopeDeterminationCompleted: false,
      taxReviewRequired: false, taxReviewCompleted: false, taxRecordId: "" } }),
  ];
  const result = assayLegacyCapitalRecoveryPreflight(fixture(...rows));
  assert.deepEqual(result.candidates.map(({ disposition }) => disposition),
    ["further-assay", "legal-blocked", "tax-review-blocked"]);
});

test("baseline assay identity and diagnostic fields determine stable result identity", () => {
  const first = assayLegacyCapitalRecoveryPreflight(fixture());
  const second = assayLegacyCapitalRecoveryPreflight(fixture());
  assert.equal(first.id, second.id);
  const changed = assayLegacyCapitalRecoveryPreflight(fixture(candidate({ baseline: { assayId: ID("Z") } })));
  assert.notEqual(first.id, changed.id);
});

test("refuses inconsistent arithmetic, future baseline, unsafe policy, numeric fields, and transaction material", () => {
  assert.throws(() => assayLegacyCapitalRecoveryPreflight(fixture(candidate({
    current: { netMicroUsdAfterFeeCeiling: "1800000" },
  }))), /must equal gross/u);
  assert.throws(() => assayLegacyCapitalRecoveryPreflight(fixture(candidate({
    baseline: { snapshotBlock: "1200" },
  }))), /cannot be later/u);
  assert.throws(() => assayLegacyCapitalRecoveryPreflight(fixture(candidate({
    policy: { executionWindowSeconds: "3601" },
  }))), /freshness bounds/u);
  const numeric = fixture();
  numeric.assayedAt = 2000;
  assert.throws(() => assayLegacyCapitalRecoveryPreflight(numeric), /decimal text/u);
  assert.throws(() => assayLegacyCapitalRecoveryPreflight({ ...fixture(), calldata: "0x1234" }),
    /transaction or secret/u);
});

test("a completed tax/accounting review must bind a content-identified record", () => {
  assert.throws(() => assayLegacyCapitalRecoveryPreflight(fixture(candidate({
    current: { taxReviewCompleted: true, taxRecordId: "" },
  }))), /taxRecordId/u);
});

test("records preflight evidence only through AGRODAO's settlement boundary", async () => {
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return { digest: ID("D") }; } };
  const recorded = await recordLegacyCapitalRecoveryPreflight(fixture(), {
    store, recordedAt: "1970-01-01T00:33:20.000Z" });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.legacy-capital-recovery-preflight");
  assert.equal(writes[0].record.preflight.id, recorded.result.id);
  assert.equal(writes[0].record.decisionBoundary.executionAdmitted, false);
  await assert.rejects(() => recordLegacyCapitalRecoveryPreflight(fixture(), {
    store: { ...store, actor: "urn:ame:not-agrodao" }, recordedAt: "1970-01-01T00:33:20.000Z" }),
  /AGRODAO's contracted settlement store/u);
  await assert.rejects(() => recordLegacyCapitalRecoveryPreflight(fixture(), {
    store, recordedAt: "1970-01-01T00:38:21.000Z" }), /earliest candidate expiry/u);
});
