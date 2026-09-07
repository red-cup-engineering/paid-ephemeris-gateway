import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import {
  computeEphemeris,
  normalizeInstant,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  MARKET_OBSERVATION_PRICE,
  MARKET_OBSERVATION_ROUTE,
  normalizeWindowRequest,
  marketObservationDiscovery,
} from "./market-observation-route.mjs";
import { observeSettlement } from "@red-cup-engineering/x402-market-observation-service/settlement";
import {
  MOMENT_ESSENTIALS_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  STATUS_ROUTE,
  INDEX_VERIFICATION_ROUTE,
  DEFAULT_INDEX_VERIFICATION_HASH,
  essentialsDiscovery,
} from "./route-catalog.mjs";

const DEFAULT_NETWORK = "eip155:8453";
const MOMENT_PATH = /^\/v1\/ephemeris\/moment\/(.+)$/u;

/**
 * Precision Moment ($0.32, JPL DE440 via the pinned `oxieph` Rust CLI over a
 * local ephemeris file) is NOT served on this Workers target. Cloudflare's
 * V8 isolates have no `node:child_process`/`execFile` and no local binary
 * filesystem — a platform limit, not a refusal — so that tier stays on a
 * host that can run a subprocess until it gets a WASM or pure-JS engine.
 */
export const WORKER_ROUTES = Object.freeze([MOMENT_ESSENTIALS_ROUTE, MARKET_OBSERVATION_ROUTE]);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function dateRefusal(error) {
  if (error instanceof TypeError || error instanceof RangeError) return json({ error: error.message }, 422);
  return null;
}

async function momentEssentialsResponse(date, dependencies) {
  try {
    normalizeInstant(date);
    return json((dependencies.computeEssentials || computeEphemeris)(date));
  } catch (error) {
    return dateRefusal(error) ?? json({ error: "internal error computing moment essentials" }, 500);
  }
}

async function marketObservationResponse(env, url, dependencies) {
  try {
    const windowBlocks = normalizeWindowRequest(Object.fromEntries(url.searchParams));
    const observe = dependencies.observeSettlement || observeSettlement;
    const settlement = await observe({ readPool: dependencies.readPool, windowBlocks });
    if (!settlement.ok) return json({ error: `settlement measurement failed: ${settlement.reason}` }, 502);
    return json({
      recordType: "561-group.x402-market-observation",
      observedAt: new Date().toISOString(),
      chain: { network: "eip155:8453", asset: settlement.asset, rangeObservation: true, provenance: settlement.measured.provenance },
      measured: settlement.measured,
      distinctAuthorizersSampled: settlement.measured.distinctAuthorizers,
      extrapolated: settlement.extrapolated,
      caveat: settlement.caveat,
    });
  } catch (error) {
    return dateRefusal(error) ?? json({ error: "internal error computing market observation" }, 500);
  }
}

/** Log one settlement (network/transaction/payer/amount/tier) via `console.log`, visible over `wrangler tail`. */
function workersSettlementWitness(context) {
  const result = context?.result;
  console.log(JSON.stringify({
    event: "paid-ephemeris-gateway.workers-settlement",
    network: result?.network,
    transaction: result?.transaction,
    payer: result?.payer ?? null,
    amount: result?.amount ?? context.requirements?.amount,
    recordedAt: new Date().toISOString(),
  }));
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
      [`GET ${MOMENT_ESSENTIALS_ROUTE}`]: {
        accepts: { scheme: "exact", price: MOMENT_ESSENTIALS_PRICE, network, payTo },
        description:
          "Moment Essentials: deterministic apparent tropical ephemeris for one exact UTC instant—10 bodies, signs, motion, lunar phase, major aspects, provenance, and audited error bounds.",
        mimeType: "application/json",
        serviceName: "561-group-ephemeris-moment",
        tags: ["ephemeris", "astrology", "planetary-positions", "exact-moment", "provenance"],
        extensions: essentialsDiscovery,
      },
      [`GET ${MARKET_OBSERVATION_ROUTE}`]: {
        accepts: { scheme: "exact", price: MARKET_OBSERVATION_PRICE, network, payTo },
        description:
          "x402 Market Observation: sampled Base-USDC EIP-3009 AuthorizationUsed activity over a recent block range, with provider provenance and explicit arithmetic extrapolation. It does not identify x402 use, agents, or protocol share.",
        mimeType: "application/json",
        serviceName: "561-group-x402-market-observation",
        tags: ["x402", "market-data", "base", "eip-3009", "agent-commerce", "settlement"],
        extensions: marketObservationDiscovery,
      },
    },
  });
  return cache.boundary;
}

/**
 * Build one Workers `{ fetch }` export. `dependencies` injects test doubles
 * (`facilitatorClient`, `computeEssentials`, `observeSettlement`, `readPool`)
 * the same way `createServer(env, dependencies)` does for the Express/Cloud
 * Run entry in `server.mjs`; production uses the zero-argument default.
 */
export function createWorkerHandler(dependencies = {}) {
  const cache = { boundary: null };
  return {
    /** @param {Request} request @param {Record<string,string>} env @returns {Promise<Response>} */
    async fetch(request, env) {
      const url = new URL(request.url);

      if (request.method === "GET" && (url.pathname === STATUS_ROUTE || url.pathname === "/healthz")) {
        return json({ status: "ok", service: "paid-ephemeris-gateway" });
      }
      if (request.method === "GET" && url.pathname === INDEX_VERIFICATION_ROUTE) {
        const hash = env.INDEX_VERIFICATION_HASH || DEFAULT_INDEX_VERIFICATION_HASH;
        return new Response(hash, { headers: { "content-type": "text/plain", "cache-control": "no-store" } });
      }

      const momentMatch = request.method === "GET" ? MOMENT_PATH.exec(url.pathname) : null;
      const isMarketObservation = request.method === "GET" && url.pathname === MARKET_OBSERVATION_ROUTE;
      if (!momentMatch && !isMarketObservation) return json({ error: "not-found" }, 404);

      let boundary;
      try {
        boundary = boundaryFor(env, dependencies, cache);
      } catch (error) {
        return json({ error: `gateway misconfigured: ${error.message}` }, 500);
      }

      if (momentMatch) {
        try {
          normalizeInstant(momentMatch[1]);
        } catch (error) {
          return dateRefusal(error) ?? json({ error: "internal error validating date" }, 500);
        }
        return boundary.handle(request, () => momentEssentialsResponse(momentMatch[1], dependencies));
      }
      try {
        normalizeWindowRequest(Object.fromEntries(url.searchParams));
      } catch (error) {
        return dateRefusal(error) ?? json({ error: "internal error validating request" }, 500);
      }
      return boundary.handle(request, () => marketObservationResponse(env, url, dependencies));
    },
  };
}

export default createWorkerHandler();
