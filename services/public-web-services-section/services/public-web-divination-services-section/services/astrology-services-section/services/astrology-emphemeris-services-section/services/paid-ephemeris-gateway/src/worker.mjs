import { createGatewayApplication } from "./application.mjs";
import { MOMENT_ESSENTIALS_ROUTE } from "./route-catalog.mjs";
import { MARKET_OBSERVATION_ROUTE } from "./market-observation-route.mjs";
export const WORKER_ROUTES = Object.freeze([MOMENT_ESSENTIALS_ROUTE, MARKET_OBSERVATION_ROUTE]);
function workersSettlementWitness(context) {
  const result = context?.result;
  console.log(JSON.stringify({
    event: "paid-ephemeris-gateway.workers-settlement",
    network: result?.network,
    transaction: result?.transaction,
    payer: result?.payer ?? null,
    amount: result?.amount ?? context.requirements?.amount,
    recordedAt: new Date().toISOString(),
  }));
}
export function createWorkerHandler(dependencies = {}) {
  const applications = new WeakMap();
  return {
    fetch(request, env = {}) {
      let application = applications.get(env);
      if (!application) {
        application = createGatewayApplication(env, { ...dependencies, afterSettle: dependencies.afterSettle ?? workersSettlementWitness });
        applications.set(env, application);
      }
      return application(request, { capabilities: env });
    },
  };
}
export default createWorkerHandler();
