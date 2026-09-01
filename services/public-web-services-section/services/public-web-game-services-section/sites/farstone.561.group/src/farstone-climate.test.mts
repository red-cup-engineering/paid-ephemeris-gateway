import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { checkpointEngine } from "@red-cup-engineering/feltos/persistence";
import { clockReport, seasonAt, weatherAt } from "@red-cup-engineering/feltos/world-clock";
import { farstoneClimateReport } from "./farstone-climate.mts";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";

test("Farstone climate turns a complete deterministic year and reports advisories", () => {
  let engine = join(createEngine(FARSTONE_GAME), "weather-reader");
  const seasons = new Set<string>();
  const weather = new Set<string>();
  for (let time = 0; time < 2_900; time++) {
    seasons.add(seasonAt(time));
    weather.add(weatherAt(FARSTONE_GAME.id, time));
  }
  for (let tick = 0; tick < 100; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    if (tick % 32 === 31) engine = checkpointEngine(engine);
  }
  assert.deepEqual([...seasons].sort(), ["autumn", "spring", "summer", "winter"]);
  assert.ok(weather.size >= 3);
  assert.equal(clockReport(engine.world).time, 100);
  assert.equal(typeof farstoneClimateReport(engine.world).harborClosed, "boolean");
  engine = submit(engine, { actor: "weather-reader", command: "almanac" });
  const result = step(engine, { runtime: FARSTONE_RUNTIME });
  assert.match(result.receipt.events[0]!.text, /Almanac of Farstone/u);
});
