import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assayLegacyCapitalRecoveryPreflight, recordLegacyCapitalRecoveryPreflight }
  from "./legacy-capital-recovery-preflight.mjs";
import { observeLegacyRecoveryContractFingerprints, recordLegacyRecoveryContractFingerprintObservation }
  from "./legacy-recovery-contract-fingerprint-observation.mjs";
import { procureFixedBlockContractIdentities } from "./procure-fixed-block-contract-identities.mjs";
import { refreshLegacyCapitalRecoveryPreflight } from "./refresh-legacy-capital-recovery-preflight.mjs";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.legacy-recovery-evidence-window-orchestration";
const PROFILE = "org.emsenn.agrodao.legacy-recovery-evidence-window-orchestration.v1";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return value;
}

function assertReadOnlyGate(name, gate) {
  if (gate?.executionAdmitted !== false || gate?.transactionAssembly !== false
    || gate?.signing !== false || gate?.broadcast !== false || gate?.chainMutation !== false) {
    throw new TypeError(`${name} widened the evidence-only authority`);
  }
}

function projection(value) {
  return { digest: value?.digest ?? null, documentNi: value?.documentNi ?? null,
    networkReference: value?.reference ?? null };
}

function assertContentIdentity(name, value, identify) {
  const { id, ...body } = value ?? {};
  if (!NI.test(id ?? "") || id !== identify(body)) {
    throw new TypeError(`${name} content identity is invalid`);
  }
  return value;
}

function identityByCandidate(observation) {
  assertContentIdentity("fixed-block observation", observation,
    (body) => ethereumObservationId("ethereum.fixed-block-contract-identity-observation", body));
  if (!Array.isArray(observation?.candidates)) {
    throw new TypeError("fixed-block procurement must return content-identified candidate evidence");
  }
  assertReadOnlyGate("fixed-block procurement", observation.gate);
  const entries = observation.candidates.map((candidate) => {
    if (typeof candidate?.candidateId !== "string" || typeof candidate?.chain !== "string"
      || candidate?.current == null || candidate?.baseline == null) {
      throw new TypeError("fixed-block comparison candidate is malformed");
    }
    if (candidate.comparisonComplete === true
      && (!NI.test(candidate.baseline.identity ?? "") || !NI.test(candidate.current.identity ?? ""))) {
      throw new TypeError(`${candidate.candidateId} asserts a complete comparison without exact identities`);
    }
    const identitiesEqual = candidate.baseline.identity === candidate.current.identity;
    if (candidate.comparisonComplete === true && candidate.unchanged !== identitiesEqual) {
      throw new TypeError(`${candidate.candidateId} unchanged flag disagrees with its exact identities`);
    }
    if (candidate.comparisonComplete !== true && candidate.unchanged === true) {
      throw new TypeError(`${candidate.candidateId} cannot be unchanged without a complete comparison`);
    }
    return [candidate.candidateId, candidate];
  });
  if (new Set(entries.map(([candidateId]) => candidateId)).size !== entries.length) {
    throw new TypeError("fixed-block observation contains duplicate candidate identifiers");
  }
  return new Map(entries);
}

export function enrichLegacyRecoveryPreflightInput(input, fixedBlockObservation, assayedAtIso) {
  iso("assayedAtIso", assayedAtIso);
  if (input == null || typeof input !== "object" || !Array.isArray(input.candidates)) {
    throw new TypeError("a refreshed preflight input is required");
  }
  const assayedAt = String(Math.floor(Date.parse(assayedAtIso) / 1_000));
  const comparisons = identityByCandidate(fixedBlockObservation);
  const inputCandidateIds = new Set(input.candidates.map(({ candidateId }) => candidateId));
  for (const candidateId of comparisons.keys()) {
    if (!inputCandidateIds.has(candidateId)) throw new TypeError(`${candidateId} is not present in the refreshed candidate set`);
  }
  const candidates = input.candidates.map((candidate) => {
    const comparison = comparisons.get(candidate.candidateId);
    if (comparison != null && comparison.chain !== candidate.chain?.caip2) {
      throw new TypeError(`${candidate.candidateId} fixed-block chain differs from the refreshed candidate`);
    }
    const exactCurrent = comparison?.current;
    if (exactCurrent != null && BigInt(exactCurrent.timestamp) > BigInt(assayedAt)) {
      throw new TypeError(`${candidate.candidateId} exact block timestamp is later than the final assay time`);
    }
    const complete = comparison?.comparisonComplete === true;
    const sourceUrls = [...new Set([exactCurrent?.sourceUrl, ...candidate.sourceUrls].filter(Boolean))].slice(0, 16);
    return { ...candidate, current: { ...candidate.current,
      headBlock: exactCurrent?.block ?? candidate.current.headBlock,
      headTimestamp: exactCurrent?.timestamp ?? candidate.current.headTimestamp,
      observedAt: assayedAt,
      contractFingerprintObservationComplete: complete,
      contractFingerprintBaseline: complete ? comparison.baseline.identity : candidate.current.contractFingerprintBaseline,
      contractFingerprintCurrent: complete ? comparison.current.identity : candidate.current.contractFingerprintCurrent,
    }, sourceUrls };
  });
  return { ...input, assayedAt, candidates };
}

export async function recordLegacyRecoveryEvidenceWindow(result, options = {}) {
  const { id, ...body } = result ?? {};
  if (result?.profile !== PROFILE
    || id !== semanticId("agrodao.recovery-evidence-window-result", body)) {
    throw new TypeError("a valid content-identified recovery evidence-window result is required");
  }
  assertReadOnlyGate("orchestration", result.gate);
  const recordedAt = iso("recordedAt", options.recordedAt ?? result.completedAt);
  if (Date.parse(recordedAt) < Date.parse(result.completedAt)) throw new TypeError("recordedAt cannot precede completion");
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("evidence-window orchestration requires AGRODAO's settlement store");
  }
  const record = { type: "LegacyRecoveryEvidenceWindowOrchestrationRecord", owner: "urn:ame:agrodao",
    orchestration: result, recordedAt, decisionBoundary: result.gate };
  const recorded = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection: recorded };
}

export async function orchestrateLegacyRecoveryEvidenceWindow({ recoveryRecords, fleet,
  clock = () => new Date().toISOString(), refresh = refreshLegacyCapitalRecoveryPreflight,
  observeFingerprints = observeLegacyRecoveryContractFingerprints,
  recordFingerprints = recordLegacyRecoveryContractFingerprintObservation,
  procureIdentities = procureFixedBlockContractIdentities,
  recordPreflight = recordLegacyCapitalRecoveryPreflight,
  recordOrchestration = recordLegacyRecoveryEvidenceWindow,
  refreshOptions = {}, fingerprintOptions = {}, procurementOptions = {}, preflightOptions = {},
  orchestrationOptions = {} } = {}) {
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const startedAt = iso("clock()", clock());
  let lastTime = Date.parse(startedAt);
  const nextTime = () => {
    const value = iso("clock()", clock());
    if (Date.parse(value) < lastTime) throw new TypeError("component timestamps must be monotone");
    lastTime = Date.parse(value);
    return value;
  };
  const refreshed = await refresh({ records: recoveryRecords, fleet, now: startedAt, ...refreshOptions });
  if (iso("refreshed.recordedAt", refreshed.recordedAt) !== startedAt) {
    throw new TypeError("holdings refresh must bind the evidence-window start time");
  }
  const provisional = assayLegacyCapitalRecoveryPreflight(refreshed.input);
  assertReadOnlyGate("provisional preflight", provisional.gate);

  const fingerprintObservedAt = nextTime();
  const fingerprint = await observeFingerprints({ records: [{ recordedAt: refreshed.recordedAt,
    preflight: provisional }], fleet, now: fingerprintObservedAt, ...fingerprintOptions });
  assertContentIdentity("fingerprint observation", fingerprint,
    (body) => semanticId("agrodao.legacy-recovery-contract-fingerprint-observation", body));
  if (fingerprint?.gate?.publicEvidenceOnly !== true
    || fingerprint?.gate?.exactHeadBinding !== false || fingerprint?.gate?.baselineComparisonComplete !== false) {
    throw new TypeError("fingerprint component returned evidence outside its public current-identity boundary");
  }
  assertReadOnlyGate("fingerprint component", fingerprint.gate);
  const fingerprintRecordedAt = nextTime();
  const fingerprintRecord = await recordFingerprints(fingerprint,
    { recordedAt: fingerprintRecordedAt, ...fingerprintOptions.recordOptions });

  const identityRecordedAt = nextTime();
  const identities = await procureIdentities({ recoveryRecords,
    fingerprintRecords: [{ recordedAt: fingerprintRecordedAt, observation: fingerprint }], fleet,
    recordedAt: identityRecordedAt, ...procurementOptions });
  const comparisons = identityByCandidate(identities.observation);

  const completedAt = nextTime();
  const enrichedInput = enrichLegacyRecoveryPreflightInput(refreshed.input, identities.observation, completedAt);
  const preflight = await recordPreflight(enrichedInput, { recordedAt: completedAt, ...preflightOptions });
  const expectedPreflight = assayLegacyCapitalRecoveryPreflight(enrichedInput);
  if (preflight?.result?.id !== expectedPreflight.id) {
    throw new TypeError("final preflight is not bound to the enriched evidence input");
  }
  assertReadOnlyGate("final preflight", preflight.result.gate);

  const finalById = new Map(preflight.result.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const candidateDispositions = enrichedInput.candidates.map(({ candidateId }) => ({ candidateId,
    contractComparisonComplete: comparisons.get(candidateId)?.comparisonComplete === true,
    contractUnchanged: comparisons.get(candidateId)?.unchanged === true,
    disposition: finalById.get(candidateId)?.disposition ?? "missing-final-disposition" }));
  const complete = candidateDispositions.filter((candidate) => candidate.contractComparisonComplete);
  const unchanged = complete.filter((candidate) => candidate.contractUnchanged);
  const resultBody = { profile: PROFILE,
    outcome: "completed-legacy-recovery-evidence-window", startedAt, completedAt,
    candidateCount: String(candidateDispositions.length), exactComparisonCompleteCount: String(complete.length),
    exactUnchangedCount: String(unchanged.length), residueCount: String(candidateDispositions.length - complete.length),
    components: { provisionalPreflight: provisional.id, fingerprintObservation: fingerprint.id,
      fixedBlockObservation: identities.observation.id, finalPreflight: preflight.result.id },
    projections: { fingerprint: projection(fingerprintRecord.projection),
      fixedBlockProvider: projection(identities.provider?.projection),
      fixedBlockCustomer: projection(identities.projection), finalPreflight: projection(preflight.projection) },
    ownershipBinding: "public holdings were observed within the evidence window, not proven at the exact identity block",
    candidateDispositions,
    gate: { publicEvidenceOnly: true, exactBlockOwnershipProven: false, fixedForkSimulationComplete: false,
      priceEvidenceComplete: false, legalScopeComplete: false, taxScopeComplete: false,
      executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  const result = { id: semanticId("agrodao.recovery-evidence-window-result", resultBody), ...resultBody };
  const orchestration = await recordOrchestration(result, { recordedAt: completedAt, ...orchestrationOptions });
  return { refreshed, provisional, fingerprint: fingerprintRecord, identities, enrichedInput,
    preflight, result, orchestration };
}

export const LEGACY_RECOVERY_EVIDENCE_WINDOW_PROFILE = PROFILE;
export const LEGACY_RECOVERY_EVIDENCE_WINDOW_RECORD_CATEGORY = RECORD_CATEGORY;
