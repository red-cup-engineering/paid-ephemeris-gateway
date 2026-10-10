export { computeAstronomyPositions } from "@lenticule-science/astronomy-services-section";

import { ASTRONOMY_OFFER } from "./route-catalog.mjs";
export const ASTRONOMY_POSITIONS_PRICE = ASTRONOMY_OFFER.declaration.price;
export const ASTRONOMY_POSITIONS_ROUTE = ASTRONOMY_OFFER.declaration.route;
export const astronomyPositionsDiscovery = ASTRONOMY_OFFER.discovery;
