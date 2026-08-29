import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { placeOf, value } from "@red-cup-engineering/feltos/world";
import { demandFor, roleDemandFor } from "./director.mts";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

test("the Director derives demands and autonomous movement from live world pressure", () => {
  assert.deepEqual(demandFor(14), { want: "edible", reward: 19 });
  assert.deepEqual(roleDemandFor(["npc", "innkeeper"]), { want: "fish", reward: 10 });
  let engine = createEngine(FARSTONE_GAME);
  const initial = placeOf(engine.world, "dax-pell");
  for (let tick = 0; tick < 120; tick++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  const demanders = Object.keys(FARSTONE_GAME.things).filter((id) => value(engine.world, id, "wants") !== null);
  assert.ok(demanders.length >= 4, "several islanders post needs");
  assert.notEqual(placeOf(engine.world, "dax-pell"), initial, "the cast pursues its ends through the room graph");
});
