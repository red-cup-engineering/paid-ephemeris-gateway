// death-routes — the five-way bilattice table (design §3.3), each route reached and checked
// directly: three fire on the PLAYER's own ending (mortal / undead-relic / construct-hazard,
// tested against death.mts directly, the same primitives tick.mts calls), and two/four fire on a
// MONSTER the player kills (named / cursed / undead / construct, tested through tick.mts so the
// combat -> death -> reward wiring is exercised end to end, not just the router in isolation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { freshEntity, addEntity, freshStats } from "#engine/world.mts";
import type { World } from "#engine/world.mts";
import { asserted, glyphOf } from "#engine/bilattice.mts";
import { resolveMonsterKill, resolvePlayerFatal, triggerVoid } from "#engine/death.mts";
import { runTick } from "#engine/tick.mts";
import { spawnPlayer } from "#engine/zones.mts";

const ACTOR = "hero";

// mkWorld — a minimal one-zone world, hand-built (not buildDaily) so every test is fully
// deterministic and independent of the generator's seeded placement.
function mkWorld(floorIndex = 1, floorCount = 1): World {
  const world: World = {
    seed: 1,
    floorCount,
    zones: new Map(),
    entities: new Map(),
    order: [],
    tick: 0,
    bossId: "",
    relicItemId: null,
    hazard: null,
    stats: freshStats(),
  };
  // Named "the-gate" because zones.mts's spawnPlayer hard-codes that id as where a fresh player
  // stands up — this minimal world stands in for whatever floor the test wants to isolate.
  world.zones.set("the-gate", { id: "the-gate", name: "Test Zone", floorIndex, bound: 20, spawn: { x: 0, z: 0 }, exits: {} });
  return world;
}

function mkMonster(world: World, id: string, opts: Partial<ReturnType<typeof freshEntity>> & { deathRule: string }): void {
  const e = freshEntity(id, "monster", id);
  Object.assign(e, { zoneId: "the-gate", pos: { x: 0, z: 0 }, homeX: 0, homeZ: 0, hostile: true, aggro: 10, alive: asserted() }, opts);
  addEntity(world, e);
}

// ---- player-side routes: death.mts's own primitives, the exact functions tick.mts calls -------

test("mortal: a player with no relic settles to a true, ended death", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  player.health = 0;

  const res = resolvePlayerFatal(world, player, 5);
  assert.deepEqual(res, { outcome: "run-ended", reason: "mortal-death" });
  assert.equal(glyphOf(player.alive), "f");
  assert.equal(player.status, "ghost");
  assert.equal(player.form, "ghost");
  assert.equal(player.health, 0);
});

test("undead (relic): a player carrying the unspent Heart of the Hollow rises instead of ending", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  const relic = freshEntity("heart-of-the-hollow-relic", "item", "the Heart of the Hollow");
  relic.archetypeId = "heart-of-the-hollow";
  relic.carriedBy = ACTOR;
  addEntity(world, relic);
  player.inventory.push(relic.id);
  player.health = 0;
  const maxHealth = player.maxHealth;

  const res = resolvePlayerFatal(world, player, 5);
  assert.equal(res.outcome, "continued");
  assert.equal(glyphOf(player.alive), "⊤"); // the held contradiction IS the mechanic
  assert.equal(player.status, "risen");
  assert.equal(player.relicSpent, true);
  assert.equal(player.health, Math.floor(maxHealth / 2));
  assert.ok(!player.inventory.includes(relic.id), "the relic is consumed");
  assert.ok((player.effects.weaken as number) > 5, "a weaken effect is applied for the run's remainder");

  // Once spent, a SECOND fatal hit ends the run for good — the relic works once, never twice.
  player.health = 0;
  const res2 = resolvePlayerFatal(world, player, 6);
  assert.deepEqual(res2, { outcome: "run-ended", reason: "mortal-death" });
});

test("construct (void hazard): the attempt is un-made, not merely ended", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;

  triggerVoid(world, player);
  assert.equal(glyphOf(player.alive), "⊥");
  assert.equal(player.status, "voided");
});

test("tick.mts wires the hazard into the void route: stepping into it voids the run this tick", () => {
  const world = mkWorld();
  world.hazard = { id: "h1", zoneId: "the-gate", pos: { x: 5, z: 5 }, radius: 2, triggered: false };
  const result0 = runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  assert.equal(result0.playerFatal, false);
  const player = world.entities.get(ACTOR)!;
  player.pos = { x: 5, z: 5 }; // stand directly on the hazard

  const result = runTick(world, 1, [], ACTOR);
  assert.equal(result.playerFatal, true);
  assert.equal(player.status, "voided");
  assert.equal(glyphOf(player.alive), "⊥");
  assert.equal(world.hazard.triggered, true);
});

// ---- monster-side routes: through tick.mts, so combat -> death -> reward is exercised whole ----

test("named: killing the final-floor boss clears the run and settles it to a true death", () => {
  const world = mkWorld(1, 1); // this zone IS the (only, hence final) floor
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  player.pos = { x: 0, z: 0 };
  mkMonster(world, "boss-1", { deathRule: "named" as never, health: 1, maxHealth: 80, attackPower: 0, xpValue: 60, goldValue: 40, drops: ["crown-of-rust"] });
  world.bossId = "boss-1";

  const result = runTick(world, 0, [{ kind: "attack", actor: ACTOR, target: "boss-1" }], ACTOR);
  assert.equal(result.clearedBoss, true);
  const boss = world.entities.get("boss-1")!;
  assert.equal(boss.status, "slain");
  assert.equal(glyphOf(boss.alive), "f");
  assert.equal(world.stats.killXp, 60);
  assert.equal(player.gold, 40);
});

test("cursed: killing a cursed monster curses the killer permanently, not itself", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  player.pos = { x: 0, z: 0 };
  assert.equal(glyphOf(player.human), "⊥"); // untouched before the curse
  mkMonster(world, "stalker-1", { deathRule: "cursed" as never, health: 1, maxHealth: 24, attackPower: 0, xpValue: 18 });

  runTick(world, 0, [{ kind: "attack", actor: ACTOR, target: "stalker-1" }], ACTOR);

  const monster = world.entities.get("stalker-1")!;
  assert.equal(monster.status, "slain");
  assert.equal(glyphOf(monster.alive), "f"); // the monster itself dies a true death
  assert.equal(glyphOf(player.human), "⊤"); // its death curses the KILLER
});

test("undead: a slain skeleton rises rather than dying, and keeps fighting", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  player.pos = { x: 0, z: 0 };
  mkMonster(world, "skeleton-1", { deathRule: "undead" as never, health: 1, maxHealth: 22, attackPower: 0 });

  runTick(world, 0, [{ kind: "attack", actor: ACTOR, target: "skeleton-1" }], ACTOR);

  const monster = world.entities.get("skeleton-1")!;
  assert.equal(monster.status, "risen");
  assert.equal(glyphOf(monster.alive), "⊤"); // held contradiction: alive AND slain, forever
  assert.equal(monster.health, monster.maxHealth); // healed on rising
  assert.equal(monster.aliveRevives, 1);
});

test("construct (monster): a slain wraith vanishes to unknown, no corpse, no loot", () => {
  const world = mkWorld();
  spawnPlayer(world, ACTOR);
  const player = world.entities.get(ACTOR)!;
  player.pos = { x: 0, z: 0 };
  mkMonster(world, "wraith-1", { deathRule: "construct" as never, health: 1, maxHealth: 16, attackPower: 0, drops: [] });

  runTick(world, 0, [{ kind: "attack", actor: ACTOR, target: "wraith-1" }], ACTOR);

  const monster = world.entities.get("wraith-1")!;
  assert.equal(monster.status, "vanished");
  assert.equal(glyphOf(monster.alive), "⊥"); // retract BOTH faces — un-made, returns to mystery
});
