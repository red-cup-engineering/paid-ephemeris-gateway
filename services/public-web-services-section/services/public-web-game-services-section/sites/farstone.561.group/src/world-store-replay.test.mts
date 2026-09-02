// world-store-replay — the same eight-Farstone-year replay-exactness property
// stability.test.mts proves for the in-memory engine snapshot/restore round trip, but routed
// through the actual bucket-persistence path this deploy relies on (world-hosting's
// world-store save()/load() over a real network round trip to a fake-GCS double), against the
// identical world shape/tick count stability.test.mts uses, so the numbers are comparable.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { checkpointEngine, snapshotEngine } from "@red-cup-engineering/feltos/persistence";
import { FARSTONE_RUNTIME, gameFromBible } from "./farstone-game.mts";
import { openWorldStore } from "@red-cup-engineering/world-hosting/world-store";
import { startFakeGcs } from "@red-cup-engineering/world-hosting/fake-gcs";

const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

test("eight Farstone years, saved and loaded through the real GCS bucket-store path, remain replay-exact", async (t) => {
  const fake = await startFakeGcs("test-bucket-replay");
  t.after(() => fake.close());
  const store = openWorldStore(
    { kind: "bucket", bucket: fake.bucket, object: "world.json" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );

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
  const before = snapshotEngine(engine);

  // The deploy-relevant act: persist the eight-year world to the bucket, exactly as
  // serve.mts's periodic autosave and shutdown-time save do, then reload it exactly as
  // serve.mts does on boot — no shortcuts through in-memory state.
  await store!.save(engine);
  const restored = await store!.load(() => {
    throw new Error("fallback should not run: the eight-year world was just saved");
  });

  assert.deepEqual(snapshotEngine(restored as never), before);
  assert.ok(engine.world.assertions.length <= 9_000);
  assert.equal(engine.tick, 26_880);
  assert.equal((restored as { tick: number }).tick, 26_880);
});
