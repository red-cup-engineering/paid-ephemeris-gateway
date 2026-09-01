import assert from "node:assert/strict";
import test from "node:test";

import { observeOpportunityFeed, OPPORTUNITY_FEED_CATEGORY } from "../src/opportunity-feed.mjs";

const observedAt = "2026-09-01T18:00:00.000Z";

function globalArbitrage() {
  return { schema: "aagaard.global-arbitrage-scan.v1", observedAt, status: "certified",
    certifyingProviders: ["provider-a", "provider-b"], providerKnowledge: { value: "true", unavailable: [{ provider: "provider-c", problem: "timeout" }] },
    opportunities: [
      { symbol: "DEC", pool: "SWAP.HIVE:DEC", policyAdmitted: true, policyRefusal: null,
        exact: { admitted: true, quote: { worstCaseProfitSwapHive: "0.01200000" } } },
      { symbol: "SPS", pool: "SWAP.HIVE:SPS", policyAdmitted: false, policyRefusal: "worst-case edge below policy",
        exact: { admitted: true, quote: { worstCaseProfitSwapHive: "0.00010000" } } },
    ], refusal: null, credentialAccess: false, chainMutation: false, executionAdmissible: false };
}

function poolCycle() {
  return { kind: "aagaard.exact-pool-cycle-opportunity", observedAt, route: ["DEC", "BEE", "VOUCHER", "DEC"],
    decision: "refuse", refusal: "0.200 DEC lacks certified exit value", assay: { status: "uncertified",
      providerKnowledge: { value: "neither", unavailable: [{ provider: "pool-provider-c", problem: "503" }] } },
    credentialAccess: false, chainMutation: false, executionAdmissible: false };
}

function games() {
  const ranked = [
    { game: "dcity", action: "recover-closed-sim", benefitClass: "treasury-protection", admittedNow: false,
      refusal: "resource-credit-state-uncertified", rcDecision: "uncertified", evidence: "true", evidenceSummary: "two providers expose 91.000 SIM" },
    { game: "terracore", action: "claim-raid-exposed-scrap", benefitClass: "treasury-protection", admittedNow: true,
      refusal: null, rcDecision: "ready", evidence: "true", evidenceSummary: "official game state exposes 6.25000000 raid-exposed SCRAP" },
    { game: "holozing-rewards", action: "claim-pending-zing", benefitClass: "productive-state", admittedNow: true,
      refusal: null, rcDecision: "not-required", evidence: "true", evidenceSummary: "pending ZING is claimable" },
  ];
  return { schema: "aagaard.game-opportunity-plan.v1", observedAt, ranked,
    observations: {
      dcity: { before: { simBalance: "91.000" }, plan: { kind: "ready", quote: { minimumSwapHive: "0.04000000" } } },
      holozingRewards: { plan: { kind: "ready", minimumClaimZing: "2.500" } },
      terracore: { plan: { kind: "claim", amount: "6.25000000" } },
      unavailable: [{ game: "splinterlands", error: "maintenance" }],
    }, credentialAccess: false, chainMutation: false };
}

test("unifies exact read-only opportunities while retaining incomparable classes and all gates", async () => {
  let recorded;
  const writer = async (input) => { recorded = input; return { id: "journal-record" }; };
  const { feed, journal } = await observeOpportunityFeed({ now: () => observedAt,
    providers: { globalArbitrage, poolCycle, games }, writer, env: {} });
  assert.equal(journal.id, "journal-record");
  assert.equal(recorded.category, OPPORTUNITY_FEED_CATEGORY);
  assert.strictEqual(recorded.record, feed);
  assert.deepEqual(feed.authority, { credentialAccess: false, chainMutation: false, signing: false, broadcasting: false, execution: false });
  assert.equal(feed.ordering.noScalarization, true);
  const arb = feed.candidates.find((candidate) => candidate.source === "global-arbitrage-scan");
  assert.equal(arb.worstCaseProfitSwapHive, "0.01200000");
  assert.equal(arb.resourceCost.status, "unpriced-resource-cost-model");
  assert.deepEqual(arb.providers, ["provider-a", "provider-b"]);
  assert.equal(feed.refusals.some((item) => item.source === "exact-pool-cycle-assay"), true);
  assert.equal(feed.refusals.some((item) => item.identity === "SWAP.HIVE:SPS"), true);
  assert.equal(feed.unknowns.some((item) => item.provider === "provider-c"), true);
  assert.equal(feed.unknowns.some((item) => item.provider === "pool-provider-c"), true);
  assert.equal(feed.unknowns.some((item) => item.provider === "splinterlands"), true);
  assert.equal(feed.unknowns.some((item) => item.provider === "terracore-exit"), true);
  assert.equal(feed.candidates.find((item) => item.identity === "dcity:recover-closed-sim").plan.quote.minimumSwapHive, "0.04000000");
  assert.equal(feed.candidates.find((item) => item.identity === "holozing-rewards:claim-pending-zing").plan.minimumClaimZing, "2.500");
  assert.equal(feed.candidates.find((item) => item.identity === "terracore:claim-raid-exposed-scrap").plan.amount, "6.25000000");
});

test("turns thrown and over-authorized providers into visible unknowns without losing the feed", async () => {
  const { feed } = await observeOpportunityFeed({ now: () => observedAt, writer: async () => ({ id: "recorded" }), env: {}, providers: {
    globalArbitrage: async () => { throw new Error("offline"); },
    poolCycle: async () => ({ credentialAccess: true, chainMutation: false }),
    games,
  } });
  assert.equal(feed.unknowns.some((item) => item.source === "global-arbitrage-scan" && item.problem === "offline"), true);
  assert.equal(feed.unknowns.some((item) => item.source === "exact-pool-cycle-assay" && /did not prove/.test(item.problem)), true);
  assert.equal(feed.candidates.some((item) => item.identity === "terracore:claim-raid-exposed-scrap"), true);
});
