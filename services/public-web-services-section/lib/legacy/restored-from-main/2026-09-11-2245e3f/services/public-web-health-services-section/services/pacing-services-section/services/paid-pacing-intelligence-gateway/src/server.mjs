import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { createSettlementWitness } from "./settlement-witness.mjs";
import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";
import { createGatewayApplication } from "./application.mjs";
import {
  HEART_RATE_THRESHOLD_PRICE,
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_PRICE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
} from "./offers.mjs";
export {
  HEART_RATE_THRESHOLD_PRICE,
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_PRICE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
};

export function createServer(env = process.env, dependencies = {}) {
  const network = env.X402_NETWORK || "eip155:84532";
  const facilitatorUrl = env.X402_FACILITATOR || "https://x402.org/facilitator";
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
  const application = createGatewayApplication({ ...env, X402_NETWORK: network, X402_FACILITATOR: facilitatorUrl }, { ...dependencies, afterSettle: dependencies.afterSettle || createSettlementWitness(env) });
  // Cloud Run terminates TLS at one explicitly trusted proxy hop.
  const app = application;
  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ pacingAnalysis: PACING_ANALYSIS_PRICE, heartRateThreshold: HEART_RATE_THRESHOLD_PRICE }),
    port: Number(env.PORT) || 4041,
  };
}

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, prices, port } = createServer();
  await startWebServer(app, { port, host: "0.0.0.0", trustProxy: 1 });
  {
    const journal = createSemanticRecordJournal({ root: NODE_ROOT, objectKind: "paid-pacing-intelligence-gateway.server-event" });
    journal.record({
      category: "paid-pacing-intelligence-gateway.listening",
      recordedAt: new Date().toISOString(),
      record: {
        port,
        routes: {
          pacingAnalysis: { path: PACING_ANALYSIS_ROUTE, price: prices.pacingAnalysis },
          heartRateThreshold: { path: HEART_RATE_THRESHOLD_ROUTE, price: prices.heartRateThreshold },
        },
        payTo,
        network,
        facilitatorUrl,
      },
      charge: { support: true, refutation: false },
    });
    console.log(`paid-pacing-intelligence-gateway listening on 0.0.0.0:${port}`);
  }
}
