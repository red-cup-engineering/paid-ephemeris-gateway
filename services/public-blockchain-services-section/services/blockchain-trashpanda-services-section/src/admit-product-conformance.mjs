#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";

function identify(body) { return { id: semanticDigest("blockchain-trashpanda.product-conformance-admission", body), ...body }; }
function contentValid(value) {
  if (!value?.id) return false;
  const { id: _id, ...body } = value;
  return value.id === semanticDigest("blockchain-trashpanda.product-conformance-admission", body);
}
function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}
function projectEvidence(evidence) {
  const dataRoot = join(ROOT, "data"), evidenceRoot = join(dataRoot, "evidence");
  if (!existsSync(evidenceRoot)) { mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 }); syncDirectory(dataRoot); }
  const target = join(evidenceRoot, "product-conformance.json");
  const bytes = Buffer.from(`${JSON.stringify(evidence)}\n`, "utf8");
  if (existsSync(target)) {
    if (!readFileSync(target).equals(bytes)) throw new TypeError("product evidence projection already exists with different bytes");
    return target;
  }
  const temporary = join(evidenceRoot, `.product-conformance.${process.pid}.tmp`);
  const descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
  renameSync(temporary, target);
  syncDirectory(evidenceRoot);
  return target;
}

export async function admitProductConformance({ measurement }) {
  if (realpathSync(ROOT) !== ROOT) throw new TypeError("product admission is outside Blockchain Trashpanda");
  if (!contentValid(measurement) || measurement.type !== "BlockchainTrashpandaLocalProductMeasurement"
      || measurement.product !== "pre-sign-transaction-policy-conformance"
      || !Number.isInteger(measurement.corpus?.expected) || measurement.corpus.expected <= 0
      || measurement.corpus.passed !== measurement.corpus.expected || JSON.stringify(measurement.corpus.mismatches) !== "[]"
      || measurement.replays?.count < 3 || measurement.replays.byteIdentical !== true
      || measurement.replays.receiptDigests?.length !== measurement.replays.count
      || !measurement.replays.receiptDigests.every((digest) => digest === measurement.replays.receiptDigests[0])
      || JSON.stringify(measurement.forbiddenEffects) !== JSON.stringify({ credentials: false, custody: false, signing: false, broadcast: false, stateMutation: false })) {
    throw new TypeError("local product measurement does not prove the mandatory corpus and replay conditions");
  }
  const evidence = identify({
    type: "BlockchainTrashpandaProductConformanceEvidence",
    status: "held",
    engine: measurement.engine,
    corpus: { expected: measurement.corpus.expected, passed: measurement.corpus.passed, mismatches: measurement.corpus.mismatches },
    replays: measurement.replays,
    latency: measurement.latency,
    forbiddenEffects: measurement.forbiddenEffects,
    measurement: measurement.id,
  });
  const admittedAt = new Date().toISOString();
  const admission = identify({ type: "BlockchainTrashpandaProductConformanceAdmission", enterprise: ACTOR,
    evidence, measurement, disposition: "admit-deterministically-measured-product-evidence", admittedAt });
  await recordSettlementRecord({ agentUrl: WITNESS_JOURNAL_AGENT, settlement: ACTOR, actor: ACTOR, category: "blockchain-trashpanda.product-conformance-admissions", recordedAt: admittedAt, record: admission });
  return Object.freeze({ admission, evidence, projection: projectEvidence(evidence) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  process.stdout.write(`${JSON.stringify(await admitProductConformance(JSON.parse(input)))}\n`);
}
