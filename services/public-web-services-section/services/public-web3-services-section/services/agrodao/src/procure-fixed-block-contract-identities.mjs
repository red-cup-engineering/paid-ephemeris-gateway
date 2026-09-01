import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FIXED_BLOCK_CONTRACT_IDENTITY_ALLOWED_METHODS,
  observeFixedBlockContractIdentities, recordFixedBlockContractIdentityObservation }
  from "@red-cup-engineering/ethereum-services-section/fixed-block-contract-identity-observation";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.fixed-block-contract-identity-procurement";
const PROVIDER_OBJECT_KIND = "ethereum.fixed-block-contract-identity-observation";
const CUSTOMER = "urn:ame:agrodao";
const PROVIDER = "urn:ame:ethereum-services-section";
const ACTIONABLE = new Set(["recover-now", "batch-only"]);
const PROXY_TYPES = new Set(["eip1167", "eip1967", "eip1967_beacon"]);

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}
function latest(records, field) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 128) throw new TypeError(`${field} records must be bounded`);
  return [...records].sort((left, right) => {
    if (!Number.isFinite(Date.parse(left.recordedAt)) || !Number.isFinite(Date.parse(right.recordedAt))) {
      throw new TypeError(`${field} record times must be ISO timestamps`);
    }
    return right.recordedAt.localeCompare(left.recordedAt)
      || String(right[field]?.id ?? "").localeCompare(String(left[field]?.id ?? ""));
  })[0];
}

function latestRecoveryCandidates(records) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 128) throw new TypeError("recovery records must be bounded");
  const selected = new Map();
  for (const record of records) {
    if (!Number.isFinite(Date.parse(record.recordedAt))) throw new TypeError("recovery record time must be ISO");
    const assay = object("recovery assay", record.assay);
    const evidence = object("recovery evidence", record.evidenceInput);
    const byId = new Map(assay.candidates.map((candidate) => [candidate.candidateId, candidate]));
    for (const input of evidence.candidates) {
      const result = byId.get(input.candidateId);
      if (result == null) throw new TypeError("recovery assay contains dangling evidence");
      const row = { recordedAt: record.recordedAt, assayId: assay.id, input, result };
      const prior = selected.get(input.candidateId);
      if (prior == null || row.recordedAt > prior.recordedAt
        || (row.recordedAt === prior.recordedAt && row.assayId > prior.assayId)) selected.set(input.candidateId, row);
    }
  }
  return new Map([...selected].filter(([, row]) => ACTIONABLE.has(row.result.disposition)));
}

function proxyExpectation(root) {
  const proxyType = root.proxyType == null ? "direct" : root.proxyType;
  if (proxyType !== "direct" && !PROXY_TYPES.has(proxyType)) return null;
  if (root.complete !== true || typeof root.address !== "string") return null;
  const implementations = Array.isArray(root.implementations) ? root.implementations : [];
  if (proxyType === "direct") {
    if (implementations.length !== 0) return null;
    return { address: root.address, expectedProxyType: proxyType, expectedImplementationAddress: null };
  }
  if (implementations.length !== 1 || implementations[0]?.complete !== true
    || typeof implementations[0].address !== "string") return null;
  return { address: root.address, expectedProxyType: proxyType,
    expectedImplementationAddress: implementations[0].address };
}

export function buildFixedBlockContractIdentityRequest({ recoveryRecords, fingerprintRecords, fleet } = {}) {
  const recovery = latestRecoveryCandidates(recoveryRecords);
  const currentRecord = latest(fingerprintRecords, "observation");
  const current = object("current fingerprint observation", currentRecord.observation);
  if (!Array.isArray(current.candidates) || current.gate?.publicEvidenceOnly !== true
    || current.gate?.executionAdmitted !== false) throw new TypeError("current fingerprint record is not public read-only evidence");
  const publicFleet = object("fleet", fleet);
  if (!Array.isArray(publicFleet.chains) || publicFleet.authority?.observationOnly !== true
    || publicFleet.authority?.signerMaterialPresent !== false) throw new TypeError("fleet is not a public observation manifest");
  const chainById = new Map(publicFleet.chains.map((chain) => [chain.caip2, chain]));
  const candidates = [];
  for (const candidate of current.candidates) {
    const prior = recovery.get(candidate.candidateId);
    if (prior == null || candidate.observationComplete !== true || !Array.isArray(candidate.roots)) continue;
    const roots = candidate.roots.map(proxyExpectation);
    if (roots.length < 1 || roots.some((root) => root == null)) continue;
    const chain = chainById.get(candidate.chain);
    const head = current.heads?.[candidate.chain];
    if (chain == null || head == null) throw new TypeError(`${candidate.candidateId} lacks chain or head evidence`);
    candidates.push({ candidateId: candidate.candidateId, chain: candidate.chain, rpcUrl: chain.rpcUrl,
      baselineBlock: prior.input.chain.snapshotBlock, currentBlock: head.block, roots });
  }
  candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  if (candidates.length < 1 || candidates.length > 64) throw new TypeError("no bounded fixed-block candidates could be built");
  return { profile: "org.emsenn.evm.fixed-block-contract-identity-observation.v1", authority: {
    publicReadOnly: true, allowedRpcMethods: [...FIXED_BLOCK_CONTRACT_IDENTITY_ALLOWED_METHODS],
    signerMaterialPresent: false, calldata: false, transactionAssembly: false, signing: false,
    broadcast: false, chainMutation: false }, candidates };
}

export async function procureFixedBlockContractIdentities({ recoveryRecords, fingerprintRecords, fleet,
  recordedAt = new Date().toISOString(), observe = observeFixedBlockContractIdentities,
  recordProvider = recordFixedBlockContractIdentityObservation, customerStore, providerOptions = {} } = {}) {
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const request = buildFixedBlockContractIdentityRequest({ recoveryRecords, fingerprintRecords, fleet });
  const observation = await observe(request);
  if (observation?.requestDigest !== ethereumObservationId(PROVIDER_OBJECT_KIND, request)
    || observation?.gate?.executionAdmitted !== false || observation?.gate?.calldata !== false) {
    throw new TypeError("provider returned evidence outside the contracted read-only law");
  }
  const provider = await recordProvider(request, observation, { recordedAt, ...providerOptions });
  const store = customerStore ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== CUSTOMER || typeof store.record !== "function") throw new TypeError("procurement requires AGRODAO's settlement store");
  const body = { type: "FixedBlockContractIdentityProcurementRecord", customer: CUSTOMER, provider: PROVIDER,
    requestDigest: ethereumObservationId(PROVIDER_OBJECT_KIND, request),
    providerObservation: observation.id, providerProjection: provider.projection?.digest ?? null,
    comparisonCompleteCount: observation.comparisonCompleteCount, unchangedCount: observation.unchangedCount,
    recordedAt, decisionBoundary: { publicEvidenceOnly: true, baselineComparisonEvidence: true,
      executionAdmitted: false, calldata: false, transactionAssembly: false, signing: false,
      broadcast: false, chainMutation: false } };
  const record = { id: semanticId("agrodao.fixed-block-contract-identity-procurement", body), ...body };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { request, observation, provider, record, projection };
}

export const FIXED_BLOCK_CONTRACT_IDENTITY_PROCUREMENT_RECORD_CATEGORY = RECORD_CATEGORY;
