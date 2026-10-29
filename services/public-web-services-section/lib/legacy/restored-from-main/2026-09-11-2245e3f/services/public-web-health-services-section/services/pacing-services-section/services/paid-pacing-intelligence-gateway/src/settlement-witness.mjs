import { resolve } from "node:path";

import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-document-service";
import { settlementWitnessGraphId } from "@red-cup-engineering/x402-settlement-witness-identity";

const NODE_ID = "paid-pacing-intelligence-gateway";

function tierFromAmount(amount) {
  const value = String(amount ?? "");
  if (value === "50000" || value === "$0.05") return "pacing-analysis";
  if (value === "10000" || value === "$0.01") return "heart-rate-threshold";
  return "undeclared";
}

/**
 * Witnesses only the settlement (network/transaction/payer/amount/tier) --
 * never the caller's submitted biometric payload or the computed analysis,
 * matching this gateway's stateless privacy stance: state custody stays
 * with the caller.
 */
export function createSettlementWitness(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_DOCUMENT_AGENT ?? env.WITNESS_JOURNAL_RDF_AGENT;
  const dataRoot = env.PAID_PACING_DATA_ROOT;
  const settlementAccount = env.X402_SETTLEMENT_ACCOUNT || env.X402_PAY_TO;
  if (!agentUrl) throw new Error("WITNESS_JOURNAL_DOCUMENT_AGENT must name the hired witness-journal document provider's Agent Card");
  if (!dataRoot) throw new Error("PAID_PACING_DATA_ROOT must name the durable gateway data plate");
  if (!settlementAccount) throw new Error("X402_SETTLEMENT_ACCOUNT or X402_PAY_TO must identify the settlement account");

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
      ["urn:emsenn:pacing:tier", tier],
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
          type: "X402PacingSettlementWitness",
          tier,
          payment: { network, transaction, payer, amount: String(amount) },
        }),
        assertions,
      },
    });
  };
}
