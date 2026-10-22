import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { launchLocalityKnowledgeDiscovery, localityDiscoveryAdmission, localityDiscoveryMessage, localityDiscoverySnapshot } from "../lib/management/launch-locality-knowledge-discovery.mjs";

const product = JSON.parse(readFileSync(new URL("../content/products/locality-knowledge-answer.json", import.meta.url), "utf8"));

test("admits and renders the free-chat to vault and metered-power-user funnel", async () => {
  assert.equal(localityDiscoveryAdmission(product).type, "TTILocalityDiscoveryAdmission");
  const content = localityDiscoveryMessage(product);
  assert.match(content, /USD 10 one-answer guess is retired/u);
  assert.match(content, /free in Discord/u);
  assert.match(content, /metered MCP or A2A/u);
  assert.match(content, /\/locality-pilot/u);
  assert.match(content, /AGREE-PERMANENT-NONPERSONAL-QUERY/u);
  assert.match(content, /not terms acceptance, a purchase, a contribution, a license/u);
  const plan = await launchLocalityKnowledgeDiscovery({ product });
  assert.equal(plan.type, "TTILocalityKnowledgeDiscoveryLaunchPlan");
  assert.deepEqual(plan.reactions.sort(), ["🆓", "📚", "🔌", "🧪"].sort());
  assert.deepEqual(plan.externalEffects, []);
});

test("refuses discovery material that revives the retired price or fabricates revenue", () => {
  const changed = structuredClone(product);
  changed.offer.price.status = "live";
  changed.commercial.recognizedRevenueMicros = 10_000_000;
  const refusal = localityDiscoveryAdmission(changed);
  assert.equal(refusal.type, "TTILocalityDiscoveryRefusal");
  assert.ok(refusal.missing.includes("retired-ten-dollar-hypothesis-preserved-as-history"));
  assert.ok(refusal.missing.includes("honest-zero-revenue-and-unknown-profit"));
});

test("projects discovery reactions to aggregate interest without buyer demand, identity, or revenue", () => {
  const snapshot = localityDiscoverySnapshot({ product, offerMessageId: "message-1", recordedAt: "2026-07-22T01:00:00.000Z", usersBySignal: { "🆓": ["private-a", "private-b"], "📚": ["private-a"], "🔌": ["private-b"], "🧪": ["private-c"] } });
  assert.equal(snapshot.distinctQualifiedInterestActors, 3);
  assert.equal(snapshot.freeChatAnswerInterestActors, 2);
  assert.equal(snapshot.persistentVaultInterestActors, 1);
  assert.equal(snapshot.meteredPowerUserInterestActors, 1);
  assert.equal(snapshot.noChargeQueryPilotActors, 1);
  assert.equal(snapshot.buyerQueriesAdmitted, 0);
  assert.equal(snapshot.externalRevenueReceiptCount, 0);
  assert.equal(snapshot.profitMicros, null);
  assert.equal(snapshot.inference, "qualified-discovery-interest-observed-not-buyer-demand-or-revenue");
  assert.doesNotMatch(JSON.stringify(snapshot), /private-a|private-b|private-c/u);
});

test("live launch refuses before Discord effects when witness authority is absent", async () => {
  await assert.rejects(() => launchLocalityKnowledgeDiscovery({ product, live: true, token: "discord-token", guildId: "guild" }), /contracted witness-journal RDF provider/u);
});

test("projects explicit Discord query pilots into aggregate demand without double-counting reaction identities", () => {
  const base = { type: "TTIDiscordLocalityQueryPilotAdmission", status: "admitted", productId: product.id, experimentId: product.nextExperiment.id, privacy: { discordIdentifiersRecorded: false, messageContentImported: false }, revenueRecognized: false, measurement: { buyerQueryAdmitted: true, persistentVaultInterest: true, priceEstablished: false } };
  const snapshot = localityDiscoverySnapshot({ product, offerMessageId: "message-1", recordedAt: "2026-07-22T01:00:00.000Z", usersBySignal: { "🆓": ["private-a"], "📚": [], "🔌": [], "🧪": [] }, queryPilotAdmissions: [{ ...base, actorPseudonym: "actor-a", submissionPseudonym: "submission-a" }, { ...base, actorPseudonym: "actor-a", submissionPseudonym: "submission-b" }] });
  assert.equal(snapshot.distinctQualifiedInterestActors, 1);
  assert.equal(snapshot.admittedDiscordQueryPilotActors, 1);
  assert.equal(snapshot.noChargeQueryPilotActors, 1);
  assert.equal(snapshot.persistentVaultInterestActors, 1);
  assert.equal(snapshot.buyerQueriesAdmitted, 2);
  assert.equal(snapshot.inference, "explicit-no-charge-buyer-query-observed-no-offer-sale-or-revenue");
  assert.doesNotMatch(JSON.stringify(snapshot), /actor-a|submission-a|submission-b|private-a/u);
});
