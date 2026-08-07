import { resolve } from "node:path";
import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { settlementWitnessGraphId } from "@red-cup-engineering/x402-settlement-witness-identity";

const NODE_ID = "trashpanda-services";

function usdcBaseUnits(price, label) {
  const match = /^\$((?:0|[1-9][0-9]*))(?:\.([0-9]{1,6}))$/u.exec(price ?? "");
  if (!match) throw new Error(`${label} must be an exact USD price with one to six decimal places`);
  return (BigInt(match[1]) * 1_000_000n + BigInt(match[2].padEnd(6, "0"))).toString(10);
}

const PRODUCT_BY_ROUTE = Object.freeze({
  "/v1/pre-sign/conformance": "pre-sign-transaction-policy-conformance",
  "/v1/market-action/admission": "market-action-admission",
});

function resourcePath(context) {
  const value = context?.paymentPayload?.resource?.url;
  if (typeof value !== "string") return null;
  try { return new URL(value, "https://resource.invalid").pathname; }
  catch { return null; }
}

export function createTrashpandaSettlementWitness(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_RDF_AGENT;
  const dataRoot = env.TRASHPANDA_SERVICES_DATA_ROOT;
  const settlementAccount = env.TRASHPANDA_SETTLEMENT_ACCOUNT || env.X402_PAY_TO;
  const price = env.TRASHPANDA_X402_PRICE;
  const marketActionPrice = env.TRASHPANDA_MARKET_ACTION_PRICE;
  if (!agentUrl) throw new Error("WITNESS_JOURNAL_RDF_AGENT must name the hired witness-journal RDF provider's A2A Agent Card");
  if (!dataRoot) throw new Error("TRASHPANDA_SERVICES_DATA_ROOT must name the durable Trashpanda Services data plate");
  if (!settlementAccount) throw new Error("TRASHPANDA_SETTLEMENT_ACCOUNT or X402_PAY_TO must identify the settlement account");
  const products = new Map([
    [usdcBaseUnits(price, "TRASHPANDA_X402_PRICE"), { id: "pre-sign-transaction-policy-conformance", route: "/v1/pre-sign/conformance", price }],
    [usdcBaseUnits(marketActionPrice, "TRASHPANDA_MARKET_ACTION_PRICE"), { id: "market-action-admission", route: "/v1/market-action/admission", price: marketActionPrice }],
  ]);
  if (products.size !== 2) throw new Error("Trashpanda Services products require distinct exact prices for unambiguous settlement witnessing");
  const record = dependencies.record || recordWitnessJournalBatch;
  const now = dependencies.now || (() => new Date().toISOString());

  return async function appendSettlement(context) {
    const transaction = context?.result?.transaction;
    const network = context?.result?.network;
    const amount = context?.result?.amount ?? context?.requirements?.amount;
    const product = products.get(String(amount));
    const route = resourcePath(context);
    if (!transaction || network !== "eip155:8453" || !product || (route !== null && (PRODUCT_BY_ROUTE[route] !== product.id || route !== product.route))) {
      throw new Error("settled Trashpanda Services context omitted its configured exact Base-mainnet USDC settlement");
    }
    const payer = context.result.payer ?? null;
    const recordedAt = now();
    const graph = settlementWitnessGraphId({ network, transaction });
    const assertions = [
      ["urn:x402:network", network],
      ["urn:x402:transaction", transaction],
      ["urn:x402:payer", payer ?? "undisclosed"],
      ["urn:x402:amount", String(amount)],
      ["urn:emsenn:trashpanda-services:product", product.id],
      ["urn:prov:generatedAtTime", recordedAt],
    ].map(([predicate, value]) => ({ subject: graph, predicate, object: { kind: "literal", value } }));
    return record({
      agentUrl,
      root: resolve(dataRoot),
      nodeId: NODE_ID,
      batch: {
        settlement: settlementAccount,
        graph,
        recordedAt,
        document: relationalWitnessJournalDocument({
          type: "X402TrashpandaServicesSettlementWitness",
          product: product.id,
          payment: { network, transaction, payer, amount: String(amount), currency: "USDC", configuredPrice: product.price },
        }),
        assertions,
      },
    });
  };
}
