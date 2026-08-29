import { closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const rscValueId = (value, objectKind) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;

import { admitEnterpriseInstall, revalidateEnterpriseInstall } from "../lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MESH_ROOT = "/home/emsenn/info";
const EXPECTED_ROOT = "/home/emsenn/info/lib/emsenn/services/561-group/services/public-services-section/services/public-computer-services-section";
const ADMITTED_PARENT = `${EXPECTED_ROOT}/services`;
const TARGET = `${ADMITTED_PARENT}/blockchain-services-section/services/blockchain-trashpanda-services-section`;
const PRIVATE_ROOT = `${EXPECTED_ROOT}/data/platform-node-admission`;
const WORKING_ROOT = `${PRIVATE_ROOT}/working`;
const WITNESS_JOURNAL_ROOT = `${PRIVATE_ROOT}/witnessJournal`;
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";
const PNI_LAW = "ni:///sha-256;fqCupKTkPu7Yta0UwcvyqaPAhfciGh2fZ6LXVVcXPhc";
const ALLOCATION_ID = "urn:emsenn:allocation:blockchain-trashpanda-formation-market-pilot-2026-07-22";
const CUSTOMER = "urn:ame:executive-office";
const NODE_ID = "blockchain-trashpanda";
const CUSTOMER_CONTRACT = "ni:///sha-256;_lgF-68iApD0D0a06OG19HVI7FPkfTfHEQDoo6VYByk";
const CONSIDERATION = "ni:///sha-256;sORxON4-WELXMDHbzE1cNlsVPEI0wn2uj-rhxKUT6ZU";
const PUBLICATION = "ni:///sha-256;bE2vJOcu9h23qgvo4pwgCtT5tkv0AQBBtVNBPsO--SQ";
const BOARD = "ni:///sha-256;D8F_tkxsUXr4BdQPm9irFJZg9542feppt5d-W8kord0";
const LEADER = "ni:///sha-256;VWfexkzOYIcZyZAmTXfQZVAzLK6dtsDi9wxd5mKL-5U";
const AUTHORIZATION_EVIDENCE = "ni:///sha-256;RESeSQCJgefaqMRTj9t9KIyrZcmFX-eXt669Y5Z5P8A";
const AUTHORIZATION_ADMISSION = "ni:///sha-256;x4tE53Q2te6hEiXMyi1uoIqi2SJnE1JQEQS1lcyVZxU";

function semanticDigest(value) {
  return rscValueId(value, "rsc-quiescent.receiver-activation-record");
}

function identify(body) {
  return { id: semanticDigest(body), ...body };
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function binding() {
  return {
    allocationId: ALLOCATION_ID,
    customer: CUSTOMER,
    maximumInductions: 1,
    nodeId: NODE_ID,
    receiverActor: "urn:ame:rsc-quiescent",
    receiverParent: ADMITTED_PARENT,
    receiverContract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA",
    ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 },
    customerContract: CUSTOMER_CONTRACT,
    considerationAdmission: CONSIDERATION,
    publicationAdmission: PUBLICATION,
  };
}

export function expectedBlockchainTrashpandaAuthorizationAdmission() {
  const exactBinding = binding();
  return identify({
    type: "PlatformNodeProductionAuthorizationAdmission",
    admitter: "urn:ame:platform-node-inducer",
    disposition: "admit-authoritative-configuration-evidence",
    trustBoundary: "pni-owned-local-configuration-admission",
    cryptographicSignaturesVerified: false,
    configuration: "platform-node-induction-offerings-pni-001",
    authoritativeSources: {
      boardDecision: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-board-record", evidence: BOARD },
      leaderDecision: { authority: "urn:ame:leader", provenance: "pni-local-config-admitted-leader-record", evidence: LEADER },
      considerationAdmission: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-consideration-record", evidence: CONSIDERATION },
      publicationAdmission: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-publication-record", evidence: PUBLICATION },
    },
    authorizationEvidenceDigest: AUTHORIZATION_EVIDENCE,
    binding: exactBinding,
  });
}

function same(left, right) {
  return semanticDigest(left) === semanticDigest(right);
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

export function privateDirectoryOwnedAndRestricted(path) {
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  const currentUid = typeof process.getuid === "function" ? process.getuid() : stat.uid;
  return stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(path) === resolve(path)
    && stat.uid === currentUid && (stat.mode & 0o077) === 0;
}

function ensureCanonicalPrivateDirectory(path) {
  const parent = dirname(path);
  if (!existsSync(path)) {
    mkdirSync(path, { mode: 0o700 });
    syncDirectory(parent);
  }
  if (!privateDirectoryOwnedAndRestricted(path)) {
    throw new TypeError(`RSC activation root is not one canonical owner-private directory: ${path}`);
  }
}

function ensurePrivateRoots() {
  for (const path of [`${EXPECTED_ROOT}/data`, PRIVATE_ROOT, WORKING_ROOT, WITNESS_JOURNAL_ROOT]) ensureCanonicalPrivateDirectory(path);
  if (statSync(WORKING_ROOT).dev !== statSync(ADMITTED_PARENT).dev || statSync(WITNESS_JOURNAL_ROOT).dev !== statSync(ADMITTED_PARENT).dev) {
    throw new TypeError("RSC activation roots and services parent must share one device");
  }
  const admission = admitEnterpriseInstall({
    authorityRoot: MESH_ROOT,
    sourceEnterprise: WORKING_ROOT,
    targetNode: WITNESS_JOURNAL_ROOT,
    installer: "codex",
    operation: "install",
    mode: "apply",
  });
  revalidateEnterpriseInstall(admission);
}

export function assayBlockchainTrashpandaReceiverActivation(authorizationAdmission) {
  if (ROOT !== EXPECTED_ROOT) throw new TypeError("RSC activation carrier is outside its owned membrane");
  const expected = expectedBlockchainTrashpandaAuthorizationAdmission();
  if (expected.id !== AUTHORIZATION_ADMISSION || authorizationAdmission?.id !== AUTHORIZATION_ADMISSION || !same(authorizationAdmission, expected)) {
    throw new TypeError("RSC receiver activation requires the exact PNI-owned authorization admission");
  }
  if (existsSync(TARGET)) throw new TypeError("Blockchain Trashpanda target must be absent at receiver activation");
  return deepFreeze({
    type: "RscPlatformNodeAdmissionReceiverActivationAssay",
    version: 1,
    disposition: "admissible-if-private-roots-settle",
    allocationId: ALLOCATION_ID,
    authorizationAdmission: AUTHORIZATION_ADMISSION,
    authorizationEvidenceDigest: AUTHORIZATION_EVIDENCE,
    target: TARGET,
    workingRoot: WORKING_ROOT,
    witnessJournalRoot: WITNESS_JOURNAL_ROOT,
    externalNetwork: false,
    credentials: false,
    externalSettlement: false,
  });
}

export function activateBlockchainTrashpandaReceiver(authorizationAdmission) {
  assayBlockchainTrashpandaReceiverActivation(authorizationAdmission);
  ensurePrivateRoots();
  return deepFreeze({
    type: "RscPlatformNodeAdmissionReceiverConfiguration",
    version: 1,
    enabled: true,
    actor: "urn:ame:rsc-quiescent",
    admittedProvider: "urn:ame:platform-node-inducer",
    admittedProviderLaw: PNI_LAW,
    contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA",
    meshAuthorityRoot: MESH_ROOT,
    receiverRoot: EXPECTED_ROOT,
    admittedParent: ADMITTED_PARENT,
    allocationId: ALLOCATION_ID,
    customer: CUSTOMER,
    nodeId: NODE_ID,
    authorizationAdmission: AUTHORIZATION_ADMISSION,
    authorizationEvidenceDigest: AUTHORIZATION_EVIDENCE,
    workingRoot: WORKING_ROOT,
    witnessJournal: { agentUrl: WITNESS_JOURNAL_AGENT, dataRoot: WITNESS_JOURNAL_ROOT, nodeId: "rsc-quiescent", settlement: "urn:ame:rsc-quiescent", actor: "urn:ame:rsc-quiescent" },
    ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 },
    publication: { createOnly: true, overwrite: false, externalNetwork: false, credentials: false, externalSettlement: false },
    refusal: "one exact Board-and-Leader-authorized create-only Blockchain Trashpanda allocation; every other request is refused",
  });
}

export const BLOCKCHAIN_TRASHPANDA_RECEIVER_ACTIVATION = deepFreeze({
  allocationId: ALLOCATION_ID,
  authorizationAdmission: AUTHORIZATION_ADMISSION,
  authorizationEvidenceDigest: AUTHORIZATION_EVIDENCE,
  target: TARGET,
  workingRoot: WORKING_ROOT,
  witnessJournalRoot: WITNESS_JOURNAL_ROOT,
  witnessJournalAgent: WITNESS_JOURNAL_AGENT,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = expectedBlockchainTrashpandaAuthorizationAdmission();
  const result = assayBlockchainTrashpandaReceiverActivation(expected);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
