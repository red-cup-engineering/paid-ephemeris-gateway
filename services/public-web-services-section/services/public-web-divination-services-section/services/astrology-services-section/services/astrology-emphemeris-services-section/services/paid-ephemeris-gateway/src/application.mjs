import { createOfferSeller } from "@red-cup-engineering/x402-offer-seller-service";
import { computeEphemeris } from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";
import { computeAstronomyPositions, normalizeInstant } from "@lenticule-science/astronomy-services-section";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import { createMarketObservationHandler, normalizeWindowRequest } from "./market-observation-route.mjs";
import { OFFERS, ESSENTIALS_OFFER, PRECISION_OFFER, ASTRONOMY_OFFER, ASTRONOMY_PRECISION_OFFER, MARKET_OFFER, DEFAULT_INDEX_VERIFICATION_HASH, precisionOptions } from "./route-catalog.mjs";

const route = (offer) => offer.declaration.route;
const astronomyOptions = (query) => ({ latitude: query.latitude, longitude: query.longitude });

/** Bind domain operations to the shared seller on Node and Workers. */
export function createGatewayApplication(env = {}, dependencies = {}) {
  const rails = { X402_NETWORK: "eip155:8453", X402_FACILITATOR: "https://api.cdp.coinbase.com/platform/v2/x402", INDEX_VERIFICATION_HASH: DEFAULT_INDEX_VERIFICATION_HASH, ...env };
  const precisionComputes = {
    [route(PRECISION_OFFER)]: dependencies.computePrecision,
    [route(ASTRONOMY_PRECISION_OFFER)]: dependencies.computeAstronomyPrecision,
  };
  const offers = OFFERS.filter((offer) => !(route(offer) in precisionComputes) || precisionComputes[route(offer)] || env.PRECISION_ORIGIN);
  const market = createMarketObservationHandler(env, dependencies);
  const compute = {
    [route(ESSENTIALS_OFFER)]: ({ params }) => (dependencies.computeEssentials || computeEphemeris)(params.date),
    [route(ASTRONOMY_OFFER)]: ({ params }) => (dependencies.computeAstronomyPositions || computeAstronomyPositions)(params.date),
    [route(MARKET_OFFER)]: (_input, context) => market(context),
    ...(dependencies.computePrecision ? {
      [route(PRECISION_OFFER)]: ({ params, query }) => dependencies.computePrecision(params.date, precisionOptions(query)),
    } : {}),
    ...(dependencies.computeAstronomyPrecision ? {
      [route(ASTRONOMY_PRECISION_OFFER)]: ({ params, query }) => dependencies.computeAstronomyPrecision(params.date, astronomyOptions(query)),
    } : {}),
  };
  const validate = {
    [route(ESSENTIALS_OFFER)]: ({ params }) => normalizeInstant(params.date),
    [route(ASTRONOMY_OFFER)]: ({ params }) => normalizeInstant(params.date),
    [route(MARKET_OFFER)]: ({ query }) => normalizeWindowRequest(query),
    ...(dependencies.normalizePrecisionRequest ? { [route(PRECISION_OFFER)]: ({ params, query }) => dependencies.normalizePrecisionRequest(params.date, precisionOptions(query)) } : {}),
    ...(dependencies.normalizeAstronomyPrecisionRequest ? { [route(ASTRONOMY_PRECISION_OFFER)]: ({ params, query }) => dependencies.normalizeAstronomyPrecisionRequest(params.date, astronomyOptions(query)) } : {}),
  };
  return createOfferSeller({
    offers, env: rails, compute, validate,
    proxy: env.PRECISION_ORIGIN ? Object.fromEntries(Object.entries(precisionComputes).filter(([, compute]) => !compute).map(([path]) => [path, env.PRECISION_ORIGIN])) : {},
    facilitatorClient: dependencies.facilitatorClient,
    facilitatorClientFactory: () => selectFacilitatorClient(rails, dependencies.facilitatorClient, rails.X402_FACILITATOR, dependencies.createCdpFacilitatorClient),
    afterSettle: dependencies.afterSettle, fetch: dependencies.fetch,
  });
}
