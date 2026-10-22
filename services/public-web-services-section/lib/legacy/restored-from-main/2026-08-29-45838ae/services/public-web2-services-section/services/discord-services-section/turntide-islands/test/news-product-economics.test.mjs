import assert from "node:assert/strict";
import test from "node:test";
import { newsProductEconomicReading } from "../lib/management/news-product-economics.mjs";

function completedRun(overrides = {}) {
  return { status: "completed", commission: { id: "urn:commission", commercialTerms: { price: { status: "unpriced", value: null } } }, graphic: { resourceReceipt: { monetaryCost: { status: "measured", value: 0 } } }, publicationReceipt: { type: "TTIDiscordPublicationReceipt", id: "urn:receipt", status: "succeeded", atomicMultipart: true, edition: "union", messageId: "123", channelId: "456", cost: { status: "unknown", value: null, reason: "Discord API does not return monetary cost" } }, ...overrides };
}

test("does not call an unpriced publication profitable when no external revenue settled", () => {
  const reading = newsProductEconomicReading({ run: completedRun(), recordedAt: "2026-07-21T12:00:00.000Z" });
  assert.equal(reading.type, "TTINewsProductEconomicReading");
  assert.equal(reading.externalRevenueReceiptCount, 0);
  assert.equal(reading.revenueObserved, false);
  assert.equal(reading.contractedCashCostMicros, null);
  assert.equal(reading.allocationCostMicros, null);
  assert.equal(reading.directContractMarginMicros, null);
  assert.equal(reading.profitStatus, "unproven-no-external-revenue-receipt");
  assert.deepEqual(reading.unpricedResourceUses.map((item) => item.resource), ["commissioned-news-service", "notebooklm-source-and-audio", "discord-publication"]);
});

test("settled revenue remains insufficient for margin while provider costs are unpriced", () => {
  const reading = newsProductEconomicReading({ run: completedRun(), recordedAt: "2026-07-21T12:00:00.000Z", revenueReceipts: [{ revenueMicros: 2_000_000 }] });
  assert.equal(reading.revenueObserved, true);
  assert.equal(reading.revenueMicros, 2_000_000);
  assert.equal(reading.directContractMarginMicros, null);
  assert.equal(reading.profitStatus, "unproven-unpriced-costs");
});

test("refuses economic projection without a successful atomic publication", () => {
  assert.equal(newsProductEconomicReading({ run: { status: "refused" }, recordedAt: "2026-07-21T12:00:00.000Z" }).type, "TTINewsProductEconomicRefusal");
});
