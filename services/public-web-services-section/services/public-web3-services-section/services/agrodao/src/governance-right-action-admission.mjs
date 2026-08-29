import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";


const PROFILE = "org.emsenn.agrodao.governance-right-action-admission.v1";
const RECORD_CATEGORY = "agrodao.governance-right-action-admission";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const UINT = /^(?:0|[1-9][0-9]*)$/u;
const FORBIDDEN = /^(?:calldata|credential|credentials|data|mnemonic|privatekey|rawtransaction|rlp|secret|seedphrase|signature|signedtransaction|transactionrequest)$/iu;
const RIGHT_ACTIONS = Object.freeze({
  "governance-treasury": ["recover-treasury", "preserve-right", "decline"],
  "governance-vote": ["review-governance-vote", "preserve-right", "decline"],
  "reward-claim": ["claim-reward", "preserve-right", "decline"],
  "nft-position": ["preserve-right", "decline"],
});

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}
function exactKeys(name, value, keys) {
  object(name, value);
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) throw new TypeError(`${name} must contain exactly: ${[...keys].sort().join(", ")}`);
}
function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} is not canonical`);
  return value;
}
function quantity(name, value) { return BigInt(text(name, value, UINT)); }
function positive(name, value) { const result = quantity(name, value); if (result === 0n) throw new TypeError(`${name} must be positive`); return result; }
function flag(name, value) { if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`); return value; }
function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  return value;
}
function scan(value, path = "input", seen = new WeakSet()) {
  if (typeof value === "number" || typeof value === "bigint") throw new TypeError(`${path} must encode every integer as decimal text`);
  if (value == null || typeof value !== "object") return;
  if (seen.has(value)) throw new TypeError(`${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) return value.forEach((entry, index) => scan(entry, `${path}[${index}]`, seen));
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN.test(key.replace(/[^a-z]/giu, ""))) throw new TypeError(`${path}.${key} is secret or transaction material and is refused`);
    scan(entry, `${path}.${key}`, seen);
  }
}

function normalize(raw) {
  scan(raw);
  exactKeys("input", raw, ["profile", "evaluatedAt", "evidence", "position", "action", "preflight", "authority"]);
  if (raw.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  const evaluatedAt = positive("evaluatedAt", raw.evaluatedAt);
  exactKeys("evidence", raw.evidence, ["nonfungibleAssayId", "recoveryAssayId", "currentPreflightId", "snapshot"]);
  exactKeys("evidence.snapshot", raw.evidence.snapshot, ["caip2", "block", "blockHash", "observedAt", "expiresAt"]);
  const evidence = {
    nonfungibleAssayId: text("evidence.nonfungibleAssayId", raw.evidence.nonfungibleAssayId, NI),
    recoveryAssayId: text("evidence.recoveryAssayId", raw.evidence.recoveryAssayId, /^(?:|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/u),
    currentPreflightId: text("evidence.currentPreflightId", raw.evidence.currentPreflightId, /^(?:|ni:\/\/\/sha-256;[A-Za-z0-9_-]{43})$/u),
    snapshot: {
      caip2: text("evidence.snapshot.caip2", raw.evidence.snapshot.caip2, /^eip155:[1-9][0-9]*$/u),
      block: positive("evidence.snapshot.block", raw.evidence.snapshot.block),
      blockHash: text("evidence.snapshot.blockHash", raw.evidence.snapshot.blockHash, /^0x[0-9a-f]{64}$/u),
      observedAt: positive("evidence.snapshot.observedAt", raw.evidence.snapshot.observedAt),
      expiresAt: positive("evidence.snapshot.expiresAt", raw.evidence.snapshot.expiresAt),
    },
  };
  if (evidence.snapshot.observedAt > evaluatedAt || evidence.snapshot.expiresAt <= evidence.snapshot.observedAt) throw new TypeError("evidence time order must satisfy observedAt <= evaluatedAt and observedAt < expiresAt");
  exactKeys("position", raw.position, ["id", "wallet", "kind", "protocol", "reference", "caip2"]);
  const kind = text("position.kind", raw.position.kind, /^(?:governance-treasury|governance-vote|reward-claim|nft-position)$/u);
  const position = {
    id: text("position.id", raw.position.id, /^[a-z0-9][a-z0-9-]{2,99}$/u),
    wallet: text("position.wallet", raw.position.wallet, /^(?:YANAGI|SIGMUND)$/u), kind,
    protocol: text("position.protocol", raw.position.protocol, /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,79}$/u),
    reference: text("position.reference", raw.position.reference, /^[a-z0-9][a-z0-9-]{2,119}$/u),
    caip2: text("position.caip2", raw.position.caip2, /^eip155:[1-9][0-9]*$/u),
  };
  if (position.caip2 !== evidence.snapshot.caip2) throw new TypeError("position must be bound to the evidence snapshot chain");
  exactKeys("action", raw.action, ["kind", "recoveryCandidateId", "deadlineAt", "humanSignerRequired"]);
  const actionKind = text("action.kind", raw.action.kind, /^(?:recover-treasury|claim-reward|review-governance-vote|preserve-right|decline)$/u);
  if (!RIGHT_ACTIONS[kind].includes(actionKind)) throw new TypeError("action.kind is incompatible with position.kind");
  const action = {
    kind: actionKind,
    recoveryCandidateId: text("action.recoveryCandidateId", raw.action.recoveryCandidateId, /^(?:|[a-z0-9][a-z0-9-]{2,79})$/u),
    deadlineAt: quantity("action.deadlineAt", raw.action.deadlineAt),
    humanSignerRequired: flag("action.humanSignerRequired", raw.action.humanSignerRequired),
  };
  const recoveryAction = action.kind === "recover-treasury" || action.kind === "claim-reward";
  if (recoveryAction !== Boolean(action.recoveryCandidateId)) throw new TypeError("recoveryCandidateId is required only for recovery or claim actions");
  if (action.humanSignerRequired !== true) throw new TypeError("a governance action must require an external human signer");
  const preflightKeys = ["positionStillOwned", "contractProvenanceComplete", "accountStateComplete", "currentHeadVerified", "noConflictingAction", "legalScopeDisclosed", "legalAcceptanceRequired", "legalAcceptanceCompleted", "taxRecordkeepingReady", "proposalContentVerified"];
  exactKeys("preflight", raw.preflight, preflightKeys);
  const preflight = Object.fromEntries(preflightKeys.map((key) => [key, flag(`preflight.${key}`, raw.preflight[key])]));
  exactKeys("authority", raw.authority, ["publicEvidenceOnly", "intentOnly", "transactionAssembly", "signerMaterialPresent", "signing", "broadcast", "chainMutation"]);
  if (!flag("authority.publicEvidenceOnly", raw.authority.publicEvidenceOnly) || !flag("authority.intentOnly", raw.authority.intentOnly)
      || ["transactionAssembly", "signerMaterialPresent", "signing", "broadcast", "chainMutation"].some((key) => flag(`authority.${key}`, raw.authority[key]))) {
    throw new TypeError("authority must be public-evidence intent-only with no transaction or custody authority");
  }
  return { profile: PROFILE, evaluatedAt, evidence, position, action, preflight,
    authority: { publicEvidenceOnly: true, intentOnly: true, transactionAssembly: false, signerMaterialPresent: false, signing: false, broadcast: false, chainMutation: false } };
}

export function admitGovernanceRightAction(raw) {
  const input = normalize(raw);
  const { action, evidence, position, preflight } = input;
  const fresh = input.evaluatedAt < evidence.snapshot.expiresAt;
  const deadlineOpen = action.deadlineAt === 0n || input.evaluatedAt < action.deadlineAt;
  const recoveryAction = action.kind === "recover-treasury" || action.kind === "claim-reward";
  const recoveryEvidenceBound = !recoveryAction || (NI.test(evidence.recoveryAssayId) && NI.test(evidence.currentPreflightId));
  const proposalEvidenceBound = action.kind !== "review-governance-vote" || preflight.proposalContentVerified;
  const coreEvidenceComplete = preflight.positionStillOwned && preflight.contractProvenanceComplete && preflight.accountStateComplete
    && preflight.currentHeadVerified && preflight.noConflictingAction && preflight.legalScopeDisclosed && preflight.taxRecordkeepingReady;
  let verdict;
  let reasons;
  if (action.kind === "decline") { verdict = "DECLINED"; reasons = ["owner-policy-declines-this-right"]; }
  else if (preflight.legalAcceptanceRequired && !preflight.legalAcceptanceCompleted) { verdict = "LEGAL_HOLD"; reasons = ["legal-acceptance-not-complete"]; }
  else if (!deadlineOpen || !preflight.noConflictingAction) { verdict = "REFUSE"; reasons = [...(!deadlineOpen ? ["review-deadline-expired"] : []), ...(!preflight.noConflictingAction ? ["conflicting-open-action"] : [])]; }
  else if (!fresh || !coreEvidenceComplete || !recoveryEvidenceBound || !proposalEvidenceBound) {
    verdict = "REFRESH_REQUIRED";
    reasons = [...(!fresh ? ["evidence-window-expired"] : []), ...(!coreEvidenceComplete ? ["current-public-preflight-incomplete"] : []), ...(!recoveryEvidenceBound ? ["recovery-evidence-unbound"] : []), ...(!proposalEvidenceBound ? ["proposal-content-unverified"] : [])];
  } else { verdict = "HUMAN_REVIEW_READY"; reasons = ["fresh-conflict-free-public-evidence-ready-for-human-review"]; }
  const result = {
    profile: PROFILE, outcome: "completed-governance-right-action-admission",
    verdict, position, action: { kind: action.kind, recoveryCandidateId: action.recoveryCandidateId, deadlineAt: action.deadlineAt.toString(), humanSignerRequired: true },
    evidence: serializable(evidence),
    gate: { evidenceFresh: fresh, deadlineOpen, coreEvidenceComplete, recoveryEvidenceBound, proposalEvidenceBound,
      humanReviewReady: verdict === "HUMAN_REVIEW_READY", executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false, reasons },
    accounting: { wallet: position.wallet, separateWalletBook: true, taxLotCaptureRequired: true, interWalletTransferPermitted: false },
    replay: { module: "@red-cup-engineering/agrodao/governance-right-action-admission", export: "admitGovernanceRightAction", normalizedInput: serializable(input) },
  };
  return { id: semanticId("agrodao.governance-right-action-admission", { input: serializable(input), result }), ...result };
}

export async function recordGovernanceRightAction(raw, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const result = admitGovernanceRightAction(raw);
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") throw new TypeError("governance-right action requires AGRODAO's contracted settlement store");
  const record = { type: "GovernanceRightActionAdmissionRecord", owner: "urn:ame:agrodao", decision: result, recordedAt,
    decisionBoundary: { intentOnly: true, executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  return { result, record, projection: await store.record({ category: RECORD_CATEGORY, recordedAt, record }) };
}

export const GOVERNANCE_RIGHT_ACTION_ADMISSION_PROFILE = PROFILE;
export const GOVERNANCE_RIGHT_ACTION_ADMISSION_RECORD_CATEGORY = RECORD_CATEGORY;
