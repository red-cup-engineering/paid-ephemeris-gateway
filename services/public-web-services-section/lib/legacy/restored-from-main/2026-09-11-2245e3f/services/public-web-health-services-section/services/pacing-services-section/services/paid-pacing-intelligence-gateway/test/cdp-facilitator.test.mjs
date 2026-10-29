import assert from "node:assert/strict";
import test from "node:test";

import {
  CDP_FACILITATOR_CORRELATION,
  selectFacilitatorClient,
} from "../src/cdp-facilitator.mjs";

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
  assert.equal(CDP_FACILITATOR_CORRELATION.source, "paid-pacing-intelligence-gateway");
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
