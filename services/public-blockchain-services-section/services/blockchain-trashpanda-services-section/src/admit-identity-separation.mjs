#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.identity-separation-admission", body), ...body });
function syncDirectory(path) { const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(fd); } finally { closeSync(fd); } }
function project(value) {
  const root = join(ROOT, "data", "evidence"); if (!existsSync(root)) { mkdirSync(root, { recursive: true, mode: 0o700 }); syncDirectory(join(ROOT, "data")); }
  const target = join(root, "operational-identity-separation.json"), bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (existsSync(target)) { if (!readFileSync(target).equals(bytes)) throw new TypeError("identity separation projection conflicts"); return target; }
  const temporary = join(root, `.identity-separation.${process.pid}.tmp`), fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temporary, target); syncDirectory(root); return target;
}
export async function admitIdentitySeparation() {
  const evidence = identify({ type: "BlockchainTrashpandaOperationalIdentitySeparationEvidence", status: "held", secretsRecorded: false, runtimeUsesRecovery: false,
    identities: {
      recovery: { publicIdentity: "eip155:8453:0x224c08a8526751887a83e2711b167f890c6d078d", role: "recovery-only Virtuals developer identity", credentialLoaded: false },
      treasury: { publicIdentity: "eip155:8453:0x42f72c0a340a4a55c082fe42483e87691d2bff64", role: "public Ephemeris payout identity proposed for separately authorized settlement", credentialLoaded: false },
      virtuals: { publicIdentity: "https://app.virtuals.io/virtuals/21164", role: "public Virtuals listing identity", credentialLoaded: false },
      receipt: { publicIdentity: "urn:ame:blockchain-trashpanda:receipt:v1", role: "non-wallet receipt issuer identity", credentialLoaded: false }
    } });
  const recordedAt = new Date().toISOString(), admission = identify({ type: "BlockchainTrashpandaIdentitySeparationAdmission", enterprise: ACTOR, evidence,
    disposition: "admit-public-identity-separation-without-control-claim", recordedAt });
  await recordSettlementRecord({ agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", settlement: ACTOR,
    actor: ACTOR, category: "blockchain-trashpanda.identity-separation-admissions", recordedAt, record: admission });
  return { admission, evidence, projection: project(evidence) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitIdentitySeparation(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, evidence: value.evidence.id, projection: value.projection })}\n`); }
