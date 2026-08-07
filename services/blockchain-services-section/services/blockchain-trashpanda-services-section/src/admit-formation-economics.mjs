#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.formation-economics-admission", body), ...body });
function syncDirectory(path) { const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(fd); } finally { closeSync(fd); } }
function project(value) {
  const root = join(ROOT, "data", "books"); if (!existsSync(root)) { mkdirSync(root, { recursive: true, mode: 0o700 }); syncDirectory(join(ROOT, "data")); }
  const target = join(root, "formation-economics.json"), bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (existsSync(target)) { if (!readFileSync(target).equals(bytes)) throw new TypeError("formation economics projection conflicts"); return target; }
  const temporary = join(root, `.formation-economics.${process.pid}.tmp`), fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temporary, target); syncDirectory(root); return target;
}
export async function admitFormationEconomics() {
  const observation = identify({
    type: "BlockchainTrashpandaFormationEconomicsObservation",
    enterprise: ACTOR,
    valueCreated: {
      status: "unknown-no-customer-outcome-observed",
      amountUsdMicros: null,
      capabilityEvidence: "ni:///sha-256;K8tjKq3fsHcPSu2ma48mXyXLDnFih_miR_YO7SDHcLI",
      note: "Independent product conformance proves capability, not a customer's realized outcome or willingness to pay."
    },
    valueCaptured: {
      status: "observed-zero-no-settlement-attempted",
      amountUsdMicros: "0",
      settlementReceipts: [],
      channelReadinessEvidence: "ni:///sha-256;jGMWQy1l8KZlVWZY2mstYOpCQ85tOu8w1x02adDakz4"
    },
    costs: {
      externalCash: { status: "observed-zero", amountUsdMicros: "0", source: "urn:emsenn:allocation:blockchain-trashpanda-formation-market-pilot-2026-07-22" },
      laborAndCompute: { status: "unknown-not-zero-or-free", amountUsdMicros: null, source: "CEO session and local test measurements are not priced by an admitted cost contract" }
    },
    accountingRule: "value-created, value-captured, and costs remain separate; unknown is never rounded to zero"
  });
  const recordedAt = new Date().toISOString(), admission = identify({ type: "BlockchainTrashpandaFormationEconomicsAdmission", enterprise: ACTOR,
    observation, disposition: "admit-separate-formation-economics", recordedAt });
  await recordSettlementRecord({ agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", settlement: ACTOR, actor: ACTOR, category: "blockchain-trashpanda.economics-admissions", recordedAt, record: admission });
  return { admission, observation, projection: project(observation) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitFormationEconomics(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, observation: value.observation.id, projection: value.projection })}\n`); }
