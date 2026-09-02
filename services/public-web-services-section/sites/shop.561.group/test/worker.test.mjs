import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import worker, { CATALOG, CATALOG_VALIDATION } from "../src/worker.mjs";
import { issueDownloadToken } from "@red-cup-engineering/digital-goods-storefront-services-section";

const TEST_KEY = "sk_test_shop561groupfixture";

function fakeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function fakeR2(objects) {
  return {
    async get(key) {
      return Object.prototype.hasOwnProperty.call(objects, key) ? { body: objects[key] } : null;
    },
  };
}

function baseEnv(overrides = {}) {
  return {
    SHOP_ENTITLEMENTS: fakeKv(),
    SHOP_GOODS: fakeR2({}),
    SHOP_TOKEN_SECRET: "test-token-secret",
    ...overrides,
  };
}

function webhookSignature(rawBody, secret, timestamp) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("catalog.json ships valid per the storefront engine's own validator", () => {
  assert.equal(CATALOG_VALIDATION.valid, true, JSON.stringify(CATALOG_VALIDATION.errors));
});

test("catalog lists both ebooks with their real byte lengths", () => {
  const ids = CATALOG.offerings.map((offering) => offering.id);
  assert.ok(ids.includes("understanding-infection-associated-chronic-illness"));
  assert.ok(ids.includes("the-agent-operators-handbook"));
});

test("GET / lists both ebooks and, unarmed, says checkout is not yet armed", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/"), baseEnv());
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Understanding Infection-Associated Chronic Illness/u);
  assert.match(body, /The Agent Operator&#39;s Handbook|The Agent Operator's Handbook/u);
  assert.match(body, /checkout not yet armed/u);
});

test("GET / routes every card's View link to /goods/<id>, not the engine's static <id>.html", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/"), baseEnv({ STRIPE_SECRET_KEY: TEST_KEY }));
  const body = await response.text();
  assert.match(body, /href="\/goods\/understanding-infection-associated-chronic-illness"/u);
  assert.match(body, /href="\/goods\/the-agent-operators-handbook"/u);
  assert.doesNotMatch(body, /\.html"/u);
});

test("GET /goods/:id renders the offering page, routed to /checkout/<id>", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/goods/the-agent-operators-handbook"), baseEnv({ STRIPE_SECRET_KEY: TEST_KEY }));
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /href="\/checkout\/the-agent-operators-handbook"/u);
  assert.match(body, /href="\/"/u);
});

test("GET /goods/:id 404s for an unknown offering", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/goods/nope"), baseEnv());
  assert.equal(response.status, 404);
});

test("GET /catalog.json serves the catalog", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/catalog.json"), baseEnv());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.merchant.legalBody, "emsenn");
  assert.equal(body.offerings.length, CATALOG.offerings.length);
});

test("POST /checkout/:id returns the honest unarmed page when no STRIPE_SECRET_KEY is bound", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/checkout/the-agent-operators-handbook", { method: "POST" }), baseEnv());
  assert.equal(response.status, 409);
  const body = await response.text();
  assert.match(body, /not yet armed/u);
});

test("POST /checkout/:id 404s for a non-purchasable offering (coming-soon)", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/checkout/merch", { method: "POST" }), baseEnv({ STRIPE_SECRET_KEY: TEST_KEY }));
  assert.equal(response.status, 404);
});

test("POST /checkout/:id creates a Stripe Checkout session and 303s to it, when armed", async (t) => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (requestUrl, options) => {
    captured = { requestUrl, options };
    return { ok: true, status: 200, json: async () => ({ id: "cs_test_shop_1", url: "https://checkout.stripe.com/c/pay/cs_test_shop_1", amount_total: 1900, currency: "usd", payment_status: "unpaid", status: "open" }) };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const response = await worker.fetch(
    new Request("https://shop.561.group/checkout/understanding-infection-associated-chronic-illness", { method: "POST" }),
    baseEnv({ STRIPE_SECRET_KEY: TEST_KEY }),
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_test_shop_1");
  assert.equal(String(captured.requestUrl), "https://api.stripe.com/v1/checkout/sessions");
});

test("POST /webhooks/stripe refuses an invalid signature with 400", async () => {
  const rawBody = JSON.stringify({ id: "evt_bad", type: "checkout.session.completed", data: { object: {} } });
  const response = await worker.fetch(
    new Request("https://shop.561.group/webhooks/stripe", { method: "POST", body: rawBody, headers: { "stripe-signature": "t=1,v1=deadbeef" } }),
    baseEnv({ STRIPE_WEBHOOK_SECRET: "whsec_test" }),
  );
  assert.equal(response.status, 400);
});

test("POST /webhooks/stripe on checkout.session.completed writes an entitlement keyed by session id, once", async () => {
  const secret = "whsec_shop_test";
  const rawBody = JSON.stringify({
    id: "evt_shop_1",
    type: "checkout.session.completed",
    created: 1,
    livemode: false,
    data: { object: { id: "cs_test_shop_2", amount_total: 1900, currency: "usd", payment_status: "paid", status: "complete", metadata: { offering_id: "understanding-infection-associated-chronic-illness", customer_settlement: "urn:ame:customer" } } },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureHeader = webhookSignature(rawBody, secret, timestamp);
  const env = baseEnv({ STRIPE_WEBHOOK_SECRET: secret });

  const first = await worker.fetch(new Request("https://shop.561.group/webhooks/stripe", { method: "POST", body: rawBody, headers: { "stripe-signature": signatureHeader } }), env);
  assert.equal(first.status, 200);
  const stored = JSON.parse(await env.SHOP_ENTITLEMENTS.get("entitlement:cs_test_shop_2"));
  assert.equal(stored.offeringId, "understanding-infection-associated-chronic-illness");

  const duplicate = await worker.fetch(new Request("https://shop.561.group/webhooks/stripe", { method: "POST", body: rawBody, headers: { "stripe-signature": signatureHeader } }), env);
  assert.equal(duplicate.status, 200);
  assert.equal(env.SHOP_ENTITLEMENTS.store.size, 2); // one entitlement row + one audit-record row (overwritten in place on retry, never duplicated)
});

test("GET /thanks with no entitlement on file refuses honestly", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/thanks?session_id=cs_nope"), baseEnv());
  assert.equal(response.status, 404);
  const body = await response.text();
  assert.match(body, /No purchase found/u);
});

test("GET /thanks with an entitlement issues one download link per good", async () => {
  const env = baseEnv();
  await env.SHOP_ENTITLEMENTS.put("entitlement:cs_test_shop_3", JSON.stringify({ sessionId: "cs_test_shop_3", offeringId: "understanding-infection-associated-chronic-illness", amountTotal: 1900, currency: "usd" }));
  const response = await worker.fetch(new Request("https://shop.561.group/thanks?session_id=cs_test_shop_3"), env);
  assert.equal(response.status, 200);
  const body = await response.text();
  const hrefs = [...body.matchAll(/href="(\/download\/[^"]+)"/gu)].map((match) => match[1]);
  assert.equal(hrefs.length, 2);
});

test("GET /thanks refuses when a bound Stripe key confirms the session is not actually paid", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ payment_status: "unpaid", status: "open" }) });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const env = baseEnv({ STRIPE_SECRET_KEY: TEST_KEY });
  await env.SHOP_ENTITLEMENTS.put("entitlement:cs_test_shop_4", JSON.stringify({ sessionId: "cs_test_shop_4", offeringId: "understanding-infection-associated-chronic-illness" }));
  const response = await worker.fetch(new Request("https://shop.561.group/thanks?session_id=cs_test_shop_4"), env);
  assert.equal(response.status, 404);
});

test("GET /download/:token streams the object from R2 for a valid token", async () => {
  const offeringId = "understanding-infection-associated-chronic-illness";
  const good = CATALOG.offerings.find((offering) => offering.id === offeringId).goods[0];
  const token = await issueDownloadToken({ secret: "test-token-secret", offeringId: `${offeringId}/${good.key}`, sessionId: "cs_x", expiresAt: Date.now() + 60_000 });
  const env = baseEnv({ SHOP_GOODS: fakeR2({ [`goods/${offeringId}/${good.key}`]: "epub-bytes" }) });
  const response = await worker.fetch(new Request(`https://shop.561.group/download/${token}`), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), good.contentType);
  assert.equal(await response.text(), "epub-bytes");
});

test("GET /download/:token refuses an expired token with 403", async () => {
  const offeringId = "understanding-infection-associated-chronic-illness";
  const good = CATALOG.offerings.find((offering) => offering.id === offeringId).goods[0];
  const token = await issueDownloadToken({ secret: "test-token-secret", offeringId: `${offeringId}/${good.key}`, sessionId: "cs_x", expiresAt: Date.now() - 1_000 });
  const response = await worker.fetch(new Request(`https://shop.561.group/download/${token}`), baseEnv());
  assert.equal(response.status, 403);
});

test("GET /download/:token refuses a bogus token with 403", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/download/bogus"), baseEnv());
  assert.equal(response.status, 403);
});

test("GET /download/:token 404s when the token is valid but R2 has no object", async () => {
  const offeringId = "understanding-infection-associated-chronic-illness";
  const good = CATALOG.offerings.find((offering) => offering.id === offeringId).goods[0];
  const token = await issueDownloadToken({ secret: "test-token-secret", offeringId: `${offeringId}/${good.key}`, sessionId: "cs_x", expiresAt: Date.now() + 60_000 });
  const response = await worker.fetch(new Request(`https://shop.561.group/download/${token}`), baseEnv({ SHOP_GOODS: fakeR2({}) }));
  assert.equal(response.status, 404);
});

test("an unmatched route 404s", async () => {
  const response = await worker.fetch(new Request("https://shop.561.group/nope"), baseEnv());
  assert.equal(response.status, 404);
});
