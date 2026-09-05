import {
  CDP_FACILITATOR_URL,
  createCdpFacilitatorClient,
} from "@red-cup-engineering/x402-services-section/cdp-facilitator";

export { CDP_FACILITATOR_URL };

export const CDP_FACILITATOR_CORRELATION = Object.freeze({
  sdkLanguage: "javascript",
  source: "paid-orphan-patch-triage-gateway",
  sourceVersion: "0.1.0",
});

/**
 * Select the facilitator client for this gateway's payment boundary: an
 * injected test double, an explicitly hired CDP facilitator, or `undefined`
 * (the boundary factory then builds its own default `HTTPFacilitatorClient`
 * from `facilitatorUrl`). Same selection policy as the ephemeris gateway's
 * `cdp-facilitator.mjs`, so both x402 sellers configure CDP identically.
 *
 * @param {Record<string, string>} env
 * @param {object|undefined} facilitatorClient Injected test double, if any.
 * @param {string} facilitatorUrl
 * @param {typeof createCdpFacilitatorClient} [cdpFacilitatorFactory]
 * @returns {object|undefined}
 * @throws {Error} When CDP is selected but its API credentials are absent.
 */
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
