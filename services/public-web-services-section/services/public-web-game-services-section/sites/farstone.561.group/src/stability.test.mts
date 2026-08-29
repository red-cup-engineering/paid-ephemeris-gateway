import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { checkpointEngine, restoreEngine, snapshotEngine } from "@red-cup-engineering/feltos/persistence";
import { FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mts";

test("eight Farstone years remain replay-exact with a bounded active trace", () => {
  const game = gameFromBible({
    meta: { world: "farstone-stability", playerStart: "quay" },
    rooms: [
      { id: "quay", name: "Quay", description: "Working stone.", exits: { north: "town" }, tags: ["harbor"] },
      { id: "town", name: "Town", description: "Civic blocks.", exits: { south: "quay" }, tags: ["civic"] },
    ],
    npcs: [
      { id: "fisher", name: "Fisher", description: "A worker.", location: "quay", tags: ["npc", "innkeeper", "rival:watch"] },
      { id: "watch", name: "Watch", description: "A constable.", location: "town", tags: ["npc", "faction:watch", "rival:fisher"] },
    ],
  });
  let engine = createEngine(game);
  for (let tick = 0; tick < 26_880; tick++) {
    engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    if (tick % 32 === 31) engine = checkpointEngine(engine);
  }
  const snapshot = snapshotEngine(engine);
  const restored = restoreEngine(snapshot);
  assert.deepEqual(snapshotEngine(restored), snapshot);
  assert.ok(engine.world.assertions.length <= 9_000);
  assert.equal(engine.tick, 26_880);
});
