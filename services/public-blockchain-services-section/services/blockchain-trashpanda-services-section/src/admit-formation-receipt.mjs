#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticDigest = semanticIdentity;
import { recordSettlementRecord } from "./settlement-witness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const ALLOCATION = "urn:emsenn:allocation:blockchain-trashpanda-formation-market-pilot-2026-07-22";
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";
const INITIAL_PATHS = [
  "AGENTS.md", "content/books/value-ledger.json", "content/characters/yanagi-chief-executive.json",
  "content/charters/blockchain-trashpanda.json", "content/governance/ceo-formation-wager.json",
  "content/governance/founding-mutual-selection.json", "content/incumbencies/chief-executive-officer-yanagi-chief-executive.json",
  "content/micro-enterprises/blockchain-trashpanda.json", "content/offices/chief-executive-officer.json",
  "content/works/pre-sign-transaction-policy-conformance.json", "lib/management/skills/operating-blockchain-trashpanda/SKILL.md",
  "lib/ownership.json", "package.json", "src/verify-enterprise-goal.mjs",
];

function identify(body) {
  return { id: semanticDigest("blockchain-trashpanda.formation-receipt", body), ...body };
}

function contentValid(value) {
  if (!value?.id) return false;
  const { id: _id, ...body } = value;
  return value.id === semanticDigest("blockchain-trashpanda.formation-receipt", body);
}

function foundingManifest() {
  const admittedManifest = join(ROOT, "data/formation/founding-manifest.json");
  if (existsSync(admittedManifest)) {
    const manifest = JSON.parse(readFileSync(admittedManifest, "utf8"));
    return manifest;
  }
  const files = INITIAL_PATHS.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { kind: "file", path, encoding: "base64", content: bytes.toString("base64"), byteLength: bytes.byteLength, sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
  });
  return { type: "PlatformNodeProductionManifest", nodeId: "blockchain-trashpanda", targetRoot: ROOT, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.byteLength, 0), files };
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function projectReceipt(receipt) {
  const dataRoot = join(ROOT, "data");
  const formationRoot = join(dataRoot, "formation");
  if (!existsSync(dataRoot)) { mkdirSync(dataRoot, { mode: 0o700 }); syncDirectory(ROOT); }
  if (!existsSync(formationRoot)) { mkdirSync(formationRoot, { mode: 0o700 }); syncDirectory(dataRoot); }
  const target = join(formationRoot, "receiver-induction-receipt.json");
  const bytes = Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8");
  if (existsSync(target)) {
    if (!readFileSync(target).equals(bytes)) throw new TypeError("formation receipt projection conflicts with the admitted receipt");
    return target;
  }
  const temporary = join(formationRoot, `.receiver-induction-receipt.${process.pid}.tmp`);
  const descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
  renameSync(temporary, target);
  syncDirectory(formationRoot);
  return target;
}

export async function admitFormationReceipt(receipt) {
  if (realpathSync(ROOT) !== ROOT) throw new TypeError("formation receipt admission is outside Blockchain Trashpanda");
  const manifest = foundingManifest(), manifestDigest = semanticDigest("blockchain-trashpanda.founding-manifest", manifest);
  if (!contentValid(receipt) || receipt.type !== "ReceiverCreateOnlyAdmissionReceipt"
      || receipt.receiver !== "urn:ame:rsc-quiescent" || receipt.customer !== "urn:ame:executive-office"
      || receipt.provider !== "urn:ame:platform-node-inducer" || receipt.allocationId !== ALLOCATION
      || receipt.nodeId !== "blockchain-trashpanda" || receipt.targetRoot !== ROOT || receipt.manifestDigest !== manifestDigest
      || receipt.installation !== true || receipt.createOnly !== true || receipt.overwrite !== false || receipt.priorTargetAbsent !== true
      || receipt.postState?.targetExists !== true || receipt.postState?.manifestDigest !== manifestDigest
      || receipt.postState?.fileCount !== manifest.fileCount || receipt.postState?.totalBytes !== manifest.totalBytes
      || receipt.resourceReceipt?.network !== false || receipt.resourceReceipt?.credentialsUsed !== false
      || receipt.resourceReceipt?.externalSettlement !== false || receipt.lifecycle?.continuingAuthority !== false
      || receipt.lifecycle?.providerRuntimeImported !== false || receipt.lifecycle?.withdrawal !== "complete") {
    throw new TypeError("formation receipt does not prove the exact bounded Blockchain Trashpanda induction");
  }
  const admission = identify({
    type: "BlockchainTrashpandaFormationReceiptAdmission",
    enterprise: ACTOR,
    allocationId: ALLOCATION,
    receiverReceipt: receipt,
    manifestDigest,
    disposition: "admit-exact-create-only-formation-receipt",
    admittedAt: new Date().toISOString(),
  });
  await recordSettlementRecord({
    agentUrl: WITNESS_JOURNAL_AGENT,
    settlement: ACTOR,
    actor: ACTOR,
    category: "blockchain-trashpanda.formation-receipt-admissions",
    recordedAt: admission.admittedAt,
    record: admission,
  });
  const projection = projectReceipt(receipt);
  return Object.freeze({ admission, projection, receiverReceipt: receipt.id, manifestDigest });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const output = await admitFormationReceipt(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(output)}\n`);
}
