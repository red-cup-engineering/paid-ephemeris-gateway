import assert from "node:assert/strict";
import test from "node:test";
import {
  X402_MARKET_ACTION_ROUTE,
  X402_MARKET_ACTION_SAMPLE_REQUEST,
  X402_ROUTE,
  X402_SAMPLE_REQUEST,
} from "../src/x402-service.mjs";
import {
  COINBASE_LAUNCH_PRICE,
  MARKET_ACTION_COINBASE_LAUNCH_PRICE,
  createServer,
  STATUS_ROUTE,
} from "../src/server.mjs";

const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";
const facilitator = {
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:8453" }], extensions: [], signers: {} }; },
  async verify() { throw new Error("unpaid test must never verify"); },
  async settle() { throw new Error("unpaid test must never settle"); },
};

async function withServer(run) {
  const service = createServer({
    X402_NETWORK: "eip155:8453",
    X402_FACILITATOR_PROVIDER: "cdp",
    X402_FACILITATOR: "https://api.cdp.coinbase.com/platform/v2/x402",
    X402_PAY_TO: PAY_TO,
    TRASHPANDA_X402_PRICE: COINBASE_LAUNCH_PRICE,
    TRASHPANDA_MARKET_ACTION_PRICE: MARKET_ACTION_COINBASE_LAUNCH_PRICE,
  }, { facilitatorClient: facilitator, afterSettle: async () => {} });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 25));
  try { return await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((accept) => server.close(accept)); }
}

test("publishes a Base-mainnet Trashpanda Services challenge with no Yanagi branding", async () => withServer(async (origin) => {
  const response = await fetch(origin + X402_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(X402_SAMPLE_REQUEST),
  });
  assert.equal(response.status, 402);
  const required = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(required.x402Version, 2);
  assert.deepEqual(required.accepts.map(({ scheme, network, amount, payTo }) => ({ scheme, network, amount, payTo: payTo.toLowerCase() })), [{
    scheme: "exact",
    network: "eip155:8453",
    amount: "30000",
    payTo: PAY_TO.toLowerCase(),
  }]);
  assert.equal(required.resource.serviceName, "trashpanda-services-pre-sign-policy-conformance");
  assert.match(required.resource.description, /^Trashpanda Services /u);
  assert.doesNotMatch(JSON.stringify(required), /yanagi/iu);
}));

test("publishes the separate market-action admission product and price", async () => withServer(async (origin) => {
  const response = await fetch(origin + X402_MARKET_ACTION_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(X402_MARKET_ACTION_SAMPLE_REQUEST),
  });
  assert.equal(response.status, 402);
  const required = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(required.accepts[0].amount, "40000");
  assert.equal(required.resource.serviceName, "trashpanda-services-market-action-admission");
  assert.equal(required.extensions.bazaar.info.output.example.verdict, "ADMIT");
  assert.doesNotMatch(JSON.stringify(required), /yanagi/iu);
}));

test("status exposes only the Trashpanda Services commercial identity", async () => withServer(async (origin) => {
  const response = await fetch(origin + STATUS_ROUTE);
  assert.equal(response.status, 200);
  const status = await response.json();
  assert.equal(status.brand, "Trashpanda Services");
  assert.equal(status.network, "eip155:8453");
  assert.deepEqual(status.products, [
    { id: "pre-sign-transaction-policy-conformance", price: COINBASE_LAUNCH_PRICE },
    { id: "market-action-admission", price: MARKET_ACTION_COINBASE_LAUNCH_PRICE },
  ]);
  assert.doesNotMatch(JSON.stringify(status), /yanagi/iu);
}));

test("refuses the penny pilot price at the Coinbase production border", () => {
  assert.throws(() => createServer({
    X402_NETWORK: "eip155:8453",
    TRASHPANDA_X402_PRICE: "$0.01",
    TRASHPANDA_MARKET_ACTION_PRICE: MARKET_ACTION_COINBASE_LAUNCH_PRICE,
  }), /production price must be the admitted \$0\.03/u);
});

test("refuses an unadmitted market-action price at the Coinbase production border", () => {
  assert.throws(() => createServer({
    X402_NETWORK: "eip155:8453",
    TRASHPANDA_X402_PRICE: COINBASE_LAUNCH_PRICE,
    TRASHPANDA_MARKET_ACTION_PRICE: "$0.01",
  }), /market-action Coinbase production price must be the admitted \$0\.04/u);
});
