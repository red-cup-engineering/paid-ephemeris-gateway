#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.den-gate-admission", body), ...body });
function syncDirectory(path) { const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(fd); } finally { closeSync(fd); } }
function project(value) {
  const root = join(ROOT, "data", "evidence"); if (!existsSync(root)) { mkdirSync(root, { recursive: true, mode: 0o700 }); syncDirectory(join(ROOT, "data")); }
  const target = join(root, "den-lianqun-membership.json"), bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (existsSync(target)) { if (!readFileSync(target).equals(bytes)) throw new TypeError("Den gate projection conflicts"); return target; }
  const temporary = join(root, `.den-gate.${process.pid}.tmp`), fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temporary, target); syncDirectory(root); return target;
}
export async function admitDenGate() {
  const evidence = identify({ type: "DenLianqunGateEvidence", disposition: "not-yet-a-lianqun", claimMade: false,
    independentlySovereignMembers: [], reason: "No second independently sovereign enterprise has voluntarily accepted one exact shared-outcome contract with Blockchain Trashpanda." });
  const recordedAt = new Date().toISOString(), admission = identify({ type: "DenLianqunGateAdmission", enterprise: ACTOR, evidence,
    disposition: "admit-not-yet-lianqun-guard", recordedAt });
  await recordSettlementRecord({ agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", settlement: ACTOR, actor: ACTOR, category: "blockchain-trashpanda.den-gate-admissions", recordedAt, record: admission });
  return { admission, evidence, projection: project(evidence) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitDenGate(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, evidence: value.evidence.id, projection: value.projection })}\n`); }
