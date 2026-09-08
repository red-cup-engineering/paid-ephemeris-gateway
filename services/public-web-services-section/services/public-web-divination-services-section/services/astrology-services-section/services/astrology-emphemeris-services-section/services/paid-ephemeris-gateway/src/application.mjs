import { createFetchHandler } from "@red-cup-engineering/http-server-core-service/fetch";
import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import {
  computeEphemeris,
  normalizeInstant,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";

import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  ASTRONOMY_POSITIONS_PRICE,
  ASTRONOMY_POSITIONS_ROUTE,
  astronomyPositionsDiscovery,
  computeAstronomyPositions,
} from "./astronomy-positions-route.mjs";
import {
  MARKET_OBSERVATION_PRICE,
  MARKET_OBSERVATION_ROUTE,
  createMarketObservationHandler,
  marketObservationDiscovery,
  normalizeWindowRequest,
} from "./market-observation-route.mjs";
import {
  MOMENT_ESSENTIALS_PRICE,
  PRECISION_MOMENT_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  PRECISION_MOMENT_ROUTE,
  STATUS_ROUTE,
  INDEX_VERIFICATION_ROUTE,
  DEFAULT_INDEX_VERIFICATION_HASH,
  essentialsDiscovery,
  precisionDiscovery,
  precisionOptions,
} from "./route-catalog.mjs";


/** The same paid resources and admission rules run in Node and Workers. */
export function createGatewayApplication(env = {}, dependencies = {}) {
  const network = env.X402_NETWORK || "eip155:8453";
  const facilitatorUrl = env.X402_FACILITATOR || "https://api.cdp.coinbase.com/platform/v2/x402";
  const payTo = env.X402_PAY_TO;
  const routes = {
    [`GET ${MOMENT_ESSENTIALS_ROUTE}`]: {
      accepts: { scheme: "exact", price: MOMENT_ESSENTIALS_PRICE, network, payTo },
      description:
        "Moment Essentials: deterministic apparent tropical ephemeris for one exact UTC instant—10 bodies, signs, motion, lunar phase, major aspects, provenance, and audited error bounds.",
      mimeType: "application/json",
      serviceName: "561-group-ephemeris-moment",
      tags: ["ephemeris", "astrology", "planetary-positions", "exact-moment", "provenance"],
      extensions: essentialsDiscovery,
    },
    [`GET ${PRECISION_MOMENT_ROUTE}`]: {
      accepts: { scheme: "exact", price: PRECISION_MOMENT_PRICE, network, payTo },
      description:
        "Precision Moment: JPL DE440-backed astrology for one exact UTC instant and Earth location—raw apparent positions, houses, Ascendant/MC, nodes, lots, sect, dignities, expanded aspects, and cross-engine measurement evidence.",
      mimeType: "application/json",
      serviceName: "561-group-precision-moment",
      tags: ["ephemeris", "astrology", "jpl-de440", "natal-chart", "provenance"],
      extensions: precisionDiscovery,
    },
    [`GET ${ASTRONOMY_POSITIONS_ROUTE}`]: {
      accepts: { scheme: "exact", price: ASTRONOMY_POSITIONS_PRICE, network, payTo },
      description:
        "Astronomy Positions: apparent geocentric ecliptic longitude/latitude/speed for the ten bodies at one exact UTC instant, plus lunar phase and illuminated fraction, provenance, and audited error bounds. No signs, no aspects, no astrological interpretation.",
      mimeType: "application/json",
      serviceName: "561-group-astronomy-positions",
      tags: ["ephemeris", "positional-astronomy", "planetary-positions", "jpl", "provenance"],
      extensions: astronomyPositionsDiscovery,
    },
    [`GET ${MARKET_OBSERVATION_ROUTE}`]: {
      accepts: { scheme: "exact", price: MARKET_OBSERVATION_PRICE, network, payTo },
      description:
        "x402 Market Observation: sampled Base-USDC EIP-3009 AuthorizationUsed activity over a recent block range, with provider provenance and explicit arithmetic extrapolation. It does not identify x402 use, agents, or protocol share.",
      mimeType: "application/json",
      serviceName: "561-group-market-observation",
      tags: ["x402", "market-data", "base", "eip-3009", "agent-commerce"],
      extensions: marketObservationDiscovery,
    },
  };

  // Precision requires a subprocess-capable host. The Node entry supplies its
  // computation and validator; the Worker exposes only its executable products.
  if (!dependencies.computePrecision) delete routes[`GET ${PRECISION_MOMENT_ROUTE}`];
  for (const [route, offer] of Object.entries(routes)) routes[route.replace(/^GET /, "HEAD ")] = offer;
  let boundary;
  function payment() {
    if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
    if (boundary) return boundary;
    boundary = createExactEvmFetchPaymentBoundary({ network, facilitatorUrl, routes, afterSettle: dependencies.afterSettle,
      facilitatorClient: selectFacilitatorClient(env, dependencies.facilitatorClient, facilitatorUrl, dependencies.createCdpFacilitatorClient),
    });
    // Every route above declares a Bazaar discovery extension, but the
    // Fetch/Workers transport (unlike @x402/express's paymentMiddleware)
    // never auto-registers the bazaar resource-server extension, so
    // enrichDeclaration() (routeTemplate, info.input.method) never ran and
    // the discovery declaration served on the 402 challenge stayed the bare,
    // unenriched one. Register it explicitly, mirroring what @x402/express
    // does when checkIfBazaarNeeded(routes) is true.
    boundary.resourceServer.registerExtension(bazaarResourceServerExtension);
    return boundary;
  }
  async function paid(context, validate, respond) {
    let boundary;
    try { boundary = payment(); }
    catch (error) { return Response.json({ error: `gateway misconfigured: ${error.message}` }, { status: 500 }); }
    validate(context);
    return boundary.handle(context.request, async () => {
      try { return await respond(context); }
      catch (error) { return refusal(error); }
    });
  }
  function refusal(error) {
    const status = error instanceof TypeError || error instanceof RangeError ? 422 : 500;
    return Response.json({ error: status === 500 ? "internal error computing gateway response" : error.message }, { status });
  }
  const query = (context) => Object.fromEntries(context.url.searchParams);
  const market = createMarketObservationHandler(env, dependencies);
  return createFetchHandler({
    cacheControl: { noStore: true }, onError: refusal,
    resources: [
      ...[STATUS_ROUTE, "/healthz"].map((match) => ({ match, methods: ["GET"], handler: () => Response.json({ status: "ok", service: "paid-ephemeris-gateway" }) })),
      { match: INDEX_VERIFICATION_ROUTE, methods: ["GET"], handler: () => new Response(env.INDEX_VERIFICATION_HASH || DEFAULT_INDEX_VERIFICATION_HASH, { headers: { "content-type": "text/plain" } }) },
      { match: MOMENT_ESSENTIALS_ROUTE, methods: ["GET"], handler: (ctx) => paid(ctx, (ctx) => normalizeInstant(ctx.params.date), (ctx) => Response.json((dependencies.computeEssentials || computeEphemeris)(ctx.params.date))) },
      { match: ASTRONOMY_POSITIONS_ROUTE, methods: ["GET"], handler: (ctx) => paid(ctx, (ctx) => normalizeInstant(ctx.params.date), (ctx) => Response.json((dependencies.computeAstronomyPositions || computeAstronomyPositions)(ctx.params.date))) },
      ...(dependencies.computePrecision ? [{ match: PRECISION_MOMENT_ROUTE, methods: ["GET"], handler: (ctx) => paid(ctx,
        (ctx) => dependencies.normalizePrecisionRequest(ctx.params.date, precisionOptions(query(ctx))),
        async (ctx) => Response.json(await dependencies.computePrecision(ctx.params.date, precisionOptions(query(ctx))))) }] : []),
      { match: MARKET_OBSERVATION_ROUTE, methods: ["GET"], handler: (ctx) => paid(ctx, (ctx) => normalizeWindowRequest(query(ctx)), market) },
    ],
  });
}
