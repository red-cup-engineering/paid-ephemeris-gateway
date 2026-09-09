import assert from "node:assert/strict";
import test from "node:test";
import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";

import {
  HEART_RATE_THRESHOLD_PRICE,
  HEART_RATE_THRESHOLD_ROUTE,
  PACING_ANALYSIS_PRICE,
  PACING_ANALYSIS_ROUTE,
  STATUS_ROUTE,
  createServer,
} from "../src/server.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";

const OBSERVATIONS = [{
  metric: "hrv-rmssd",
  measuredAt: "2026-08-30T07:00:00Z",
  measurement: { value: "42.1", unit: "ms", precision: "1" },
  missingness: { status: "observed" },
}];

const unpaidFacilitator = {
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
  async verify() { throw new Error("an unpaid assay must never verify"); },
  async settle() { throw new Error("an unpaid assay must never settle"); },
};

function decodeChallenge(response) {
  return JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
}

async function withServer(dependencies, run) {
  const { app } = createServer({
    X402_NETWORK: NETWORK,
    X402_FACILITATOR: "https://facilitator.invalid",
    X402_PAY_TO: PAY_TO,
    PORT: "0",
  }, { facilitatorClient: unpaidFacilitator, afterSettle: async () => {}, ...dependencies });
  const server = await startWebServer(app, { port: 0, host: "127.0.0.1", trustProxy: 1 });
  await new Promise((accept) => setTimeout(accept, 50));
  try {
    await run(`http://127.0.0.1:${server.port}`);
  } finally {
    await server.close();
  }
}

test("seller exposes both pacing products at the mandated prices, with the ephemeris gateway's payTo", async () => {
  assert.equal(PACING_ANALYSIS_PRICE, "$0.05");
  assert.equal(HEART_RATE_THRESHOLD_PRICE, "$0.01");

  await withServer({}, async (origin) => {
    const analysis = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-proto": "https" },
      body: JSON.stringify({ observations: OBSERVATIONS }),
    });
    assert.equal(analysis.status, 402);
    const analysisChallenge = decodeChallenge(analysis);
    assert.equal(analysisChallenge.accepts[0].amount, "50000");
    assert.equal(analysisChallenge.accepts[0].network, NETWORK);
    assert.equal(analysisChallenge.accepts[0].payTo, PAY_TO);
    assert.equal(analysisChallenge.resource.mimeType, "application/json");
    assert.match(analysisChallenge.resource.url, /^https:\/\//u);
    assert.equal(analysisChallenge.extensions.bazaar.info.input.bodyType, "json");

    const threshold = await fetch(`${origin}${HEART_RATE_THRESHOLD_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restingHr: 58 }),
    });
    assert.equal(threshold.status, 402);
    const thresholdChallenge = decodeChallenge(threshold);
    assert.equal(thresholdChallenge.accepts[0].amount, "10000");
    assert.equal(thresholdChallenge.accepts[0].payTo, PAY_TO);

    const status = await fetch(`${origin}${STATUS_ROUTE}`);
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { status: "ok", service: "paid-pacing-intelligence-gateway" });
  });
});

test("refuses malformed observation payloads with 422 before any 402 is issued", async () => {
  await withServer({}, async (origin) => {
    const missingObservations = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(missingObservations.status, 422);
    assert.match((await missingObservations.json()).error, /observations/u);

    const emptyObservations = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ observations: [] }),
    });
    assert.equal(emptyObservations.status, 422);

    const malformedRecord = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ observations: [{ metric: "hrv-rmssd" }] }),
    });
    assert.equal(malformedRecord.status, 422);
    assert.match((await malformedRecord.json()).error, /measuredAt or enteredAt/u);
  });
});

test("refuses a malformed heart-rate-threshold payload with 422 before any 402 is issued", async () => {
  await withServer({}, async (origin) => {
    const missing = await fetch(`${origin}${HEART_RATE_THRESHOLD_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(missing.status, 422);

    const negative = await fetch(`${origin}${HEART_RATE_THRESHOLD_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restingHr: -5 }),
    });
    assert.equal(negative.status, 422);
  });
});

test("Pacing Analysis issues the 402 challenge unpaid, then serves the full analyzePacing report after settlement", async () => {
  let settleCalls = 0;
  let witnessed;
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { settleCalls += 1; return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
  await withServer({ facilitatorClient: paidFacilitator, afterSettle: async (context) => { witnessed = context; } }, async (origin) => {
    const unpaid = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ observations: OBSERVATIONS }),
    });
    assert.equal(unpaid.status, 402);
    const challenge = decodeChallenge(unpaid);
    const paymentSignature = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: challenge.accepts[0],
      payload: { signature: "0xtest" },
    })).toString("base64");

    const paid = await fetch(`${origin}${PACING_ANALYSIS_ROUTE}`, {
      method: "POST",
      headers: { "content-type": "application/json", "payment-signature": paymentSignature },
      body: JSON.stringify({ observations: OBSERVATIONS }),
    });
    assert.equal(paid.status, 200);
    const body = await paid.json();
    assert.equal(body.observationCount, 1);
    assert.ok("risk" in body);
    assert.ok("note" in body);
    assert.equal(settleCalls, 1);
    assert.equal(witnessed.result.amount ?? witnessed.requirements?.amount, "50000");
  });
});
