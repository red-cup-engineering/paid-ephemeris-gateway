import { createTrashpandaX402Service } from "./x402-service.mjs";
import { createTrashpandaSettlementWitness } from "./x402-settlement-witness.mjs";

export const STATUS_ROUTE = "/v1/status";
export const COINBASE_LAUNCH_PRICE = "$0.03";
export const MARKET_ACTION_COINBASE_LAUNCH_PRICE = "$0.04";
const DEFAULT_PORT = 4022;

export function createServer(env = process.env, dependencies = {}) {
  if ((env.X402_NETWORK ?? "eip155:84532") === "eip155:8453" && env.TRASHPANDA_X402_PRICE !== COINBASE_LAUNCH_PRICE) {
    throw new TypeError(`Trashpanda Services Coinbase production price must be the admitted ${COINBASE_LAUNCH_PRICE}`);
  }
  if ((env.X402_NETWORK ?? "eip155:84532") === "eip155:8453" && env.TRASHPANDA_MARKET_ACTION_PRICE !== MARKET_ACTION_COINBASE_LAUNCH_PRICE) {
    throw new TypeError(`Trashpanda Services market-action Coinbase production price must be the admitted ${MARKET_ACTION_COINBASE_LAUNCH_PRICE}`);
  }
  const afterSettle = dependencies.afterSettle || createTrashpandaSettlementWitness(env);
  const service = createTrashpandaX402Service({
    env,
    facilitatorClient: dependencies.facilitatorClient,
    afterSettle,
  });
  service.app.get(STATUS_ROUTE, (_request, response) => response.json({
    status: "ok",
    service: "trashpanda-services",
    brand: "Trashpanda Services",
    products: [
      { id: "pre-sign-transaction-policy-conformance", price: service.price },
      { id: "market-action-admission", price: service.marketActionPrice },
    ],
    network: service.network,
  }));
  return Object.freeze({ ...service, port: Number(env.PORT) || DEFAULT_PORT });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, network, facilitatorUrl, payTo, price, marketActionPrice, port } = createServer();
  app.listen(port, "0.0.0.0", () => console.log(JSON.stringify({
    event: "trashpanda-services-ready",
    port,
    network,
    facilitatorUrl,
    payTo,
    price,
    marketActionPrice,
  })));
}
