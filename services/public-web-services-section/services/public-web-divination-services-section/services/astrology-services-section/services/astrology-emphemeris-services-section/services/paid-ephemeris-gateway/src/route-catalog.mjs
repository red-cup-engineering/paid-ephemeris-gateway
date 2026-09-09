import { declareOffer } from "@red-cup-engineering/x402-services-section/offer";
import declarations from "../data/contracts/offers.json" with { type: "json" };
export const OFFERS = Object.freeze(declarations.map(declareOffer));
export const offerFor = (operation) => OFFERS.find((offer) => offer.declaration.operation === operation);
export const ESSENTIALS_OFFER = offerFor("moment");
export const PRECISION_OFFER = offerFor("precision-moment");
export const ASTRONOMY_OFFER = offerFor("astronomy-positions");
export const ASTRONOMY_PRECISION_OFFER = offerFor("astronomy-precision-positions");
export const MARKET_OFFER = offerFor("market-observation");
export const MOMENT_ESSENTIALS_PRICE = ESSENTIALS_OFFER.declaration.price;
export const PRECISION_MOMENT_PRICE = PRECISION_OFFER.declaration.price;
export const MOMENT_ESSENTIALS_ROUTE = ESSENTIALS_OFFER.declaration.route;
export const PRECISION_MOMENT_ROUTE = PRECISION_OFFER.declaration.route;
export const STATUS_ROUTE = "/v1/status";
export const INDEX_VERIFICATION_ROUTE = "/.well-known/402index-verify.txt";
export const DEFAULT_INDEX_VERIFICATION_HASH = "8f8a2ea306af8bf4937fbeaf674c1cabcf974d319934f31d6c4e7c515fdc873a";
export const essentialsDiscovery = ESSENTIALS_OFFER.discovery;
export const precisionDiscovery = PRECISION_OFFER.discovery;
export function precisionOptions(query) {
  return { latitude: query.latitude, longitude: query.longitude, houseSystem: query.houseSystem, rulership: query.rulership, sidereal: query.sidereal };
}
export const precisionMomentListingFramings = Object.freeze({
  astrology: PRECISION_OFFER.declaration.framings[0],
  positionalAstronomy: ASTRONOMY_PRECISION_OFFER.declaration.framings[0],
});
