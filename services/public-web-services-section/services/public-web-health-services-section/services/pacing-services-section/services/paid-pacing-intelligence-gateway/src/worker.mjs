import { settlementWitness } from "@red-cup-engineering/x402-services-section/offer";
import { createGatewayApplication } from "./application.mjs";
import { HEART_RATE_THRESHOLD_ROUTE, PACING_ANALYSIS_ROUTE, offers } from "./offers.mjs";

export const WORKER_ROUTES = Object.freeze([PACING_ANALYSIS_ROUTE, HEART_RATE_THRESHOLD_ROUTE]);

export function createWorkerHandler(dependencies = {}) {
  const applications = new WeakMap();
  return {
    fetch(request, env = {}) {
      let application = applications.get(env);
      if (!application) {
        application = createGatewayApplication(env, {
          ...dependencies,
          afterSettle: dependencies.afterSettle ?? settlementWitness(offers, { env }),
        });
        applications.set(env, application);
      }
      return application(request, { capabilities: env });
    },
  };
}
export default createWorkerHandler();
