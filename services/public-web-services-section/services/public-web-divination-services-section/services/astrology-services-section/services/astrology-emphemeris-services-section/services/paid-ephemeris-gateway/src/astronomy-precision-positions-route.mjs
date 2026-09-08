/**
 * Precision Moment's astronomy-only projection: the same DE440/OxiEphemeris
 * chart, stripped to raw apparent positions and lunar nodes -- no houses, no
 * angles, no lots, no dignities, no aspects, no astrological interpretation.
 * Node-only (needs the OXIEPH_BIN/OXIEPH_DE subprocess), proxied at the edge
 * by worker.mjs's PRECISION_ORIGIN binding, same as PRECISION_MOMENT_ROUTE.
 */
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { precisionMomentListingFramings } from "./route-catalog.mjs";

export const ASTRONOMY_PRECISION_POSITIONS_PRICE = "$0.32";
export const ASTRONOMY_PRECISION_POSITIONS_ROUTE = "/v1/astronomy/precision-positions/:date";

const ASTRONOMY_BODY_FIELDS = [
  "body", "lon_deg", "lat_deg", "lon_speed_deg_per_day", "lat_speed_deg_per_day",
  "distance_au", "light_time_days", "declination_deg", "retrograde", "out_of_bounds",
];

/**
 * Project one full Precision Moment result (from `computePrecisionMoment`)
 * to astronomy only: apparent body positions, lunar nodes, provenance, and
 * accuracy evidence. No sign, house, angle, lot, dignity, or aspect field
 * is copied across this boundary.
 */
export function projectAstronomyPrecisionPositions(precisionMoment) {
  const bodies = precisionMoment.chart.bodies.map((body) =>
    Object.fromEntries(ASTRONOMY_BODY_FIELDS.filter((field) => field in body).map((field) => [field, body[field]])));
  return {
    tier: "astronomy-precision-positions",
    time: precisionMoment.time,
    location: precisionMoment.location,
    metrology: precisionMoment.metrology,
    bodies,
    nodes: precisionMoment.chart.nodes,
    essentialsCrossCheck: precisionMoment.essentialsCrossCheck,
  };
}

/** Compose the shared subprocess computation with the astronomy-only projection. */
export async function computeAstronomyPrecisionPositions(date, options, dependencies) {
  return projectAstronomyPrecisionPositions(await dependencies.computePrecision(date, options));
}

const datePathSchema = {
  properties: {
    date: { type: "string", description: "Exact ISO-8601 UTC date or instant, e.g. 2026-07-21T00:00:00Z." },
  },
  required: ["date"],
};

export const astronomyPrecisionPositionsDiscovery = declareDiscoveryExtension({
  input: { latitude: 41.8781, longitude: -87.6298 },
  inputSchema: {
    properties: {
      latitude: { type: "number", minimum: -90, maximum: 90, description: "Geodetic degrees north." },
      longitude: { type: "number", minimum: -180, maximum: 180, description: "Geodetic degrees east." },
    },
    required: ["latitude", "longitude"],
  },
  pathParamsSchema: datePathSchema,
  output: {
    schema: {
      type: "object",
      required: ["tier", "time", "location", "metrology", "bodies", "nodes"],
      properties: {
        tier: { const: "astronomy-precision-positions" },
        time: { type: "string" },
        location: { type: "object" },
        metrology: { type: "object" },
        bodies: { type: "array" },
        nodes: { type: "object" },
        essentialsCrossCheck: { type: "object" },
      },
    },
    example: {
      tier: "astronomy-precision-positions",
      time: "2026-07-21T00:00:00.000Z",
      location: { latitudeDegreesNorth: 41.8781, longitudeDegreesEast: -87.6298 },
      metrology: { ephemeris: "JPL DE440", supplier: "OxiEphemeris 0.1.1" },
      bodies: [{ body: "Sun", lon_deg: 118.28082814466296, lat_deg: -0.0000954, distance_au: 1.0160791606164674 }],
      nodes: { mean_node_deg: 331.52801390791086, true_node_deg: 330.2782328236698 },
    },
  },
});

/** {@link precisionMomentListingFramings.positionalAstronomy} scoped to this route's own tags/description. */
export const astronomyPrecisionPositionsListing = precisionMomentListingFramings.positionalAstronomy;
