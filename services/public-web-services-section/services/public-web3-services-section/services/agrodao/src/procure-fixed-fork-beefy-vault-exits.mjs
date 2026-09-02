import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { observeFixedForkBeefyVaultExits, recordFixedForkBeefyVaultExitObservation }
  from "@red-cup-engineering/ethereum-services-section/fixed-fork-beefy-vault-exit-observation";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.fixed-fork-beefy-vault-exit-procurement";
const CUSTOMER = "urn:ame:agrodao";
const PROVIDER = "urn:ame:ethereum-services-section";

const PROVIDER_OBJECT_KIND = "ethereum.fixed-fork-beefy-vault-exit-observation";
function requestDigest(request) { return ethereumObservationId(PROVIDER_OBJECT_KIND, request); }

export async function procureFixedForkBeefyVaultExits(request, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  if (!Array.isArray(request?.candidates)) throw new TypeError("request candidates must be an array");
  const normalizedRequest = { ...request, candidates: [...request.candidates].sort() };
  const observe = options.observe ?? observeFixedForkBeefyVaultExits;
  const recordProvider = options.recordProvider ?? recordFixedForkBeefyVaultExitObservation;
  const observation = await observe(normalizedRequest, options.providerObservationOptions);
  const { id, ...observationBody } = observation ?? {};
  if (observation?.requestDigest !== requestDigest(normalizedRequest) || id !== ethereumObservationId(PROVIDER_OBJECT_KIND, observationBody)
    || observation?.gate?.fixedForkEvidenceOnly !== true || observation?.gate?.feeCeilingComplete !== true
    || observation?.gate?.priceEvidenceComplete !== false || observation?.gate?.executionAdmitted !== false
    || observation?.gate?.transactionAssembly !== false || observation?.gate?.outputCalldata !== false
    || observation?.gate?.signing !== false || observation?.gate?.broadcast !== false
    || observation?.gate?.chainMutation !== false) {
    throw new TypeError("provider returned evidence outside the contracted fixed-fork law");
  }
  const provider = await recordProvider(normalizedRequest, observation, { recordedAt, ...options.providerRecordOptions });
  const store = options.customerStore ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== CUSTOMER || typeof store.record !== "function") {
    throw new TypeError("procurement requires AGRODAO's settlement store");
  }
  const body = { type: "FixedForkBeefyVaultExitProcurementRecord", customer: CUSTOMER, provider: PROVIDER,
    requestDigest: observation.requestDigest,
    providerObservation: observation.id, providerProjection: provider.projection?.digest ?? null,
    block: observation.block, blockHash: observation.blockHash, candidateCount: observation.candidateCount,
    candidates: observation.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      outputs: candidate.outputs,
      ...(candidate.fee == null ? {} : { totalFeeWeiCeil: candidate.fee.totalFeeWeiCeil }),
      ...(candidate.fullConversion == null ? {} : { fullConversion: candidate.fullConversion }),
      ...(candidate.repayment == null ? {} : { repayment: candidate.repayment }),
      ...(candidate.health == null ? {} : { health: candidate.health }),
    })), recordedAt,
    decisionBoundary: { fixedForkEvidenceOnly: true, priceEvidenceComplete: false,
      executionAdmitted: false, transactionAssembly: false, outputCalldata: false, signing: false,
      broadcast: false, chainMutation: false } };
  const record = { id: semanticId("agrodao.fixed-fork-beefy-vault-exit-procurement", body), ...body };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { request: normalizedRequest, observation, provider, record, projection };
}

export const FIXED_FORK_BEEFY_VAULT_EXIT_PROCUREMENT_RECORD_CATEGORY = RECORD_CATEGORY;
