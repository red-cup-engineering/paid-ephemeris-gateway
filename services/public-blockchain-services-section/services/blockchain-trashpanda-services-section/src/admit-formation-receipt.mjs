#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { writeFlatfile } from "@red-cup-engineering/flatfile";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticDigest } from "./policy-conformance.mjs";
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
  const projection = writeFlatfile(join(ROOT, "data", "formation", "receiver-induction-receipt.json"), JSON.stringify(receipt) + "\n", { ifExists: "same", mode: 0o600, directoryMode: 0o700, conflictMessage: "formation receipt projection conflicts with the admitted receipt" });
  return Object.freeze({ admission, projection, receiverReceipt: receipt.id, manifestDigest });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const output = await admitFormationReceipt(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(output)}\n`);
}
