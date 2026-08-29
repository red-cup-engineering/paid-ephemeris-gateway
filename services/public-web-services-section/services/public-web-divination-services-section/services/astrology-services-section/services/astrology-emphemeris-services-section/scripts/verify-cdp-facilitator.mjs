import { createCdpJwt } from "../src/cdp-jwt.mjs";

const CDP_SUPPORTED_URL = "https://api.cdp.coinbase.com/platform/v2/x402/supported";

/** Authenticate one read-only GET of Coinbase's declared facilitator capabilities. */
export async function verifyCdpFacilitator({
  apiKeyId = process.env.CDP_API_KEY_ID,
  apiKeySecret = process.env.CDP_API_KEY_SECRET,
  endpoint = CDP_SUPPORTED_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("one fetch implementation is required");
  const url = new URL(endpoint);
  if (url.href !== CDP_SUPPORTED_URL) throw new TypeError("CDP capability assay endpoint is fixed");
  const jwt = createCdpJwt({
    apiKeyId,
    apiKeySecret,
    method: "GET",
    host: url.host,
    path: url.pathname,
  });
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "error",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${jwt}`,
    },
  });
  if (!response.ok) throw new Error(`authenticated CDP facilitator returned HTTP ${response.status}`);
  const supported = await response.json();
  const baseExact = (supported.kinds ?? []).some((kind) =>
    kind.x402Version === 2 && kind.scheme === "exact" && kind.network === "eip155:8453"
  );
  const extensions = new Set((supported.extensions ?? []).map((entry) => entry.name ?? entry));
  if (!baseExact || !extensions.has("bazaar")) {
    throw new Error("authenticated CDP facilitator lacks Base-mainnet exact settlement or Bazaar discovery");
  }
  return Object.freeze({
    authenticated: true,
    baseExact: true,
    bazaar: true,
    paymentAttempted: false,
    settlementAttempted: false,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(await verifyCdpFacilitator())}\n`);
}
