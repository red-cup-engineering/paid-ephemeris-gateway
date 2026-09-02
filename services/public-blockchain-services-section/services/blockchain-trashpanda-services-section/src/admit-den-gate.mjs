#!/usr/bin/env node
import { writeFlatfile } from "@red-cup-engineering/flatfile";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.den-gate-admission", body), ...body });
export async function admitDenGate() {
  const evidence = identify({ type: "DenLianqunGateEvidence", disposition: "not-yet-a-lianqun", claimMade: false,
    independentlySovereignMembers: [], reason: "No second independently sovereign enterprise has voluntarily accepted one exact shared-outcome contract with Blockchain Trashpanda." });
  const recordedAt = new Date().toISOString(), admission = identify({ type: "DenLianqunGateAdmission", enterprise: ACTOR, evidence,
    disposition: "admit-not-yet-lianqun-guard", recordedAt });
  await recordSettlementRecord({ agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", settlement: ACTOR, actor: ACTOR, category: "blockchain-trashpanda.den-gate-admissions", recordedAt, record: admission });
  return { admission, evidence, projection: writeFlatfile(join(ROOT, "data", "evidence", "den-lianqun-membership.json"), JSON.stringify(evidence) + "\n", { ifExists: "same", mode: 0o600, directoryMode: 0o700, conflictMessage: "Den gate projection conflicts" }) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitDenGate(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, evidence: value.evidence.id, projection: value.projection })}\n`); }
