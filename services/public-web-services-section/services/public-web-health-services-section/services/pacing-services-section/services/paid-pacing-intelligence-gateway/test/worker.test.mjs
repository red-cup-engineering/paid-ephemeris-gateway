import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerHandler, WORKER_ROUTES } from "../src/worker.mjs";
import { HEART_RATE_THRESHOLD_ROUTE, PACING_ANALYSIS_ROUTE } from "../src/route-catalog.mjs";

const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";
const NETWORK = "eip155:8453";

const OBSERVATIONS = [{
  metric: "hrv-rmssd",
  measuredAt: "2026-08-30T07:00:00Z",
  measurement: { value: "42.1", unit: "ms", precision: "1" },
  missingness: { status: "observed" },
}];

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
}

test("declares both priced products, unlike ephemeris excluding none of them (pure-JS compute, no subprocess limit)", () => {
  assert.deepEqual(WORKER_ROUTES, [PACING_ANALYSIS_ROUTE, HEART_RATE_THRESHOLD_ROUTE]);
});

test("serves status unpriced, with no env at all", async () => {
  const worker = createWorkerHandler();
  const status = await worker.fetch(new Request("https://pacing.561.group/v1/status"), {});
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { status: "ok", service: "paid-pacing-intelligence-gateway" });
});

test("refuses an unknown path with 404", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(new Request("https://pacing.561.group/nope"), {});
  assert.equal(response.status, 404);
});

test("reports clean misconfiguration, not a crash, when X402_PAY_TO is absent", async () => {
  const worker = createWorkerHandler({ facilitatorClient: unpaidFacilitator() });
  const response = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ observations: OBSERVATIONS }),
  }), {});
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.match(body.error, /X402_PAY_TO/u);
});

test("Pacing Analysis refuses a malformed body with 422 before pricing it", async () => {
  const worker = createWorkerHandler({ facilitatorClient: unpaidFacilitator() });
  const response = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ observations: [] }),
  }), { X402_PAY_TO: PAY_TO });
  assert.equal(response.status, 422);
});

test("Pacing Analysis issues the 402 challenge unpaid, then serves the full report after settlement", async () => {
  let settleCalls = 0;
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { settleCalls += 1; return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
  const worker = createWorkerHandler({ facilitatorClient: paidFacilitator });
  const env = { X402_PAY_TO: PAY_TO };
  const requestBody = JSON.stringify({ observations: OBSERVATIONS });

  const unpaid = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: requestBody,
  }), env);
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].amount, "50000");

  const paymentSignature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");
  const paid = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/analysis", {
    method: "POST",
    headers: { "content-type": "application/json", "payment-signature": paymentSignature },
    body: requestBody,
  }), env);
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.observationCount, 1);
  assert.equal(settleCalls, 1);
});

test("Heart-Rate Threshold issues the 402 challenge unpaid, then serves the Workwell heuristic after settlement", async () => {
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"22".repeat(20)}` }; },
    async settle() { return { success: true, network: NETWORK, transaction: `0x${"cd".repeat(32)}`, payer: `0x${"22".repeat(20)}` }; },
  };
  const worker = createWorkerHandler({ facilitatorClient: paidFacilitator });
  const env = { X402_PAY_TO: PAY_TO };
  const requestBody = JSON.stringify({ restingHr: 58 });

  const unpaid = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/heart-rate-threshold", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: requestBody,
  }), env);
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].amount, "10000");

  const paymentSignature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");
  const paid = await worker.fetch(new Request("https://pacing.561.group/v1/pacing/heart-rate-threshold", {
    method: "POST",
    headers: { "content-type": "application/json", "payment-signature": paymentSignature },
    body: requestBody,
  }), env);
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.ceilingBpm, 73);
});
