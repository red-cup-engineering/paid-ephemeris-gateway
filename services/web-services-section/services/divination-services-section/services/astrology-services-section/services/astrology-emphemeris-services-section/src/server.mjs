import express from "express";
import {
  CDP_FACILITATOR_URL,
  createCdpFacilitatorContract,
  createExactEvmPaymentBoundary,
  declareDiscoveryExtension,
} from "@red-cup-engineering/x402-services-section/server";

import {
  computeEphemeris,
  normalizeInstant,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";
import {
  computePrecisionMoment,
  normalizePrecisionRequest,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/precision-moment.mjs";
import { createSettlementWitness } from "./settlement-witness.mjs";

export const MOMENT_ESSENTIALS_PRICE = "$0.04";
export const PRECISION_MOMENT_PRICE = "$0.32";
export const MOMENT_ESSENTIALS_ROUTE = "/v1/ephemeris/moment/:date";
export const PRECISION_MOMENT_ROUTE = "/v1/ephemeris/precision-moment/:date";
export const STATUS_ROUTE = "/v1/status";

const DEFAULT_NETWORK = "eip155:84532";
const DEFAULT_FACILITATOR = "https://x402.org/facilitator";
const DEFAULT_PORT = 4021;

const datePathSchema = {
  properties: {
    date: {
      type: "string",
      description: "Exact ISO-8601 UTC date or instant, e.g. 2026-07-21T00:00:00Z.",
    },
  },
  required: ["date"],
};

const essentialsDiscovery = declareDiscoveryExtension({
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

const precisionDiscovery = declareDiscoveryExtension({
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

function precisionOptions(query) {
  return {
    latitude: query.latitude,
    longitude: query.longitude,
    houseSystem: query.houseSystem,
    rulership: query.rulership,
    sidereal: query.sidereal,
  };
}

function selectedFacilitator(env, facilitatorClient, facilitatorUrl) {
  if (facilitatorClient) return facilitatorClient;
  if (env.X402_FACILITATOR_PROVIDER === "cdp" || facilitatorUrl === CDP_FACILITATOR_URL) {
    return createCdpFacilitatorContract({
      apiKeyId: env.CDP_API_KEY_ID,
      apiKeySecret: env.CDP_API_KEY_SECRET,
      baseUrl: facilitatorUrl,
    });
  }
  return undefined;
}

function dateRefusal(response, error) {
  if (error instanceof TypeError || error instanceof RangeError) {
    response.status(422).json({ error: error.message });
    return true;
  }
  return false;
}

export function createServer(env = process.env, dependencies = {}) {
  const network = env.X402_NETWORK || DEFAULT_NETWORK;
  const facilitatorUrl = env.X402_FACILITATOR || DEFAULT_FACILITATOR;
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");

  const facilitatorClient = selectedFacilitator(env, dependencies.facilitatorClient, facilitatorUrl);
  const afterSettle = dependencies.afterSettle || createSettlementWitness(env);
  const app = express();
  // Cloud Run terminates TLS at its first proxy hop. Trust that hop so x402's
  // advertised resource URL retains the buyer-facing HTTPS scheme.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const status = (_request, response) => response.json({ status: "ok", service: "paid-ephemeris-gateway" });
  app.get(STATUS_ROUTE, status);
  app.get("/healthz", status);

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
      serviceName: "561-group-ephemeris-precision-moment",
      tags: ["ephemeris", "astrology", "jpl-de440", "natal-chart", "houses", "ascendant", "provenance"],
      extensions: precisionDiscovery,
    },
  };

  const payment = createExactEvmPaymentBoundary({
    network,
    facilitatorUrl,
    facilitatorClient,
    routes,
    afterSettle,
  });

  app.get(MOMENT_ESSENTIALS_ROUTE, (request, response, next) => {
    try { normalizeInstant(request.params.date); next(); }
    catch (error) { if (!dateRefusal(response, error)) next(error); }
  });
  app.get(PRECISION_MOMENT_ROUTE, (request, response, next) => {
    try { normalizePrecisionRequest(request.params.date, precisionOptions(request.query)); next(); }
    catch (error) { if (!dateRefusal(response, error)) next(error); }
  });

  app.use(payment.middleware);

  app.get(MOMENT_ESSENTIALS_ROUTE, (request, response, next) => {
    try { response.json((dependencies.computeEssentials || computeEphemeris)(request.params.date)); }
    catch (error) { if (!dateRefusal(response, error)) next(error); }
  });
  app.get(PRECISION_MOMENT_ROUTE, async (request, response, next) => {
    try {
      const product = await (dependencies.computePrecision || computePrecisionMoment)(
        request.params.date,
        precisionOptions(request.query),
      );
      response.json(product);
    } catch (error) {
      if (!dateRefusal(response, error)) next(error);
    }
  });

  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ moment: MOMENT_ESSENTIALS_PRICE, precisionMoment: PRECISION_MOMENT_PRICE }),
    port: Number(env.PORT) || DEFAULT_PORT,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, prices, port } = createServer();
  app.listen(port, "0.0.0.0", () => {
    console.log(`paid-ephemeris-gateway listening on 0.0.0.0:${port}`);
    console.log(`moment: ${MOMENT_ESSENTIALS_ROUTE} ${prices.moment}`);
    console.log(`precision: ${PRECISION_MOMENT_ROUTE} ${prices.precisionMoment}`);
    console.log(`payTo: ${payTo}`);
    console.log(`network: ${network}`);
    console.log(`facilitator: ${facilitatorUrl}`);
  });
}
