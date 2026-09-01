/**
 * `market-observation-route` — a second priced product on the same gateway: an on-demand
 * x402 market-size observation, computed live from Base at request time.
 *
 * The measurement itself lives in `@red-cup-engineering/x402-market-observation-service`
 * (counts EIP-3009 `AuthorizationUsed` settlements over a block window and extrapolates a
 * day/month figure, with the catalog-undercounts-the-market caveat carried in the body). This
 * module is only the HTTP + Bazaar-discovery skin: pre-payment validation of the window size,
 * the discovery extension describing the product, and the handler that runs after settlement.
 *
 * The measurement functions themselves are a vendored copy of
 * @red-cup-engineering/x402-market-observation-service's settlement.mjs, in
 * ./x402-settlement-observation.mjs (see that file's header for why: the source package is not
 * yet published to the internal registry, and ops/cloud-run/prepare-context.sh only copies this
 * gateway's own src/ into the Cloud Run build context, so a cross-package import — relative or
 * `file:` — would resolve locally but not survive the container build).
 */
import {
  catalogVisibility,
  observeSettlement,
} from "./x402-settlement-observation.mjs";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

export const MARKET_OBSERVATION_PRICE = "$0.10";
export const MARKET_OBSERVATION_ROUTE = "/v1/x402-market/observation";
export const DEFAULT_MARKET_RPC_URL = "https://mainnet.base.org";
export const DEFAULT_WINDOW_BLOCKS = 900; // ~30 minutes at Base's ~2s block time
export const MIN_WINDOW_BLOCKS = 30; // ~1 minute floor: below this a sample is mostly noise
export const MAX_WINDOW_BLOCKS = 10800; // ~6 hours ceiling: most public RPCs cap eth_getLogs ranges well under this

export function normalizeWindowRequest(query = {}) {
  if (query.windowBlocks === undefined) return DEFAULT_WINDOW_BLOCKS;
  const windowBlocks = Number(query.windowBlocks);
  if (!Number.isInteger(windowBlocks)) {
    throw new TypeError(`windowBlocks must be an integer, got ${JSON.stringify(query.windowBlocks)}`);
  }
  if (windowBlocks < MIN_WINDOW_BLOCKS || windowBlocks > MAX_WINDOW_BLOCKS) {
    throw new RangeError(`windowBlocks must be between ${MIN_WINDOW_BLOCKS} and ${MAX_WINDOW_BLOCKS}, got ${windowBlocks}`);
  }
  return windowBlocks;
}

export const marketObservationDiscovery = declareDiscoveryExtension({
  input: { windowBlocks: DEFAULT_WINDOW_BLOCKS },
  inputSchema: {
    properties: {
      windowBlocks: {
        type: "integer",
        minimum: MIN_WINDOW_BLOCKS,
        maximum: MAX_WINDOW_BLOCKS,
        default: DEFAULT_WINDOW_BLOCKS,
        description: "Block-count sample window ending at the chain tip; scaled to a day/month in the response.",
      },
    },
  },
  output: {
    schema: {
      type: "object",
      required: ["recordType", "observedAt", "chain", "measured", "extrapolated", "caveat"],
      properties: {
        recordType: { type: "string" },
        observedAt: { type: "string" },
        chain: { type: "object" },
        measured: { type: "object" },
        distinctAuthorizersSampled: { type: "integer" },
        extrapolated: { type: "object" },
        caveat: { type: "string" },
      },
    },
    example: {
      recordType: "561-group.x402-market-observation",
      observedAt: "2026-08-28T02:00:00.000Z",
      chain: { network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", rpcUrl: "https://mainnet.base.org" },
      measured: { fromBlock: 50546711, toBlock: 50547611, blocks: 900, approximateMinutes: 30, authorizations: 812, distinctAuthorizers: 96 },
      distinctAuthorizersSampled: 96,
      extrapolated: { dayFactor: 48, monthFactor: 1440, authorizationsPerDay: 38976, authorizationsPer30Days: 1169280, basis: "a 900-block sample scaled by 48.0 to a day; a burst inside the window is scaled with it" },
      caveat: "EIP-3009 AuthorizationUsed is the settlement primitive x402's exact scheme uses, not a marker of the protocol. These figures are an upper bound on x402 volume and a measurement of gasless-authorized stablecoin transfer generally.",
    },
  },
});

/**
 * Build the post-payment handler. `dependencies.rpcUrl` and `dependencies.now` are injectable
 * for tests; production leaves both at their defaults (the public Base RPC, `Date.now`).
 */
export function createMarketObservationHandler(env = process.env, dependencies = {}) {
  const rpcUrl = dependencies.rpcUrl || env.X402_MARKET_RPC_URL || DEFAULT_MARKET_RPC_URL;
  const observe = dependencies.observeSettlement || observeSettlement;
  const now = dependencies.now || (() => new Date().toISOString());

  return async function marketObservationHandler(request, response, next) {
    try {
      const windowBlocks = normalizeWindowRequest(request.query);
      const settlement = await observe({ rpcUrl, windowBlocks, fetchImpl: dependencies.fetchImpl });
      if (!settlement.ok) {
        response.status(502).json({ error: `settlement measurement failed: ${settlement.reason}`, rpcUrl });
        return;
      }
      const observation = {
        recordType: "561-group.x402-market-observation",
        observedAt: now(),
        chain: { network: "eip155:8453", asset: settlement.asset, rpcUrl },
        measured: settlement.measured,
        distinctAuthorizersSampled: settlement.measured.distinctAuthorizers,
        extrapolated: settlement.extrapolated,
        caveat: settlement.caveat,
      };
      response.json(observation);
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        response.status(422).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}

/** Pre-payment validation middleware: refuse a malformed windowBlocks before any 402 is issued. */
export function validateMarketObservationRequest(request, response, next) {
  try {
    normalizeWindowRequest(request.query);
    next();
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      response.status(422).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/** Exposed for anyone wiring `catalogVisibility` findings alongside this route elsewhere. */
export { catalogVisibility };
