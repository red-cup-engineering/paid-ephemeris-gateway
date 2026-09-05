// score.test.mts — proves the exact formula from spec §2.5: every clear outranks every non-clear
// (VICTORY_BASE), speed is the dominant axis among clears, and a tick-cap run scores from landed
// wounds tie-broken down by grasp-time (hurt).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, totalWoundsLanded, DAILY_TICK_CAP, VICTORY_BASE } from "./score.mjs";

test("cleared always outranks tick-cap, even a slow clear against a maximal tick-cap wound score", () => {
  const slowClear = computeScore({ reason: "cleared", endTick: DAILY_TICK_CAP - 1, hurt: 500, demonReports: [] });
  const maxTickCap = computeScore({ reason: "tick-cap", endTick: DAILY_TICK_CAP, hurt: 0, demonReports: [{ wounds: 20 }, { wounds: 20 }] });
  assert.ok(slowClear >= VICTORY_BASE);
  assert.ok(slowClear > maxTickCap);
});

test("cleared: a faster clear (lower endTick) scores strictly higher than a slower one, all else equal", () => {
  const fast = computeScore({ reason: "cleared", endTick: 100, hurt: 0, demonReports: [] });
  const slow = computeScore({ reason: "cleared", endTick: 2500, hurt: 0, demonReports: [] });
  assert.ok(fast > slow);
});

test("cleared: less grasp-time (lower hurt) scores strictly higher than more, all else equal", () => {
  const clean = computeScore({ reason: "cleared", endTick: 1000, hurt: 0, demonReports: [] });
  const grasped = computeScore({ reason: "cleared", endTick: 1000, hurt: 300, demonReports: [] });
  assert.ok(clean > grasped);
});

test("cleared at endTick=0 scores VICTORY_BASE + full SWIFT_MAX + full SURVIVAL_MAX", () => {
  const s = computeScore({ reason: "cleared", endTick: 0, hurt: 0, demonReports: [] });
  assert.equal(s, VICTORY_BASE + 2000 + 500);
});

test("tick-cap: more landed wounds scores strictly higher, all else equal", () => {
  const few = computeScore({ reason: "tick-cap", endTick: DAILY_TICK_CAP, hurt: 0, demonReports: [{ wounds: 1 }] });
  const many = computeScore({ reason: "tick-cap", endTick: DAILY_TICK_CAP, hurt: 0, demonReports: [{ wounds: 8 }] });
  assert.ok(many > few);
});

test("tick-cap: never negative, even with hurt exceeding the wound value", () => {
  const s = computeScore({ reason: "tick-cap", endTick: DAILY_TICK_CAP, hurt: 9999, demonReports: [{ wounds: 1 }] });
  assert.equal(s, 0);
});

test("tick-cap score is always far below VICTORY_BASE (a non-clear can never outrank any clear)", () => {
  const s = computeScore({ reason: "tick-cap", endTick: 0, hurt: 0, demonReports: [{ wounds: 5 }, { wounds: 5 }, { wounds: 5 }, { wounds: 5 }] });
  assert.ok(s < VICTORY_BASE);
});

test("totalWoundsLanded sums the demonReports.wounds field, treating a missing field as 0", () => {
  assert.equal(totalWoundsLanded([{ wounds: 3 }, { wounds: 2 }, {}]), 5);
  assert.equal(totalWoundsLanded([]), 0);
});
