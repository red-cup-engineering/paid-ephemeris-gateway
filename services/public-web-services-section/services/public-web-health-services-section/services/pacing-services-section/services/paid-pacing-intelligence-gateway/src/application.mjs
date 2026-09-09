import { createWebApplicationEngine } from "@red-cup-engineering/web-server-services-section";
import { BodyReadError, readJsonBody } from "@red-cup-engineering/read-http-request-body-service/web";
import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { x402RoutesForOffers } from "@red-cup-engineering/x402-services-section/offer";
import { selectFacilitatorClient } from "./cdp-facilitator.mjs";
import {
  runHeartRateThreshold,
  runPacingAnalysis,
  validateHeartRateThresholdRequest,
  validatePacingAnalysisRequest,
} from "./pacing-request.mjs";
import {
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
  offers,
} from "./offers.mjs";

const MAINNET_NETWORK = "eip155:8453";
const SEPOLIA_NETWORK = "eip155:84532";
/** Circle-issued USDC, verified against developers.circle.com/stablecoins/usdc-contract-addresses. */
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Resolve the settlement asset for a network from the deployment, or from the well-known USDC contract. */
export function settlementAsset(env, network) {
  const known = network === MAINNET_NETWORK ? USDC_BASE_MAINNET : network === SEPOLIA_NETWORK ? USDC_BASE_SEPOLIA : undefined;
  const asset = env.X402_ASSET || known;
  if (!asset) throw new Error("X402_ASSET is required; no built-in USDC default exists for this network");
  return asset;
}

/** Compose the gateway's sole HTTP application for Node and Fetch runtimes. */
export function createGatewayApplication(env = {}, dependencies = {}) {
  const network = env.X402_NETWORK || MAINNET_NETWORK;
  const facilitatorUrl = env.X402_FACILITATOR || "https://api.cdp.coinbase.com/platform/v2/x402";
  const payTo = env.X402_PAY_TO;

  let boundary;
  function payment() {
    if (!payTo) throw new Error("X402_PAY_TO is required (seller payout address); no default is provided on purpose");
    return boundary ??= createExactEvmFetchPaymentBoundary({
      network,
      facilitatorUrl,
      routes: x402RoutesForOffers(offers, { network, payTo, asset: settlementAsset(env, network) }),
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
  function indexVerification() {
    const hash = env.INDEX_VERIFICATION_HASH;
    if (typeof hash !== "string" || hash === "") return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(hash, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return createWebApplicationEngine({
    cacheControl: { noStore: true },
    onError: refusal,
    resources: [
      ...[STATUS_ROUTE, "/healthz"].map((match) => ({ match, methods: ["GET"], handler: () => Response.json({ status: "ok", service: "paid-pacing-intelligence-gateway" }) })),
      { match: "/.well-known/402index-verify.txt", methods: ["GET"], handler: indexVerification },
      { match: PACING_ANALYSIS_ROUTE, methods: ["POST"], handler: (ctx) => paid(ctx, validatePacingAnalysisRequest, dependencies.runPacingAnalysis || runPacingAnalysis) },
      { match: HEART_RATE_THRESHOLD_ROUTE, methods: ["POST"], handler: (ctx) => paid(ctx, validateHeartRateThresholdRequest, dependencies.runHeartRateThreshold || runHeartRateThreshold) },
    ],
  });
}
