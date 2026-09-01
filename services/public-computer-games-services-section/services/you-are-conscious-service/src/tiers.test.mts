import { test } from "node:test";
import assert from "node:assert/strict";
import { TIER_IDS } from "./state.mts";
import { TIER_DEFINITIONS, canUnlockTier, insightCost, priorTiersUnlocked, tierDefinition } from "./tiers.mts";

test("there are exactly ten tiers, ids 1..10, each with a definition", () => {
  assert.equal(TIER_IDS.length, 10);
  for (const id of TIER_IDS) {
    const def = tierDefinition(id);
    assert.equal(def.id, id);
    assert.ok(def.mechanic.length > 0);
    assert.ok(def.concept.length > 0);
  }
});

test("tierDefinition throws for an id outside the ladder", () => {
  assert.throws(() => tierDefinition(11 as never), RangeError);
});

test("insightCost is strictly increasing and disclosed designed-flavor, per tier", () => {
  let prev = 0;
  for (const id of TIER_IDS) {
    const cost = insightCost(id);
    assert.equal(cost.provenance, "designed-flavor");
    assert.ok(cost.value > prev, `insightCost(${id}) = ${cost.value} must exceed the previous tier's cost ${prev}`);
    prev = cost.value;
  }
});

test("insightCost matches the stated doubling formula 2^(tier-1) exactly", () => {
  for (const id of TIER_IDS) {
    assert.equal(insightCost(id).value, 2 ** (id - 1));
  }
});

test("priorTiersUnlocked: tier 1 is always considered unlocked (the starting state)", () => {
  assert.equal(priorTiersUnlocked([], 1), true);
});

test("priorTiersUnlocked: tier n+1 requires exactly tier n, not any earlier tier alone", () => {
  assert.equal(priorTiersUnlocked([1], 2), true);
  assert.equal(priorTiersUnlocked([1], 3), false, "tier 3 requires tier 2 unlocked, not just tier 1");
  assert.equal(priorTiersUnlocked([1, 2], 3), true);
});

test("canUnlockTier refuses a tier that's already unlocked", () => {
  const check = canUnlockTier([1, 2], 999, true, 2);
  assert.equal(check.ok, false);
  assert.equal(check.reason, "tier-already-unlocked");
});

test("canUnlockTier refuses when the prior tier is locked, even with enough insight and a valid crossing", () => {
  const check = canUnlockTier([1], 999, true, 3); // tier 2 not yet unlocked
  assert.equal(check.ok, false);
  assert.equal(check.reason, "prior-tier-locked");
});

test("canUnlockTier refuses on insufficient insight alone", () => {
  const check = canUnlockTier([1], 0, true, 2);
  assert.equal(check.ok, false);
  assert.equal(check.reason, "insufficient-insight");
});

test("canUnlockTier refuses when the crossing hasn't been answered, even with enough insight — money alone never opens a tier", () => {
  const check = canUnlockTier([1], 999, false, 2);
  assert.equal(check.ok, false);
  assert.equal(check.reason, "crossing-not-answered");
});

test("canUnlockTier succeeds only when all three conditions hold at once", () => {
  const check = canUnlockTier([1], insightCost(2).value, true, 2);
  assert.equal(check.ok, true);
});

test("every TIER_DEFINITIONS capability is unique except tier 1's 'baseline' — no two real cognitive capabilities are duplicated across tiers", () => {
  const real = TIER_DEFINITIONS.filter((t) => t.capability !== "baseline").map((t) => t.capability);
  assert.equal(new Set(real).size, real.length);
});
