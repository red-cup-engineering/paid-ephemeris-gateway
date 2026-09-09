import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";
import { createGatewayApplication } from "./application.mjs";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

import {
  computePrecisionMoment,
  normalizePrecisionRequest,
} from "@lenticule-science/divination-services-section/services/divination-services-section/services/ephemeris-tracking-team/src/precision-moment.mjs";
import { createSettlementWitness } from "./settlement-witness.mjs";
import {
  MOMENT_ESSENTIALS_PRICE,
  PRECISION_MOMENT_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  PRECISION_MOMENT_ROUTE,
  STATUS_ROUTE,
  INDEX_VERIFICATION_ROUTE,
} from "./route-catalog.mjs";
import { MARKET_OBSERVATION_PRICE, MARKET_OBSERVATION_ROUTE } from "./market-observation-route.mjs";
export {
  MOMENT_ESSENTIALS_PRICE,
  PRECISION_MOMENT_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  PRECISION_MOMENT_ROUTE,
  STATUS_ROUTE,
  INDEX_VERIFICATION_ROUTE,
};
export function createServer(env = process.env, dependencies = {}) {
  const network = env.X402_NETWORK || "eip155:84532";
  const facilitatorUrl = env.X402_FACILITATOR || "https://x402.org/facilitator";
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
  const application = createGatewayApplication({ ...env, X402_NETWORK: network, X402_FACILITATOR: facilitatorUrl }, {
    ...dependencies, normalizePrecisionRequest, computePrecision: dependencies.computePrecision || computePrecisionMoment,
    afterSettle: dependencies.afterSettle || createSettlementWitness(env),
  });
  const app = application;
  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ moment: MOMENT_ESSENTIALS_PRICE, precisionMoment: PRECISION_MOMENT_PRICE, marketObservation: MARKET_OBSERVATION_PRICE }),
    port: Number(env.PORT) || 4021,
  };
}

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, prices, port } = createServer();
  await startWebServer(app, { port, host: "0.0.0.0", trustProxy: 1 });
  {
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
  }
}
