import assert from "node:assert/strict";
import test from "node:test";
import {
  createTrashpandaX402Service,
  X402_MARKET_ACTION_ROUTE,
  X402_MARKET_ACTION_SAMPLE_REQUEST,
  X402_MARKET_ACTION_SERVICE_NAME,
  X402_MAINNET_NETWORK,
  X402_ROUTE,
  X402_SERVICE_NAME,
  X402_TEST_NETWORK,
} from "../src/x402-service.mjs";
import { baseProductRequest } from "./fixtures/product-corpus.mjs";

const facilitator = {
  async getSupported() { return { kinds: [
    { x402Version: 2, scheme: "exact", network: X402_TEST_NETWORK },
    { x402Version: 2, scheme: "exact", network: X402_MAINNET_NETWORK },
  ], extensions: [], signers: {} }; },
  async verify() { throw new Error("unpaid seller proof must never verify"); },
  async settle() { throw new Error("unpaid seller proof must never settle"); },
};

async function withServer(run) {
  const service = createTrashpandaX402Service({
    env: { X402_NETWORK: X402_TEST_NETWORK, X402_PAY_TO: "0x42F72C0a340A4A55C082Fe42483e87691D2bff64" },
    facilitatorClient: facilitator,
    afterSettle: async () => { throw new Error("unpaid proof must never witness settlement"); },
  });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 25));
  try { return await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((accept) => server.close(accept)); }
}

test("valid work receives an official Base Sepolia x402 v2 challenge before execution", async () => withServer(async (origin) => {
  const response = await fetch(origin + X402_ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(baseProductRequest()) });
  assert.equal(response.status, 402);
  const required = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(required.x402Version, 2);
  assert.equal(required.accepts.length, 1);
  assert.equal(required.accepts[0].scheme, "exact");
  assert.equal(required.accepts[0].network, X402_TEST_NETWORK);
  assert.equal(required.accepts[0].payTo.toLowerCase(), "0x42f72c0a340a4a55c082fe42483e87691d2bff64");
  assert.equal(required.accepts[0].amount, "10000");
  assert.equal(required.resource.serviceName, X402_SERVICE_NAME);
  assert.match(required.resource.description, /^Trashpanda Services /u);
  assert.doesNotMatch(JSON.stringify(required.resource), /yanagi/iu);
}));

test("malformed or forbidden work is refused for free before payment", async () => withServer(async (origin) => {
  const request = baseProductRequest(); request.privateKey = "not-a-real-key";
  const response = await fetch(origin + X402_ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("payment-required"), null);
  assert.deepEqual(await response.json(), {
    type: "PolicyConformanceRefusal", code: "forbidden-authority", path: "$.privateKey",
    message: "request contains forbidden field 'privateKey'",
  });
}));

test("valid market-action work receives its distinct x402 challenge before evaluation", async () => withServer(async (origin) => {
  const response = await fetch(origin + X402_MARKET_ACTION_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(X402_MARKET_ACTION_SAMPLE_REQUEST),
  });
  assert.equal(response.status, 402);
  const required = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(required.x402Version, 2);
  assert.equal(required.accepts.length, 1);
  assert.equal(required.accepts[0].scheme, "exact");
  assert.equal(required.accepts[0].network, X402_TEST_NETWORK);
  assert.equal(required.accepts[0].amount, "40000");
  assert.equal(required.resource.serviceName, X402_MARKET_ACTION_SERVICE_NAME);
  assert.match(required.resource.description, /^Trashpanda Services /u);
  assert.deepEqual(required.extensions.bazaar.info.input.body, X402_MARKET_ACTION_SAMPLE_REQUEST);
  assert.equal(required.extensions.bazaar.info.output.example.verdict, "ADMIT");
  assert.doesNotMatch(JSON.stringify(required.resource), /yanagi/iu);
}));

test("market-action secrets and malformed requests are refused for free", async () => withServer(async (origin) => {
  const request = structuredClone(X402_MARKET_ACTION_SAMPLE_REQUEST);
  request.candidate.privateKey = "not-a-real-key";
  const response = await fetch(origin + X402_MARKET_ACTION_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("payment-required"), null);
  assert.deepEqual(await response.json(), {
    type: "MarketActionAdmissionRefusal",
    code: "forbidden-authority",
    path: "$.candidate.privateKey",
    message: "request contains forbidden field 'privateKey'",
  });
}));

test("service refuses implicit payout, implicit CDP clients, and settlement-witness authority", () => {
  assert.throws(() => createTrashpandaX402Service(), /explicit EVM payout/u);
  assert.throws(() => createTrashpandaX402Service({ env: { X402_PAY_TO: "0x42F72C0a340A4A55C082Fe42483e87691D2bff64" }, facilitatorClient: facilitator }), /settlement witness/u);
  assert.throws(() => createTrashpandaX402Service({
    env: { X402_NETWORK: X402_MAINNET_NETWORK, X402_FACILITATOR_PROVIDER: "cdp", X402_FACILITATOR: "https://api.cdp.coinbase.com/platform/v2/x402", X402_PAY_TO: "0x42F72C0a340A4A55C082Fe42483e87691D2bff64" },
    afterSettle: async () => {},
  }), /explicitly contracted facilitatorClient/u);
});

test("Base-mainnet deployment refuses a Sepolia product request before payment", async () => {
  const service = createTrashpandaX402Service({
    env: { X402_NETWORK: X402_MAINNET_NETWORK, X402_PAY_TO: "0x42F72C0a340A4A55C082Fe42483e87691D2bff64" },
    facilitatorClient: facilitator,
    afterSettle: async () => {},
  });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 25));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${X402_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseProductRequest()),
    });
    assert.equal(response.status, 422);
    assert.equal(response.headers.get("payment-required"), null);
    assert.equal((await response.json()).code, "wrong-production-chain");
  } finally {
    await new Promise((accept) => server.close(accept));
  }
});
