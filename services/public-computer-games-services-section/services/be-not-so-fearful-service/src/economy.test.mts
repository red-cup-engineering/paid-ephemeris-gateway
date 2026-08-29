// economy.test — the ledgered honesty itself, as assertions: unbanked loot dies with you; banked
// loot survives; a run can only end once; extraction with nothing carried is a legal (if pointless)
// zero-score extraction, not an error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialEconomy, pickUp, extract, die, voidRun, tickCap, scoreOf, valueOf, LOOT_VALUE } from "./economy.mts";
import type { LootItem } from "./economy.mts";

const common: LootItem = { id: "c1", rarity: "common", tier: 1 };
const rare: LootItem = { id: "r1", rarity: "rare", tier: 1 };
const valuable: LootItem = { id: "v1", rarity: "valuable", tier: 3, wardedBy: "toll" };

test("economy: pricing is ordered common < rare < valuable, and scoreOf sums only banked items", () => {
  assert.ok(LOOT_VALUE.common < LOOT_VALUE.rare && LOOT_VALUE.rare < LOOT_VALUE.valuable);
  let state = initialEconomy();
  state = pickUp(state, common);
  state = pickUp(state, rare);
  assert.strictEqual(scoreOf(state), 0, "carried-but-not-banked items must not count toward score");
});

test("economy: death loses everything only carried — score is exactly zero if nothing was ever extracted", () => {
  let state = initialEconomy();
  state = pickUp(state, common);
  state = pickUp(state, rare);
  state = pickUp(state, valuable);
  const expectedTotal = valueOf(common) + valueOf(rare) + valueOf(valuable);
  state = die(state, "unwitnessed-caught-you", 2, 500);
  assert.strictEqual(scoreOf(state), 0, "everything was only carried, never banked — death loses all of it");
  assert.strictEqual(state.carrying.length, 3, "carried items are never deleted, just never promoted (THE LAW)");
  assert.strictEqual(state.ended, true);
  assert.deepStrictEqual(state.endReason, { kind: "died", cause: "unwitnessed-caught-you", tier: 2, tick: 500 });
  assert.ok(expectedTotal > 0);
});

test("economy: extraction banks exactly what was carried, and score reflects the banked total", () => {
  let state = initialEconomy();
  state = pickUp(state, common);
  state = pickUp(state, rare);
  state = extract(state, 1, 300);
  assert.strictEqual(scoreOf(state), valueOf(common) + valueOf(rare));
  assert.strictEqual(state.carrying.length, 0, "banked items move out of carrying");
  assert.strictEqual(state.banked.length, 2);
  assert.deepStrictEqual(state.endReason, { kind: "extracted", tier: 1, tick: 300 });
});

test("economy: a run can only end once — extract-after-death (or after an earlier extraction) is a no-op", () => {
  let state = initialEconomy();
  state = pickUp(state, common);
  state = die(state, "warden", 1, 100);
  const afterDeath = state;
  state = extract(state, 1, 150); // should not resurrect the run or bank anything
  assert.deepStrictEqual(state, afterDeath, "extract() after the run has already ended must be a no-op");

  let extracted = initialEconomy();
  extracted = pickUp(extracted, rare);
  extracted = extract(extracted, 2, 200);
  const afterExtract = extracted;
  extracted = die(extracted, "impossible", 2, 250);
  assert.deepStrictEqual(extracted, afterExtract, "die() after an already-extracted run must be a no-op");
});

test("economy: extraction with nothing carried is legal — a zero-score extraction, not an error", () => {
  const state = extract(initialEconomy(), 1, 60);
  assert.strictEqual(state.ended, true);
  assert.strictEqual(scoreOf(state), 0);
  assert.deepStrictEqual(state.endReason, { kind: "extracted", tier: 1, tick: 60 });
});

test("economy: picking up the same item id twice does not double-count it", () => {
  let state = initialEconomy();
  state = pickUp(state, valuable);
  state = pickUp(state, { ...valuable }); // same id, fresh object
  assert.strictEqual(state.carrying.length, 1);
});

test("economy: voidRun and tickCap are real, distinct terminal EndReason kinds", () => {
  const voided = voidRun(initialEconomy(), 42);
  assert.deepStrictEqual(voided.endReason, { kind: "voided", tick: 42 });
  const capped = tickCap(initialEconomy(), 99999);
  assert.deepStrictEqual(capped.endReason, { kind: "tick-cap", tick: 99999 });
});
