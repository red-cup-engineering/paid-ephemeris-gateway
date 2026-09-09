import assert from "node:assert/strict";
import test from "node:test";
import { startWebServer } from "@red-cup-engineering/web-server-services-section/node";
import { createServer } from "../src/server.mjs";
import { createWorkerHandler } from "../src/worker.mjs";

const NETWORK = "eip155:84532";
const env = { X402_NETWORK: NETWORK, X402_PAY_TO: "0x0000000000000000000000000000000000000001", X402_FACILITATOR: "https://facilitator.invalid" };
const cases = [{ path: "/v1/ephemeris/moment/2026-07-21", method: "GET", amount: "40000" }, { path: "/v1/x402-market/observation", method: "GET", amount: "100000" }];
const challenge = (response) => JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));

test("one application preserves HTTP and payment admission across Worker and Node", async (t) => {
  let actions = 0, verifications = 0, settlements = 0; const witnesses = [];
  const action = () => { actions++; return { ok: true }; };
  const dependencies = {
    computeEssentials: action, computePrecision: action, now: () => "2026-09-07T00:00:00.000Z", observeSettlement: async () => { action(); return { ok: true, asset: "0xUSDC", measured: { distinctAuthorizers: 3, provenance: { providerId: "fake" } }, extrapolated: {}, caveat: "test" }; },
    afterSettle: async (context) => { witnesses.push(context); },
    facilitatorClient: {
      async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
      async verify() { verifications++; return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
      async settle() { settlements++; return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
    },
  };
  const worker = createWorkerHandler(dependencies);
  const { app } = createServer(env, dependencies);
  const server = await startWebServer(app, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  await new Promise((resolve) => setTimeout(resolve, 150));
  const origin = `http://127.0.0.1:${server.port}`;
  const receivers = [(url, init) => worker.fetch(new Request(url, init), env), (url, init) => fetch(url, init)];
  for (const [path, method, expected] of [["/v1/status", "GET", 200], ["/v1/status", "HEAD", 200], ["/v1/status", "OPTIONS", 204], ["/v1/status", "POST", 405], ["/missing", "GET", 404], ["/%ZZ", "GET", 400]]) {
    const responses = await Promise.all(receivers.map((receive) => receive(origin + path, { method })));
    assert.equal(responses[0].status, expected); assert.equal(responses[1].status, expected);
    for (const header of ["allow", "content-type", "cache-control", "content-security-policy"]) assert.equal(responses[0].headers.get(header), responses[1].headers.get(header));
    assert.equal(await responses[0].text(), await responses[1].text());
  }
  for (const item of cases) {
    const init = { method: item.method, headers: { "content-type": "application/json" }, ...(item.body ? { body: JSON.stringify(item.body) } : {}) };
    const unpaid = await Promise.all(receivers.map((receive) => receive(origin + item.path, init)));
    assert.equal(actions, settlements); // no unpaid domain computation, including after earlier paid cases
    for (const response of unpaid) { assert.equal(response.status, 402); assert.equal(challenge(response).accepts[0].amount, item.amount); }
    assert.deepEqual(challenge(unpaid[0]), challenge(unpaid[1]));
    const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challenge(unpaid[0]).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
    await Promise.all(unpaid.map((response) => response.arrayBuffer()));
    const paid = await Promise.all(receivers.map((receive) => receive(origin + item.path, { ...init, headers: { ...init.headers, "payment-signature": payment } })));
    for (const response of paid) { assert.equal(response.status, 200); assert.ok(response.headers.get("payment-response")); }
    assert.deepEqual(await paid[0].json(), await paid[1].json());
    assert.equal(witnesses.length, settlements); assert.equal(actions, settlements);
    for (const receive of receivers) {
      const options = await receive(origin + item.path, { method: "OPTIONS" }); assert.equal(options.status, 204); assert.ok(options.headers.get("allow").includes(item.method));
      const refused = await receive(origin + item.path, { method: "DELETE" }); assert.equal(refused.status, 405); await refused.arrayBuffer();
      if (item.method === "GET") { const head = await receive(origin + item.path, { method: "HEAD" }); assert.equal(head.status, 402); assert.ok(head.headers.get("payment-required")); assert.equal(await head.text(), ""); }
    }
  }
  assert.equal(verifications, settlements); assert.equal(actions, settlements);
  for (const witness of witnesses) { assert.equal(witness.result.success, true); assert.equal(witness.result.network, NETWORK); assert.equal(witness.result.transaction, `0x${"ab".repeat(32)}`); }
  if (cases[0].method === "POST") {
    const count = actions;
    for (const [body, type, status] of [["{", "application/json", 400], ["{}", "text/plain", 415], [JSON.stringify({ text: "x".repeat(128 * 1024) }), "application/json", 413]]) {
      const responses = await Promise.all(receivers.map((receive) => receive(origin + cases[0].path, { method: "POST", headers: { "content-type": type }, body })));
      for (const response of responses) assert.equal(response.status, status);
      assert.deepEqual(await responses[0].json(), await responses[1].json());
    }
    assert.equal(actions, count);
  }
});
