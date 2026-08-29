import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { placeOf, value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

function act(engine: any, line: string) {
  return step(submit(engine, { actor: "hero", command: line }), { runtime: FARSTONE_RUNTIME }).engine;
}

test("a player completes the Off-Season through ordinary current commands", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero");
  for (let count = 0; count < 16; count++) engine = act(engine, "work");
  engine = act(engine, "think");
  for (let count = 0; count < 32; count++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  engine = act(engine, "build");
  engine = act(engine, "go north");
  engine = act(engine, "petition brannaugh");
  engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  assert.equal(value(engine.world, "hero", "campaign-stage"), 6);
  assert.ok(Number(value(engine.world, "hero", "coin")) > 0);
  assert.ok(Number(value(engine.world, "hero", "skill")) >= 15);
  assert.ok(Number(value(engine.world, "hero", "thoughts-fixed")) >= 1);
  assert.ok(Number(value(engine.world, "hero", "structures-built")) >= 1);
  assert.equal(placeOf(engine.world, "hero"), "downtown-farston");
});
