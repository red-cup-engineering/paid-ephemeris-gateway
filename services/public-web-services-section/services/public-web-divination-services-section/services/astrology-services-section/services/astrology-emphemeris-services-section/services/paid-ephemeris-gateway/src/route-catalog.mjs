import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/**
 * Route identity, price, and Bazaar-discovery schema shared by every
 * transport this gateway runs on (the Express/Cloud Run `server.mjs` and
 * the Fetch/Cloudflare-Workers `worker.mjs`), so the two entrypoints never
 * carry two copies of the same product declaration.
 */
export const MOMENT_ESSENTIALS_PRICE = "$0.04";
export const PRECISION_MOMENT_PRICE = "$0.32";
export const MOMENT_ESSENTIALS_ROUTE = "/v1/ephemeris/moment/:date";
export const PRECISION_MOMENT_ROUTE = "/v1/ephemeris/precision-moment/:date";
export const STATUS_ROUTE = "/v1/status";
export const INDEX_VERIFICATION_ROUTE = "/.well-known/402index-verify.txt";
export const DEFAULT_INDEX_VERIFICATION_HASH =
  "8f8a2ea306af8bf4937fbeaf674c1cabcf974d319934f31d6c4e7c515fdc873a";

const datePathSchema = {
  properties: {
    date: {
      type: "string",
      description: "Exact ISO-8601 UTC date or instant, e.g. 2026-07-21T00:00:00Z.",
    },
  },
  required: ["date"],
};

export const essentialsDiscovery = declareDiscoveryExtension({
  pathParamsSchema: datePathSchema,
  output: {
    schema: {
      type: "object",
      required: ["time", "frame", "bodies", "lunarPhase", "aspects", "provenance", "accuracy"],
      properties: {
        time: { type: "string" },
        frame: { type: "string" },
        bodies: { type: "object" },
        lunarPhase: { type: "object" },
        aspects: { type: "array" },
        provenance: { type: "object" },
        accuracy: { type: "object" },
      },
    },
    example: {
      time: "2026-07-21T00:00:00.000Z",
      frame: "geocentric ecliptic-of-date, tropical, apparent",
      bodies: {
        sun: {
          longitude: 118.3151,
          latitude: 0,
          speed: 0.95465,
          sign: "Cancer",
          degreeInSign: 28.3151,
          motion: "direct",
        },
      },
      lunarPhase: { name: "first quarter", illuminatedFraction: 0.566, trend: "waxing" },
      aspects: [{ bodyA: "jupiter", bodyB: "uranus", name: "sextile", offset: -0.08, phase: "applying" }],
      provenance: { algorithm: "meeus-truncated-series + jpl-approximate-elements (zero-dependency)" },
      accuracy: { validRange: "1800-2050", method: "independently audited against astronomy-engine (VSOP87/ELP)" },
    },
  },
});

export const precisionDiscovery = declareDiscoveryExtension({
  input: {
    latitude: 41.8781,
    longitude: -87.6298,
    houseSystem: "placidus",
    rulership: "traditional",
  },
  inputSchema: {
    properties: {
      latitude: { type: "number", minimum: -90, maximum: 90, description: "Geodetic degrees north." },
      longitude: { type: "number", minimum: -180, maximum: 180, description: "Geodetic degrees east." },
      houseSystem: {
        type: "string",
        enum: ["placidus", "koch", "whole-sign", "equal", "porphyry", "regiomontanus", "campanus"],
        default: "placidus",
      },
      rulership: { type: "string", enum: ["traditional", "modern"], default: "traditional" },
      sidereal: { type: "string", enum: ["fagan-bradley", "lahiri", "krishnamurti", "raman"] },
    },
    required: ["latitude", "longitude"],
  },
  pathParamsSchema: datePathSchema,
  output: {
    schema: {
      type: "object",
      required: ["tier", "time", "location", "configuration", "metrology", "chart", "essentialsCrossCheck"],
      properties: {
        tier: { const: "precision-moment" },
        time: { type: "string" },
        location: { type: "object" },
        configuration: { type: "object" },
        metrology: { type: "object" },
        chart: { type: "object" },
        essentialsCrossCheck: { type: "object" },
      },
    },
    example: {
      tier: "precision-moment",
      time: "2026-07-21T00:00:00.000Z",
      location: { latitudeDegreesNorth: 41.8781, longitudeDegreesEast: -87.6298 },
      configuration: { zodiac: "tropical", houseSystem: "placidus", rulership: "traditional" },
      metrology: { ephemeris: "JPL DE440", supplier: "OxiEphemeris 0.1.1" },
      chart: {
        bodies: [{ body: "Sun", lon_deg: 118.28082814466296, sign: "Cancer", house: 7 }],
        houses: { system: "placidus", cusps_deg: [277.84814268371105] },
        angles: { ascendant_deg: 277.84814268371105, mc_deg: 213.37468449748192 },
        nodes: { mean_node_deg: 331.52801390791086, true_node_deg: 330.2782328236698 },
      },
      essentialsCrossCheck: { sun: { absoluteDifferenceArcminutes: 0.034311, withinEssentialsAuditedBound: true } },
    },
  },
});

/** Build the shared precision-moment query options object from an HTTP query record. */
export function precisionOptions(query) {
  return {
    latitude: query.latitude,
    longitude: query.longitude,
    houseSystem: query.houseSystem,
    rulership: query.rulership,
    sidereal: query.sidereal,
  };
}

/**
 * Two listing framings for the one `PRECISION_MOMENT_ROUTE` backend (founder
 * ruling 2026-08-31: a second face, not a replacement). The route and its
 * JSON body are unchanged; only the title/description/tags an external
 * directory is handed differ, because the DE440 accuracy this tier sells is
 * arcsecond-grade positional astronomy whether or not the buyer wants the
 * astrological reading built on top of it.
 */
export const precisionMomentListingFramings = Object.freeze({
  astrology: {
    title: "Precision Moment",
    description:
      "Precision Moment: JPL DE440-backed astrology for one exact UTC instant and Earth location—raw apparent positions, houses, Ascendant/MC, nodes, lots, sect, dignities, expanded aspects, and cross-engine measurement evidence.",
    tags: ["ephemeris", "astrology", "jpl-de440", "natal-chart", "houses", "ascendant", "provenance"],
  },
  positionalAstronomy: {
    title: "DE440 Celestial Position Fix",
    description:
      "Arcsecond-grade JPL DE440 celestial body positions for one exact UTC instant and Earth-surface location: raw apparent ecliptic/equatorial coordinates, local horizon angles, and solar/lunar position with cross-engine divergence evidence. Built for marine celestial navigation, solar-angle and camera-exposure planning, and observation scheduling; no astrological interpretation implied.",
    tags: ["ephemeris", "jpl-de440", "celestial-navigation", "positional-astronomy", "provenance"],
  },
});
