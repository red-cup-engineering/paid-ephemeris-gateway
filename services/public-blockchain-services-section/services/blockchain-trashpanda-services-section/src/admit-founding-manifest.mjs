#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { writeFlatfile } from "@red-cup-engineering/flatfile";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticDigest } from "./policy-conformance.mjs";
import { recordSettlementRecord } from "./settlement-witness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = join(ROOT, "data");
const FORMATION_ROOT = join(DATA_ROOT, "formation");
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";

function identify(body) {
  return { id: semanticDigest("blockchain-trashpanda.founding-manifest", body), ...body };
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
  return Object.freeze({ admission, projection: writeFlatfile(join(ROOT, "data", "formation", "founding-manifest.json"), JSON.stringify(manifest) + "\n", { ifExists: "same", mode: 0o600, directoryMode: 0o700, createDirectories: false, conflictMessage: "founding manifest projection conflicts" }) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const output = await admitFoundingManifest(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(output)}\n`);
}
