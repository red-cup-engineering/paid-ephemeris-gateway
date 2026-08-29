import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  verify,
} from "node:crypto";
import test from "node:test";

import {
  createCdpFacilitatorClient,
  createCdpJwt,
  selectFacilitatorClient,
} from "../src/cdp-facilitator.mjs";
import { verifyCdpFacilitator } from "../scripts/verify-cdp-facilitator.mjs";

const ED25519_SEED = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const ED25519_PUBLIC = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const ED25519_SECRET = Buffer.from(`${ED25519_SEED}${ED25519_PUBLIC}`, "hex").toString("base64");
const FIXED_JWT = "eyJhbGciOiJFZERTQSIsImtpZCI6Im9yZ2FuaXphdGlvbnMvZXhhbXBsZS9hcGlLZXlzL2V4YW1wbGUiLCJ0eXAiOiJKV1QiLCJub25jZSI6IjAwMDEwMjAzMDQwNTA2MDcwODA5MGEwYjBjMGQwZTBmIn0.eyJzdWIiOiJvcmdhbml6YXRpb25zL2V4YW1wbGUvYXBpS2V5cy9leGFtcGxlIiwiaXNzIjoiY2RwIiwidXJpcyI6WyJHRVQgYXBpLmNkcC5jb2luYmFzZS5jb20vcGxhdGZvcm0vdjIveDQwMi9zdXBwb3J0ZWQiXSwiaWF0IjoxNzAwMDAwMDAwLCJuYmYiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDEyMH0.8H1jECLd2wFVhBdKq-rtnSfSqSUwEL1wY1CNTLikE01HruBwNv0DWpQGzUImsfLapl0pPsMzwfKok8BB9WrtCA";

function jwtParts(jwt) {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  return {
    signingInput: `${encodedHeader}.${encodedPayload}`,
    header: JSON.parse(Buffer.from(encodedHeader, "base64url")),
    payload: JSON.parse(Buffer.from(encodedPayload, "base64url")),
    signature: Buffer.from(encodedSignature, "base64url"),
  };
}

test("Ed25519 JWT matches the deterministic RFC 8032 key vector", () => {
  const jwt = createCdpJwt({
    apiKeyId: "organizations/example/apiKeys/example",
    apiKeySecret: ED25519_SECRET,
    method: "GET",
    host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/supported",
    now: 1_700_000_000,
    nonce: "000102030405060708090a0b0c0d0e0f",
  });
  assert.equal(jwt, FIXED_JWT);
  const { header, payload } = jwtParts(jwt);
  assert.deepEqual(header, {
    alg: "EdDSA",
    kid: "organizations/example/apiKeys/example",
    typ: "JWT",
    nonce: "000102030405060708090a0b0c0d0e0f",
  });
  assert.deepEqual(payload, {
    sub: "organizations/example/apiKeys/example",
    iss: "cdp",
    uris: ["GET api.cdp.coinbase.com/platform/v2/x402/supported"],
    iat: 1_700_000_000,
    nbf: 1_700_000_000,
    exp: 1_700_000_120,
  });
});

test("ES256 JWT is one JOSE P-1363 signature verifiable by its public key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwt = createCdpJwt({
    apiKeyId: "organizations/example/apiKeys/es256",
    apiKeySecret: privateKey.export({ format: "pem", type: "pkcs8" }),
    method: "POST",
    host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/verify",
    now: 1_700_000_000,
    nonce: "101112131415161718191a1b1c1d1e1f",
  });
  const { signingInput, header, payload, signature } = jwtParts(jwt);
  assert.equal(header.alg, "ES256");
  assert.deepEqual(payload.uris, ["POST api.cdp.coinbase.com/platform/v2/x402/verify"]);
  assert.equal(signature.length, 64);
  assert.equal(verify(
    "sha256",
    Buffer.from(signingInput),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    signature,
  ), true);
});

test("Ed25519 secrets retain Coinbase's seed-plus-public-key integrity", () => {
  const mismatched = Buffer.from(`${ED25519_SEED}${"00".repeat(32)}`, "hex").toString("base64");
  assert.throws(() => createCdpJwt({
    apiKeyId: "key",
    apiKeySecret: mismatched,
    method: "GET",
    host: "api.cdp.coinbase.com",
    path: "/platform/v2/x402/supported",
    now: 1,
    nonce: "00".repeat(16),
  }), /does not match its seed/u);
});

test("facilitator base URL is normalized once and rejects ambiguous authority or paths", () => {
  const credentials = { apiKeyId: "key", apiKeySecret: ED25519_SECRET };
  assert.equal(createCdpFacilitatorClient({
    ...credentials,
    baseUrl: "https://example.test/platform/v2/x402/",
  }).url, "https://example.test/platform/v2/x402");

  for (const baseUrl of [
    "http://example.test/platform/v2/x402",
    "https://user@example.test/platform/v2/x402",
    "https://example.test/platform//v2/x402",
    "https://example.test/platform/v2/x402?operation=verify",
    "https://example.test/platform/v2/x402#verify",
    "https://example.test/",
    "https://example.test/platform/%2f/v2/x402",
  ]) {
    assert.throws(() => createCdpFacilitatorClient({ ...credentials, baseUrl }), /canonical HTTPS URL|API base path/u, baseUrl);
  }
});

test("native client binds fresh JWTs and exact JSON envelopes to all three endpoints", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/supported")) {
      return new Response(JSON.stringify({
        kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:8453" }],
        extensions: ["bazaar"],
        signers: { "eip155:*": ["0x0000000000000000000000000000000000000001"] },
      }), { status: 200 });
    }
    if (url.endsWith("/verify")) return new Response(JSON.stringify({ isValid: true, payer: "0xpayer" }), { status: 200 });
    return new Response(JSON.stringify({
      success: true,
      payer: "0xpayer",
      transaction: `0x${"01".repeat(32)}`,
      network: "eip155:8453",
      amount: "40000",
    }), { status: 200 });
  };

  try {
    const client = createCdpFacilitatorClient({
      apiKeyId: "organizations/example/apiKeys/wire",
      apiKeySecret: ED25519_SECRET,
      baseUrl: "https://facilitator.example/platform/v2/x402/",
    });
    const requirements = {
      scheme: "exact",
      network: "eip155:8453",
      asset: "0x0000000000000000000000000000000000000002",
      amount: "40000",
      payTo: "0x0000000000000000000000000000000000000003",
      maxTimeoutSeconds: 60,
      extra: { name: "USDC", version: "2" },
    };
    const payload = {
      x402Version: 2,
      accepted: requirements,
      payload: { authorization: { value: 40_000n }, signature: "0xsigned" },
    };

    assert.equal((await client.getSupported()).kinds[0].network, "eip155:8453");
    assert.equal((await client.verify(payload, requirements)).isValid, true);
    assert.equal((await client.settle(payload, requirements)).success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls.map(({ url, options }) => [options.method, url]), [
    ["GET", "https://facilitator.example/platform/v2/x402/supported"],
    ["POST", "https://facilitator.example/platform/v2/x402/verify"],
    ["POST", "https://facilitator.example/platform/v2/x402/settle"],
  ]);
  const expectedBindings = [
    "GET facilitator.example/platform/v2/x402/supported",
    "POST facilitator.example/platform/v2/x402/verify",
    "POST facilitator.example/platform/v2/x402/settle",
  ];
  const authorizations = new Set();
  for (const [index, call] of calls.entries()) {
    assert.equal(call.options.headers["Content-Type"], "application/json");
    assert.equal(call.options.headers["Correlation-Context"], "sdkLanguage=javascript,source=paid-ephemeris-gateway,sourceVersion=0.2.4");
    assert.match(call.options.headers.Authorization, /^Bearer /u);
    const authorization = call.options.headers.Authorization.slice("Bearer ".length);
    authorizations.add(authorization);
    assert.deepEqual(jwtParts(authorization).payload.uris, [expectedBindings[index]]);
  }
  assert.equal(authorizations.size, 3);
  assert.equal(calls[0].options.body, undefined);
  for (const call of calls.slice(1)) {
    assert.deepEqual(JSON.parse(call.options.body), {
      x402Version: 2,
      paymentPayload: {
        x402Version: 2,
        accepted: {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x0000000000000000000000000000000000000002",
          amount: "40000",
          payTo: "0x0000000000000000000000000000000000000003",
          maxTimeoutSeconds: 60,
          extra: { name: "USDC", version: "2" },
        },
        payload: { authorization: { value: "40000" }, signature: "0xsigned" },
      },
      paymentRequirements: {
        scheme: "exact",
        network: "eip155:8453",
        asset: "0x0000000000000000000000000000000000000002",
        amount: "40000",
        payTo: "0x0000000000000000000000000000000000000003",
        maxTimeoutSeconds: 60,
        extra: { name: "USDC", version: "2" },
      },
    });
  }
});

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
  const authorization = calls[0].options.headers.authorization.slice("Bearer ".length);
  assert.deepEqual(jwtParts(authorization).payload.uris, [
    "GET api.cdp.coinbase.com/platform/v2/x402/supported",
  ]);
});

test("production selects Coinbase's authenticated facilitator client", () => {
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
