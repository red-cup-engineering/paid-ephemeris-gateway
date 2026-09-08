/**
 * Second Workers-served product: Moment Essentials projected to astronomy
 * only (positions, lunar phase, provenance, accuracy) -- no signs, no
 * aspects, no astrological interpretation. Founder ruling: astronomical data.
 */
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import {
  BODIES,
  computeEphemeris,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";

export const ASTRONOMY_POSITIONS_PRICE = "$0.04";
export const ASTRONOMY_POSITIONS_ROUTE = "/v1/astronomy/positions/:date";

const datePathSchema = {
  properties: {
    date: {
      type: "string",
      description: "Exact ISO-8601 UTC date or instant, e.g. 2026-07-21T00:00:00Z.",
    },
  },
  required: ["date"],
};

/**
 * Project the full Moment Essentials chart to astronomy only: apparent
 * ecliptic longitude/latitude/speed per body, lunar phase and illuminated
 * fraction, provenance, and accuracy. No sign, element, modality, or
 * aspect field is copied across this boundary.
 */
export function computeAstronomyPositions(date) {
  const essentials = computeEphemeris(date, { aspects: false });
  const bodies = {};
  for (const body of BODIES) {
    const st = essentials.bodies[body];
    if (!st) continue;
    bodies[body] = { longitude: st.longitude, latitude: st.latitude, speed: st.speed };
  }
  return {
    tier: "astronomy-positions",
    time: essentials.time,
    frame: essentials.frame,
    bodies,
    lunarPhase: {
      elongation: essentials.lunarPhase.elongation,
      illuminatedFraction: essentials.lunarPhase.illuminatedFraction,
      trend: essentials.lunarPhase.trend,
    },
    provenance: essentials.provenance,
    accuracy: essentials.accuracy,
  };
}

export const astronomyPositionsDiscovery = declareDiscoveryExtension({
  pathParamsSchema: datePathSchema,
  output: {
    schema: {
      type: "object",
      required: ["tier", "time", "frame", "bodies", "lunarPhase", "provenance", "accuracy"],
      properties: {
        tier: { const: "astronomy-positions" },
        time: { type: "string" },
        frame: { type: "string" },
        bodies: { type: "object" },
        lunarPhase: { type: "object" },
        provenance: { type: "object" },
        accuracy: { type: "object" },
      },
    },
    example: {
      tier: "astronomy-positions",
      time: "2026-07-21T00:00:00.000Z",
      frame: "geocentric ecliptic-of-date, tropical, apparent",
      bodies: { sun: { longitude: 118.3151, latitude: 0, speed: 0.95465 } },
      lunarPhase: { elongation: 92.4413, illuminatedFraction: 0.566, trend: "waxing" },
      provenance: { algorithm: "meeus-truncated-series + jpl-approximate-elements (zero-dependency)" },
      accuracy: { validRange: "1800-2050", method: "independently audited against astronomy-engine (VSOP87/ELP)" },
    },
  },
});
