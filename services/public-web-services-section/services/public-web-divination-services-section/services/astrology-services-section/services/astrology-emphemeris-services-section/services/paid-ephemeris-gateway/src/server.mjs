import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createExactEvmPaymentBoundary } from "@red-cup-engineering/x402-services-section/server";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

import {
  computeEphemeris,
  normalizeInstant,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/ephemeris-product.mjs";
import {
  computePrecisionMoment,
  normalizePrecisionRequest,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/precision-moment.mjs";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import { createSettlementWitness } from "./settlement-witness.mjs";
import {
  MARKET_OBSERVATION_PRICE,
  MARKET_OBSERVATION_ROUTE,
  createMarketObservationHandler,
  marketObservationDiscovery,
  validateMarketObservationRequest,
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

export {
  MOMENT_ESSENTIALS_PRICE,
  PRECISION_MOMENT_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  PRECISION_MOMENT_ROUTE,
  STATUS_ROUTE,
  INDEX_VERIFICATION_ROUTE,
};

const DEFAULT_NETWORK = "eip155:84532";
const DEFAULT_FACILITATOR = "https://x402.org/facilitator";
const DEFAULT_PORT = 4021;

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
  const indexVerificationHash = env.INDEX_VERIFICATION_HASH || DEFAULT_INDEX_VERIFICATION_HASH;
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");

  const facilitatorClient = selectFacilitatorClient(
    env,
    dependencies.facilitatorClient,
    facilitatorUrl,
    dependencies.createCdpFacilitatorClient,
  );
  const afterSettle = dependencies.afterSettle || createSettlementWitness(env);
  const app = express();
  // Cloud Run terminates TLS at its first proxy hop. Trust that hop so x402's
  // advertised resource URL retains the buyer-facing HTTPS scheme.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const status = (_request, response) => response.json({ status: "ok", service: "paid-ephemeris-gateway" });
  app.get(STATUS_ROUTE, status);
  app.get("/healthz", status);

  // Domain-ownership proof for third-party x402 directories, served unpriced and above the
  // payment middleware on purpose: a verifier fetching this path must get the hash, not a 402.
  // Directory listing is how a paid endpoint is found at all, so gating the proof behind the
  // payment it exists to advertise would be self-defeating. The hash comes from the
  // environment so the next claim needs a redeploy, not a code change.
  app.get(INDEX_VERIFICATION_ROUTE, (_request, response) => {
    response.type("text/plain").send(indexVerificationHash);
  });

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
    [`GET ${MARKET_OBSERVATION_ROUTE}`]: {
      accepts: { scheme: "exact", price: MARKET_OBSERVATION_PRICE, network, payTo },
      description:
        "x402 Market Observation: sampled Base-USDC EIP-3009 AuthorizationUsed activity over a recent block range, with provider provenance and explicit arithmetic extrapolation. It does not identify x402 use, agents, or protocol share.",
      mimeType: "application/json",
      serviceName: "561-group-x402-market-observation",
      tags: ["x402", "market-data", "base", "eip-3009", "agent-commerce", "settlement"],
      extensions: marketObservationDiscovery,
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
  app.get(MARKET_OBSERVATION_ROUTE, validateMarketObservationRequest);

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
  app.get(MARKET_OBSERVATION_ROUTE, createMarketObservationHandler(env, dependencies));

  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ moment: MOMENT_ESSENTIALS_PRICE, precisionMoment: PRECISION_MOMENT_PRICE, marketObservation: MARKET_OBSERVATION_PRICE }),
    port: Number(env.PORT) || DEFAULT_PORT,
  };
}

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, prices, port } = createServer();
  app.listen(port, "0.0.0.0", () => {
    const journal = createSemanticRecordJournal({ root: NODE_ROOT, objectKind: "paid-ephemeris-gateway.server-event" });
    journal.record({
      category: "paid-ephemeris-gateway.listening",
      recordedAt: new Date().toISOString(),
      record: {
        port,
        routes: {
          moment: { path: MOMENT_ESSENTIALS_ROUTE, price: prices.moment },
          precisionMoment: { path: PRECISION_MOMENT_ROUTE, price: prices.precisionMoment },
          marketObservation: { path: MARKET_OBSERVATION_ROUTE, price: prices.marketObservation },
        },
        payTo,
        network,
        facilitatorUrl,
      },
      charge: { support: true, refutation: false },
    });
    console.log(`paid-ephemeris-gateway listening on 0.0.0.0:${port}`);
  });
}
