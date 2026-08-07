import express from "express";
import {
  createExactEvmPaymentBoundary,
  declareDiscoveryExtension,
} from "@red-cup-engineering/x402-services-section/server";
import { evaluateBasePreSignPolicy, normalizeRequest, PolicyConformanceRefusal } from "./policy-conformance.mjs";
import {
  evaluateMarketActionAdmission,
  normalizeMarketActionAdmissionRequest,
  MarketActionAdmissionRefusal,
} from "./market-action-admission.mjs";

export const X402_TEST_NETWORK = "eip155:84532";
export const X402_MAINNET_NETWORK = "eip155:8453";
export const X402_TEST_FACILITATOR = "https://x402.org/facilitator";
export const X402_DEFAULT_PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";
export const X402_DEFAULT_PRICE = "$0.01";
export const X402_ROUTE = "/v1/pre-sign/conformance";
export const X402_SERVICE_NAME = "trashpanda-services-pre-sign-policy-conformance";
export const X402_MARKET_ACTION_ROUTE = "/v1/market-action/admission";
export const X402_MARKET_ACTION_SERVICE_NAME = "trashpanda-services-market-action-admission";
export const X402_DEFAULT_MARKET_ACTION_PRICE = "$0.04";
export const X402_SAMPLE_REQUEST = Object.freeze({
  type: "BasePreSignConformanceRequest",
  version: 1,
  transaction: Object.freeze({ type: "UnsignedBaseTransaction", chainId: 8453, sender: "0x1111111111111111111111111111111111111111", to: "0x2222222222222222222222222222222222222222", valueWei: "0", data: "0x", gasLimit: "21000", nonce: "0" }),
  policy: Object.freeze({ type: "BasePreSignPolicy", version: 1, clauses: Object.freeze([Object.freeze({ id: "a-chain", type: "ChainIdEquals", chainId: 8453 })]) }),
  anchor: Object.freeze({ type: "ImmutableBaseBlockAnchor", chainId: 8453, blockNumber: "1", blockHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
  evidence: Object.freeze([]),
  receiptProfile: "full-v1",
});
export const X402_MARKET_ACTION_SAMPLE_REQUEST = Object.freeze({
  type: "MarketActionAdmissionRequest",
  version: 1,
  candidate: Object.freeze({
    type: "CandidateMarketAction",
    action: "SELL",
    venue: "urn:venue:gmx-v2:eip155:42161",
    instrument: "urn:instrument:gmx:eth-usd-perpetual",
    side: "LONG",
    notionalUsdMicros: "25000000",
    leverageBps: "20000",
  }),
  anchor: Object.freeze({
    type: "ImmutableMarketDecisionAnchor",
    snapshot: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    decisionAt: "2026-07-22T18:00:30.000Z",
    expiresAt: "2026-07-22T18:05:30.000Z",
  }),
  evidence: Object.freeze([]),
  policy: Object.freeze({
    type: "MarketActionAdmissionPolicy",
    version: 1,
    clauses: Object.freeze([
      Object.freeze({ id: "a-action", type: "ActionIn", actions: Object.freeze(["SELL"]) }),
      Object.freeze({ id: "b-notional", type: "NotionalUsdMicrosAtMost", value: "50000000" }),
      Object.freeze({ id: "c-leverage", type: "LeverageBpsAtMost", value: "30000" }),
    ]),
  }),
  receiptProfile: "full-v1",
});

const output = {
  example: evaluateBasePreSignPolicy(X402_SAMPLE_REQUEST),
  schema: {
    type: "object",
    required: ["id", "type", "transactionDigest", "policyDigest", "chain", "block", "engine", "law", "clauseResults", "verdict", "replay", "forbiddenEffects"],
    properties: {
      id: { type: "string" },
      type: { const: "BasePreSignPolicyConformanceReceipt" },
      verdict: { enum: ["PASS", "FAIL", "ESCALATE"] },
      clauseResults: { type: "array" },
      forbiddenEffects: { type: "object" },
    },
  },
};

const discovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: X402_SAMPLE_REQUEST,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "version", "transaction", "policy", "anchor", "evidence", "receiptProfile"],
    properties: {
      type: { const: "BasePreSignConformanceRequest" },
      version: { const: 1 },
      transaction: { type: "object", description: "One unsigned Base transaction; credentials, signatures, signed transactions, custody, signing, and broadcast grants are refused." },
      policy: { type: "object", description: "The exact deterministic policy clauses to evaluate." },
      anchor: { type: "object", description: "One immutable Base block number and hash." },
      evidence: { type: "array", description: "Deterministic evidence objects cited by policy clauses." },
      receiptProfile: { const: "full-v1" },
    },
  },
  output,
});

const marketActionDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: X402_MARKET_ACTION_SAMPLE_REQUEST,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "version", "candidate", "anchor", "evidence", "policy", "receiptProfile"],
    properties: {
      type: { const: "MarketActionAdmissionRequest" },
      version: { const: 1 },
      candidate: { type: "object", description: "One proposed BUY, SELL, CLOSE, REDUCE, or HOLD action; never an order or execution grant." },
      anchor: { type: "object", description: "One immutable content-addressed snapshot and bounded decision-validity window." },
      evidence: { type: "array", description: "Sorted customer-declared, publicly referenceable observations bound to the snapshot." },
      policy: { type: "object", description: "Sorted deterministic admission clauses for venue, instrument, action, notional, leverage, evidence thresholds, and freshness." },
      receiptProfile: { const: "full-v1" },
    },
  },
  output: {
    example: evaluateMarketActionAdmission(X402_MARKET_ACTION_SAMPLE_REQUEST),
    schema: {
      type: "object",
      required: ["id", "type", "requestDigest", "candidateDigest", "policyDigest", "snapshot", "decisionAt", "validUntil", "engine", "clauseResults", "verdict", "replay", "forbiddenEffects"],
      properties: {
        id: { type: "string" },
        type: { const: "MarketActionAdmissionReceipt" },
        verdict: { enum: ["ADMIT", "REFUSE", "ESCALATE"] },
        clauseResults: { type: "array" },
        forbiddenEffects: { type: "object" },
      },
    },
  },
});

function chainIdFromNetwork(network) {
  if (network === X402_MAINNET_NETWORK) return 8453;
  if (network === X402_TEST_NETWORK) return 84532;
  throw new TypeError("Trashpanda Services supports only Base mainnet or Base Sepolia x402 settlement");
}

function selectedFacilitator(env, facilitatorClient, facilitatorUrl) {
  if (facilitatorClient !== undefined) return facilitatorClient;
  if (env.X402_FACILITATOR_PROVIDER === "cdp" || facilitatorUrl.includes("api.cdp.coinbase.com")) {
    throw new TypeError("Trashpanda Services requires an explicitly contracted facilitatorClient for authenticated CDP settlement");
  }
  return undefined;
}

export function createTrashpandaX402Service({ env = {}, facilitatorClient, afterSettle } = {}) {
  const network = env.X402_NETWORK ?? X402_TEST_NETWORK;
  const facilitatorUrl = env.X402_FACILITATOR ?? X402_TEST_FACILITATOR;
  const payTo = env.X402_PAY_TO;
  const price = env.TRASHPANDA_X402_PRICE ?? X402_DEFAULT_PRICE;
  const marketActionPrice = env.TRASHPANDA_MARKET_ACTION_PRICE ?? X402_DEFAULT_MARKET_ACTION_PRICE;
  if (!/^0x[0-9a-fA-F]{40}$/u.test(payTo ?? "")) throw new TypeError("Trashpanda Services requires one explicit EVM payout address");
  if (!/^\$(?:0|[1-9][0-9]*)\.[0-9]{2,6}$/u.test(price)) throw new TypeError("Trashpanda Services requires one exact decimal USD price");
  if (!/^\$(?:0|[1-9][0-9]*)\.[0-9]{2,6}$/u.test(marketActionPrice)) throw new TypeError("Trashpanda Services requires one exact decimal USD market-action price");
  if (typeof afterSettle !== "function") throw new TypeError("Trashpanda Services requires a sovereign settlement witness before it can serve paid work");
  const productChainId = chainIdFromNetwork(network);
  const contractedFacilitator = selectedFacilitator(env, facilitatorClient, facilitatorUrl);
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb", strict: true }));
  app.get("/healthz", (_request, response) => response.json({
    status: "ok",
    service: "trashpanda-services",
    products: ["pre-sign-transaction-policy-conformance", "market-action-admission"],
  }));
  app.post(X402_ROUTE, (request, response, next) => {
    try {
      const normalized = normalizeRequest(request.body);
      if (normalized.transaction.chainId !== productChainId || normalized.anchor.chainId !== productChainId) {
        throw new PolicyConformanceRefusal("wrong-production-chain", `this Trashpanda Services deployment accepts only Base chain ${productChainId}`, "$.transaction.chainId");
      }
      response.locals.normalizedRequest = normalized;
      next();
    } catch (error) {
      if (error instanceof PolicyConformanceRefusal) {
        response.status(422).json({ type: "PolicyConformanceRefusal", code: error.code, path: error.path, message: error.message });
      } else next(error);
    }
  });
  app.post(X402_MARKET_ACTION_ROUTE, (request, response, next) => {
    try {
      response.locals.normalizedMarketActionRequest = normalizeMarketActionAdmissionRequest(request.body);
      next();
    } catch (error) {
      if (error instanceof MarketActionAdmissionRefusal) {
        response.status(422).json({ type: "MarketActionAdmissionRefusal", code: error.code, path: error.path, message: error.message });
      } else next(error);
    }
  });
  const routes = {
    [`POST ${X402_ROUTE}`]: {
      accepts: [{ scheme: "exact", price, network, payTo }],
      description: "Trashpanda Services deterministically evaluates one unsigned Base transaction against the buyer's exact policy and immutable block anchor before signing, returning a replayable clause-by-clause PASS, FAIL, or ESCALATE receipt. No keys, signatures, custody, signing, or broadcast authority are accepted.",
      mimeType: "application/json",
      serviceName: X402_SERVICE_NAME,
      tags: ["trashpanda-services", "base", "pre-sign", "transaction-policy", "deterministic"],
      extensions: discovery,
    },
    [`POST ${X402_MARKET_ACTION_ROUTE}`]: {
      accepts: [{ scheme: "exact", price: marketActionPrice, network, payTo }],
      description: "Trashpanda Services deterministically evaluates one proposed market action against the buyer's exact policy, immutable snapshot, fees, risk limits, and customer-declared public evidence, returning a replayable ADMIT, REFUSE, or ESCALATE receipt. It does not predict markets, handle keys, hold custody, sign, place orders, or execute trades.",
      mimeType: "application/json",
      serviceName: X402_MARKET_ACTION_SERVICE_NAME,
      tags: ["trashpanda-services", "market-action", "risk-policy", "broker", "deterministic"],
      extensions: marketActionDiscovery,
    },
  };
  const boundary = createExactEvmPaymentBoundary({ network, routes, facilitatorUrl, facilitatorClient: contractedFacilitator, afterSettle });
  app.use(boundary.middleware);
  app.post(X402_ROUTE, (_request, response) => response.json(evaluateBasePreSignPolicy(response.locals.normalizedRequest)));
  app.post(X402_MARKET_ACTION_ROUTE, (_request, response) => response.json(evaluateMarketActionAdmission(response.locals.normalizedMarketActionRequest)));
  return Object.freeze({
    app, boundary, network, facilitatorUrl, payTo, price, marketActionPrice,
    route: X402_ROUTE, serviceName: X402_SERVICE_NAME,
    marketActionRoute: X402_MARKET_ACTION_ROUTE,
    marketActionServiceName: X402_MARKET_ACTION_SERVICE_NAME,
    productChainId,
  });
}
