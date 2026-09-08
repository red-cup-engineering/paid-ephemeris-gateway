import { createFetchHandler } from "@red-cup-engineering/http-server-core-service/fetch";
import { BodyReadError, readJsonBody } from "./read-json-body.mjs";
import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { scoreSetOfOrphanPatchCandidates } from "@red-cup-engineering/jsnode-package-vulnerability-triage-services-section/score-set-of-orphan-patch-candidates";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  ORPHAN_PATCH_SCORE_PRICE,
  ORPHAN_PATCH_SCORE_ROUTE,
  STATUS_ROUTE,
  orphanPatchScoreDiscovery,
} from "./route-catalog.mjs";

/** Compose the gateway's sole HTTP application for Node and Fetch runtimes. */
export function createGatewayApplication(env = {}, dependencies = {}) {
  const network = env.X402_NETWORK || "eip155:8453";
  const facilitatorUrl = env.X402_FACILITATOR || "https://api.cdp.coinbase.com/platform/v2/x402";
  const payTo = env.X402_PAY_TO;
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

  let boundary;
  function payment() {
    if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
    return boundary ??= createExactEvmFetchPaymentBoundary({
      network, facilitatorUrl, routes,
      facilitatorClient: selectFacilitatorClient(env, dependencies.facilitatorClient, facilitatorUrl, dependencies.createCdpFacilitatorClient),
      afterSettle: dependencies.afterSettle,
    });
  }
  async function paid(context, validate, compute) {
    let boundary;
    try { boundary = payment(); }
    catch (error) { return Response.json({ error: `gateway misconfigured: ${error.message}` }, { status: 500 }); }
    const body = await readJsonBody(context.request, { maxBytes: 100 * 1024 });
    if (validate) validate(body);
    return boundary.handle(context.request, async () => {
      try { return Response.json(await compute(body)); }
      catch (error) { return refusal(error); }
    });
  }
  function refusal(error) {
    const status = error instanceof BodyReadError ? error.status : error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError ? 422 : 500;
    return Response.json({ error: status === 500 ? "internal error computing gateway response" : error.message }, { status });
  }
  return createFetchHandler({
    cacheControl: { noStore: true },
    onError: refusal,
    resources: [
      ...[STATUS_ROUTE, "/healthz"].map((match) => ({ match, methods: ["GET"], handler: () => Response.json({ status: "ok", service: "paid-orphan-patch-triage-gateway" }) })),
      { match: ORPHAN_PATCH_SCORE_ROUTE, methods: ["POST"], handler: (ctx) => paid(ctx, null, dependencies.score || scoreSetOfOrphanPatchCandidates) },
    ],
  });
}
