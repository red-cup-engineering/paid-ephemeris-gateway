import { resolve } from "node:path";

import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { settlementWitnessGraphId } from "@red-cup-engineering/x402-settlement-witness-identity";

const NODE_ID = "paid-ephemeris-gateway";

function tierFromAmount(amount) {
  const value = String(amount ?? "");
  if (value === "40000" || value === "$0.04") return "moment-essentials";
  if (value === "320000" || value === "$0.32") return "precision-moment";
  return "undeclared";
}

export function createSettlementWitness(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_RDF_AGENT;
  const dataRoot = env.PAID_EPHEMERIS_DATA_ROOT;
  const settlementAccount = env.PAID_EPHEMERIS_ACCOUNT || env.X402_PAY_TO;
  if (!agentUrl) throw new Error("WITNESS_JOURNAL_RDF_AGENT must name the hired witness-journal RDF provider's A2A Agent Card");
  if (!dataRoot) throw new Error("PAID_EPHEMERIS_DATA_ROOT must name the durable gateway data plate");
  if (!settlementAccount) throw new Error("PAID_EPHEMERIS_ACCOUNT or X402_PAY_TO must identify the settlement account");

  const record = dependencies.record || recordWitnessJournalBatch;
  const now = dependencies.now || (() => new Date().toISOString());

  return async function appendSettlement(context) {
    const transaction = context?.result?.transaction;
    const network = context?.result?.network;
    if (!transaction || !network) throw new Error("settled x402 context omitted network or transaction");
    const amount = context.result.amount ?? context.requirements?.amount;
    const payer = context.result.payer ?? null;
    const recordedAt = now();
    const graph = settlementWitnessGraphId({ network, transaction });
    const tier = tierFromAmount(amount);
    const assertions = [
      ["urn:x402:network", network],
      ["urn:x402:transaction", transaction],
      ["urn:x402:payer", payer ?? "undisclosed"],
      ["urn:x402:amount", amount],
      ["urn:emsenn:ephemeris:tier", tier],
      ["urn:prov:generatedAtTime", recordedAt],
    ].map(([predicate, value]) => ({
      subject: graph,
      predicate,
      object: { kind: "literal", value: String(value) },
    }));
    return record({
      agentUrl,
      root: resolve(dataRoot),
      nodeId: NODE_ID,
      batch: {
        settlement: settlementAccount,
        graph,
        recordedAt,
        document: relationalWitnessJournalDocument({
          type: "X402EphemerisSettlementWitness",
          tier,
          payment: { network, transaction, payer, amount: String(amount) },
        }),
        assertions,
      },
    });
  };
}
