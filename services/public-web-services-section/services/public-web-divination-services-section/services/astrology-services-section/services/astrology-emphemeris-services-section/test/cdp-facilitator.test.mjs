import assert from "node:assert/strict";
import test from "node:test";

import {
  CDP_FACILITATOR_CORRELATION,
  selectFacilitatorClient,
} from "../src/cdp-facilitator.mjs";
import { verifyCdpFacilitator } from "../scripts/verify-cdp-facilitator.mjs";

const ED25519_SECRET = Buffer.from(
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
  "hex",
).toString("base64");

function jwtPayload(jwt) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url"));
}

test("CDP monitor authenticates only the read-only supported endpoint", async () => {
  const calls = [];
  const result = await verifyCdpFacilitator({
    apiKeyId: "organizations/example/apiKeys/monitor",
    apiKeySecret: ED25519_SECRET,
    fetchImpl: async (url, options) => {
      calls.push({ url: url.href, options });
      return new Response(JSON.stringify({
        kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:8453" }],
        extensions: [{ name: "bazaar" }],
      }), { status: 200 });
    },
  });

  assert.deepEqual(result, {
    authenticated: true,
    baseExact: true,
    bazaar: true,
    paymentAttempted: false,
    settlementAttempted: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.cdp.coinbase.com/platform/v2/x402/supported");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.body, undefined);
  assert.deepEqual(jwtPayload(calls[0].options.headers.authorization.slice("Bearer ".length)).uris, [
    "GET api.cdp.coinbase.com/platform/v2/x402/supported",
  ]);
});

test("production selects Coinbase through the shared client with gateway leaf metadata", () => {
  const calls = [];
  const authenticated = Object.freeze({ kind: "authenticated-cdp-facilitator" });
  const selected = selectFacilitatorClient({
    X402_FACILITATOR_PROVIDER: "cdp",
    CDP_API_KEY_ID: "organizations/example/apiKeys/example",
    CDP_API_KEY_SECRET: "opaque-secret",
  }, undefined, "https://api.cdp.coinbase.com/platform/v2/x402", (configuration) => {
    calls.push(configuration);
    return authenticated;
  });

  assert.equal(selected, authenticated);
  assert.deepEqual(calls, [{
    apiKeyId: "organizations/example/apiKeys/example",
    apiKeySecret: "opaque-secret",
    baseUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
    correlation: CDP_FACILITATOR_CORRELATION,
  }]);
});

test("production refuses to start without both Coinbase credentials", () => {
  assert.throws(() => selectFacilitatorClient(
    { X402_FACILITATOR_PROVIDER: "cdp", CDP_API_KEY_ID: "present" },
    undefined,
    "https://api.cdp.coinbase.com/platform/v2/x402",
  ), /CDP_API_KEY_SECRET/u);
  assert.throws(() => selectFacilitatorClient(
    { X402_FACILITATOR_PROVIDER: "cdp", CDP_API_KEY_SECRET: "present" },
    undefined,
    "https://api.cdp.coinbase.com/platform/v2/x402",
  ), /CDP_API_KEY_ID/u);
});

test("an explicitly contracted facilitator wins and non-CDP URLs remain generic", () => {
  const contracted = Object.freeze({ kind: "test-facilitator" });
  const forbiddenFactory = () => { throw new Error("CDP factory must not be called"); };
  assert.equal(selectFacilitatorClient(
    { X402_FACILITATOR_PROVIDER: "cdp" },
    contracted,
    "https://api.cdp.coinbase.com/platform/v2/x402",
    forbiddenFactory,
  ), contracted);
  assert.equal(selectFacilitatorClient(
    {},
    undefined,
    "https://x402.org/facilitator",
    forbiddenFactory,
  ), undefined);
});
