import { HTTPFacilitatorClient } from "@x402/core/server";
import { createCdpJwt } from "./cdp-jwt.mjs";

export { createCdpJwt } from "./cdp-jwt.mjs";

export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

const CORRELATION_CONTEXT = "sdkLanguage=javascript,source=paid-ephemeris-gateway,sourceVersion=0.2.4";

function canonicalBaseUrl(value = CDP_FACILITATOR_URL) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL");
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || /\/\//u.test(url.pathname)
    || /%(?:2f|5c)/iu.test(url.pathname)
  ) {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL without credentials, query, fragment, or ambiguous path separators");
  }
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/u, "");
  if (pathname === "") throw new TypeError("CDP facilitator baseUrl must include its API base path");
  url.pathname = pathname;
  return Object.freeze({
    url: url.href.replace(/\/$/u, ""),
    host: url.host,
    pathname,
  });
}

function credentials(args = {}) {
  const apiKeyId = args.apiKeyId ?? process.env.CDP_API_KEY_ID;
  const apiKeySecret = args.apiKeySecret ?? process.env.CDP_API_KEY_SECRET;
  const missing = [
    ...(apiKeyId ? [] : ["CDP_API_KEY_ID"]),
    ...(apiKeySecret ? [] : ["CDP_API_KEY_SECRET"]),
  ];
  if (missing.length > 0) throw new Error(`Missing required CDP credentials: ${missing.join(", ")}`);
  return Object.freeze({ apiKeyId, apiKeySecret });
}

/** Create the native authenticated Coinbase facilitator client. */
export function createCdpFacilitatorClient(args = {}) {
  const selectedCredentials = credentials(args);
  const base = canonicalBaseUrl(args.baseUrl);
  const endpoint = (operation) => `${base.pathname}/${operation}`;
  return new HTTPFacilitatorClient({
    url: base.url,
    createAuthHeaders: async () => Object.fromEntries(
      [["verify", "POST"], ["settle", "POST"], ["supported", "GET"]].map(([operation, method]) => [operation, {
        Authorization: `Bearer ${createCdpJwt({
          ...selectedCredentials,
          method,
          host: base.host,
          path: endpoint(operation),
        })}`,
        "Correlation-Context": CORRELATION_CONTEXT,
      }]),
    ),
  });
}

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
  return cdpFacilitatorFactory({ apiKeyId, apiKeySecret, baseUrl: facilitatorUrl });
}
