import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { knowledgeVaultMarketSnapshot } from "../lib/management/observe-knowledge-vault-market.mjs";
import { observerBlock, spliceObserver } from "../lib/management/install-knowledge-vault-market-observer.mjs";

const product = JSON.parse(readFileSync(new URL("../content/products/founding-knowledge-vault.json", import.meta.url), "utf8"));

test("distinguishes qualified interest from entitlement and revenue", () => {
  const snapshot = knowledgeVaultMarketSnapshot({ product, offerMessage: { id: "offer-1" }, recordedAt: "2026-07-21T19:00:00.000Z", usersBySignal: { "💸": ["reaction-a", "reaction-b"], "🧠": ["reaction-a"], "🔎": ["reaction-b"], "🧾": [] }, checkoutIntents: [{ type: "TTIVaultCheckoutIntent", status: "qualified-no-charge", productId: product.id, discordUserId: "checkout-c" }] });
  assert.equal(snapshot.qualifiedInterestActors, 3);
  assert.equal(snapshot.signalCounts["would-start-at-five-usd-per-month"], 2);
  assert.equal(snapshot.qualifiedCheckoutIntentCount, 1);
  assert.equal(snapshot.distinctQualifiedCheckoutIntentActors, 1);
  assert.equal(snapshot.settledEntitlements, 0);
  assert.equal(snapshot.externalRevenueReceiptCount, 0);
  assert.equal(snapshot.inference, "observed-qualified-checkout-intent-not-revenue");
  assert.equal(snapshot.identityProjection, "aggregate-only-no-discord-user-identifiers");
  assert.doesNotMatch(JSON.stringify(snapshot), /reaction-a|reaction-b|checkout-c/u);
});

test("installs one locked hourly observer without disturbing other recurrence", () => {
  const existing = "0 0 * * * unrelated\n"; const once = spliceObserver(existing, { ttiRoot: "/srv/tti", nodePath: "/usr/bin/node" }); const twice = spliceObserver(once, { ttiRoot: "/srv/tti", nodePath: "/usr/bin/node" });
  assert.equal(once, twice); assert.match(once, /0 0 \* \* \* unrelated/u); assert.match(observerBlock({ ttiRoot: "/srv/tti", nodePath: "/usr/bin/node" }), /17 \* \* \* \*.*flock/u);
});
