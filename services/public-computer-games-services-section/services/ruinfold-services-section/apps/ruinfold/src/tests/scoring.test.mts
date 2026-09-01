// scoring — the exact integer formula (design §4), against the design doc's own worked example
// plus the boundary cases it calls out explicitly: no CLEAR_BONUS/SWIFT on a non-clear, RISEN's
// flat penalty, and a voided run scoring null (not zero, and never eligible for a leaderboard).

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, RUN_TICK_CAP } from "#engine/score.mts";
import { freshEntity, addEntity, freshStats } from "#engine/world.mts";
import type { World } from "#engine/world.mts";
import { asserted, unknown } from "#engine/bilattice.mts";

function mkWorld(): World {
  return { seed: 1, floorCount: 6, zones: new Map(), entities: new Map(), order: [], tick: 0, bossId: "", relicItemId: null, hazard: null, stats: freshStats() };
}

function mkPlayer(world: World, id = "hero") {
  const p = freshEntity(id, "player", id);
  p.alive = asserted();
  p.human = unknown();
  addEntity(world, p);
  return p;
}

function carry(world: World, player: ReturnType<typeof mkPlayer>, id: string, archetypeId: string) {
  const item = freshEntity(id, "item", id);
  item.archetypeId = archetypeId;
  item.carriedBy = player.id;
  addEntity(world, item);
  player.inventory.push(id);
}

// The design doc's own worked example (§4): floor 3 of 6, killed there (no clear); 2 skeletons
// (12 xp each), 1 goblin (8 xp), 1 wraith (18 xp); an iron blade (30) + leather jerkin (25) held,
// 47 gold; lycanthrope triggered once; 2 of 3 floors on this attempt cleared flawlessly.
test("worked example: floor 3/6, not cleared, 4 kills, 2 items + gold, lycanthrope, 2 flawless floors -> 607", () => {
  const world = mkWorld();
  const player = mkPlayer(world);
  player.gold = 47;
  player.human = { pos: true, neg: true }; // ⊤ — lycanthrope, triggered
  world.stats.maxFloorReached = 3;
  world.stats.killXp = 12 + 12 + 8 + 18;
  world.stats.floorsFlawless = 2;
  carry(world, player, "iron-blade-1", "iron-blade");
  carry(world, player, "leather-jerkin-1", "leather-jerkin");

  const score = computeScore(world, player, 1234, "mortal-death");
  assert.equal(score, 607);
});

test("CLEAR_BONUS and SWIFT only apply when endedAt.reason is 'cleared'", () => {
  const world = mkWorld();
  const player = mkPlayer(world);
  world.stats.maxFloorReached = 6;

  const notCleared = computeScore(world, player, 100, "tick-cap");
  const cleared = computeScore(world, player, 100, "cleared");
  assert.equal(notCleared, 100 * 6); // no +500, no SWIFT
  assert.equal(cleared, 100 * 6 + 500 + Math.floor((200 * (RUN_TICK_CAP - 100)) / RUN_TICK_CAP));
});

test("RISEN locks in a flat -150 style penalty, permanently", () => {
  const world = mkWorld();
  const player = mkPlayer(world);
  player.relicSpent = true;
  world.stats.maxFloorReached = 3;

  const score = computeScore(world, player, 500, "mortal-death");
  assert.equal(score, 100 * 3 - 150); // depthScore 300, styleScore -150 -> 150, well clear of the max(0,...) floor
});

test("total score is floored at zero, never negative", () => {
  const world = mkWorld();
  const player = mkPlayer(world);
  player.relicSpent = true; // -150
  world.stats.maxFloorReached = 0; // depthScore 0

  const score = computeScore(world, player, 500, "mortal-death");
  assert.equal(score, 0);
});

test("a voided run scores null, not zero, and is structurally never a leaderboard row", () => {
  const world = mkWorld();
  const player = mkPlayer(world);
  world.stats.maxFloorReached = 5;
  world.stats.killXp = 999;

  const score = computeScore(world, player, 100, "voided");
  assert.equal(score, null);
});
