// Witness compute spend so profitability is measurable: every sandbox run costs
// runner minutes the Leader is subsidizing. GitHub bills Linux runners per started minute
// (rounded up) at $0.008/min beyond the free allotment; public-repo runners are free but we
// still record the minutes so cost-per-verified-fix — and eventually payout-minus-cost — is
// a known number, not a guess.
import { resolve } from "node:path";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { addressed } from "./hashing.mjs";
import { WITNESS_ROOT } from "./service-bindings.mjs";

export const GH_LINUX_USD_PER_MINUTE = 0.008;

export function computeCostRecord({ observedAt, provider = "github-actions", repo, issue, runId, durationSeconds, freeAllotment = false }) {
  const billableMinutes = durationSeconds != null ? Math.ceil(durationSeconds / 60) : null;
  const estUsd = billableMinutes != null ? (freeAllotment ? 0 : Math.round(billableMinutes * GH_LINUX_USD_PER_MINUTE * 10000) / 10000) : null;
  return addressed({ kind: "algora-pilot.compute-cost", observedAt, provider, repo, issue, runId, durationSeconds, billableMinutes, estUsd, freeAllotment });
}

export const COMPUTE_COST_CATEGORY = "algora-recovery.compute-cost";

export async function recordComputeCost(store, fields) {
  if (!store || typeof store.record !== "function") throw new Error("an explicit Algora WitnessJournal store is required");
  const rec = computeCostRecord(fields);
  const projection = await store.record({ category: COMPUTE_COST_CATEGORY, recordedAt: fields.observedAt, record: rec });
  return Object.freeze({ ...rec, witness: { graph: projection.documentNi, projection: projection.digest } });
}

export async function readComputeCosts(dataRoot = resolve(WITNESS_ROOT, "data")) { return await querySettlementRecords(COMPUTE_COST_CATEGORY); }

export function sumComputeCost(records = []) {
  const totals = { runs: 0, billableMinutes: 0, estUsd: 0 };
  if (!Array.isArray(records)) throw new Error("compute totals require explicit witnessed records");
  for (const record of records) { totals.runs += 1; totals.billableMinutes += record.billableMinutes || 0; totals.estUsd += record.estUsd || 0; }
  totals.estUsd = Math.round(totals.estUsd * 10000) / 10000;
  return totals;
}
