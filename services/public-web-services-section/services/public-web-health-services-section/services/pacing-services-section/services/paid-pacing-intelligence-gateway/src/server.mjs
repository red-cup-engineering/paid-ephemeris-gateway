import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createExactEvmPaymentBoundary } from "@red-cup-engineering/x402-services-section/server";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import { createSettlementWitness } from "./settlement-witness.mjs";
import {
  runHeartRateThreshold,
  runPacingAnalysis,
  validateHeartRateThresholdRequest,
  validatePacingAnalysisRequest,
} from "./pacing-request.mjs";
import {
  HEART_RATE_THRESHOLD_PRICE,
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_PRICE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
  heartRateThresholdDiscovery,
  pacingAnalysisDiscovery,
} from "./route-catalog.mjs";

export {
  HEART_RATE_THRESHOLD_PRICE,
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_PRICE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
};

const DEFAULT_NETWORK = "eip155:84532";
const DEFAULT_FACILITATOR = "https://x402.org/facilitator";
const DEFAULT_PORT = 4041;

function admissionRefusal(response, error) {
  if (error instanceof TypeError || error instanceof RangeError) {
    response.status(422).json({ error: error.message });
    return true;
  }
  return false;
}

/**
 * Build the Express/Cloud Run entrypoint. Both routes are stateless: the
 * caller's biometric payload is analyzed in memory and never written to
 * disk -- only the x402 settlement (network/transaction/payer/amount/tier)
 * is witnessed, the same split `paid-ephemeris-gateway` uses.
 */
export function createServer(env = process.env, dependencies = {}) {
  const network = env.X402_NETWORK || DEFAULT_NETWORK;
  const facilitatorUrl = env.X402_FACILITATOR || DEFAULT_FACILITATOR;
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");

  const facilitatorClient = selectFacilitatorClient(
    env,
    dependencies.facilitatorClient,
    facilitatorUrl,
    dependencies.createCdpFacilitatorClient,
  );
  const afterSettle = dependencies.afterSettle || createSettlementWitness(env);
  const app = express();
  // Cloud Run terminates TLS at its first proxy hop. Trust that hop so x402's
  // advertised resource URL retains the buyer-facing HTTPS scheme.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json());

  const status = (_request, response) => response.json({ status: "ok", service: "paid-pacing-intelligence-gateway" });
  app.get(STATUS_ROUTE, status);
  app.get("/healthz", status);

  const routes = {
    [`POST ${PACING_ANALYSIS_ROUTE}`]: {
      accepts: { scheme: "exact", price: PACING_ANALYSIS_PRICE, network, payTo },
      description:
        "Pacing Analysis: the full analyzePacing report over caller-submitted biometric observations -- rolling baselines, morning deviation, resting-heart-rate threshold estimate, and conservative PEM risk flags, each with citations and epistemic labels. Stateless: nothing submitted or computed is stored.",
      mimeType: "application/json",
      serviceName: "561-group-pacing-analysis",
      tags: ["pacing", "biometric", "me-cfs", "long-covid", "post-exertional-malaise", "hrv", "provenance"],
      extensions: pacingAnalysisDiscovery,
    },
    [`POST ${HEART_RATE_THRESHOLD_ROUTE}`]: {
      accepts: { scheme: "exact", price: HEART_RATE_THRESHOLD_PRICE, network, payTo },
      description:
        "Heart-Rate Threshold: the Workwell Foundation resting-heart-rate+15bpm pacing-ceiling heuristic, labeled as an unvalidated clinical rule of thumb. Stateless: nothing submitted or computed is stored.",
      mimeType: "application/json",
      serviceName: "561-group-pacing-heart-rate-threshold",
      tags: ["pacing", "biometric", "heart-rate", "workwell", "heuristic", "provenance"],
      extensions: heartRateThresholdDiscovery,
    },
  };

  const payment = createExactEvmPaymentBoundary({
    network,
    facilitatorUrl,
    facilitatorClient,
    routes,
    afterSettle,
  });

  app.post(PACING_ANALYSIS_ROUTE, (request, response, next) => {
    try { validatePacingAnalysisRequest(request.body); next(); }
    catch (error) { if (!admissionRefusal(response, error)) next(error); }
  });
  app.post(HEART_RATE_THRESHOLD_ROUTE, (request, response, next) => {
    try { validateHeartRateThresholdRequest(request.body); next(); }
    catch (error) { if (!admissionRefusal(response, error)) next(error); }
  });

  app.use(payment.middleware);

  app.post(PACING_ANALYSIS_ROUTE, (request, response, next) => {
    try { response.json((dependencies.runPacingAnalysis || runPacingAnalysis)(request.body)); }
    catch (error) { if (!admissionRefusal(response, error)) next(error); }
  });
  app.post(HEART_RATE_THRESHOLD_ROUTE, (request, response, next) => {
    try { response.json((dependencies.runHeartRateThreshold || runHeartRateThreshold)(request.body)); }
    catch (error) { if (!admissionRefusal(response, error)) next(error); }
  });

  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ pacingAnalysis: PACING_ANALYSIS_PRICE, heartRateThreshold: HEART_RATE_THRESHOLD_PRICE }),
    port: Number(env.PORT) || DEFAULT_PORT,
  };
}

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, prices, port } = createServer();
  app.listen(port, "0.0.0.0", () => {
    const journal = createSemanticRecordJournal({ root: NODE_ROOT, objectKind: "paid-pacing-intelligence-gateway.server-event" });
    journal.record({
      category: "paid-pacing-intelligence-gateway.listening",
      recordedAt: new Date().toISOString(),
      record: {
        port,
        routes: {
          pacingAnalysis: { path: PACING_ANALYSIS_ROUTE, price: prices.pacingAnalysis },
          heartRateThreshold: { path: HEART_RATE_THRESHOLD_ROUTE, price: prices.heartRateThreshold },
        },
        payTo,
        network,
        facilitatorUrl,
      },
      charge: { support: true, refutation: false },
    });
    console.log(`paid-pacing-intelligence-gateway listening on 0.0.0.0:${port}`);
  });
}
