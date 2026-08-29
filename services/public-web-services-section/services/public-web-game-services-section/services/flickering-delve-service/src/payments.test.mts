import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { AuditLedger } from "./ledger.mts";
import { Payments, SKUS, verifyStripeSignature, hiveProvider, stripeProvider } from "./payments.mts";

test("mock provider: intent then settle clears, grants a bounded boost, and posts to the ledger", async () => {
  const ledger = new AuditLedger();
  const pay = new Payments(ledger, {}, () => "2026-06-19");
  const intent = await pay.intent("player-p1", "kindling");
  assert.equal(intent.provider, "mock");
  const grant = await pay.settle(intent.orderId);
  assert.ok(grant, "cleared");
  assert.equal(grant!.kind, "rate");
  assert.equal(grant!.actor, "player-p1");
  assert.ok(grant!.durationSeconds > 0);
  const report = ledger.audit();
  assert.equal(report.balanced, true);
  assert.equal(report.entries, 1);
});

test("settling the same order twice does not double-post (idempotent ledger)", async () => {
  const ledger = new AuditLedger();
  const pay = new Payments(ledger, {}, () => "2026-06-19");
  const intent = await pay.intent("player-p1", "bonfire");
  await pay.settle(intent.orderId);
  await pay.settle(intent.orderId);
  assert.equal(ledger.all().length, 1);
});

test("the store offers only bounded, time-limited boosts (no flat power)", () => {
  for (const s of SKUS) {
    assert.ok(["rate", "offline"].includes(s.boost.kind), s.id);
    assert.ok(s.boost.durationSeconds > 0, `${s.id} is time-limited`);
  }
});

test("stripe webhook signature verification is correct and constant-time-shaped", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ type: "payment_intent.succeeded" });
  const t = "1700000000";
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${v1}`, secret), true);
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=deadbeef`, secret), false);
  assert.equal(verifyStripeSignature(payload, `t=${t},v1=${v1}`, undefined), false, "no secret → reject");
});

test("real providers report unconfigured without secrets", () => {
  assert.equal(stripeProvider(undefined, undefined).configured, false);
  assert.equal(hiveProvider(undefined).configured, false);
  assert.equal(stripeProvider("sk_test_x", "whsec").configured, true);
  assert.equal(hiveProvider("flickering.gnaw").configured, true);
});

test("Payments.available lists mock plus the real providers", () => {
  const pay = new Payments(new AuditLedger(), {});
  const ids = pay.available().map((p) => p.id).sort();
  assert.deepEqual(ids, ["hive", "mock", "stripe"]);
  assert.equal(pay.available().find((p) => p.id === "mock")!.configured, true);
});
