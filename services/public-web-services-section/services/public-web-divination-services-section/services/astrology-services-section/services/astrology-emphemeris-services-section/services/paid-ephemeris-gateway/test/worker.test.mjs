import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerHandler, WORKER_ROUTES } from "../src/worker.mjs";
import { MOMENT_ESSENTIALS_ROUTE } from "../src/route-catalog.mjs";
import { ASTRONOMY_POSITIONS_ROUTE } from "../src/astronomy-positions-route.mjs";
import { MARKET_OBSERVATION_ROUTE } from "../src/market-observation-route.mjs";

const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";
const NETWORK = "eip155:8453";

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
}

test("declares the three Workers-portable products, excluding Precision Moment", () => {
  assert.deepEqual(WORKER_ROUTES, [MOMENT_ESSENTIALS_ROUTE, ASTRONOMY_POSITIONS_ROUTE, MARKET_OBSERVATION_ROUTE]);
});

test("serves status and the 402index verification file unpriced, with no env at all", async () => {
  const worker = createWorkerHandler();
  const env = {};
  const status = await worker.fetch(new Request("https://ephemeris.561.group/v1/status"), env);
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { status: "ok", service: "paid-ephemeris-gateway" });

  const verify = await worker.fetch(new Request("https://ephemeris.561.group/.well-known/402index-verify.txt"), env);
  assert.equal(verify.status, 200);
  assert.equal(verify.headers.get("content-type"), "text/plain");
  assert.equal(await verify.text(), "8f8a2ea306af8bf4937fbeaf674c1cabcf974d319934f31d6c4e7c515fdc873a");
});

test("verification route honors an INDEX_VERIFICATION_HASH override and needs no payout configuration", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(
    new Request("https://ephemeris.561.group/.well-known/402index-verify.txt"),
    { INDEX_VERIFICATION_HASH: "override-hash" },
  );
  assert.equal(await response.text(), "override-hash");
});

test("refuses an unknown path with 404", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(new Request("https://ephemeris.561.group/nope"), {});
  assert.equal(response.status, 404);
});

test("reports clean misconfiguration, not a crash, when X402_PAY_TO is absent", async () => {
  const worker = createWorkerHandler({ facilitatorClient: unpaidFacilitator() });
  const response = await worker.fetch(new Request("https://ephemeris.561.group/v1/ephemeris/moment/2026-07-21"), {});
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.match(body.error, /X402_PAY_TO/u);
});

test("Moment Essentials issues the 402 challenge unpaid, then serves after settlement", async () => {
  let settleCalls = 0;
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { settleCalls += 1; return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
  const worker = createWorkerHandler({ facilitatorClient: paidFacilitator, computeEssentials: () => ({ time: "2026-07-21T00:00:00.000Z" }) });
  const env = { X402_PAY_TO: PAY_TO };

  const unpaid = await worker.fetch(new Request("https://ephemeris.561.group/v1/ephemeris/moment/2026-07-21"), env);
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].price ?? challenge.accepts[0].amount !== undefined, true);

  const paymentSignature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");
  const paid = await worker.fetch(
    new Request("https://ephemeris.561.group/v1/ephemeris/moment/2026-07-21", { headers: { "payment-signature": paymentSignature } }),
    env,
  );
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { time: "2026-07-21T00:00:00.000Z" });
  assert.equal(settleCalls, 1);
});

test("Moment Essentials refuses a malformed date before pricing it", async () => {
  const worker = createWorkerHandler({ facilitatorClient: unpaidFacilitator() });
  const response = await worker.fetch(
    new Request("https://ephemeris.561.group/v1/ephemeris/moment/not-a-date"),
    { X402_PAY_TO: PAY_TO },
  );
  assert.equal(response.status, 422);
});

test("Market Observation serves a live observation after settlement through the injected canonical observer", async () => {
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"22".repeat(20)}` }; },
    async settle() { return { success: true, network: NETWORK, transaction: `0x${"cd".repeat(32)}`, payer: `0x${"22".repeat(20)}` }; },
  };
  const mockObservation = { ok: true, asset: "0xUSDC", measured: { fromBlock: 1, toBlock: 900, blocks: 900, approximateMinutes: 30, authorizations: 10, distinctAuthorizers: 3 }, extrapolated: { dayFactor: 48 }, caveat: "test" };
  const worker = createWorkerHandler({ facilitatorClient: paidFacilitator, observeSettlement: async () => mockObservation });
  const env = { X402_PAY_TO: PAY_TO };

  const unpaid = await worker.fetch(new Request("https://ephemeris.561.group/v1/x402-market/observation"), env);
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const paymentSignature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");

  const paid = await worker.fetch(
    new Request("https://ephemeris.561.group/v1/x402-market/observation", { headers: { "payment-signature": paymentSignature } }),
    env,
  );
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.recordType, "561-group.x402-market-observation");
  assert.equal(body.distinctAuthorizersSampled, 3);
});
