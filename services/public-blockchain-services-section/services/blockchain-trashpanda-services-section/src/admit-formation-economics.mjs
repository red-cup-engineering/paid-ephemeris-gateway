#!/usr/bin/env node
import { writeFlatfile } from "@red-cup-engineering/flatfile";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.formation-economics-admission", body), ...body });
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
  return { admission, observation, projection: writeFlatfile(join(ROOT, "data", "books", "formation-economics.json"), JSON.stringify(observation) + "\n", { ifExists: "same", mode: 0o600, directoryMode: 0o700, conflictMessage: "formation economics projection conflicts" }) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitFormationEconomics(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, observation: value.observation.id, projection: value.projection })}\n`); }
