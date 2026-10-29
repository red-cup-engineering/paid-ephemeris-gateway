import assert from "node:assert/strict";
import test from "node:test";
import { contributorKnowledgeMarketSnapshot } from "../lib/management/observe-contributor-knowledge-market.mjs";

test("measures the contribution funnel without projecting contributor identity or pretending it is revenue", () => {
  const sessions = [
    { type: "TTIKnowledgeOfferSession", tokenDigest: "d1", discord: { authorId: "private-a" }, expiresAt: "2026-07-22T00:00:00.000Z" },
    { type: "TTIKnowledgeOfferSession", tokenDigest: "d2", discord: { authorId: "private-b" }, expiresAt: "2026-07-21T19:00:00.000Z" },
    { type: "TTIKnowledgeOfferSessionConsumption", tokenDigest: "d1" },
  ];
  const candidates = [{ type: "TTIKnowledgeContributionCandidate", id: "candidate-1", offerSessionDigest: "d1", knowledge: "private knowledge" }];
  const snapshot = contributorKnowledgeMarketSnapshot({ sessions, candidates, admissions: [], recordedAt: "2026-07-21T20:00:00.000Z" });
  assert.equal(snapshot.counts.offerSessionsIssued, 2);
  assert.equal(snapshot.counts.distinctOfferRequestAuthors, 2);
  assert.equal(snapshot.counts.expiredUnconsumedSessions, 1);
  assert.equal(snapshot.counts.pendingAdmissionCandidates, 1);
  assert.equal(snapshot.conversion.offerSessionToCandidateBasisPoints, 5000);
  assert.equal(snapshot.economics.status, "unknown");
  assert.equal(snapshot.economics.profitMicros, null);
  assert.doesNotMatch(JSON.stringify(snapshot), /private-a|private-b|private knowledge/u);
  assert.equal(snapshot.inference, "direct-candidates-observed-pending-admission-not-revenue");
});

test("an explicitly configured empty sale ledger measures zero sales without inferring future margin", () => {
  const snapshot = contributorKnowledgeMarketSnapshot({ sessions: [], candidates: [], admissions: [], sales: [], recordedAt: "2026-07-21T20:00:00.000Z" });
  assert.equal(snapshot.economics.status, "measured-no-settled-sales-costs-unknown");
  assert.equal(snapshot.economics.settledSaleReceiptCount, 0);
  assert.equal(snapshot.economics.profitMicros, null);
  assert.equal(snapshot.counts.offerSessionsIssued, 0);
});

test("excludes synthetic sale receipts from live sale and economic counts", () => {
  const sales = [{ type: "TTIKnowledgeSaleReceipt", status: "settled", simulation: true }];
  const snapshot = contributorKnowledgeMarketSnapshot({ sessions: [], candidates: [], admissions: [], sales, recordedAt: "2026-07-21T20:00:00.000Z" });
  assert.equal(snapshot.economics.settledSaleReceiptCount, 0);
  assert.equal(snapshot.integrity.syntheticSaleReceiptsExcluded, 1);
  assert.equal(snapshot.economics.profitMicros, null);
});

test("measures the locality buyer funnel and settled product margin without projecting buyer identity or calling margin profit", () => {
  const buyerQueries = [
    { type: "TTILocalityKnowledgeBuyerQuery", id: "q1", buyerSettlement: "urn:ame:private-buyer", budget: { currency: "USD", maximumMicros: 10_000_000 }, simulation: false },
    { type: "TTILocalityKnowledgeBuyerQuery", id: "q2", buyerSettlement: "urn:ame:private-buyer", budget: { currency: "USD", maximumMicros: 12_000_000 }, simulation: false },
    { type: "TTILocalityKnowledgeBuyerQuery", id: "synthetic-q", buyerSettlement: "urn:ame:synthetic-buyer", budget: { currency: "USD", maximumMicros: 10_000_000 }, simulation: true },
  ];
  const matches = [{ type: "TTILocalityKnowledgeMatchReceipt", id: "m1", simulation: false }];
  const offers = [{ type: "TTILocalityKnowledgeProductOffer", id: "o1", simulation: false }, { type: "TTILocalityKnowledgeProductOffer", id: "synthetic-o", simulation: true }];
  const sales = [{ type: "TTIKnowledgeSaleReceipt", id: "s1", status: "settled", simulation: false }];
  const fulfillments = [{ type: "TTILocalityKnowledgeFulfillmentPackage", id: "f1", simulation: false }];
  const allocations = [{ type: "TTIKnowledgeCreditAllocation", id: "a1", simulation: false, grossRevenueMicros: 10_000_000, receiptedDirectCostsMicros: 2_000_000, contributorPoolMicros: 4_000_000, retainedTTIMarginMicros: 4_000_000 }, { type: "TTIKnowledgeCreditAllocation", id: "synthetic-a", simulation: true }];
  const snapshot = contributorKnowledgeMarketSnapshot({ sessions: [], candidates: [], admissions: [], buyerQueries, matches, offers, sales, fulfillments, allocations, recordedAt: "2026-07-21T20:00:00.000Z" });
  assert.equal(snapshot.counts.admittedBuyerQueries, 2);
  assert.equal(snapshot.counts.fixedPriceQualifiedBuyerQueries, 2);
  assert.equal(snapshot.counts.distinctBuyerSettlements, 1);
  assert.equal(snapshot.counts.repeatBuyerSettlements, 1);
  assert.equal(snapshot.conversion.buyerQueryToOfferBasisPoints, 5000);
  assert.equal(snapshot.conversion.offerToSettledSaleBasisPoints, 10_000);
  assert.equal(snapshot.conversion.settledSaleToPreparedFulfillmentBasisPoints, 10_000);
  assert.equal(snapshot.economics.externallySettledRevenueMicros, 10_000_000);
  assert.equal(snapshot.economics.retainedTTIMarginMicros, 4_000_000);
  assert.equal(snapshot.economics.profitMicros, null);
  assert.equal(snapshot.integrity.syntheticBuyerQueriesExcluded, 1);
  assert.equal(snapshot.integrity.syntheticOffersExcluded, 1);
  assert.equal(snapshot.integrity.syntheticAllocationsExcluded, 1);
  assert.equal(snapshot.inference, "settled-sale-and-prepared-fulfillment-observed-profit-still-unknown");
  assert.doesNotMatch(JSON.stringify(snapshot), /private-buyer|synthetic-buyer/u);
});
