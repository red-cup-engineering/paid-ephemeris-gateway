import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { placeOf, value } from "@red-cup-engineering/feltos/world";
import { DEFAULT_RESPAWN, homeOf } from "./depths.mts";
import { FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mts";

test("monster homes are data and slain monsters return after their own delay", () => {
  assert.equal(homeOf(["monster", "home:den"]), "den");
  assert.ok(DEFAULT_RESPAWN >= 10);
  const game = gameFromBible({
    meta: { world: "farstone-lair", playerStart: "den" },
    rooms: [{ id: "den", name: "The Den", description: "Bone and dark.", tags: ["civic"], exits: {} }],
    npcs: [{ id: "rat", name: "a giant rat", description: "Yellow-toothed.", location: "den", tags: ["npc", "monster", "home:den", "health:2", "respawn:3"] }],
  });
  let engine = join(createEngine(game), "hero");
  engine = submit(engine, { actor: "hero", command: "attack rat" });
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "rat", "condition"), "dead");
  for (let tick = 0; tick < 3; tick++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "rat", "condition"), "alive");
  assert.equal(placeOf(engine.world, "rat"), "den");
  assert.equal(value(engine.world, "rat", "health"), 2);
});
