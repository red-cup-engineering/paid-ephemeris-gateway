import assert from "node:assert/strict";
import test from "node:test";

import {
  MOMENT_ESSENTIALS_PRICE,
  MOMENT_ESSENTIALS_ROUTE,
  PRECISION_MOMENT_PRICE,
  PRECISION_MOMENT_ROUTE,
  STATUS_ROUTE,
  createServer,
} from "../src/server.mjs";

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

test("seller exposes two exact-moment Bazaar products at the mandated prices", async () => {
  assert.equal(MOMENT_ESSENTIALS_PRICE, "$0.04");
  assert.equal(PRECISION_MOMENT_PRICE, "$0.32");

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
    const essentials = await fetch(`${origin}${MOMENT_ESSENTIALS_ROUTE.replace(":date", "2026-07-21T00:00:00Z")}`, {
      headers: { "x-forwarded-proto": "https" },
    });
    assert.equal(essentials.status, 402);
    const essentialsChallenge = decodeChallenge(essentials);
    assert.equal(essentialsChallenge.accepts[0].amount, "40000");
    assert.equal(essentialsChallenge.accepts[0].network, NETWORK);
    assert.equal(essentialsChallenge.resource.mimeType, "application/json");
    assert.match(essentialsChallenge.resource.url, /^https:\/\//u);
    assert.equal(essentialsChallenge.extensions.bazaar.routeTemplate, MOMENT_ESSENTIALS_ROUTE);

    const precisionPath = PRECISION_MOMENT_ROUTE.replace(":date", "2026-07-21T00:00:00Z");
    const precision = await fetch(`${origin}${precisionPath}?latitude=41.8781&longitude=-87.6298`);
    assert.equal(precision.status, 402);
    const precisionChallenge = decodeChallenge(precision);
    assert.equal(precisionChallenge.accepts[0].amount, "320000");
    assert.equal(precisionChallenge.extensions.bazaar.routeTemplate, PRECISION_MOMENT_ROUTE);
    assert.deepEqual(
      precisionChallenge.extensions.bazaar.schema.properties.input.properties.queryParams.required,
      ["latitude", "longitude"],
    );

    const impossibleEssentials = await fetch(`${origin}${MOMENT_ESSENTIALS_ROUTE.replace(":date", "1700-01-01")}`);
    assert.equal(impossibleEssentials.status, 422);
    const missingLocation = await fetch(`${origin}${precisionPath}`);
    assert.equal(missingLocation.status, 422);
    const unsupportedPrecisionDate = await fetch(
      `${origin}${PRECISION_MOMENT_ROUTE.replace(":date", "1900-01-01")}?latitude=0&longitude=0`,
    );
    assert.equal(unsupportedPrecisionDate.status, 422);
    const health = await fetch(`${origin}${STATUS_ROUTE}`);
    assert.equal(health.status, 200);
  } finally {
    await new Promise((accept) => server.close(accept));
  }
});
