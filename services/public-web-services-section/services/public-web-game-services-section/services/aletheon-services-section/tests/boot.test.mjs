// boot — does the server actually come up, seed a real world, and answer HTTP? And is the seeded
// entity count actually deterministic, or did the report that said "38 entities" get lucky once?
//
// seed.mjs's `ring()`/keeper/Hollow-Reiver/seedAltars calls are all FIXED-COUNT loops — the only
// place Math.random() enters seeding is `pick()`, which chooses a NAME string from a fixed pool,
// never how many things spawn. So the entity COUNT is deterministic today with zero seeding work
// needed; only the cosmetic names vary run to run. This test proves that structurally (by summing
// seed.mjs's own ring counts) rather than trusting a comment, and proves it empirically (spawn the
// real world many times, assert the count never moves) rather than asserting it once.

import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createWorld } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { createGameServer } from "../server/app.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// grade 0 (6) + grade 1 critters (9) + 4 keepers + grade 2 brigands (7) + grade 3 brigands (6)
// + 1 seed Anomaly (the Hollow Reiver) + 5 claim altars (one per grade 0..4) — read straight out
// of seed.mjs's own ring()/seedAltars() call sites, not guessed.
const EXPECTED_SEED_COUNT = 6 + 9 + 4 + 7 + 6 + 1 + 5;

test("seedWorld: entity count is deterministic across repeated seedings (only names are random)", () => {
  const counts = new Set();
  for (let i = 0; i < 20; i++) {
    const world = createWorld();
    seedWorld(world);
    counts.add(world.entities.size);
  }
  assert.deepEqual([...counts], [EXPECTED_SEED_COUNT], `entity count varied across seedings: saw ${[...counts]}`);
});

test("seedWorld: the seed Anomaly is a real ⊤ (contradiction), not a stamped flag", () => {
  const world = createWorld();
  seedWorld(world);
  const anomalies = [...world.entities.values()].filter((e) => e.state === "anomaly");
  assert.equal(anomalies.length, 1, "expected exactly the one seeded Anomaly");
  assert.equal(anomalies[0].killed, true);
  assert.equal(anomalies[0].raised, true);
});

test("createGameServer: boots a real http server over the seeded world and answers GET /", async (t) => {
  const { world, server } = createGameServer({ root: ROOT, seed: true });
  t.after(() => server.close());

  assert.equal(world.entities.size, EXPECTED_SEED_COUNT);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /<html/i, "expected the real client index.html, not a stub");
});

test("createGameServer: seed:false boots an empty world (no implicit seeding)", () => {
  const { world } = createGameServer({ root: null, seed: false });
  assert.equal(world.entities.size, 0);
});

test("createGameServer: step() advances exactly one tick per call, by hand, no timer", () => {
  const { world, step } = createGameServer({ root: null, seed: true });
  assert.equal(world.tick, 0);
  step();
  assert.equal(world.tick, 1);
  step();
  step();
  assert.equal(world.tick, 3);
});
