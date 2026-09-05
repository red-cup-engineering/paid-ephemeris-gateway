import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { scoreSetOfOrphanPatchCandidates } from "@red-cup-engineering/jsnode-package-vulnerability-triage-services-section/score-set-of-orphan-patch-candidates";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  ORPHAN_PATCH_SCORE_PRICE,
  ORPHAN_PATCH_SCORE_ROUTE,
  STATUS_ROUTE,
  orphanPatchScoreDiscovery,
} from "./route-catalog.mjs";

const DEFAULT_NETWORK = "eip155:8453";

export const WORKER_ROUTES = Object.freeze([ORPHAN_PATCH_SCORE_ROUTE]);

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function inputRefusal(error) {
  if (error instanceof TypeError || error instanceof SyntaxError) return json({ error: error.message }, 422);
  return null;
}

async function scoreResponse(request, dependencies) {
  try {
    const requestBody = await request.json();
    const score = dependencies.scoreOrphanPatchCandidates || scoreSetOfOrphanPatchCandidates;
    return json(score(requestBody));
  } catch (error) {
    return inputRefusal(error) ?? json({ error: "internal error scoring orphan-patch candidates" }, 500);
  }
}

/** Log one settlement (network/transaction/payer/amount) via `console.log`, visible over `wrangler tail`. */
function workersSettlementWitness(context) {
  const result = context?.result;
  console.log(JSON.stringify({
    event: "paid-orphan-patch-triage-gateway.workers-settlement",
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
      [`POST ${ORPHAN_PATCH_SCORE_ROUTE}`]: {
        accepts: { scheme: "exact", price: ORPHAN_PATCH_SCORE_PRICE, network, payTo },
        description:
          "Orphan-Patch Triage Score: deterministic ranking of packages with disclosed, unpatched advisories, silent maintainers, and many dependents, from public advisory/maintenance/dependent-count inputs alone.",
        mimeType: "application/json",
        serviceName: "561-group-orphan-patch-score",
        tags: ["vulnerability-triage", "orphan-patch", "supply-chain-security", "npm", "advisory"],
        extensions: orphanPatchScoreDiscovery,
      },
    },
  });
  return cache.boundary;
}

/**
 * Build one Workers `{ fetch }` export. `dependencies` injects test doubles
 * (`facilitatorClient`, `scoreOrphanPatchCandidates`) the same way
 * `createServer(env, dependencies)` does for the Express/Cloud Run entry in
 * `server.mjs`; production uses the zero-argument default.
 */
export function createWorkerHandler(dependencies = {}) {
  const cache = { boundary: null };
  return {
    /** @param {Request} request @param {Record<string,string>} env @returns {Promise<Response>} */
    async fetch(request, env) {
      const url = new URL(request.url);

      if (request.method === "GET" && (url.pathname === STATUS_ROUTE || url.pathname === "/healthz")) {
        return json({ status: "ok", service: "paid-orphan-patch-triage-gateway" });
      }
      if (request.method !== "POST" || url.pathname !== ORPHAN_PATCH_SCORE_ROUTE) {
        return json({ error: "not-found" }, 404);
      }

      let boundary;
      try {
        boundary = boundaryFor(env, dependencies, cache);
      } catch (error) {
        return json({ error: `gateway misconfigured: ${error.message}` }, 500);
      }
      return boundary.handle(request, () => scoreResponse(request, dependencies));
    },
  };
}

export default createWorkerHandler();
