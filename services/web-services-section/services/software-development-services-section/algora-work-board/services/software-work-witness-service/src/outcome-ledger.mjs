// Witness die. Append a content-addressed solve outcome through the settlement's hired
// witness-journal RDF provider. These records are the loop's memory: they feed repo-trust (the learned K) and the
// RSI detector. A local solve that passed the repo's own tests is a strong signal but is NOT
// a merge — outward posting/merge is a separate, gated act — so outcomes carry `action`
// values distinct from the merge/loss that repo-trust treats as authoritative.
import { resolve } from "node:path";
import { createSettlementStore, querySettlementRecords } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { addressed } from "./hashing.mjs";
import { WITNESS_ROOT, WITNESS_SERVICES } from "./service-bindings.mjs";

export const OUTCOME_CATEGORY = "algora-recovery.solve-outcome";

export function outcomeStore({ dataRoot = resolve(WITNESS_ROOT, "data"), witnessJournal = WITNESS_SERVICES.witnessJournal } = {}) {
  return createSettlementStore({ settlementRoot: WITNESS_ROOT, agentUrl: witnessJournal.agentCard });
}

export async function appendOutcome(store, record) {
  if (!store || typeof store.record !== "function") throw new Error("an explicit Algora WitnessJournal store is required");
  const value = addressed({ kind: "algora-pilot.solve-outcome", ...record });
  const projection = await store.record({ category: OUTCOME_CATEGORY, recordedAt: record.observedAt, record: value });
  return Object.freeze({ ...value, witness: Object.freeze({ graph: projection.documentNi, projection: projection.digest, provider: WITNESS_SERVICES.witnessJournal.actor }) });
}

export async function readOutcomes(dataRoot = resolve(WITNESS_ROOT, "data")) {
  return await querySettlementRecords(OUTCOME_CATEGORY);
}
