import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

const command = (engine: any, line: string) => {
  const queued = submit(engine, { actor: "hero", command: line });
  return step(queued, { runtime: FARSTONE_RUNTIME });
};

test("the permit and hydrant arcs irreversibly settle through civic commands", () => {
  let engine = join(createEngine(FARSTONE_GAME), "hero");
  engine = command(engine, "go north").engine;
  let result = command(engine, "petition brannaugh");
  engine = result.engine;
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "denied");
  assert.match(result.receipt.events[0]!.text, /clam bed is spared/u);
  result = command(engine, "inspect hydrant-23");
  assert.notEqual(value(result.engine.world, "hydrant-23", "water-quality"), "contested");
});
