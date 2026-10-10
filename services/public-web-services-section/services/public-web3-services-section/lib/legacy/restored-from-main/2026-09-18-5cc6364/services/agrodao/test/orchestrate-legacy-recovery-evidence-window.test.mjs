import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticId = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const ethereumObservationId = semanticId;
import { assayLegacyCapitalRecoveryPreflight } from "../src/legacy-capital-recovery-preflight.mjs";
import { enrichLegacyRecoveryPreflightInput, orchestrateLegacyRecoveryEvidenceWindow }
  from "../src/orchestrate-legacy-recovery-evidence-window.mjs";

const NI = `ni:///sha-256;${"A".repeat(43)}`;
const BASELINE_IDENTITY = `ni:///sha-256;${"B".repeat(43)}`;
const CURRENT_IDENTITY = BASELINE_IDENTITY;
const sec = (value) => String(Math.floor(Date.parse(value) / 1_000));

function refreshedInput() {
  return { profile: "org.emsenn.agrodao.legacy-capital-recovery-preflight.v1",
    assayedAt: sec("2026-07-22T10:00:00.000Z"), authority: { publicEvidenceOnly: true,
      fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false }, candidates: [{
      candidateId: "yanagi-beefy-test", wallet: "YANAGI", protocol: "Beefy",
      chain: { caip2: "eip155:8453" }, baseline: { assayId: NI, disposition: "recover-now",
        snapshotBlock: "100", snapshotTimestamp: "1", netMicroUsdAfterFeeCeiling: "1000000" },
      current: { headBlock: "200", headTimestamp: sec("2026-07-22T09:59:30.000Z"),
        observedAt: sec("2026-07-22T10:00:00.000Z"), fixedForkBlock: "0", fixedForkTimestamp: "0",
        fixedForkSimulationComplete: false, positionObservationComplete: true, positionStillOwned: true,
        outputVerified: false, gasEstimated: false, contractFingerprintObservationComplete: false,
        priceTimestamp: "0", grossMicroUsdFloor: "1100000", executionFeeMicroUsdCeil: "100000",
        netMicroUsdAfterFeeCeiling: "1000000", contractFingerprintBaseline: NI,
        contractFingerprintCurrent: NI, legalScopeDeterminationCompleted: false, legalRecordId: "",
        legalAcceptanceRequired: false, legalAcceptanceCompleted: false,
        taxScopeDeterminationCompleted: false, taxReviewRequired: true, taxReviewCompleted: false, taxRecordId: "" },
      policy: { maximumHeadAgeSeconds: "900", maximumPriceAgeSeconds: "900",
        maximumAssayDelaySeconds: "120", executionWindowSeconds: "300", minimumNetRetentionBps: "9000",
        maximumDragBps: "1000", minimumCurrentNetMicroUsd: "100000" },
      sourceUrls: ["https://base.blockscout.com/address/0x1111111111111111111111111111111111111111",
        "https://base.blockscout.com/api/v2/blocks?type=block"] }] };
}

function fixedObservation(chain = "eip155:8453") {
  const body = { candidates: [{ candidateId: "yanagi-beefy-test", chain,
    comparisonComplete: true, unchanged: true,
    baseline: { identity: BASELINE_IDENTITY }, current: { identity: CURRENT_IDENTITY, block: "210",
      timestamp: sec("2026-07-22T10:01:30.000Z"), sourceUrl: "https://mainnet.base.org/" } }],
    gate: { publicEvidenceOnly: true, executionAdmitted: false, transactionAssembly: false,
      signing: false, broadcast: false, chainMutation: false } };
  return { id: ethereumObservationId("ethereum.fixed-block-contract-identity-observation", body), ...body };
}

test("projects only complete exact comparisons into the final conservative preflight", () => {
  const enriched = enrichLegacyRecoveryPreflightInput(refreshedInput(), fixedObservation(),
    "2026-07-22T10:02:00.000Z");
  assert.equal(enriched.candidates[0].current.headBlock, "210");
  assert.equal(enriched.candidates[0].current.contractFingerprintObservationComplete, true);
  assert.equal(enriched.candidates[0].current.contractFingerprintBaseline, BASELINE_IDENTITY);
  assert.equal(enriched.candidates[0].sourceUrls[0], "https://mainnet.base.org/");
  assert.equal(assayLegacyCapitalRecoveryPreflight(enriched).candidates[0].disposition, "stale-evidence");
  assert.throws(() => enrichLegacyRecoveryPreflightInput(refreshedInput(), fixedObservation("eip155:42161"),
    "2026-07-22T10:02:00.000Z"), /chain differs/u);
});

test("refuses cross-candidate joins and contradictory comparison claims", () => {
  const { id: ignoredExtraId, ...extraBody } = fixedObservation();
  extraBody.candidates = [{ ...extraBody.candidates[0], candidateId: "sigmund-extra-candidate" }];
  const boundExtra = { id: ethereumObservationId("ethereum.fixed-block-contract-identity-observation", extraBody), ...extraBody };
  assert.throws(() => enrichLegacyRecoveryPreflightInput(refreshedInput(), boundExtra,
    "2026-07-22T10:02:00.000Z"), /not present/u);
  const { id: ignoredContradictionId, ...contradictionBody } = fixedObservation();
  contradictionBody.candidates = contradictionBody.candidates.map((candidate) => ({ ...candidate, unchanged: false }));
  const contradiction = { id: ethereumObservationId("ethereum.fixed-block-contract-identity-observation", contradictionBody), ...contradictionBody };
  assert.throws(() => enrichLegacyRecoveryPreflightInput(refreshedInput(), contradiction,
    "2026-07-22T10:02:00.000Z"), /unchanged flag disagrees/u);
});

test("composes separately recorded public evidence without widening authority", async () => {
  const times = ["2026-07-22T10:00:00.000Z", "2026-07-22T10:00:30.000Z",
    "2026-07-22T10:01:00.000Z", "2026-07-22T10:01:30.000Z", "2026-07-22T10:02:00.000Z"];
  const fingerprintBody = { profile: "org.emsenn.agrodao.legacy-recovery-contract-fingerprint-observation.v1",
    candidates: [], gate: { publicEvidenceOnly: true, exactHeadBinding: false,
      baselineComparisonComplete: false, executionAdmitted: false, transactionAssembly: false,
      signing: false, broadcast: false, chainMutation: false } };
  const fingerprint = { id: semanticId("agrodao.legacy-recovery-contract-fingerprint-observation", fingerprintBody), ...fingerprintBody };
  const result = await orchestrateLegacyRecoveryEvidenceWindow({ recoveryRecords: [{}], fleet: {},
    clock: () => times.shift(),
    refresh: async ({ now }) => ({ recordedAt: now, input: refreshedInput(), observation: {} }),
    observeFingerprints: async () => fingerprint,
    recordFingerprints: async (value) => ({ result: value, projection: { digest: "fingerprint" } }),
    procureIdentities: async () => ({ observation: fixedObservation(), provider: { projection: { digest: "provider" } },
      projection: { digest: "customer" } }),
    recordPreflight: async (input) => ({ result: assayLegacyCapitalRecoveryPreflight(input),
      projection: { digest: "preflight" } }),
    recordOrchestration: async (value) => ({ result: value, projection: { digest: "orchestration" } }) });
  assert.equal(result.result.exactComparisonCompleteCount, "1");
  assert.equal(result.result.exactUnchangedCount, "1");
  assert.equal(result.result.residueCount, "0");
  assert.equal(result.result.gate.executionAdmitted, false);
  assert.match(result.result.ownershipBinding, /not proven/u);
});
