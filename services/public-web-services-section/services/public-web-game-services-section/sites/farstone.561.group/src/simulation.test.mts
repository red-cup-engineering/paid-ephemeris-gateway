import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { checkpointEngine, snapshotEngine } from "@red-cup-engineering/feltos/persistence";
import { clockReport } from "@red-cup-engineering/feltos/world-clock";
import { placeOf, value } from "@red-cup-engineering/feltos/world";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

function simulate(ticks: number) {
  let engine = createEngine(FARSTONE_GAME);
  const weather = new Set<string>();
  const places = new Set<string>();
  let minStock = Infinity;
  let maxPrice = 0;
  for (let tick = 0; tick < ticks; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    weather.add(String(clockReport(engine.world).weather));
    places.add(placeOf(engine.world, "dax-pell") ?? "nowhere");
    minStock = Math.min(minStock, Number(value(engine.world, "the-fishing-grounds", "fish-stock") ?? 40));
    maxPrice = Math.max(maxPrice, Number(value(engine.world, "farstone-market", "price:fish") ?? 2));
    if (tick % 32 === 31) engine = checkpointEngine(engine);
  }
  return { engine, weather, places, minStock, maxPrice };
}

test("the authored island sustains varied deterministic autonomous activity", () => {
  const first = simulate(500);
  const second = simulate(500);
  assert.deepEqual(snapshotEngine(first.engine), snapshotEngine(second.engine));
  assert.ok(first.weather.size >= 3);
  assert.ok(first.places.size >= 3);
  assert.ok(first.minStock < 40);
  assert.ok(first.maxPrice > 2);
});
