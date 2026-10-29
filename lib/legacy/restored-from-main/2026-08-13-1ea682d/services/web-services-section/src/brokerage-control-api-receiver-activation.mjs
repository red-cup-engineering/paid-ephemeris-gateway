import { closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const rscValueId = (value, objectKind) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { admitEnterpriseInstall, revalidateEnterpriseInstall } from "../lib/management/skills/enforcing-mesh-scope/scripts/mesh-scope.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_ROOT = "/home/emsenn/info/lib/emsenn/services/561-group/services/public-services-section/services/public-computer-services-section/services/web-services-section";
const PARENT = `${EXPECTED_ROOT}/services`, NODE = "brokerage-control-api-federation", TARGET = `${PARENT}/${NODE}`;
const PRIVATE = `${EXPECTED_ROOT}/data/platform-node-admission`, WORKING = `${PRIVATE}/working`, WitnessJournal = `${PRIVATE}/witnessJournal`;
const ALLOCATION = "urn:emsenn:allocation:brokerage-control-api-first-commercial-formation-2026-07-22";
const EVIDENCE = "ni:///sha-256;Ovjiv9a8cQJ74zZ7kbw3f6tImbTiakcSHTIV5EUcjjc", ADMISSION = "ni:///sha-256;jc6pBg-ZB8YH-w2YLdcJt5KK6dG7F3UMHnnTn9HflGo";
const LAW = "ni:///sha-256;fqCupKTkPu7Yta0UwcvyqaPAhfciGh2fZ6LXVVcXPhc";
const RECOVERY_KEY = "NrBJW_pu-iTHgr-tpHwrCbcaQogI83Ee_P2vU8wu0mA";
const RECOVERY_RECEIPT = `${WORKING}/claims/${RECOVERY_KEY}/receipt.json`;
const digest = (value) => rscValueId(value, "rsc-quiescent.receiver-activation-record");
const identify = (body) => ({ id: digest(body), ...body });
const freeze = (value) => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const binding = () => ({ allocationId: ALLOCATION, customer: "urn:ame:leader-movement-team", maximumInductions: 1, nodeId: NODE, receiverActor: "urn:ame:rsc-quiescent", receiverParent: PARENT, receiverContract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA", ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 }, customerContract: "ni:///sha-256;9pOSj_Hdu4_hOMxqnKIxQIoLly634i0qz7LDPArrm68", considerationAdmission: "ni:///sha-256;6HU9Zv3L67WtdavNU9fEu-ZzMOTKUQU3eQkdbHd1HnI", publicationAdmission: "ni:///sha-256;HACkeap6XelMI6wIW3gUdqCfIEeg8xEcNiDBEWHdKNs" });
function completedRecoveryExists() {
  if (!existsSync(RECOVERY_RECEIPT)) return false;
  try {
    const receipt = JSON.parse(readFileSync(RECOVERY_RECEIPT, "utf8"));
    const body = Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "id"));
    return receipt.id === digest(body) && receipt.type === "ReceiverCreateOnlyAdmissionReceipt"
      && receipt.contract === "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA" && receipt.allocationId === ALLOCATION
      && receipt.idempotencyKey === `ni:///sha-256;${RECOVERY_KEY}` && receipt.nodeId === NODE
      && receipt.targetRoot === TARGET && receipt.installation === true && receipt.createOnly === true
      && receipt.overwrite === false && receipt.priorTargetAbsent === true && receipt.postState?.targetExists === true
      && receipt.postState?.manifestDigest === receipt.manifestDigest && receipt.postState?.fileCount === 16
      && receipt.postState?.totalBytes === 25110 && receipt.lifecycle?.continuingAuthority === false
      && receipt.lifecycle?.withdrawal === "complete";
  } catch { return false; }
}
export function expectedBrokerageControlApiAuthorizationAdmission() { const exact = binding(); return identify({ type: "PlatformNodeProductionAuthorizationAdmission", admitter: "urn:ame:platform-node-inducer", disposition: "admit-authoritative-configuration-evidence", trustBoundary: "pni-owned-local-configuration-admission", cryptographicSignaturesVerified: false, configuration: "platform-node-induction-offerings-pni-001", authoritativeSources: { boardDecision: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-board-record", evidence: "ni:///sha-256;q3uMa5L2G501lxrl1Ge43gv0dD4b2SQWvNjPh8fvTdE" }, leaderDecision: { authority: "urn:ame:leader", provenance: "pni-local-config-admitted-leader-record", evidence: "ni:///sha-256;7elBNrq3RI-rilr_YjtnHBTfWKht0VCAuft-e4ptD6M" }, considerationAdmission: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-consideration-record", evidence: "ni:///sha-256;6HU9Zv3L67WtdavNU9fEu-ZzMOTKUQU3eQkdbHd1HnI" }, publicationAdmission: { authority: "urn:ame:board-of-directors", provenance: "pni-local-config-admitted-publication-record", evidence: "ni:///sha-256;HACkeap6XelMI6wIW3gUdqCfIEeg8xEcNiDBEWHdKNs" } }, authorizationEvidenceDigest: EVIDENCE, binding: exact }); }
function sync(path) { const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(fd); } finally { closeSync(fd); } }
function ensurePrivate(path) { if (!existsSync(path)) { mkdirSync(path, { mode: 0o700 }); sync(dirname(path)); } const stat = lstatSync(path), uid = typeof process.getuid === "function" ? process.getuid() : stat.uid; if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(path) !== resolve(path) || stat.uid !== uid || (stat.mode & 0o077) !== 0) throw new TypeError(`RSC activation root is not owner-private: ${path}`); }
function ensureRoots() { for (const path of [`${EXPECTED_ROOT}/data`, PRIVATE, WORKING, WitnessJournal]) ensurePrivate(path); if (statSync(WORKING).dev !== statSync(PARENT).dev || statSync(WitnessJournal).dev !== statSync(PARENT).dev) throw new TypeError("RSC activation roots and services parent must share one device"); revalidateEnterpriseInstall(admitEnterpriseInstall({ authorityRoot: "/home/emsenn/info", sourceEnterprise: WORKING, targetNode: WitnessJournal, installer: "codex", operation: "install", mode: "apply" })); }
export function assayBrokerageControlApiReceiverActivation(admission) { if (ROOT !== EXPECTED_ROOT) throw new TypeError("RSC receiver carrier changed"); const expected = expectedBrokerageControlApiAuthorizationAdmission(); if (expected.id !== ADMISSION || admission?.id !== ADMISSION || digest(admission) !== digest(expected)) throw new TypeError("RSC receiver requires exact Brokerage Control API admission"); const recovering = existsSync(TARGET); if (recovering && !completedRecoveryExists()) throw new TypeError("Brokerage Control API target must be absent or carry the exact completed receiver receipt"); return freeze({ type: "RscPlatformNodeAdmissionReceiverActivationAssay", version: 1, disposition: recovering ? "admissible-status-recovery-only" : "admissible-if-private-roots-settle", allocationId: ALLOCATION, authorizationAdmission: ADMISSION, authorizationEvidenceDigest: EVIDENCE, target: TARGET, workingRoot: WORKING, witnessJournalRoot: WitnessJournal, externalNetwork: false, credentials: false, externalSettlement: false }); }
export function activateBrokerageControlApiReceiver(admission) { assayBrokerageControlApiReceiverActivation(admission); ensureRoots(); return freeze({ type: "RscPlatformNodeAdmissionReceiverConfiguration", version: 1, enabled: true, actor: "urn:ame:rsc-quiescent", admittedProvider: "urn:ame:platform-node-inducer", admittedProviderLaw: LAW, contract: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA", meshAuthorityRoot: "/home/emsenn/info", receiverRoot: EXPECTED_ROOT, admittedParent: PARENT, allocationId: ALLOCATION, customer: "urn:ame:leader-movement-team", nodeId: NODE, authorizationAdmission: ADMISSION, authorizationEvidenceDigest: EVIDENCE, workingRoot: WORKING, witnessJournal: { agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", dataRoot: WitnessJournal, nodeId: "rsc-quiescent", settlement: "urn:ame:rsc-quiescent", actor: "urn:ame:rsc-quiescent" }, ceilings: { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 }, publication: { createOnly: true, overwrite: false, externalNetwork: false, credentials: false, externalSettlement: false }, refusal: "one exact scalable Brokerage Control API federation formation; every other request refused" }); }

if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(`${JSON.stringify(assayBrokerageControlApiReceiverActivation(expectedBrokerageControlApiAuthorizationAdmission()))}\n`);
