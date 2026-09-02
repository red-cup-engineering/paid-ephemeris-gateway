import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
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

const DEFAULT_NETWORK = "eip155:8453";

/**
 * Unlike `paid-ephemeris-gateway` (whose Precision Moment tier needs a
 * subprocess and so cannot run in a Workers isolate), this gateway's
 * compute -- `@red-cup-engineering/pacing-intelligence-services-section` --
 * is pure JS with no filesystem, network, or subprocess dependency. Both
 * priced routes ship on this Workers transport identically to the
 * Express/Cloud Run transport in `server.mjs`.
 */
export const WORKER_ROUTES = Object.freeze([PACING_ANALYSIS_ROUTE, HEART_RATE_THRESHOLD_ROUTE]);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function admissionRefusal(error) {
  if (error instanceof TypeError || error instanceof RangeError) return json({ error: error.message }, 422);
  return null;
}

async function pacingAnalysisResponse(body, dependencies) {
  try {
    return json((dependencies.runPacingAnalysis || runPacingAnalysis)(body));
  } catch (error) {
    return admissionRefusal(error) ?? json({ error: "internal error computing pacing analysis" }, 500);
  }
}

async function heartRateThresholdResponse(body, dependencies) {
  try {
    return json((dependencies.runHeartRateThreshold || runHeartRateThreshold)(body));
  } catch (error) {
    return admissionRefusal(error) ?? json({ error: "internal error computing heart-rate threshold" }, 500);
  }
}

function boundaryFor(env, dependencies, cache) {
  if (cache.boundary) return cache.boundary;
  const network = env.X402_NETWORK || DEFAULT_NETWORK;
  const facilitatorUrl = env.X402_FACILITATOR || "https://api.cdp.coinbase.com/platform/v2/x402";
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
  const facilitatorClient = selectFacilitatorClient(env, dependencies.facilitatorClient, facilitatorUrl, dependencies.createCdpFacilitatorClient);
  cache.boundary = createExactEvmFetchPaymentBoundary({
    network,
    facilitatorUrl,
    facilitatorClient,
    afterSettle: workersSettlementWitness,
    routes: {
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
    },
  });
  return cache.boundary;
}

/** Log one settlement (network/transaction/payer/amount/tier) via `console.log`, visible over `wrangler tail`. Never the submitted biometric payload -- the stateless privacy stance holds on this transport too. */
function workersSettlementWitness(context) {
  const result = context?.result;
  console.log(JSON.stringify({
    event: "paid-pacing-intelligence-gateway.workers-settlement",
    network: result?.network,
    transaction: result?.transaction,
    payer: result?.payer ?? null,
    amount: result?.amount ?? context.requirements?.amount,
    recordedAt: new Date().toISOString(),
  }));
}

/**
 * Build one Workers `{ fetch }` export. `dependencies` injects test doubles
 * (`facilitatorClient`, `runPacingAnalysis`, `runHeartRateThreshold`) the
 * same way `createServer(env, dependencies)` does for the Express/Cloud Run
 * entry in `server.mjs`; production uses the zero-argument default.
 */
export function createWorkerHandler(dependencies = {}) {
  const cache = { boundary: null };
  return {
    /** @param {Request} request @param {Record<string,string>} env @returns {Promise<Response>} */
    async fetch(request, env) {
      const url = new URL(request.url);

      if (request.method === "GET" && (url.pathname === STATUS_ROUTE || url.pathname === "/healthz")) {
        return json({ status: "ok", service: "paid-pacing-intelligence-gateway" });
      }

      const isAnalysis = request.method === "POST" && url.pathname === PACING_ANALYSIS_ROUTE;
      const isThreshold = request.method === "POST" && url.pathname === HEART_RATE_THRESHOLD_ROUTE;
      if (!isAnalysis && !isThreshold) return json({ error: "not-found" }, 404);

      let boundary;
      try {
        boundary = boundaryFor(env, dependencies, cache);
      } catch (error) {
        return json({ error: `gateway misconfigured: ${error.message}` }, 500);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "request body must be valid JSON" }, 422);
      }
      try {
        if (isAnalysis) validatePacingAnalysisRequest(body);
        else validateHeartRateThresholdRequest(body);
      } catch (error) {
        return admissionRefusal(error) ?? json({ error: "internal error validating request" }, 500);
      }

      return boundary.handle(request, () => (isAnalysis ? pacingAnalysisResponse(body, dependencies) : heartRateThresholdResponse(body, dependencies)));
    },
  };
}

export default createWorkerHandler();
