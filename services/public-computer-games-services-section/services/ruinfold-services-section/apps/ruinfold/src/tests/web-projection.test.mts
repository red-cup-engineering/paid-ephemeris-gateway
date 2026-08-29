// web-projection — drives #engine's real tick loop through a scripted run and asserts
// web/js/projection.mjs's `projectWorld()` (the client's state-projection: World + actorId + tick
// -> plain render data, PURE — no DOM, no fetch, no timers, no Math.random()/Date.now()) matches
// the raw engine state field-by-field. This is the "drives the engine through a scripted run and
// asserts the client's state-projection (pure function) matches" obligation — projection.mjs's own
// header names this exact file. server static-serving of the client is covered separately by
// web-static.test.mts (fetch against a real running server).
//
// projection.mjs is imported straight off web/js/ the same way a browser loads it — this test
// exercises the actual shipped file, not a copy.

import { test } from "node:test";
import assert from "node:assert/strict";

import { dailySeed } from "#engine/daily.mts";
import { buildDaily } from "#engine/dungeon.mts";
import { runTick } from "#engine/tick.mts";
import { addEntity, freshEntity } from "#engine/world.mts";
import { asserted, deathFace } from "#engine/bilattice.mts";

import { projectWorld, FOV_RADIUS, SPECIES_GLYPH } from "../../web/js/projection.mjs";

const ACTOR = "wanderer-projtest";

test("projectWorld before the actor has joined returns a null player, not a throw", () => {
  const world = buildDaily(dailySeed("2026-08-19"));
  const model = projectWorld(world, ACTOR, 0);
  assert.deepEqual(model, { player: null, zone: null, tiles: [], hud: null });
});

test("projectWorld after a scripted join+move sequence matches the raw engine state field-by-field", () => {
  const seed = dailySeed("2026-08-19");
  const world = buildDaily(seed);

  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  runTick(world, 1, [{ kind: "move", actor: ACTOR, dir: "n" }], ACTOR);
  runTick(world, 2, [{ kind: "move", actor: ACTOR, dir: "n" }], ACTOR);
  runTick(world, 3, [{ kind: "move", actor: ACTOR, dir: "e" }], ACTOR);

  const raw = world.entities.get(ACTOR);
  assert.ok(raw);

  const model = projectWorld(world, ACTOR, 3);
  assert.ok(model.player);
  assert.equal(model.player.x, raw.pos.x);
  assert.equal(model.player.z, raw.pos.z);
  assert.equal(model.player.health, raw.health);
  assert.equal(model.player.maxHealth, raw.maxHealth);
  assert.equal(model.player.stamina, raw.stamina);
  assert.equal(model.player.level, raw.level);
  assert.equal(model.player.xp, raw.xp);
  assert.equal(model.player.gold, raw.gold);
  assert.equal(model.player.status, raw.status);
  // fresh, undamaged: `alive` is a plain assertion (pos only) -> glyph "t", no risen/cursed aura.
  assert.equal(model.player.aliveGlyph, "t");
  assert.equal(model.player.risen, false);
  assert.equal(model.player.cursed, false);

  assert.equal(model.zone.id, "the-gate");
  assert.equal(model.zone.floorIndex, 0);
  assert.equal(model.hud.floorIndex, 0);
  assert.equal(model.hud.floorCount, world.floorCount);
  assert.equal(model.hud.tick, 3);
  assert.deepEqual(model.hud.inventory, []);
});

test("projectWorld surfaces a picked-up item in hud.inventory exactly as #engine/items.mts's inventoryOf reports it, and drops it from the ground tiles", () => {
  const world = buildDaily(dailySeed("2026-08-20"));
  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  const player = world.entities.get(ACTOR);

  const item = freshEntity("test-blade", "item", "a test blade");
  item.archetypeId = "iron-blade";
  item.zoneId = player.zoneId;
  item.pos = { ...player.pos };
  addEntity(world, item);

  // Before pickup: renders as a ground tile.
  assert.ok(projectWorld(world, ACTOR, 0).tiles.some((t) => t.id === "test-blade"));

  runTick(world, 1, [{ kind: "pickup", actor: ACTOR, item: "test-blade" }], ACTOR);

  const model = projectWorld(world, ACTOR, 1);
  assert.equal(model.hud.inventory.length, 1);
  assert.equal(model.hud.inventory[0].id, "test-blade");
  assert.equal(model.hud.inventory[0].archetypeId, "iron-blade");
  assert.equal(model.hud.inventory[0].equipped, false);
  // Now carried: no longer a ground tile.
  assert.equal(model.tiles.some((t) => t.id === "test-blade"), false);
});

test("projectWorld's field of view: monsters within FOV_RADIUS render, monsters outside it or in another zone do not, and the actor never renders itself as a tile", () => {
  const world = buildDaily(dailySeed("2026-08-21"));
  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  const player = world.entities.get(ACTOR);

  const near = freshEntity("near-goblin", "monster", "a goblin");
  near.species = "goblin";
  near.deathRule = "mortal";
  near.zoneId = player.zoneId;
  near.pos = { x: player.pos.x + FOV_RADIUS - 1, z: player.pos.z };
  near.alive = asserted();
  addEntity(world, near);

  const far = freshEntity("far-goblin", "monster", "a goblin");
  far.species = "goblin";
  far.deathRule = "mortal";
  far.zoneId = player.zoneId;
  far.pos = { x: player.pos.x + FOV_RADIUS + 50, z: player.pos.z };
  far.alive = asserted();
  addEntity(world, far);

  const elsewhere = freshEntity("elsewhere-goblin", "monster", "a goblin");
  elsewhere.species = "goblin";
  elsewhere.deathRule = "mortal";
  elsewhere.zoneId = "not-the-players-zone";
  elsewhere.pos = { ...player.pos };
  elsewhere.alive = asserted();
  addEntity(world, elsewhere);

  const model = projectWorld(world, ACTOR, 0);
  const ids = model.tiles.map((t) => t.id);
  assert.ok(ids.includes("near-goblin"));
  assert.ok(!ids.includes("far-goblin"));
  assert.ok(!ids.includes("elsewhere-goblin"));
  assert.ok(!ids.includes(ACTOR));
});

test("the risen/cursed aura flags surface exactly when the player's bilattice cells hold death.mts's held-contradiction (⊤) glyph — the aura state design §6.2 asks the client to render", () => {
  const world = buildDaily(dailySeed("2026-08-22"));
  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  const player = world.entities.get(ACTOR);

  assert.equal(projectWorld(world, ACTOR, 0).player.risen, false);
  assert.equal(projectWorld(world, ACTOR, 0).player.cursed, false);

  // The undead-relic continuation (design §3.3) settles `alive` to death.mts's own ⊤ cell.
  player.alive = deathFace("undead");
  assert.equal(projectWorld(world, ACTOR, 0).player.risen, true);
  assert.equal(projectWorld(world, ACTOR, 0).player.cursed, false);

  // The lycanthrope curse settles `human` to the same ⊤ shape, independently of `alive`.
  player.human = deathFace("undead");
  assert.equal(projectWorld(world, ACTOR, 0).player.risen, true);
  assert.equal(projectWorld(world, ACTOR, 0).player.cursed, true);
});

test("a monster whose own alive cell holds the undead ⊤ contradiction renders the same 'held contradiction' tell (risen:true) the design's glyph table asks for", () => {
  const world = buildDaily(dailySeed("2026-08-23"));
  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  const player = world.entities.get(ACTOR);

  const skeleton = freshEntity("risen-skeleton", "monster", "a skeleton");
  skeleton.species = "skeleton";
  skeleton.deathRule = "undead";
  skeleton.zoneId = player.zoneId;
  skeleton.pos = { ...player.pos };
  skeleton.alive = deathFace("undead"); // already risen once
  addEntity(world, skeleton);

  const model = projectWorld(world, ACTOR, 0);
  const tile = model.tiles.find((t) => t.id === "risen-skeleton");
  assert.ok(tile);
  assert.equal(tile.glyph, SPECIES_GLYPH.skeleton);
  assert.equal(tile.risen, true);
});

test("projectWorld is a pure function of (world, actorId, tick): calling it twice on the same inputs yields deep-equal output, and it never mutates world", () => {
  const world = buildDaily(dailySeed("2026-08-19"));
  runTick(world, 0, [{ kind: "join", actor: ACTOR }], ACTOR);
  runTick(world, 1, [{ kind: "move", actor: ACTOR, dir: "n" }], ACTOR);

  const before = JSON.stringify([...world.entities.entries()]);
  const a = projectWorld(world, ACTOR, 1);
  const b = projectWorld(world, ACTOR, 1);
  const after = JSON.stringify([...world.entities.entries()]);

  assert.deepEqual(a, b);
  assert.equal(before, after);
});
