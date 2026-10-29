import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";
import { createGatewayApplication } from "./application.mjs";
import { ORPHAN_PATCH_SCORE_PRICE, ORPHAN_PATCH_SCORE_ROUTE, STATUS_ROUTE } from "./route-catalog.mjs";
export { ORPHAN_PATCH_SCORE_PRICE, ORPHAN_PATCH_SCORE_ROUTE, STATUS_ROUTE };

export function createServer(env = process.env, dependencies = {}) {
  const network = env.X402_NETWORK || "eip155:84532";
  const facilitatorUrl = env.X402_FACILITATOR || "https://x402.org/facilitator";
  const payTo = env.X402_PAY_TO;
  if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
  const application = createGatewayApplication({ ...env, X402_NETWORK: network, X402_FACILITATOR: facilitatorUrl }, dependencies);
  // Cloud Run terminates TLS at one explicitly trusted proxy hop.
  const app = application;
  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ orphanPatchScore: ORPHAN_PATCH_SCORE_PRICE }),
    port: Number(env.PORT) || 4031,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, port } = createServer();
  await startWebServer(app, { port, host: "0.0.0.0", trustProxy: 1 });
  {
    console.log(`paid-orphan-patch-triage-gateway listening on 0.0.0.0:${port}`);
  }
}
