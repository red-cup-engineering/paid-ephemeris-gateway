import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WINDOW_BLOCKS,
  MARKET_OBSERVATION_PRICE,
  MARKET_OBSERVATION_ROUTE,
  MAX_WINDOW_BLOCKS,
  MIN_WINDOW_BLOCKS,
  createMarketObservationHandler,
  normalizeWindowRequest,
} from "../src/market-observation-route.mjs";
import { createServer } from "../src/server.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = "0x0000000000000000000000000000000000000001";
const facilitator = {
  async getSupported() {
    return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} };
  },
  async verify() { throw new Error("unpaid assay must not verify"); },
  async settle() { throw new Error("unpaid assay must not settle"); },
};

function decodeChallenge(response) {
  return JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
}

/** Answer eth_blockNumber and eth_getLogs the way settlement.mjs's own tests do. */
const AUTHORIZATION_USED_TOPIC = "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5";
const topicFor = (addr) => `0x${"0".repeat(24)}${addr.slice(2).toLowerCase()}`;
const log = (addr) => ({ topics: [AUTHORIZATION_USED_TOPIC, topicFor(addr), `0x${"1".repeat(64)}`] });
function rpcFake({ tip = 50548585, logs = [] } = {}) {
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    if (body.method === "eth_blockNumber") {
      return { ok: true, status: 200, json: async () => ({ jsonrpc: "2.0", id: 1, result: `0x${tip.toString(16)}` }) };
    }
    if (body.method === "eth_getLogs") {
      return { ok: true, status: 200, json: async () => ({ jsonrpc: "2.0", id: 1, result: logs }) };
    }
    return { ok: false, status: 400, json: async () => ({}) };
  };
}

test("normalizeWindowRequest(): defaults, accepts in-range integers, refuses the rest", () => {
  assert.equal(normalizeWindowRequest({}), DEFAULT_WINDOW_BLOCKS);
  assert.equal(normalizeWindowRequest({ windowBlocks: "900" }), 900);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: "not-a-number" }), TypeError);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: "3.5" }), TypeError);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: String(MIN_WINDOW_BLOCKS - 1) }), RangeError);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: String(MAX_WINDOW_BLOCKS + 1) }), RangeError);
});

test("seller exposes the market-observation product at the declared price, alongside the ephemeris routes", async () => {
  assert.equal(MARKET_OBSERVATION_PRICE, "$0.10");

  const { app } = createServer({
    X402_NETWORK: NETWORK,
    X402_FACILITATOR: "https://facilitator.invalid",
    X402_PAY_TO: PAY_TO,
    PORT: "0",
  }, { facilitatorClient: facilitator, afterSettle: async () => {} });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 50));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;

    const challengeResponse = await fetch(`${origin}${MARKET_OBSERVATION_ROUTE}`, {
      headers: { "x-forwarded-proto": "https" },
    });
    assert.equal(challengeResponse.status, 402);
    const challenge = decodeChallenge(challengeResponse);
    assert.equal(challenge.accepts[0].amount, "100000");
    assert.equal(challenge.accepts[0].network, NETWORK);
    assert.equal(challenge.resource.mimeType, "application/json");
    assert.match(challenge.resource.url, new RegExp(`${MARKET_OBSERVATION_ROUTE}$`));
    // A static path (no :param segments) carries no routeTemplate by Bazaar's own convention —
    // the requested URL already is the exact resource, unlike the ephemeris routes' :date.
    assert.equal(challenge.extensions.bazaar.routeTemplate, undefined);
    assert.equal(
      challenge.extensions.bazaar.schema.properties.input.properties.queryParams.properties.windowBlocks.maximum,
      MAX_WINDOW_BLOCKS,
    );
    assert.equal(challenge.extensions.bazaar.info.output.example.recordType, "561-group.x402-market-observation");

    // Pre-payment validation must refuse a malformed window before any 402 is issued —
    // the same discipline the ephemeris routes hold for a bad date.
    const badWindow = await fetch(`${origin}${MARKET_OBSERVATION_ROUTE}?windowBlocks=0`);
    assert.equal(badWindow.status, 422);
    const nonsenseWindow = await fetch(`${origin}${MARKET_OBSERVATION_ROUTE}?windowBlocks=not-a-number`);
    assert.equal(nonsenseWindow.status, 422);
  } finally {
    await new Promise((accept) => server.close(accept));
  }
});

test("createMarketObservationHandler(): serves a live observation on settled payment, RPC mocked", async () => {
  const a = "0x1111111111111111111111111111111111111111";
  const b = "0x2222222222222222222222222222222222222222";
  const handler = createMarketObservationHandler({}, {
    fetchImpl: rpcFake({ logs: [log(a), log(b), log(a)] }),
    now: () => "2026-08-28T00:00:00.000Z",
  });

  let statusCode = 200;
  let body;
  const response = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; },
  };
  await handler({ query: {} }, response, (error) => { throw error; });

  assert.equal(statusCode, 200);
  assert.equal(body.recordType, "561-group.x402-market-observation");
  assert.equal(body.observedAt, "2026-08-28T00:00:00.000Z");
  assert.equal(body.measured.authorizations, 3);
  assert.equal(body.measured.distinctAuthorizers, 2);
  assert.equal(body.distinctAuthorizersSampled, 2);
  assert.match(body.caveat, /not a marker of the protocol/u);
});

test("createMarketObservationHandler(): a throttled RPC is a 502, never a silent zero", async () => {
  const handler = createMarketObservationHandler({}, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.method === "eth_blockNumber") {
        return { ok: false, status: 429, json: async () => ({}) };
      }
      return { ok: false, status: 400, json: async () => ({}) };
    },
  });

  let statusCode = 200;
  let body;
  const response = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; },
  };
  await handler({ query: {} }, response, (error) => { throw error; });

  assert.equal(statusCode, 502);
  assert.match(body.error, /429/u);
});

// The domain-ownership proof third-party x402 directories fetch to confirm we control this
// host. It is deliberately unpriced and registered above the payment middleware: a verifier
// that receives a 402 fails the check, and the listing the proof exists to unlock never
// happens. Gating it behind the payment it advertises would be self-defeating.
test("serves the directory verification hash unpriced", async () => {
  const { app } = createServer({
    X402_NETWORK: NETWORK,
    X402_FACILITATOR: "https://facilitator.invalid",
    X402_PAY_TO: PAY_TO,
    INDEX_VERIFICATION_HASH: "deadbeefcafe",
    PORT: "0",
  }, { facilitatorClient: facilitator, afterSettle: async () => {} });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 50));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}/.well-known/402index-verify.txt`);
    assert.equal(response.status, 200, "must not sit behind the payment middleware");
    assert.match(response.headers.get("content-type") ?? "", /text\/plain/u);
    assert.equal((await response.text()).trim(), "deadbeefcafe");
  } finally {
    server.close();
    await new Promise((accept) => server.once("close", accept));
  }
});
