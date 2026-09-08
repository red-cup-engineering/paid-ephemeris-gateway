/**
 * Paid HTTP and Bazaar projection for the shared x402 market-observation
 * capability. The package owns the Base provider pool, EIP-3009 validation,
 * attempts, and range-observation provenance; this gateway owns only payment,
 * request validation, and its public response shape.
 */
import { observeSettlement } from "@red-cup-engineering/x402-market-observation-service/settlement";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

export const MARKET_OBSERVATION_PRICE = "$0.10";
export const MARKET_OBSERVATION_ROUTE = "/v1/x402-market/observation";
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

export const marketObservationDiscovery = declareDiscoveryExtension({
  input: { windowBlocks: DEFAULT_WINDOW_BLOCKS },
  inputSchema: { properties: { windowBlocks: {
    type: "integer", minimum: MIN_WINDOW_BLOCKS, maximum: MAX_WINDOW_BLOCKS, default: DEFAULT_WINDOW_BLOCKS,
    description: "Block-count sample window ending near a public-provider chain tip; the response distinguishes measured range from arithmetic extrapolation.",
  } } },
  output: { schema: { type: "object", required: ["recordType", "observedAt", "chain", "measured", "extrapolated", "caveat"], properties: {
    recordType: { type: "string" }, observedAt: { type: "string" }, chain: { type: "object" }, measured: { type: "object" },
    distinctAuthorizersSampled: { type: "integer" }, extrapolated: { type: "object" }, caveat: { type: "string" },
  } }, example: {
    recordType: "561-group.x402-market-observation", observedAt: "2026-08-28T02:00:00.000Z",
    chain: { network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", rangeObservation: true },
    measured: { fromBlock: 50546711, toBlock: 50547611, blocks: 900, approximateMinutes: 30, authorizations: 812, distinctAuthorizers: 96 },
    distinctAuthorizersSampled: 96,
    extrapolated: { dayFactor: 48, monthFactor: 1440, authorizationsPerDay: 38976, authorizationsPer30Days: 1169280, basis: "a 900-block sample scaled by 48.0 to a day; a burst inside the window is scaled with it" },
    caveat: "EIP-3009 AuthorizationUsed is not an x402 marker or an agent identity. Daily and monthly figures are arithmetic projections from this sampled range, not established bounds.",
  } },
});

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
