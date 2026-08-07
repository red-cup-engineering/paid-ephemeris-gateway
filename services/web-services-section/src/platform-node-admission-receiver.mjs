import { createHash, randomUUID } from "node:crypto";
import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  linkSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const rscValueId = (value, objectKind) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";

import CONFIG from "../content/config/platform-node-admission-receiver.json" with { type: "json" };
import SCHEMA from "../lib/schemas/platform-node-admission-receiver.schema.json" with { type: "json" };
import { admitEnterpriseInstall, revalidateEnterpriseInstall } from "../lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js";
import { renameNoReplace } from "./rename-noreplace.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OPERATIONS = "rsc-platform-node-admission-operations";
const RECEIPTS = "rsc-platform-node-admission-receipts";
const HARD_CEILINGS = Object.freeze({ maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 });
const EFFECTS = Object.freeze([
  "receiver-create-only-admission",
  "receiver-rollback-on-partial-failure",
  "provider-local-witness-journal-evidence",
  "provider-runtime-withdrawal",
]);
const OPERATION_SEQUENCE = Object.freeze(["claimed", "prepared", "committed", "receipted"]);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(SCHEMA);
const validateConfiguration = ajv.compile({ $ref: `${SCHEMA.$id}#/$defs/configuration` });
const validateRequest = ajv.compile({ $ref: `${SCHEMA.$id}#/$defs/request` });
const validateReceipt = ajv.compile({ $ref: `${SCHEMA.$id}#/$defs/receipt` });
const validateOperation = ajv.compile({ $ref: `${SCHEMA.$id}#/$defs/operation` });

export class PlatformNodeAdmissionError extends Error {
  constructor(reason, detail = {}, cause) {
    super(reason, { cause });
    this.name = "PlatformNodeAdmissionError";
    this.reason = reason;
    this.detail = Object.freeze(detail);
  }
}

export function semanticDigest(value) {
  return rscValueId(value, "rsc-quiescent.platform-node-admission-record");
}

export function identify(body) {
  return { id: semanticDigest(body), ...body };
}

function withoutId(value) {
  const { id: _id, ...body } = value ?? {};
  return body;
}

export function canonicalNi(value) {
  if (typeof value !== "string" || !value.startsWith("ni:///sha-256;")) return false;
  const encoded = value.slice("ni:///sha-256;".length);
  if (!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(encoded)) return false;
  const bytes = Buffer.from(encoded, "base64url");
  return bytes.byteLength === 32 && bytes.toString("base64url") === encoded;
}

export function contentValid(value) {
  return canonicalNi(value?.id) && value.id === semanticDigest(withoutId(value));
}

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function contains(root, subject) {
  const rel = relative(root, subject);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function canonicalBase64(value) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? bytes : null;
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function normalizedRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !value.startsWith("/") && !value.includes("\\") && !value.includes("\0")
    && value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function pathEntryExists(path) {
  try { lstatSync(path); return true; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

function manifestReason(manifest, configuration) {
  if (manifest.fileCount !== manifest.files.length || manifest.fileCount > configuration.ceilings.maximumFiles) return "manifest-file-account-invalid";
  let totalBytes = 0;
  const paths = [];
  for (const file of manifest.files) {
    if (!normalizedRelativePath(file.path)) return "manifest-path-invalid";
    const bytes = canonicalBase64(file.content);
    if (!bytes || bytes.byteLength !== file.byteLength || sha256(bytes) !== file.sha256) return "manifest-content-invalid";
    totalBytes += bytes.byteLength;
    paths.push(file.path);
  }
  if (new Set(paths).size !== paths.length || paths.some((path, index) => index > 0 && paths[index - 1] >= path)) return "manifest-order-or-uniqueness-invalid";
  if (paths.some((path, index) => paths.some((other, otherIndex) => otherIndex !== index && other.startsWith(`${path}/`)))) return "manifest-file-directory-collision";
  if (totalBytes !== manifest.totalBytes || totalBytes > configuration.ceilings.maximumBytes) return "manifest-byte-account-invalid";
  return null;
}

function expectedIdempotencyKey(request, configuration) {
  return semanticDigest({
    law: configuration.admittedProviderLaw,
    allocationId: request.allocationId,
    nodeId: request.nodeId,
    targetRoot: request.targetRoot,
    manifestDigest: request.manifestDigest,
    receiver: configuration.actor,
    receiverContract: configuration.contract,
  });
}

function canonicalUnlinkedDirectory(path) {
  return typeof path === "string" && path.length > 0 && existsSync(path) && lstatSync(path).isDirectory()
    && !lstatSync(path).isSymbolicLink() && realpathSync(path) === resolve(path);
}

function activationReason(configuration, journal, testOnly) {
  if (!validateConfiguration(configuration)) return "configuration-schema-invalid";
  if (configuration.enabled !== true) return "receiver-disabled";
  if (configuration.contract !== "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA") return "receiver-contract-not-activated";
  for (const key of ["allocationId", "customer", "nodeId", "authorizationAdmission", "authorizationEvidenceDigest", "admittedProviderLaw", "workingRoot"]) {
    if (typeof configuration[key] !== "string" || configuration[key].length === 0) return `receiver-${key}-not-activated`;
  }
  if (![configuration.contract, configuration.authorizationAdmission, configuration.authorizationEvidenceDigest, configuration.admittedProviderLaw].every(canonicalNi)) {
    return "receiver-activation-identity-invalid";
  }
  if (!journal || typeof journal.record !== "function" || typeof journal.records !== "function") return "contracted-witness-journal-unavailable";
  if (!canonicalUnlinkedDirectory(configuration.meshAuthorityRoot)) return "receiver-authority-root-invalid";
  const marker = join(configuration.meshAuthorityRoot, ".git");
  if (!existsSync(marker) || (!statSync(marker).isFile() && !statSync(marker).isDirectory())) return "receiver-authority-worktree-invalid";
  for (const path of [configuration.receiverRoot, configuration.admittedParent, configuration.workingRoot, configuration.witnessJournal?.dataRoot]) {
    if (!canonicalUnlinkedDirectory(path)) return "receiver-owned-root-not-precreated-canonical-directory";
  }
  const receiverRoot = realpathSync(configuration.receiverRoot);
  if (!contains(receiverRoot, realpathSync(configuration.admittedParent)) || !contains(receiverRoot, realpathSync(configuration.workingRoot))
      || !contains(receiverRoot, realpathSync(configuration.witnessJournal.dataRoot))) return "receiver-owned-root-outside-rsc-territory";
  if (configuration.witnessJournal.nodeId !== "rsc-quiescent" || configuration.witnessJournal.actor !== configuration.actor
      || configuration.witnessJournal.settlement !== configuration.actor) return "receiver-witness-journal-identity-mismatch";
  try {
    admitEnterpriseInstall({ authorityRoot: configuration.meshAuthorityRoot, sourceEnterprise: configuration.workingRoot,
      targetNode: configuration.witnessJournal.dataRoot, installer: "codex", operation: "install", mode: "apply" });
  } catch { return "receiver-owned-data-crosses-mesh-boundary"; }
  const temporaryRoot = realpathSync(tmpdir());
  if (testOnly) {
    if (!contains(temporaryRoot, receiverRoot)) return "receiver-test-seam-outside-temporary-territory";
  } else if (receiverRoot !== ROOT) return "receiver-root-not-rsc-quiescent";
  return null;
}

function requestReason(request, configuration) {
  if (!validateRequest(request)) return "request-schema-invalid";
  if (!contentValid(request)) return "request-content-identity-invalid";
  if (request.contract !== configuration.contract || request.receiver !== configuration.actor || request.provider !== configuration.admittedProvider) return "request-contract-or-actor-mismatch";
  if (request.allocationId !== configuration.allocationId || request.customer !== configuration.customer || request.nodeId !== configuration.nodeId) return "request-allocation-mismatch";
  if (request.authorizationAdmission !== configuration.authorizationAdmission || request.authorizationEvidenceDigest !== configuration.authorizationEvidenceDigest) return "request-authorization-mismatch";
  if (request.idempotencyKey !== expectedIdempotencyKey(request, configuration)) return "request-idempotency-key-mismatch";
  if (request.maximumRuntimeMs > configuration.ceilings.maximumRuntimeMs || request.maximumRuntimeMs > HARD_CEILINGS.maximumRuntimeMs) return "request-runtime-widened";
  if (request.effects.length !== EFFECTS.length || request.effects.some((effect, index) => effect !== EFFECTS[index])) return "request-effects-mismatch";
  const parent = realpathSync(configuration.admittedParent);
  const expectedTarget = join(parent, request.nodeId);
  if (request.targetRoot !== expectedTarget || request.manifest.targetRoot !== expectedTarget || request.manifest.nodeId !== request.nodeId) return "request-target-mismatch";
  const manifestIssue = manifestReason(request.manifest, configuration);
  if (manifestIssue) return manifestIssue;
  if (request.manifestDigest !== semanticDigest(request.manifest)) return "manifest-content-identity-invalid";
  return null;
}

export function platformNodeMeshAdmissionRequest(configuration, stage) {
  return {
    authorityRoot: configuration.meshAuthorityRoot,
    sourceEnterprise: stage,
    targetNode: configuration.admittedParent,
    installer: "codex",
    operation: "install",
    mode: "apply",
  };
}

function freshMeshAdmission(configuration, stage) {
  try {
    const request = platformNodeMeshAdmissionRequest(configuration, stage);
    const admission = admitEnterpriseInstall(request);
    if (admission.request.sourceEnterprise !== realpathSync(stage) || admission.request.targetNode !== realpathSync(configuration.admittedParent)) {
      throw new PlatformNodeAdmissionError("receiver-mesh-admission-binding-invalid");
    }
    return admission;
  } catch (error) {
    throw new PlatformNodeAdmissionError("receiver-parent-outside-mesh", error?.facts ?? {}, error);
  }
}

function freshReceiverDataAdmission(configuration) {
  try {
    return admitEnterpriseInstall({ authorityRoot: configuration.meshAuthorityRoot, sourceEnterprise: configuration.workingRoot,
      targetNode: configuration.witnessJournal.dataRoot, installer: "codex", operation: "install", mode: "apply" });
  } catch (error) {
    throw new PlatformNodeAdmissionError("receiver-owned-data-crosses-mesh-boundary", error?.facts ?? {}, error);
  }
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function writeDurableJsonExclusive(path, value) {
  const parent = dirname(path);
  const temporary = join(parent, `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor); descriptor = undefined;
    linkSync(temporary, path);
    syncDirectory(parent);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (pathEntryExists(temporary)) { unlinkSync(temporary); syncDirectory(parent); }
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function mkdirDurable(path, parent) {
  mkdirSync(path, { mode: 0o700 });
  syncDirectory(parent);
}

function ensurePrivateRoots(workingRoot) {
  const canonicalWorking = realpathSync(workingRoot);
  if (canonicalWorking !== resolve(workingRoot) || lstatSync(workingRoot).isSymbolicLink() || !lstatSync(workingRoot).isDirectory()) {
    throw new PlatformNodeAdmissionError("receiver-working-root-not-precreated-private-directory");
  }
  const claims = join(canonicalWorking, "claims");
  if (!pathEntryExists(claims)) mkdirDurable(claims, canonicalWorking);
  const claimsStat = lstatSync(claims);
  if (!claimsStat.isDirectory() || claimsStat.isSymbolicLink() || realpathSync(claims) !== claims) {
    throw new PlatformNodeAdmissionError("receiver-private-claims-root-invalid");
  }
  return claims;
}

function claimDirectory(claimsRoot, idempotencyKey) {
  return join(claimsRoot, idempotencyKey.slice("ni:///sha-256;".length));
}

function assertPrivateClaimDirectory(claimDir, claimsRoot) {
  const stat = lstatSync(claimDir);
  if (!stat.isDirectory() || stat.isSymbolicLink() || dirname(realpathSync(claimDir)) !== claimsRoot || dirname(claimDir) !== claimsRoot) {
    throw new PlatformNodeAdmissionError("receiver-private-claim-directory-invalid");
  }
}

function makeStage(stage, manifest) {
  mkdirSync(stage, { mode: 0o700 });
  for (const file of manifest.files) {
    const output = join(stage, ...file.path.split("/"));
    const parent = dirname(output);
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    const descriptor = openSync(output, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try { writeFileSync(descriptor, Buffer.from(file.content, "base64")); fsyncSync(descriptor); }
    finally { closeSync(descriptor); }
  }
  const directories = new Set([stage]);
  for (const file of manifest.files) {
    let at = dirname(join(stage, ...file.path.split("/")));
    while (at.startsWith(`${stage}${sep}`)) { directories.add(at); at = dirname(at); }
  }
  [...directories].sort((left, right) => right.length - left.length).forEach(syncDirectory);
}

function actualManifestExact(root, manifest) {
  if (!pathEntryExists(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) return false;
  const files = [], directories = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const relativePath = relative(root, path).split(sep).join("/");
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) return false;
      if (stat.isDirectory()) { directories.push(relativePath); if (walk(path) === false) return false; }
      else if (stat.isFile()) files.push(relativePath);
      else return false;
    }
    return true;
  }
  const expectedDirectories = new Set();
  for (const file of manifest.files) {
    const parts = file.path.split("/");
    for (let index = 1; index < parts.length; index += 1) expectedDirectories.add(parts.slice(0, index).join("/"));
  }
  if (walk(root) === false || files.sort().join("\0") !== manifest.files.map((file) => file.path).join("\0")
      || directories.sort().join("\0") !== [...expectedDirectories].sort().join("\0")) return false;
  return manifest.files.every((file) => {
    const bytes = readFileSync(join(root, ...file.path.split("/")));
    return bytes.byteLength === file.byteLength && sha256(bytes) === file.sha256 && bytes.equals(Buffer.from(file.content, "base64"));
  });
}

function operationFor(state, predecessor, request, recordedAt) {
  return identify({
    type: "RscPlatformNodeAdmissionOperation",
    contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA",
    state,
    predecessor,
    request,
    requestDigest: request.id,
    idempotencyKey: request.idempotencyKey,
    targetRoot: request.targetRoot,
    manifestDigest: request.manifestDigest,
    recordedAt,
  });
}

async function appendOperation(journal, state, request, recordedAt) {
  const history = operationHistory(journal, request);
  const states = new Set(history.map((record) => record.state));
  const existing = history.find((record) => record.state === state);
  if (existing) {
    const candidate = operationFor(state, existing.predecessor, request, recordedAt);
    if (candidate.id === existing.id) return existing;
    throw new PlatformNodeAdmissionError("receiver-operation-journal-fork", { state, existing: existing.id, candidate: candidate.id });
  }
  const next = OPERATION_SEQUENCE[states.size];
  const legal = state === next || (state === "refused" && states.has("claimed") && !states.has("committed") && !states.has("receipted"));
  if (!legal) throw new PlatformNodeAdmissionError("receiver-operation-transition-illegal", { state, priorStates: [...states] });
  const priorState = state === "refused" ? OPERATION_SEQUENCE.filter((candidate) => states.has(candidate)).at(-1)
    : OPERATION_SEQUENCE[OPERATION_SEQUENCE.indexOf(state) - 1];
  const predecessor = priorState ? history.find((record) => record.state === priorState).id : null;
  const record = operationFor(state, predecessor, request, recordedAt);
  if (!validateOperation(record) || !contentValid(record)) throw new PlatformNodeAdmissionError("receiver-operation-invalid", { state });
  await journal.record({ category: OPERATIONS, recordedAt, record });
  return record;
}

function operationHistory(journal, request) {
  const records = journal.records(OPERATIONS).filter((record) => record?.idempotencyKey === request.idempotencyKey);
  if (records.some((record) => !validateOperation(record) || !contentValid(record))) {
    throw new PlatformNodeAdmissionError("receiver-operation-journal-contaminated", { idempotencyKey: request.idempotencyKey });
  }
  if (records.some((record) => record.contract !== "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA"
      || record.requestDigest !== request.id || record.request?.id !== request.id
      || record.targetRoot !== request.targetRoot || record.manifestDigest !== request.manifestDigest)) {
    throw new PlatformNodeAdmissionError("receiver-operation-journal-conflict", { idempotencyKey: request.idempotencyKey });
  }
  const byState = new Map();
  for (const record of records) {
    if (!byState.has(record.state)) byState.set(record.state, new Map());
    byState.get(record.state).set(record.id, record);
  }
  for (const [state, identities] of byState) {
    if (identities.size > 1) throw new PlatformNodeAdmissionError("receiver-operation-journal-fork", { state, identities: [...identities.keys()] });
  }
  const ordinary = OPERATION_SEQUENCE.filter((state) => byState.has(state));
  const expected = OPERATION_SEQUENCE.slice(0, ordinary.length);
  if (ordinary.join("\0") !== expected.join("\0")) {
    throw new PlatformNodeAdmissionError("receiver-operation-journal-illegal-transition", { idempotencyKey: request.idempotencyKey, states: ordinary });
  }
  const canonical = ordinary.map((state) => [...byState.get(state).values()][0]);
  for (let index = 0; index < canonical.length; index += 1) {
    const expectedPredecessor = index === 0 ? null : canonical[index - 1].id;
    if (canonical[index].predecessor !== expectedPredecessor) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-predecessor-mismatch", { state: canonical[index].state });
    }
  }
  if (byState.has("refused")) {
    if (!byState.has("claimed") || byState.has("committed") || byState.has("receipted")) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-illegal-transition", { state: "refused" });
    }
    const refused = [...byState.get("refused").values()][0];
    const prior = canonical.at(-1);
    if (!prior || refused.predecessor !== prior.id) throw new PlatformNodeAdmissionError("receiver-operation-journal-predecessor-mismatch", { state: "refused" });
    throw new PlatformNodeAdmissionError("receiver-operation-terminal-refusal", { idempotencyKey: request.idempotencyKey });
  }
  return records;
}

function matchingOperations(journal, request, state) {
  return operationHistory(journal, request).filter((record) => record.state === state);
}

function makeReceipt(request, recordedAt, elapsedMs) {
  return identify({
    type: "ReceiverCreateOnlyAdmissionReceipt",
    contract: request.contract,
    receiver: request.receiver,
    customer: request.customer,
    provider: request.provider,
    allocationId: request.allocationId,
    idempotencyKey: request.idempotencyKey,
    nodeId: request.nodeId,
    targetRoot: request.targetRoot,
    manifestDigest: request.manifestDigest,
    installation: true,
    createOnly: true,
    overwrite: false,
    priorTargetAbsent: true,
    postState: { targetExists: true, manifestDigest: request.manifestDigest, fileCount: request.manifest.fileCount, totalBytes: request.manifest.totalBytes },
    rollback: { ownedByReceiver: true, partialFailureRemovesExactNewTarget: true },
    lifecycle: { providerRuntimeImported: false, continuingAuthority: false, withdrawal: "complete" },
    resourceReceipt: { elapsedMs, network: false, credentialsUsed: false, externalSettlement: false },
    recordedAt,
  });
}

function receiptMatchesRequest(receipt, request) {
  return !request || (receipt.contract === request.contract && receipt.receiver === request.receiver
    && receipt.customer === request.customer && receipt.provider === request.provider
    && receipt.allocationId === request.allocationId && receipt.idempotencyKey === request.idempotencyKey
    && receipt.nodeId === request.nodeId && receipt.targetRoot === request.targetRoot
    && receipt.manifestDigest === request.manifestDigest
    && receipt.postState?.manifestDigest === request.manifestDigest
    && receipt.postState?.fileCount === request.manifest.fileCount
    && receipt.postState?.totalBytes === request.manifest.totalBytes);
}

function acceptedReceipt(records, idempotencyKey, request = null) {
  const matching = records.filter((record) => record?.idempotencyKey === idempotencyKey);
  if (!matching.length) return null;
  if (matching.some((record) => !validateReceipt(record) || !contentValid(record))) throw new PlatformNodeAdmissionError("receiver-receipt-journal-contaminated", { idempotencyKey });
  if (matching.some((record) => !receiptMatchesRequest(record, request))) throw new PlatformNodeAdmissionError("receiver-receipt-journal-conflict", { idempotencyKey });
  if (new Set(matching.map((record) => record.id)).size !== 1) throw new PlatformNodeAdmissionError("receiver-receipt-journal-conflict", { idempotencyKey });
  return matching[0];
}

function claimWitnessValid(claim, request) {
  return exactKeys(claim, ["type", "version", "request", "startedAt", "monotonicStartedNs"])
    && claim.type === "RscPlatformNodeAdmissionClaimWitness" && claim.version === 1
    && claim.request?.id === request.id && contentValid(claim.request) && Number.isFinite(Date.parse(claim.startedAt))
    && /^(?:0|[1-9][0-9]*)$/u.test(claim.monotonicStartedNs);
}

function preparedWitnessValid(prepared, request, claimDir) {
  return exactKeys(prepared, ["type", "version", "requestDigest", "idempotencyKey", "stage", "device", "inode", "preparedAt", "activeElapsedMs"])
    && prepared.type === "RscPlatformNodeAdmissionPreparedWitness" && prepared.version === 1
    && prepared.requestDigest === request.id && prepared.idempotencyKey === request.idempotencyKey
    && dirname(prepared.stage) === claimDir && /^stage-[0-9a-f-]{36}$/u.test(prepared.stage.slice(claimDir.length + 1))
    && Number.isInteger(prepared.device) && prepared.device >= 0 && Number.isInteger(prepared.inode) && prepared.inode > 0
    && Number.isFinite(Date.parse(prepared.preparedAt)) && Number.isFinite(prepared.activeElapsedMs) && prepared.activeElapsedMs >= 0;
}

function publicationWitnessValid(publication, request, prepared) {
  return exactKeys(publication, ["type", "version", "requestDigest", "idempotencyKey", "device", "inode", "recordedAt", "elapsedBeforePublishMs", "receiptElapsedMs"])
    && publication.type === "RscPlatformNodeAdmissionPublicationBudgetWitness" && publication.version === 1
    && publication.requestDigest === request.id && publication.idempotencyKey === request.idempotencyKey
    && publication.device === prepared.device && publication.inode === prepared.inode
    && Number.isFinite(Date.parse(publication.recordedAt)) && Number.isFinite(publication.elapsedBeforePublishMs)
    && publication.elapsedBeforePublishMs >= 0 && publication.elapsedBeforePublishMs < request.maximumRuntimeMs
    && publication.receiptElapsedMs === request.maximumRuntimeMs;
}

function monotonicElapsedMs(startedNs, currentNs) {
  if (typeof currentNs !== "bigint" || currentNs < 0n) throw new PlatformNodeAdmissionError("receiver-monotonic-clock-invalid");
  const started = BigInt(startedNs);
  if (currentNs < started) throw new PlatformNodeAdmissionError("receiver-monotonic-epoch-regressed");
  return Number(currentNs - started) / 1e6;
}

async function durableReceipt({ journal, claimDir, request, prepared, publication, clock, fault }) {
  const existing = acceptedReceipt(journal.records(RECEIPTS), request.idempotencyKey, request);
  if (existing) {
    const history = operationHistory(journal, request);
    const states = new Set(history.map((record) => record.state));
    if (!["claimed", "prepared", "committed"].every((state) => states.has(state))) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-illegal-transition", { idempotencyKey: request.idempotencyKey });
    }
    if (!states.has("receipted")) await appendOperation(journal, "receipted", request, existing.recordedAt);
    return existing;
  }
  const historyBeforeReceipt = operationHistory(journal, request);
  if (historyBeforeReceipt.some((record) => record.state === "receipted")) {
    throw new PlatformNodeAdmissionError("receiver-operation-journal-premature-terminal-state", { state: "receipted" });
  }
  const receiptPath = join(claimDir, "receipt.json");
  let receipt;
  if (pathEntryExists(receiptPath)) receipt = readJson(receiptPath);
  else {
    const recordedAt = clock();
    const elapsedMs = publication.receiptElapsedMs;
    const candidate = makeReceipt(request, recordedAt, elapsedMs);
    try { writeDurableJsonExclusive(receiptPath, candidate); receipt = candidate; }
    catch (error) { if (error?.code !== "EEXIST") throw error; receipt = readJson(receiptPath); }
  }
  if (!validateReceipt(receipt) || !contentValid(receipt)) throw new PlatformNodeAdmissionError("private-receipt-witness-invalid");
  if (!receiptMatchesRequest(receipt, request)) throw new PlatformNodeAdmissionError("private-receipt-witness-mismatch");
  if (!matchingOperations(journal, request, "committed").length) await appendOperation(journal, "committed", request, receipt.recordedAt);
  const prior = acceptedReceipt(journal.records(RECEIPTS), request.idempotencyKey, request);
  if (prior && prior.id !== receipt.id) throw new PlatformNodeAdmissionError("receiver-receipt-journal-conflict", { idempotencyKey: request.idempotencyKey });
  if (!prior) await journal.record({ category: RECEIPTS, recordedAt: receipt.recordedAt, record: receipt });
  await fault?.("afterReceiptRecord", { request, claimDir, receipt });
  if (!matchingOperations(journal, request, "receipted").length) await appendOperation(journal, "receipted", request, receipt.recordedAt);
  return receipt;
}

export function createContractedWitnessJournal({ agentUrl, dataRoot, nodeId, settlement, actor }) {
  if (![agentUrl, dataRoot, nodeId, settlement, actor].every((value) => typeof value === "string" && value.length > 0)) {
    throw new PlatformNodeAdmissionError("contracted-witness-journal-configuration-invalid");
  }
  return Object.freeze({
    async records(category) { return await querySettlementRecords(category); },
    record({ category, recordedAt, record }) {
      return recordSettlementRecord({ agentUrl, settlement, actor, category, recordedAt, record });
    },
  });
}

export function createRscPlatformNodeAdmissionReceiver(options = {}) {
  const configuration = deepFreeze(structuredClone(options.configuration ?? CONFIG));
  const testOnly = options.testOnly === true;
  const customSeam = options.journal !== undefined || options.publish !== undefined || options.fault !== undefined
    || options.clock !== undefined || options.monotonicNow !== undefined;
  if (customSeam && !testOnly) throw new PlatformNodeAdmissionError("receiver-custom-seam-test-only");
  const journal = options.journal ?? (configuration.witnessJournal ? createContractedWitnessJournal(configuration.witnessJournal) : null);
  const publish = options.publish ?? renameNoReplace;
  const clock = options.clock ?? (() => new Date().toISOString());
  const monotonicNow = options.monotonicNow ?? (() => process.hrtime.bigint());
  const fault = options.fault ?? null;
  const activationIssue = activationReason(configuration, journal, testOnly);

  function assertActive() {
    if (activationIssue) throw new PlatformNodeAdmissionError(activationIssue);
  }

  async function ensureClaim(request, claimDir) {
    const claimPath = join(claimDir, "claim.json");
    if (!pathEntryExists(claimPath)) {
      const candidate = {
        type: "RscPlatformNodeAdmissionClaimWitness", version: 1, request, startedAt: clock(),
        monotonicStartedNs: monotonicNow().toString(),
      };
      try { writeDurableJsonExclusive(claimPath, candidate); }
      catch (error) { if (error?.code !== "EEXIST") throw error; }
    }
    const claim = readJson(claimPath);
    if (!claimWitnessValid(claim, request) || claim.request.id !== request.id) throw new PlatformNodeAdmissionError("private-claim-witness-invalid");
    if (!matchingOperations(journal, request, "claimed").length) await appendOperation(journal, "claimed", request, claim.startedAt);
    await fault?.("afterClaim", { request, claimDir });
    return claim;
  }

  async function ensurePrepared(request, claimDir, activeStarted) {
    const preparedPath = join(claimDir, "prepared.json");
    let prepared;
    if (pathEntryExists(preparedPath)) prepared = readJson(preparedPath);
    else {
      if (pathEntryExists(request.targetRoot)) throw new PlatformNodeAdmissionError("target-already-exists");
      const candidateStage = join(claimDir, `stage-${randomUUID()}`);
      try {
        makeStage(candidateStage, request.manifest);
        const stageStat = lstatSync(candidateStage);
        const activeElapsedMs = Number(monotonicElapsedMs(activeStarted.toString(), monotonicNow()).toFixed(3));
        if (activeElapsedMs > request.maximumRuntimeMs) throw new PlatformNodeAdmissionError("receiver-runtime-exhausted", { activeElapsedMs });
        const candidate = {
          type: "RscPlatformNodeAdmissionPreparedWitness", version: 1, requestDigest: request.id,
          idempotencyKey: request.idempotencyKey, stage: candidateStage, device: stageStat.dev, inode: stageStat.ino,
          preparedAt: clock(), activeElapsedMs,
        };
        try { writeDurableJsonExclusive(preparedPath, candidate); prepared = candidate; }
        catch (error) {
          if (error?.code !== "EEXIST") throw error;
          prepared = readJson(preparedPath);
          rmSync(candidateStage, { recursive: true, force: true });
        }
      } catch (error) {
        if (pathEntryExists(candidateStage) && (!prepared || prepared.stage !== candidateStage)) rmSync(candidateStage, { recursive: true, force: true });
        throw error;
      }
    }
    if (!preparedWitnessValid(prepared, request, claimDir)) throw new PlatformNodeAdmissionError("private-prepared-witness-invalid");
    if (!matchingOperations(journal, request, "prepared").length) await appendOperation(journal, "prepared", request, prepared.preparedAt);
    await fault?.("afterPrepared", { request, claimDir });
    return prepared;
  }

  function ensurePublicationBudget(request, claimDir, claim, prepared) {
    const path = join(claimDir, "publication.json");
    let publication;
    if (pathEntryExists(path)) publication = readJson(path);
    else {
      const recordedAt = clock();
      const elapsedBeforePublishMs = monotonicElapsedMs(claim.monotonicStartedNs, monotonicNow());
      if (elapsedBeforePublishMs >= request.maximumRuntimeMs) throw new PlatformNodeAdmissionError("receiver-runtime-exhausted", { elapsedMs: elapsedBeforePublishMs });
      const candidate = {
        type: "RscPlatformNodeAdmissionPublicationBudgetWitness", version: 1, requestDigest: request.id,
        idempotencyKey: request.idempotencyKey, device: prepared.device, inode: prepared.inode,
        recordedAt, elapsedBeforePublishMs, receiptElapsedMs: request.maximumRuntimeMs,
      };
      try { writeDurableJsonExclusive(path, candidate); publication = candidate; }
      catch (error) { if (error?.code !== "EEXIST") throw error; publication = readJson(path); }
    }
    if (!publicationWitnessValid(publication, request, prepared)) throw new PlatformNodeAdmissionError("private-publication-budget-witness-invalid");
    return publication;
  }

  async function advance(request) {
    const dataAdmission = freshReceiverDataAdmission(configuration);
    try { revalidateEnterpriseInstall(dataAdmission); }
    catch (error) { throw new PlatformNodeAdmissionError("receiver-owned-data-mesh-changed", error?.facts ?? {}, error); }
    const working = realpathSync(configuration.workingRoot);
    const parent = realpathSync(configuration.admittedParent);
    if (lstatSync(configuration.workingRoot).isSymbolicLink() || statSync(working).dev !== statSync(parent).dev) {
      throw new PlatformNodeAdmissionError("receiver-working-root-not-private-same-device");
    }
    const initialReceipt = acceptedReceipt(journal.records(RECEIPTS), request.idempotencyKey, request);
    const initialHistory = operationHistory(journal, request);
    const initialStates = new Set(initialHistory.map((record) => record.state));
    const initialTargetExists = pathEntryExists(request.targetRoot);
    if (initialReceipt && !initialStates.has("committed")) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-illegal-transition", { reason: "receipt-without-committed" });
    }
    if (!initialTargetExists && (initialReceipt || initialStates.has("committed") || initialStates.has("receipted"))) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-premature-terminal-state", { states: [...initialStates] });
    }
    const claimsRoot = ensurePrivateRoots(configuration.workingRoot);
    const claimDir = claimDirectory(claimsRoot, request.idempotencyKey);
    try { mkdirDurable(claimDir, dirname(claimDir)); } catch (error) { if (error?.code !== "EEXIST") throw error; }
    assertPrivateClaimDirectory(claimDir, claimsRoot);
    const claim = await ensureClaim(request, claimDir);
    const prepared = await ensurePrepared(request, claimDir, monotonicNow());
    const targetWasPresent = pathEntryExists(request.targetRoot);
    const historyBeforeEffect = operationHistory(journal, request);
    const statesBeforeEffect = new Set(historyBeforeEffect.map((record) => record.state));
    if (!targetWasPresent && (statesBeforeEffect.has("committed") || statesBeforeEffect.has("receipted"))) {
      throw new PlatformNodeAdmissionError("receiver-operation-journal-premature-terminal-state", { states: [...statesBeforeEffect] });
    }
    const publicationPath = join(claimDir, "publication.json");
    if (targetWasPresent && !pathEntryExists(publicationPath)) throw new PlatformNodeAdmissionError("private-publication-budget-witness-absent");
    const publication = ensurePublicationBudget(request, claimDir, claim, prepared);
    if (!pathEntryExists(request.targetRoot)) {
      const stagedStat = pathEntryExists(prepared.stage) ? lstatSync(prepared.stage) : null;
      if (!stagedStat || !stagedStat.isDirectory() || stagedStat.isSymbolicLink() || stagedStat.dev !== prepared.device || stagedStat.ino !== prepared.inode
          || !actualManifestExact(prepared.stage, request.manifest)) throw new PlatformNodeAdmissionError("prepared-stage-mismatch");
      const meshAdmission = freshMeshAdmission(configuration, prepared.stage);
      if (statSync(prepared.stage).dev !== statSync(configuration.admittedParent).dev) throw new PlatformNodeAdmissionError("prepared-stage-cross-device");
      try { revalidateEnterpriseInstall(meshAdmission); }
      catch (error) { throw new PlatformNodeAdmissionError("receiver-parent-mesh-changed", error?.facts ?? {}, error); }
      const elapsedBeforePublish = monotonicElapsedMs(claim.monotonicStartedNs, monotonicNow());
      const remainingMs = Math.floor(request.maximumRuntimeMs - elapsedBeforePublish);
      if (remainingMs < 1) throw new PlatformNodeAdmissionError("receiver-runtime-exhausted", { elapsedMs: elapsedBeforePublish });
      try { await publish(prepared.stage, request.targetRoot, { timeoutMs: remainingMs }); }
      catch (error) {
        const target = pathEntryExists(request.targetRoot) ? lstatSync(request.targetRoot) : null;
        const committed = target?.isDirectory() && !target.isSymbolicLink() && target.dev === prepared.device && target.ino === prepared.inode
          && actualManifestExact(request.targetRoot, request.manifest);
        if (!committed) throw error;
      }
      await fault?.("afterRenameBeforeParentSync", { request, claimDir });
      if (pathEntryExists(request.targetRoot)) syncDirectory(dirname(request.targetRoot));
      await fault?.("afterPublish", { request, claimDir });
    }
    if (!pathEntryExists(request.targetRoot)) return null;
    const targetStat = lstatSync(request.targetRoot);
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink() || targetStat.dev !== prepared.device || targetStat.ino !== prepared.inode
        || !actualManifestExact(request.targetRoot, request.manifest)) return null;
    syncDirectory(dirname(request.targetRoot));
    return durableReceipt({ journal, claimDir, request, prepared, publication, clock, fault });
  }

  async function status(idempotencyKey, exactRequest) {
    assertActive();
    if (!canonicalNi(idempotencyKey)) throw new PlatformNodeAdmissionError("status-idempotency-key-invalid");
    if (!exactRequest) throw new PlatformNodeAdmissionError("status-exact-request-required");
    const issue = requestReason(exactRequest, configuration);
    if (issue) throw new PlatformNodeAdmissionError(issue);
    if (exactRequest.idempotencyKey !== idempotencyKey) throw new PlatformNodeAdmissionError("status-request-key-mismatch");
    const prior = acceptedReceipt(journal.records(RECEIPTS), idempotencyKey, exactRequest);
    if (prior && !pathEntryExists(exactRequest.targetRoot)) throw new PlatformNodeAdmissionError("receiver-receipt-poststate-invalid");
    return advance(exactRequest);
  }

  async function admit(request) {
    assertActive();
    const issue = requestReason(request, configuration);
    if (issue) throw new PlatformNodeAdmissionError(issue);
    return advance(request);
  }

  return Object.freeze({ admit, status, contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA" });
}

export const RSC_PLATFORM_NODE_ADMISSION_CATEGORIES = Object.freeze({ operations: OPERATIONS, receipts: RECEIPTS });
export const RSC_PLATFORM_NODE_ADMISSION_HARD_CEILINGS = HARD_CEILINGS;
export const RSC_PLATFORM_NODE_ADMISSION_EFFECTS = EFFECTS;
