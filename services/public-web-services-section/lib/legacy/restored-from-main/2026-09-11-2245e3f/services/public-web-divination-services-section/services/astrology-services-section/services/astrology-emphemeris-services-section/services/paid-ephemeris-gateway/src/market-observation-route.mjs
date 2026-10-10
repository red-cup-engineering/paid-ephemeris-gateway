/**
 * Paid HTTP and Bazaar projection for the shared x402 market-observation
 * capability. The package owns the Base provider pool, EIP-3009 validation,
 * attempts, and range-observation provenance; this gateway owns only payment,
 * request validation, and its public response shape.
 */
import { observeSettlement } from "@red-cup-engineering/x402-market-observation-service/settlement";
import { MARKET_OFFER } from "./route-catalog.mjs";

export const MARKET_OBSERVATION_PRICE = MARKET_OFFER.declaration.price;
export const MARKET_OBSERVATION_ROUTE = MARKET_OFFER.declaration.route;
export const DEFAULT_WINDOW_BLOCKS = 900;
export const MIN_WINDOW_BLOCKS = 30;
export const MAX_WINDOW_BLOCKS = 10800;

export function normalizeWindowRequest(query = {}) {
  if (query.windowBlocks === undefined) return DEFAULT_WINDOW_BLOCKS;
  const windowBlocks = Number(query.windowBlocks);
  if (!Number.isInteger(windowBlocks)) throw new TypeError(`windowBlocks must be an integer, got ${JSON.stringify(query.windowBlocks)}`);
  if (windowBlocks < MIN_WINDOW_BLOCKS || windowBlocks > MAX_WINDOW_BLOCKS) {
    throw new RangeError(`windowBlocks must be between ${MIN_WINDOW_BLOCKS} and ${MAX_WINDOW_BLOCKS}, got ${windowBlocks}`);
  }
  return windowBlocks;
}

export const marketObservationDiscovery = MARKET_OFFER.discovery;

/** Build the post-payment handler. `readPool`, `observeSettlement`, and `now` are test seams. */
export function createMarketObservationHandler(_env = process.env, dependencies = {}) {
  const observe = dependencies.observeSettlement || observeSettlement;
  const now = dependencies.now || (() => new Date().toISOString());
  return async function marketObservationHandler(context) {
    const windowBlocks = normalizeWindowRequest(Object.fromEntries(context.url.searchParams));
    const settlement = await observe({ readPool: dependencies.readPool, windowBlocks });
    if (!settlement.ok) return Response.json({ error: `settlement measurement failed: ${settlement.reason}` }, { status: 502 });
    return Response.json({
      recordType: "561-group.x402-market-observation", observedAt: now(),
      chain: { network: "eip155:8453", asset: settlement.asset, rangeObservation: true, provenance: settlement.measured.provenance },
      measured: settlement.measured, distinctAuthorizersSampled: settlement.measured.distinctAuthorizers,
      extrapolated: settlement.extrapolated, caveat: settlement.caveat,
    });
  };
}
