import express from "express";
import { createExactEvmPaymentBoundary } from "@red-cup-engineering/x402-services-section/server";
import { scoreSetOfOrphanPatchCandidates } from "@red-cup-engineering/jsnode-package-vulnerability-triage-services-section/score-set-of-orphan-patch-candidates";

import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  ORPHAN_PATCH_SCORE_PRICE,
  ORPHAN_PATCH_SCORE_ROUTE,
  STATUS_ROUTE,
  orphanPatchScoreDiscovery,
} from "./route-catalog.mjs";

export { ORPHAN_PATCH_SCORE_PRICE, ORPHAN_PATCH_SCORE_ROUTE, STATUS_ROUTE };

const DEFAULT_NETWORK = "eip155:84532";
const DEFAULT_FACILITATOR = "https://x402.org/facilitator";
const DEFAULT_PORT = 4031;

function inputRefusal(response, error) {
  if (error instanceof TypeError || error instanceof SyntaxError) {
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

  const facilitatorClient = selectFacilitatorClient(
    env,
    dependencies.facilitatorClient,
    facilitatorUrl,
    dependencies.createCdpFacilitatorClient,
  );
  const app = express();
  // Cloud Run terminates TLS at its first proxy hop. Trust that hop so x402's
  // advertised resource URL retains the buyer-facing HTTPS scheme.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json());

  const status = (_request, response) => response.json({ status: "ok", service: "paid-orphan-patch-triage-gateway" });
  app.get(STATUS_ROUTE, status);
  app.get("/healthz", status);

  const routes = {
    [`POST ${ORPHAN_PATCH_SCORE_ROUTE}`]: {
      accepts: { scheme: "exact", price: ORPHAN_PATCH_SCORE_PRICE, network, payTo },
      description:
        "Orphan-Patch Triage Score: deterministic ranking of packages with disclosed, unpatched advisories, silent maintainers, and many dependents, from public advisory/maintenance/dependent-count inputs alone.",
      mimeType: "application/json",
      serviceName: "561-group-orphan-patch-score",
      tags: ["vulnerability-triage", "orphan-patch", "supply-chain-security", "npm", "advisory"],
      extensions: orphanPatchScoreDiscovery,
    },
  };

  const payment = createExactEvmPaymentBoundary({ network, facilitatorUrl, facilitatorClient, routes });

  app.use(payment.middleware);

  app.post(ORPHAN_PATCH_SCORE_ROUTE, (request, response, next) => {
    try {
      const score = dependencies.scoreOrphanPatchCandidates || scoreSetOfOrphanPatchCandidates;
      response.json(score(request.body));
    } catch (error) {
      if (!inputRefusal(response, error)) next(error);
    }
  });

  return {
    app,
    network,
    facilitatorUrl,
    payTo,
    prices: Object.freeze({ orphanPatchScore: ORPHAN_PATCH_SCORE_PRICE }),
    port: Number(env.PORT) || DEFAULT_PORT,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { app, port } = createServer();
  app.listen(port, "0.0.0.0", () => {
    console.log(`paid-orphan-patch-triage-gateway listening on 0.0.0.0:${port}`);
  });
}
