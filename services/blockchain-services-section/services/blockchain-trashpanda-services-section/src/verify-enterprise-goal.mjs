#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticDigest = semanticIdentity;

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const has = (path) => existsSync(join(ROOT, path));
const exact = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const result = (cell, held, evidence, missing = []) => ({ type: "BlockchainTrashpandaGoalCellResult", cell, held, evidence, missing });
const NI = /^ni:///sha-256;[A-Za-z0-9_-]{43}$/u;
const INITIAL_PATHS = [
  "AGENTS.md", "content/books/value-ledger.json", "content/characters/yanagi-chief-executive.json",
  "content/charters/blockchain-trashpanda.json", "content/contracts/formation-value-adjustment.rml",
  "content/contracts/pre-sign-transaction-policy-conformance.rml", "content/governance/ceo-formation-wager.json",
  "content/governance/founding-mutual-selection.json", "content/incumbencies/chief-executive-officer-yanagi-chief-executive.json",
  "content/micro-enterprises/blockchain-trashpanda.json", "content/offices/chief-executive-officer.json",
  "content/works/pre-sign-transaction-policy-conformance.json", "lib/management/skills/operating-blockchain-trashpanda/SKILL.md",
  "lib/ownership.json", "package.json", "src/verify-enterprise-goal.mjs",
];
function contentValid(value) {
  if (!value || typeof value !== "object" || !NI.test(value.id ?? "")) return false;
  const { id: _id, ...body } = value;
  return value.id === semanticDigest("blockchain-trashpanda.formation-receipt", body);
}
function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
function foundingManifest() {
  const manifest = read("data/formation/founding-manifest.json");
  if (manifest.type !== "PlatformNodeProductionManifest"
      || manifest.nodeId !== "blockchain-trashpanda" || manifest.targetRoot !== ROOT || manifest.fileCount !== 16
      || manifest.files?.length !== 16 || manifest.files.map((file) => file.path).join("\0") !== INITIAL_PATHS.join("\0")) {
    throw new TypeError("admitted founding manifest is invalid");
  }
  let totalBytes = 0;
  for (const file of manifest.files) {
    const bytes = Buffer.from(file.content, "base64");
    if (bytes.toString("base64") !== file.content || bytes.byteLength !== file.byteLength
        || file.sha256 !== "sha256:" + createHash("sha256").update(bytes).digest("hex")) throw new TypeError("founding manifest file commitment is invalid");
    totalBytes += bytes.byteLength;
  }
  if (totalBytes !== manifest.totalBytes) throw new TypeError("founding manifest accounting is invalid");
  return manifest;
}

function formation() {
  const pkg = read("package.json"), charter = read("content/charters/blockchain-trashpanda.json");
  const office = read("content/offices/chief-executive-officer.json"), character = read("content/characters/yanagi-chief-executive.json");
  const incumbency = read("content/incumbencies/chief-executive-officer-yanagi-chief-executive.json");
  const micro = read("content/micro-enterprises/blockchain-trashpanda.json"), work = read("content/works/pre-sign-transaction-policy-conformance.json");
  const manifest = foundingManifest(), manifestDigest = semanticDigest("blockchain-trashpanda.founding-manifest", manifest);
  const receiptPath = "data/formation/receiver-induction-receipt.json";
  const receipt = has(receiptPath) ? read(receiptPath) : null;
  const held = pkg.name === "@rsc-quiescent/blockchain-trashpanda" && charter["issued-to"] === office.id
    && character.kind === "session" && incumbency.office === office.id && incumbency.holder === character.id
    && incumbency.recognition === "t" && incumbency.induction === "t" && micro.bundle === work.id
    && contentValid(receipt) && exactKeys(receipt, ["id", "type", "contract", "receiver", "customer", "provider", "allocationId", "idempotencyKey", "nodeId", "targetRoot", "manifestDigest", "installation", "createOnly", "overwrite", "priorTargetAbsent", "postState", "rollback", "lifecycle", "resourceReceipt", "recordedAt"])
    && receipt.type === "ReceiverCreateOnlyAdmissionReceipt"
    && receipt.receiver === "urn:ame:rsc-quiescent" && receipt.customer === "urn:ame:executive-office" && receipt.provider === "urn:ame:platform-node-inducer"
    && receipt.allocationId === "urn:emsenn:allocation:blockchain-trashpanda-formation-market-pilot-2026-07-22"
    && receipt.nodeId === "blockchain-trashpanda" && receipt.targetRoot === ROOT && receipt.manifestDigest === manifestDigest
    && receipt.installation === true && receipt.createOnly === true && receipt.overwrite === false && receipt.priorTargetAbsent === true
    && exact(receipt.postState, { targetExists: true, manifestDigest, fileCount: 16, totalBytes: manifest.totalBytes })
    && exact(receipt.rollback, { ownedByReceiver: true, partialFailureRemovesExactNewTarget: true })
    && exact(receipt.lifecycle, { providerRuntimeImported: false, continuingAuthority: false, withdrawal: "complete" })
    && receipt.resourceReceipt?.network === false && receipt.resourceReceipt?.credentialsUsed === false && receipt.resourceReceipt?.externalSettlement === false
    && Number.isFinite(receipt.resourceReceipt?.elapsedMs) && receipt.resourceReceipt.elapsedMs >= 0 && receipt.resourceReceipt.elapsedMs <= 120000;
  return result("formation", held, { manifestDigest, receipt: receipt?.id ?? null }, receipt ? [] : [receiptPath]);
}

function governance() {
  const ownership = read("lib/ownership.json"), wager = read("content/governance/ceo-formation-wager.json");
  const selection = read("content/governance/founding-mutual-selection.json");
  const held = exact(ownership.rights, ["decision", "personnel", "distribution"])
    && ownership.approvalFromAbove === false && wager.type === "RendanheyiLeadershipBid"
    && wager.contestable === true && wager.downsideExposure?.reopensOfficeOnShortfall === true
    && Array.isArray(wager.measures) && wager.measures.length >= 4
    && selection.type === "RendanheyiMutualSelection" && selection.revocable === true
    && selection.approvalFromAbove === false && selection.candidateAcceptance === "accepted";
  return result("governance", held, { rights: ownership.rights, wager: wager.id, selection: selection.id });
}

function economics() {
  const ledger = read("content/books/value-ledger.json");
  const held = ledger.valueCreated.sourceRequired === true && ledger.valueCaptured.settlementReceiptRequired === true
    && ledger.costs.sourceRequired === true && ledger.unknownMeans === "unknown-not-zero-or-free"
    && [ledger.valueCreated.entries, ledger.valueCaptured.entries, ledger.costs.entries].every(Array.isArray);
  return result("economics", held, { ledger: ledger.id, initialEntryCounts: [ledger.valueCreated.entries.length, ledger.valueCaptured.entries.length, ledger.costs.entries.length] });
}

function evidenceCell(cell, path, type, predicate) {
  if (!has(path)) return result(cell, false, { record: null, valid: false }, [path]);
  const record = read(path), held = contentValid(record) && record.type === type && predicate(record);
  return result(cell, held, { record: record.id ?? null, valid: held }, held ? [] : [path + "#invalid-or-unsettled"]);
}
const cells = {
  formation,
  governance,
  economics,
  product: () => evidenceCell("product", "data/evidence/product-conformance.json", "BlockchainTrashpandaProductConformanceEvidence", (record) =>
    record.status === "held"
    && Number.isInteger(record.corpus?.expected) && record.corpus.expected > 0 && record.corpus.passed === record.corpus.expected
    && exact(record.corpus.mismatches, []) && record.replays?.count >= 3 && record.replays.receiptDigests?.length === record.replays.count
    && record.replays.receiptDigests.every((digest) => NI.test(digest) && digest === record.replays.receiptDigests[0])
    && exact(record.forbiddenEffects, { credentials: false, custody: false, signing: false, broadcast: false, stateMutation: false })
    && record.replays.byteIdentical === true),
  identities: () => evidenceCell("identities", "data/evidence/operational-identity-separation.json", "BlockchainTrashpandaOperationalIdentitySeparationEvidence", (record) => {
    const identities = [record.identities?.recovery, record.identities?.treasury, record.identities?.virtuals, record.identities?.receipt];
    return record.status === "held" && record.secretsRecorded === false && record.runtimeUsesRecovery === false
      && identities.every((identity) => typeof identity?.publicIdentity === "string" && identity.publicIdentity.length > 0 && identity.credentialLoaded === false)
      && new Set(identities.map((identity) => identity.publicIdentity)).size === 4;
  }),
  channels: () => evidenceCell("channels", "data/evidence/channel-proofs.json", "BlockchainTrashpandaChannelProofEvidence", (record) =>
    record.status === "held" && record.externalCash === false && record.mainnetEffects === false && record.realUsdc === false
    && record.x402?.network === "eip155:84532" && record.x402?.proofCount === 1 && record.x402?.status === "succeeded" && typeof record.x402?.receipt === "string" && record.x402.receipt.length > 0
    && record.virtuals?.environment === "sandbox" && record.virtuals?.proofCount === 1 && record.virtuals?.serviceOnly === true && record.virtuals?.status === "succeeded" && typeof record.virtuals?.receipt === "string" && record.virtuals.receipt.length > 0),
  den: () => evidenceCell("den", "data/evidence/den-lianqun-membership.json", "DenLianqunGateEvidence", (record) => {
    if (record.disposition === "not-yet-a-lianqun") return record.claimMade === false && exact(record.independentlySovereignMembers, []);
    return record.disposition === "lianqun-formed" && record.claimMade === true && record.voluntary === true && record.commonAuthority === false
      && NI.test(record.sharedOutcomeContract ?? "") && Array.isArray(record.independentlySovereignMembers) && record.independentlySovereignMembers.length >= 2
      && record.independentlySovereignMembers.every((member) => typeof member?.enterprise === "string" && NI.test(member?.sovereigntyEvidence ?? "") && member.contractAcceptance === true);
  }),
};

const cellIndex = process.argv.indexOf("--cell"), selected = cellIndex >= 0 ? process.argv[cellIndex + 1] : null;
if (selected) {
  if (!cells[selected]) throw new TypeError("unknown goal cell: " + selected);
  const output = cells[selected](); process.stdout.write(JSON.stringify(output) + "\n"); process.exitCode = output.held ? 0 : 1;
} else if (process.argv.includes("--all")) {
  const output = Object.fromEntries(Object.entries(cells).map(([name, check]) => [name, check()]));
  process.stdout.write(JSON.stringify(output) + "\n"); process.exitCode = Object.values(output).every((entry) => entry.held) ? 0 : 1;
} else {
  throw new TypeError("use --cell formation|governance|product|identities|channels|economics|den or --all");
}
