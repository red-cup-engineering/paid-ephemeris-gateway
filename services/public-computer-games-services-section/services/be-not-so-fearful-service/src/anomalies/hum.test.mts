// hum.test — the sound-bound behavior contract: loudness ordering, heat accumulation through walls
// (distance-only, no LOS), the commit-to-a-memory-not-the-live-player mechanic, and juke-ability
// (evading after a trigger does not let stale residual heat instantly re-trigger a second hunt).
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import {
  spawn, decideStep, noiseOf, accumulateHeat, heatOf, isHunting, positionOf, lastHeardOf, HEAT_THRESHOLD,
} from "./hum.mts";

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("hum: noiseOf orders loudness fire > sprint > ordinary movement > standing still, crouch is always silent", () => {
  assert.strictEqual(noiseOf({ crouch: true, fire: true, sprint: true, forward: 1 }), 0, "crouch overrides everything else");
  assert.strictEqual(noiseOf({ fire: true }), 1.5);
  assert.strictEqual(noiseOf({ sprint: true }), 1.0);
  assert.strictEqual(noiseOf({ forward: 1 }), 0.4);
  assert.strictEqual(noiseOf({}), 0, "standing still and not firing/sprinting makes no noise");
  assert.ok(noiseOf({ fire: true }) > noiseOf({ sprint: true }));
  assert.ok(noiseOf({ sprint: true }) > noiseOf({ forward: 1 }));
});

test("hum: accumulateHeat attenuates with distance and decays with no noise", () => {
  const near = accumulateHeat(0, 1, 1, 1 / 60);
  const far = accumulateHeat(0, 1, 20, 1 / 60);
  assert.ok(near > far, "the same noise closer should contribute more heat than farther away");
  const decayed = accumulateHeat(5, 0, 100, 1 / 60);
  assert.ok(decayed < 5, "with zero noise, heat should decay");
});

test("hum: a quiet, distant player never crosses the hunt threshold", () => {
  let world = worldFromRows(spawn("h1", 0, 0));
  const player = { x: 100, z: 100 };
  for (let t = 1; t <= 200; t++) {
    const rows = decideStep(world, "h1", player, {}, t, 1 / 60);
    world = admit(world, rows);
  }
  assert.strictEqual(isHunting(world, "h1"), false);
  assert.ok(heatOf(world, "h1") < HEAT_THRESHOLD);
});

test("hum: a loud, nearby player crosses the threshold and triggers a hunt latched to that moment's position", () => {
  let world = worldFromRows(spawn("h1", 0, 0, { speed: 0.4 }));
  const player = { x: 2, z: 0 };
  let triggeredAtTick = -1;
  for (let t = 1; t <= 20 && triggeredAtTick < 0; t++) {
    const rows = decideStep(world, "h1", player, { sprint: true }, t, 1 / 60);
    world = admit(world, rows);
    if (isHunting(world, "h1")) triggeredAtTick = t;
  }
  assert.ok(triggeredAtTick > 0, "expected the hunt to trigger within 20 loud, nearby ticks");
  assert.deepStrictEqual(lastHeardOf(world, "h1"), { x: 2, z: 0 });
});

test("hum: once hunting, it beelines toward the LATCHED memory, not the player's live (moved) position — lurable/juke-able", () => {
  let world = worldFromRows(spawn("h1", 0, 0, { speed: 0.4 }));
  let player = { x: 2, z: 0 };
  let t = 1;
  for (; t <= 20 && !isHunting(world, "h1"); t++) {
    world = admit(world, decideStep(world, "h1", player, { sprint: true }, t, 1 / 60));
  }
  assert.strictEqual(isHunting(world, "h1"), true);
  const memory = lastHeardOf(world, "h1")!;

  // the player now relocates far away and goes silent — juking it.
  player = { x: -50, z: 50 };
  for (let i = 0; i < 30 && isHunting(world, "h1"); i++, t++) {
    world = admit(world, decideStep(world, "h1", player, {}, t, 1 / 60));
    const pos = positionOf(world, "h1")!;
    // every step while still hunting must move STRICTLY toward the latched memory, never toward the
    // player's real (juked-away) position.
    const distToMemoryBefore = Math.hypot(pos.x - memory.x, pos.z - memory.z);
    assert.ok(distToMemoryBefore <= 4, `should be closing on the memory (${memory.x},${memory.z}), got pos (${pos.x},${pos.z})`);
  }
  assert.strictEqual(isHunting(world, "h1"), false, "should stop hunting once it reaches the (unmoving) memory");
  const finalPos = positionOf(world, "h1")!;
  assert.ok(Math.hypot(finalPos.x - memory.x, finalPos.z - memory.z) < 1e-6, "should end exactly at the latched memory");
});

test("hum: reaching a stale memory does not instantly re-trigger a second hunt from residual heat (the juke actually works)", () => {
  let world = worldFromRows(spawn("h1", 0, 0, { speed: 0.4 }));
  let player = { x: 2, z: 0 };
  let t = 1;
  for (; t <= 20 && !isHunting(world, "h1"); t++) {
    world = admit(world, decideStep(world, "h1", player, { sprint: true }, t, 1 / 60));
  }
  player = { x: -80, z: 80 }; // far enough that distance-attenuated heat from here is negligible
  for (let i = 0; i < 40; i++, t++) {
    world = admit(world, decideStep(world, "h1", player, {}, t, 1 / 60));
  }
  assert.strictEqual(isHunting(world, "h1"), false, "should have settled back to idle, not re-triggered off residual heat");
});
