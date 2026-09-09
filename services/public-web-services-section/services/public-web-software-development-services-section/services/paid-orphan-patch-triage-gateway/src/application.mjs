import { createWebApplicationEngine } from "@red-cup-engineering/web-server-services-section";
import { BodyReadError, readJsonBody } from "@red-cup-engineering/read-http-request-body-service/web";
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
  const MAX_BODY_BYTES = 100 * 1024;
  async function paid(context, validate, compute) {
    let boundary;
    try { boundary = payment(); }
    catch (error) { return Response.json({ error: `gateway misconfigured: ${error.message}` }, { status: 500 }); }
    let body;
    // Caught here, not left to propagate through the dispatcher: an oversized body makes
    // the shared reader cancel the request stream mid-read, which the Node transport reads
    // as a client disconnect and marks the request signal aborted a tick later -- if that
    // race is still running when this rejection reaches the dispatcher's own catch, it
    // discards our refusal for a bare 500. Resolving the refusal here, before any throw
    // leaves this function, means the dispatcher's happy path carries it out instead.
    try {
      // A declared Content-Length over the limit is refused before the stream is ever
      // opened: canceling the reader mid-read (the path below, for a body that lies about
      // its length) makes the Node transport tear down the socket instead of delivering
      // the response, so the common well-behaved-client case is short-circuited here.
      const declaredLength = Number(context.request.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
        // Same wording the shared reader itself throws on a mid-stream overflow, so a
        // caller sees one refusal message regardless of which path caught it.
        throw new BodyReadError(413, "body-too-large", `request body exceeded ${MAX_BODY_BYTES} bytes`);
      }
      body = await readJsonBody(context.request, { maxBytes: MAX_BODY_BYTES });
      if (validate) validate(body);
    } catch (error) { return refusal(error); }
    return boundary.handle(context.request, async () => {
      try { return Response.json(await compute(body)); }
      catch (error) { return refusal(error); }
    });
  }
  function refusal(error) {
    const status = error instanceof BodyReadError ? error.status : error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError ? 422 : 500;
    return Response.json({ error: status === 500 ? "internal error computing gateway response" : error.message }, { status });
  }
  function indexVerification() {
    const hash = env.INDEX_VERIFICATION_HASH;
    if (typeof hash !== "string" || hash === "") return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(hash, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return createWebApplicationEngine({
    cacheControl: { noStore: true },
    onError: refusal,
    resources: [
      ...[STATUS_ROUTE, "/healthz"].map((match) => ({ match, methods: ["GET"], handler: () => Response.json({ status: "ok", service: "paid-orphan-patch-triage-gateway" }) })),
      { match: "/.well-known/402index-verify.txt", methods: ["GET"], handler: indexVerification },
      { match: ORPHAN_PATCH_SCORE_ROUTE, methods: ["POST"], handler: (ctx) => paid(ctx, null, dependencies.score || scoreSetOfOrphanPatchCandidates) },
    ],
  });
}
