#!/usr/bin/env node

import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticDigest = semanticIdentity;
import { recordSettlementRecord } from "./settlement-witness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = join(ROOT, "data");
const FORMATION_ROOT = join(DATA_ROOT, "formation");
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";

function identify(body) {
  return { id: semanticDigest("blockchain-trashpanda.founding-manifest", body), ...body };
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function validateManifest(manifest) {
  if (manifest?.type !== "PlatformNodeProductionManifest"
      || manifest.nodeId !== "blockchain-trashpanda" || manifest.targetRoot !== ROOT || manifest.fileCount !== 16
      || !Array.isArray(manifest.files) || manifest.files.length !== 16) throw new TypeError("founding manifest identity or binding is invalid");
  let total = 0;
  const paths = [];
  for (const file of manifest.files) {
    const bytes = Buffer.from(file.content, "base64");
    if (file.kind !== "file" || file.encoding !== "base64" || bytes.toString("base64") !== file.content
        || bytes.byteLength !== file.byteLength || file.sha256 !== `sha256:${createHash("sha256").update(bytes).digest("hex")}`) {
      throw new TypeError("founding manifest contains an invalid file commitment");
    }
    total += bytes.byteLength;
    paths.push(file.path);
  }
  if (total !== manifest.totalBytes || new Set(paths).size !== 16 || paths.join("\0") !== [...paths].sort().join("\0")) {
    throw new TypeError("founding manifest file accounting is invalid");
  }
  const receipt = JSON.parse(readFileSync(join(FORMATION_ROOT, "receiver-induction-receipt.json"), "utf8"));
  if (receipt.postState?.fileCount !== 16 || receipt.postState?.totalBytes !== total) {
    throw new TypeError("founding manifest differs from the admitted receiver receipt");
  }
  return manifest;
}

function projectManifest(manifest) {
  const target = join(FORMATION_ROOT, "founding-manifest.json");
  const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
  if (existsSync(target)) {
    if (!readFileSync(target).equals(bytes)) throw new TypeError("founding manifest projection conflicts");
    return target;
  }
  const temporary = join(FORMATION_ROOT, `.founding-manifest.${process.pid}.tmp`);
  const descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
  renameSync(temporary, target);
  syncDirectory(FORMATION_ROOT);
  return target;
}

export async function admitFoundingManifest(value) {
  const manifest = validateManifest(value);
  const admittedAt = new Date().toISOString();
  const admission = identify({
    type: "BlockchainTrashpandaFoundingManifestAdmission",
    law: "ni:///sha-256;jEu9l81AnYaHH2bIOWT0ORsl-o5Imd7njissVLvh7eA",
    enterprise: "urn:ame:blockchain-trashpanda",
    manifest,
    receiverReceipt: "ni:///sha-256;VBuYEStVUmWlPkFlfNmPUzxBQCwT5aYyyLDLRoarzKA",
    disposition: "admit-exact-receiver-committed-founding-manifest",
    admittedAt,
  });
  await recordSettlementRecord({ agentUrl: WITNESS_JOURNAL_AGENT, settlement: "urn:ame:blockchain-trashpanda", actor: "urn:ame:blockchain-trashpanda",
    category: "blockchain-trashpanda.founding-manifest-admissions", recordedAt: admittedAt, record: admission });
  return Object.freeze({ admission, projection: projectManifest(manifest) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const output = await admitFoundingManifest(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(output)}\n`);
}
