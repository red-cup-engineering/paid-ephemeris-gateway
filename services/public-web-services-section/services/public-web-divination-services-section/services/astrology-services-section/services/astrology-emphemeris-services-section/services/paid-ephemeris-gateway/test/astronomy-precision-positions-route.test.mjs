import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "../src/server.mjs";
import { ASTRONOMY_PRECISION_POSITIONS_PRICE, ASTRONOMY_PRECISION_POSITIONS_ROUTE } from "../src/astronomy-precision-positions-route.mjs";

test("precision astronomy serves polar locations through the astronomy operation", async () => {
  const network = "eip155:84532";
  let physicalOptions;
  const { app } = createServer({
    X402_NETWORK: network, X402_PAY_TO: "0x0000000000000000000000000000000000000001", X402_FACILITATOR: "https://facilitator.invalid",
  }, {
    computePrecision: () => { throw new Error("astronomy must not call astrology"); },
    computeAstronomyPrecision: (_date, options) => { physicalOptions = options; return { tier: "astronomy-precision-positions" }; },
    afterSettle: async () => {},
    facilitatorClient: {
      getSupported: async () => ({ kinds: [{ x402Version: 2, scheme: "exact", network }], extensions: [], signers: {} }),
      verify: async () => ({ isValid: true, payer: "0x" + "11".repeat(20) }),
      settle: async () => ({ success: true, network, transaction: "0x" + "ab".repeat(32) }),
    },
  });
  const url = "https://ephemeris.test/v1/astronomy/precision-positions/2026-07-21T00:00:00Z?latitude=89&longitude=0&houseSystem=placidus";
  const unpaid = await app.fetch(new Request(url));
  assert.equal(unpaid.status, 402);
  assert.equal(physicalOptions, undefined);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64"));
  const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0xtest" } })).toString("base64");
  const paid = await app.fetch(new Request(url, { headers: { "payment-signature": payment } }));
  assert.equal(paid.status, 200);
  assert.deepEqual(physicalOptions, { latitude: "89", longitude: "0" });
  assert.equal((await paid.json()).tier, "astronomy-precision-positions");
});

test("prices Astronomy Precision Positions at $0.32 on its own templated route", () => {
  assert.equal(ASTRONOMY_PRECISION_POSITIONS_PRICE, "$0.32");
  assert.equal(ASTRONOMY_PRECISION_POSITIONS_ROUTE, "/v1/astronomy/precision-positions/{date}");
});
