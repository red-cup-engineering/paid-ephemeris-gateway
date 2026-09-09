import { createOfferSellerWorker, proxyPaymentBoundary } from "@red-cup-engineering/x402-offer-seller-service";
import { createGatewayApplication } from "./application.mjs";
import { ESSENTIALS_OFFER, ASTRONOMY_OFFER, MARKET_OFFER, PRECISION_OFFER, ASTRONOMY_PRECISION_OFFER } from "./route-catalog.mjs";
export const WORKER_ROUTES = Object.freeze([ESSENTIALS_OFFER, ASTRONOMY_OFFER, MARKET_OFFER].map((offer) => offer.declaration.route));
export const PRECISION_PROXY_ROUTES = Object.freeze([PRECISION_OFFER, ASTRONOMY_PRECISION_OFFER].map((offer) => offer.declaration.route));
export { proxyPaymentBoundary as proxyToPrecisionOrigin };
export function createWorkerHandler(dependencies = {}) {
  return createOfferSellerWorker((env) => createGatewayApplication(env, dependencies));
}
export default createWorkerHandler();
