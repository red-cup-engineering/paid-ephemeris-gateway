import { createGatewayApplication } from "./application.mjs";
import { ORPHAN_PATCH_SCORE_ROUTE } from "./route-catalog.mjs";

export const WORKER_ROUTES = Object.freeze([ORPHAN_PATCH_SCORE_ROUTE]);

function workersSettlementWitness(context) {
  const result = context?.result;
  console.log(JSON.stringify({
    event: "paid-orphan-patch-triage-gateway.workers-settlement",
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
      return application.fetch(request, { capabilities: env });
    },
  };
}
export default createWorkerHandler();
