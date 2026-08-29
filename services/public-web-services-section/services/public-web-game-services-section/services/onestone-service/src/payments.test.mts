import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Order } from "./types.mts";
import { AuditLedger } from "./ledger.mts";
import { SKUS } from "./economy.mts";
import { Payments, verifyStripeSignature, hiveProvider, stripeProvider, skuById } from "./payments.mts";

test("mock provider: intent then settle clears, grants the sku, and posts a balanced ledger entry", async () => {
  const ledger = new AuditLedger();
  const sku = SKUS[0]!;
  const pay = new Payments(ledger, {}, () => Date.parse("2026-06-19T00:00:00Z"));
  const intent = await pay.intent("player-p1", sku.id);
  assert.equal(intent.provider, "mock");
  const order = pay.getOrder(intent.orderId);
  assert.ok(order, "order was minted");
  assert.equal(order!.status, "pending");
  const cleared = await pay.settle(intent.orderId);
  assert.ok(cleared, "cleared");
  assert.equal(cleared!.order.status, "cleared");
  assert.equal(cleared!.order.account, "player-p1");
  assert.equal(cleared!.sku.id, sku.id);
  const report = ledger.audit();
  assert.equal(report.balanced, true);
  assert.equal(report.entries, 1);
});

test("settling the same order twice does not double-post (idempotent ledger)", async () => {
  const ledger = new AuditLedger();
  const sku = SKUS[0]!;
  const pay = new Payments(ledger, {}, () => Date.parse("2026-06-19T00:00:00Z"));
  const intent = await pay.intent("player-p1", sku.id);
  await pay.settle(intent.orderId);
  await pay.settle(intent.orderId);
  assert.equal(ledger.all().length, 1);
});

test("intent rejects an unknown sku id", async () => {
  const pay = new Payments(new AuditLedger(), {});
  await assert.rejects(() => pay.intent("player-p1", "not-a-real-sku"));
});

test("settle on an unknown order id returns null", async () => {
  const pay = new Payments(new AuditLedger(), {});
  assert.equal(await pay.settle("ord-nope"), null);
});

test("skuById finds a real sku and misses a bogus one", () => {
  const sku = SKUS[0]!;
  assert.equal(skuById(sku.id)?.id, sku.id);
  assert.equal(skuById("not-a-real-sku"), undefined);
});

test("stripe webhook signature verification is correct and rejects a bad signature", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ type: "payment_intent.succeeded" });
  const t = "1700000000";
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${v1}`, secret), true);
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=deadbeef`, secret), false, "bad signature rejected");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${v1}`, undefined), false, "no secret → reject");
});

test("stripe provider settle: bad signature never clears, a real HMAC signature does", async () => {
  // Exercises the settle-side boundary directly (no network): createIntent is the only side
  // hitting api.stripe.com, and it is out of scope for a unit test — settle's HMAC check is not.
  const secret = "whsec_test";
  const sku = SKUS[0]!;
  const provider = stripeProvider("sk_test_x", secret);
  const order: Order = {
    id: "ord-stripe-1", account: "player-p1", skuId: sku.id, provider: "stripe",
    status: "pending", createdAt: 0, clearedAt: null, ref: "",
  };
  const payload = JSON.stringify({ type: "payment_intent.succeeded", data: { object: { metadata: { orderId: order.id } } } });

  const bad = await provider.settle(order, sku, { payload, signature: "t=1700000000,v1=deadbeef" });
  assert.equal(bad.cleared, false, "bad signature never clears");

  const t = "1700000000";
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const good = await provider.settle(order, sku, { payload, signature: `t=${t},v1=${v1}` });
  assert.equal(good.cleared, true, "a real HMAC signature clears");
});

test("real providers report unconfigured without secrets, configured with them", () => {
  assert.equal(stripeProvider(undefined, undefined).configured, false);
  assert.equal(hiveProvider(undefined).configured, false);
  assert.equal(stripeProvider("sk_test_x", "whsec").configured, true);
  assert.equal(hiveProvider("onestone.game").configured, true);
});

test("Payments.available lists mock plus the real providers", () => {
  const pay = new Payments(new AuditLedger(), {});
  const ids = pay.available().map((p) => p.id).sort();
  assert.deepEqual(ids, ["hive", "mock", "stripe"]);
  assert.equal(pay.available().find((p) => p.id === "mock")!.configured, true);
});

test("provider selection prefers a configured real provider over mock when unspecified", async () => {
  const pay = new Payments(new AuditLedger(), { hiveAccount: "onestone.game" });
  const sku = SKUS[0]!;
  const intent = await pay.intent("player-p1", sku.id);
  assert.equal(intent.provider, "hive");
});

test("provider selection falls back to mock when the requested provider is not configured", async () => {
  const pay = new Payments(new AuditLedger(), {});
  const sku = SKUS[0]!;
  const intent = await pay.intent("player-p1", sku.id, "stripe");
  assert.equal(intent.provider, "mock");
});
