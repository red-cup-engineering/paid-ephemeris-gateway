import assert from "node:assert/strict";
import test from "node:test";
import { completedHourlyWindow, contractDeterministicGraphic, nextIncompleteHourlyWindow, publicationKey, publishedEditions } from "../lib/management/advance-hourly-news.mjs";

test("binds both editions to the same completed UTC hour", () => {
  const window = completedHourlyWindow(new Date("2026-07-21T17:37:12.000Z"));
  assert.deepEqual(window, { fromExclusive: "2026-07-21T16:00:00.000Z", toInclusive: "2026-07-21T17:00:00.000Z", baseline: false });
  assert.notEqual(publicationKey("union", window), publicationKey("colonial", window));
});

test("prevents a successful edition from being republished independently", () => {
  const window = completedHourlyWindow(new Date("2026-07-21T17:37:12.000Z"));
  const rows = [{ type: "TTINewsPublicationReceipt", status: "succeeded", edition: "union", window }, { type: "TTINewsPublicationReceipt", status: "refused", edition: "colonial", window }];
  assert.deepEqual([...publishedEditions(rows, window)], ["union"]);
});

test("retries the earliest incomplete deployment-anchored hour after downtime", () => {
  const first = "2026-07-21T17:00:00.000Z"; const firstWindow = { fromExclusive: "2026-07-21T16:00:00.000Z", toInclusive: first, baseline: false };
  const records = ["union", "colonial"].map((edition) => ({ type: "TTINewsPublicationReceipt", status: "succeeded", edition, window: firstWindow }));
  const selected = nextIncompleteHourlyWindow({ at: new Date("2026-07-21T20:12:00.000Z"), records, firstWindowToInclusive: first });
  assert.deepEqual(selected, { fromExclusive: "2026-07-21T17:00:00.000Z", toInclusive: "2026-07-21T18:00:00.000Z", baseline: false });
});

test("does not backfill hours before the admitted deployment boundary", () => {
  assert.equal(nextIncompleteHourlyWindow({ at: new Date("2026-07-21T16:59:00.000Z"), records: [], firstWindowToInclusive: "2026-07-21T17:00:00.000Z" }), null);
});

test("buys the PNG through the deterministic provider's public A2A client face", async () => {
  const packet = { type: "HarmoniousUnionDeltaPacket", period: "2026-07-21T17:00:00.000Z", subscriptionDigest: "sha256:subscription", previousSuccessfulPublicationDigest: null, currentManifestDigest: "sha256:current", reportingWindow: { fromExclusive: "2026-07-21T16:00:00.000Z", toInclusive: "2026-07-21T17:00:00.000Z", baseline: false }, claims: [{ settlement: "urn:ame:turntide-islands", claimId: "civic/news", classification: "added" }], metrics: [], coverage: { admitted: 1, accepted: 1, refused: 0, unknownUnreported: 0 }, presentation: { graphicTitle: "TURNTIDE ISLANDS COLONIAL NEWS", graphicDescription: "Current TTI civic measurements." } };
  let received;
  const artifact = await contractDeterministicGraphic(packet, "2026-07-21T17:30:00.000Z", { render: async (request) => { received = request; return { type: "DeterministicReportGraphicArtifact", contract: "ni:///sha-256;ITq5Cj56QcUA3JDqhWhf7K_eRfFNfksTwSKwNksn9b8", resourceReceipt: { monetaryCost: { currency: "USD", value: 0 } }, renderingProvider: "urn:ame:deterministic-report-graphic-service", renderingReceipt: { inputNi: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", outputNi: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" } }; } });
  assert.deepEqual(received, packet);
  assert.equal(artifact.type, "DeterministicReportGraphicArtifact");
  assert.equal(artifact.resourceReceipt.monetaryCost.value, 0);
  assert.equal(artifact.contract.startsWith("ni:///sha-256;"), true);
});
