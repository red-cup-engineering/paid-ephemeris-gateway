import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerHandler, WORKER_ROUTES } from "../src/worker.mjs";
import { ORPHAN_PATCH_SCORE_ROUTE, STATUS_ROUTE } from "../src/route-catalog.mjs";

const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64";
const NETWORK = "eip155:8453";

const HARVEST_INPUT = {
  advisories: [{
    id: "GHSA-2026-0001",
    package: "left-pad-example",
    ecosystem: "npm",
    severity: "high",
    published: "2026-01-15T00:00:00Z",
    fixedVersion: null,
  }],
  maintenance: [{
    package: "left-pad-example",
    ecosystem: "npm",
    lastReleaseDaysAgo: 900,
    openIssueResponseDaysMedian: null,
  }],
  dependents: [{ package: "left-pad-example", ecosystem: "npm", dependentCount: 4200 }],
};

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
}

function paidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
}

function paymentSignatureFor(challenge) {
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");
}

test("declares the one priced route", () => {
  assert.deepEqual(WORKER_ROUTES, [ORPHAN_PATCH_SCORE_ROUTE]);
});

test("serves status unpriced, with no env at all", async () => {
  const worker = createWorkerHandler();
  const status = await worker.fetch(new Request("https://orphan-patch.561.group" + STATUS_ROUTE), {});
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { status: "ok", service: "paid-orphan-patch-triage-gateway" });
});

test("serves the 402index verification hash as text/plain when configured", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(
    new Request("https://orphan-patch.561.group/.well-known/402index-verify.txt"),
    { INDEX_VERIFICATION_HASH: "abc123" },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain");
  assert.equal(await response.text(), "abc123");
});

test("returns 404 for the 402index verification route when unset", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(new Request("https://orphan-patch.561.group/.well-known/402index-verify.txt"), {});
  assert.equal(response.status, 404);
});

test("refuses an unknown path with 404", async () => {
  const worker = createWorkerHandler();
  const response = await worker.fetch(new Request("https://orphan-patch.561.group/nope"), {});
  assert.equal(response.status, 404);
});

test("reports clean misconfiguration, not a crash, when X402_PAY_TO is absent", async () => {
  const worker = createWorkerHandler({ facilitatorClient: unpaidFacilitator() });
  const response = await worker.fetch(
    new Request("https://orphan-patch.561.group" + ORPHAN_PATCH_SCORE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(HARVEST_INPUT),
    }),
    {},
  );
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.match(body.error, /X402_PAY_TO/u);
});

test("Orphan-Patch Score issues the 402 challenge unpaid, then serves the ranked candidates after settlement", async () => {
  let settleCalls = 0;
  const facilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() {
      settleCalls += 1;
      return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` };
    },
  };
  const worker = createWorkerHandler({ facilitatorClient: facilitator });
  const env = { X402_PAY_TO: PAY_TO };

  const unpaid = await worker.fetch(
    new Request("https://orphan-patch.561.group" + ORPHAN_PATCH_SCORE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(HARVEST_INPUT),
    }),
    env,
  );
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].price ?? challenge.accepts[0].amount !== undefined, true);

  const paid = await worker.fetch(
    new Request("https://orphan-patch.561.group" + ORPHAN_PATCH_SCORE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json", "payment-signature": paymentSignatureFor(challenge) },
      body: JSON.stringify(HARVEST_INPUT),
    }),
    env,
  );
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.candidates.length, 1);
  assert.equal(body.candidates[0].package, "left-pad-example");
  assert.equal(body.candidates[0].advisoryIds[0], "GHSA-2026-0001");
  assert.equal(settleCalls, 1);
});

test("refuses a malformed harvest input (missing arrays) before it reaches the scorer, before pricing rejects it", async () => {
  const worker = createWorkerHandler({ facilitatorClient: paidFacilitator() });
  const env = { X402_PAY_TO: PAY_TO };
  const unpaid = await worker.fetch(
    new Request("https://orphan-patch.561.group" + ORPHAN_PATCH_SCORE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ advisories: [] }),
    }),
    env,
  );
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const paid = await worker.fetch(
    new Request("https://orphan-patch.561.group" + ORPHAN_PATCH_SCORE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json", "payment-signature": paymentSignatureFor(challenge) },
      body: JSON.stringify({ advisories: [] }),
    }),
    env,
  );
  assert.equal(paid.status, 422);
});
