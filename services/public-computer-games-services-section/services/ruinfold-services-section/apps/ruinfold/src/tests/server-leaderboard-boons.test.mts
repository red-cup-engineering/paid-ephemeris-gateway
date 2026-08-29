// server-leaderboard-boons — ruinfold's OWN remaining weekly aggregation/boon-selection logic
// (server/leaderboard.mts's weeklyTotals, server/boons.mts, server/reward-hook.mts). No file I/O,
// no clock, all fixture-driven. rankLeaderboard's own ranking/tiebreak correctness moved to
// @red-cup-engineering/footing/leaderboard and is tested there now.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScoreLike } from "@red-cup-engineering/footing/leaderboard";
import { weeklyTotals } from "#server/leaderboard.mts";
import { computeWeekBoons } from "#server/boons.mts";
import { buildDailyAccrual } from "#server/reward-hook.mts";

function entry(over: Partial<ScoreLike> & { runId: string }): ScoreLike {
  return { actor: "someone", score: 0, endedAtTick: 0, submittedAt: "2026-08-19T00:00:00.000Z", ...over };
}

test("weeklyTotals sums an actor's scores across the week's dates, treating a missed day as 0", () => {
  const byDate = new Map<string, ScoreLike[]>([
    ["2026-08-17", [entry({ runId: "r1", actor: "alice", score: 100 })]],
    ["2026-08-18", [entry({ runId: "r2", actor: "alice", score: 200 }), entry({ runId: "r3", actor: "bob", score: 50 })]],
    // 2026-08-19 missing entirely for both actors -> contributes 0, not a penalty
  ]);
  const weekDates = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"];
  const totals = weeklyTotals(byDate, weekDates);
  assert.equal(totals.get("alice"), 300);
  assert.equal(totals.get("bob"), 50);
  assert.equal(totals.has("nobody-played"), false);
});

test("computeWeekBoons awards exactly the design's top-3 table, in rank order", () => {
  const totals = new Map([
    ["alice", 1000],
    ["bob", 800],
    ["cleo", 500],
    ["dee", 100], // 4th place — no boon
  ]);
  const awards = computeWeekBoons(totals);
  assert.equal(awards.length, 3);
  assert.deepEqual(awards[0], { actor: "alice", weeklyScore: 1000, rank: 1, boonName: "Ashfall Coronet", edge: { armor: 1 } });
  assert.deepEqual(awards[1], { actor: "bob", weeklyScore: 800, rank: 2, boonName: "Cinderveil Cloak", edge: { maxHealth: 5 } });
  assert.deepEqual(awards[2], { actor: "cleo", weeklyScore: 500, rank: 3, boonName: "Rootbound Charm", edge: { attackPower: 1 } });
});

test("computeWeekBoons never awards a boon for a weeklyScore of 0, even with fewer than 3 players", () => {
  const totals = new Map([
    ["alice", 40],
    ["bob", 0],
  ]);
  const awards = computeWeekBoons(totals);
  assert.equal(awards.length, 1);
  assert.equal(awards[0]?.actor, "alice");
});

test("buildDailyAccrual: a real winner produces a would-pay intent with the exact rails-doc posting shape", () => {
  const entryOut = buildDailyAccrual("2026-08-19", "wanderer-w1vxpa");
  assert.equal(entryOut.wouldPay, true);
  assert.equal(entryOut.ref, "accrue-ruinfold-20260819");
  assert.equal(entryOut.actor, "wanderer-w1vxpa");
  assert.deepEqual(entryOut.postings, [
    { account: "income:ads", amount: entryOut.amountUsd, commodity: "USD" },
    { account: "liabilities:rewards:wanderer-w1vxpa", amount: -entryOut.amountUsd, commodity: "USD" },
  ]);
  // every posting in the entry balances to zero, same invariant AuditLedger.record() enforces
  const sum = entryOut.postings.reduce((s, p) => s + p.amount, 0);
  assert.ok(Math.abs(sum) < 1e-9);
});

test("buildDailyAccrual: no winner (zero eligible submissions) pays out nothing, distinctly from a zero amount", () => {
  const entryOut = buildDailyAccrual("2026-08-20", null);
  assert.equal(entryOut.wouldPay, false);
  assert.equal(entryOut.actor, null);
  assert.equal(entryOut.postings.length, 0);
  assert.equal(entryOut.reason, "no-eligible-scored-submissions");
});
