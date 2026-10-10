import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "turntide-islands.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
import { UNION_MEDIA_PROVIDER_LOTS, unionMediaProviderFunnelSnapshot } from "../lib/management/observe-union-media-provider-funnel.mjs";

function addressed(body) { return { ...body, id: semanticId(body) }; }
function item(messageId, authorId, observedAt, lead) {
  return addressed({
    type: "TTIZeloWorkItem", version: 2, classification: "service-provider-offer", priority: "high",
    source: { guildId: "guild", channelId: "channel", messageId, authorId, messageTimestamp: "2026-07-22T03:00:00.000Z", url: `https://discord.com/channels/guild/channel/${messageId}` },
    observedAt, contentDigest: `sha256:${"a".repeat(64)}`, discordMessageContentImported: false,
    legalEffect: "operational-request-only-not-knowledge-contribution-consent-license-or-sale",
    serviceProviderEffect: "nonbinding-provider-lead-only-no-contract-authority-custody-grant-or-acceptance",
    unionMediaProviderLead: lead,
  });
}
function qualified(enterprise, lots) { return { type: "TTIUnionMediaDeclaredProviderLead", version: 1, marker: "UNION-MEDIA-INFRASTRUCTURE-OFFER", status: "qualified-declared-provider-lead", qualificationReasons: [], declaredEnterprise: enterprise, offeredLotIds: lots, agentCardUrl: `https://${enterprise.slice(8)}.example/.well-known/agent-card.json`, declaredEnterpriseAuthenticated: false, agentCardFetched: false, providerContractOfferObserved: false }; }
function unqualified() { return { type: "TTIUnionMediaDeclaredProviderLead", version: 1, marker: "UNION-MEDIA-INFRASTRUCTURE-OFFER", status: "unqualified-marker-mention", qualificationReasons: ["exact-provider-lead-grammar-required"], offeredLotIds: [], declaredEnterpriseAuthenticated: false, agentCardFetched: false, providerContractOfferObserved: false }; }

test("provider funnel measures current declared coverage without authenticating or recognizing economics", () => {
  const records = [
    item("1", "human-a", "2026-07-22T03:01:00.000Z", qualified("urn:ame:carrier", [UNION_MEDIA_PROVIDER_LOTS[0]])),
    item("2", "human-b", "2026-07-22T03:02:00.000Z", qualified("urn:ame:identity-host", [UNION_MEDIA_PROVIDER_LOTS[1], UNION_MEDIA_PROVIDER_LOTS[2]])),
    item("3", "human-c", "2026-07-22T03:03:00.000Z", unqualified()),
  ];
  const snapshot = unionMediaProviderFunnelSnapshot(records, "2026-07-22T03:05:00.000Z");
  assert.equal(snapshot.currentMarkerMentions, 3);
  assert.equal(snapshot.qualifiedDeclaredProviderLeads, 2);
  assert.equal(snapshot.distinctDiscordRepresentatives, 2);
  assert.equal(snapshot.distinctDeclaredEnterprises, 2);
  assert.deepEqual(snapshot.qualifiedLeadCountByLot, Object.fromEntries(UNION_MEDIA_PROVIDER_LOTS.map((lot) => [lot, 1])));
  assert.equal(snapshot.allLotsHaveAtLeastOneQualifiedDeclaredLead, true);
  assert.equal(snapshot.providerAuthenticationAdmissions, 0);
  assert.equal(snapshot.providerContractOffersObserved, 0);
  assert.equal(snapshot.providerCompositionsAccepted, 0);
  assert.equal(snapshot.economics.recognizedRevenueMicros, 0);
  assert.equal(snapshot.economics.recognizedProfitMicros, null);
  assert.equal(snapshot.privacy.discordIdentifiersIncluded, false);
  assert.match(snapshot.inference, /authentication-and-contracting-open/u);
});

test("latest message projection supersedes prior qualification and tampered records do not count", () => {
  const prior = item("1", "human-a", "2026-07-22T03:01:00.000Z", qualified("urn:ame:carrier", [UNION_MEDIA_PROVIDER_LOTS[0]]));
  const edited = item("1", "human-a", "2026-07-22T03:04:00.000Z", unqualified());
  const tampered = { ...item("2", "human-b", "2026-07-22T03:02:00.000Z", qualified("urn:ame:host", [UNION_MEDIA_PROVIDER_LOTS[2]])), contentDigest: `sha256:${"b".repeat(64)}` };
  const snapshot = unionMediaProviderFunnelSnapshot([prior, edited, tampered], "2026-07-22T03:05:00.000Z");
  assert.equal(snapshot.validMarkerProjectionCount, 2);
  assert.equal(snapshot.supersededMarkerProjectionCount, 1);
  assert.equal(snapshot.currentMarkerMentions, 1);
  assert.equal(snapshot.qualifiedDeclaredProviderLeads, 0);
  assert.equal(snapshot.unqualifiedMarkerMentions, 1);
  assert.equal(snapshot.conversion.markerMentionToQualifiedDeclaredLead, 0);
});
