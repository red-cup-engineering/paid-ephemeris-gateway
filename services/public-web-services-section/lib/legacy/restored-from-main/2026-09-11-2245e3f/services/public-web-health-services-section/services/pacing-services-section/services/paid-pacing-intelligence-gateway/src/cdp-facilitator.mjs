import {
  CDP_FACILITATOR_URL,
  createCdpFacilitatorClient,
} from "@red-cup-engineering/x402-services-section/cdp-facilitator";

export { CDP_FACILITATOR_URL };

export const CDP_FACILITATOR_CORRELATION = Object.freeze({
  sdkLanguage: "javascript",
  source: "paid-pacing-intelligence-gateway",
  sourceVersion: "0.1.0",
});

export function selectFacilitatorClient(
  env,
  facilitatorClient,
  facilitatorUrl,
  cdpFacilitatorFactory = createCdpFacilitatorClient,
) {
  if (facilitatorClient !== undefined) return facilitatorClient;
  if (env.X402_FACILITATOR_PROVIDER !== "cdp" && facilitatorUrl !== CDP_FACILITATOR_URL) return undefined;

  const apiKeyId = env.CDP_API_KEY_ID;
  const apiKeySecret = env.CDP_API_KEY_SECRET;
  const missing = [
    ...(apiKeyId ? [] : ["CDP_API_KEY_ID"]),
    ...(apiKeySecret ? [] : ["CDP_API_KEY_SECRET"]),
  ];
  if (missing.length > 0) {
    throw new Error(`CDP facilitator requires ${missing.join(" and ")}`);
  }
  return cdpFacilitatorFactory({
    apiKeyId,
    apiKeySecret,
    baseUrl: facilitatorUrl,
    correlation: CDP_FACILITATOR_CORRELATION,
  });
}
