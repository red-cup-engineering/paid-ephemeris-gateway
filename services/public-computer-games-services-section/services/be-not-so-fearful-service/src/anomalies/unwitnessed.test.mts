// unwitnessed.test — the behavior contract, as a numeric assertion: alternate look-at/look-away
// ticks, assert ZERO position delta on look-at and NONZERO delta on look-away, over a real abrash
// world (worldFromRows/admitLog), not a hand-rolled state object.
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import { spawn, positionOf, isObserved, decideStep } from "./unwitnessed.mts";

// an open grid (every voxel ⊥ fog — nothing occludes) so the only thing gating observation is angle.
const openGrid = { at: () => ({ charge: "bot" }) };

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("unwitnessed: isObserved is true when facing it with clear line of sight, false when facing away", () => {
  const player = { x: 0, z: 0, angle: 0 }; // facing +x
  assert.strictEqual(isObserved(openGrid, player, { x: 5, z: 0 }), true, "directly ahead should be observed");
  assert.strictEqual(isObserved(openGrid, { ...player, angle: Math.PI }, { x: 5, z: 0 }), false, "behind the player should not be observed");
});

test("unwitnessed: isObserved is false when a wall occludes the line of sight even inside the view cone", () => {
  const wallGrid = { at: (x: number) => ({ charge: Math.floor(x) === 3 ? "t" : "bot" }) };
  const player = { x: 0, z: 0.5, angle: 0 };
  assert.strictEqual(isObserved(wallGrid, player, { x: 5, z: 0.5 }), false, "a wall between player and target must occlude");
});

test("unwitnessed: position delta is EXACTLY zero on a look-at tick, and nonzero on a look-away tick", () => {
  let world = worldFromRows(spawn("u1", 10, 10, { speed: 0.5 }));
  const startPos = positionOf(world, "u1")!;

  // look-at: the player faces the anomaly.
  const player = { x: 0, z: 10, angle: 0 }; // facing +x, the anomaly sits directly ahead at (10,10)... adjust z
  const lookingAtPlayer = { x: 0, z: 10, angle: 0 };
  const rows1 = decideStep(world, "u1", lookingAtPlayer, openGrid, 1);
  assert.deepStrictEqual(rows1, [], "an observed anomaly must append NO row this tick");
  world = admit(world, rows1);
  const afterLookAt = positionOf(world, "u1")!;
  assert.strictEqual(afterLookAt.x, startPos.x);
  assert.strictEqual(afterLookAt.z, startPos.z);

  // look-away: the player faces the opposite direction.
  const lookingAway = { x: 0, z: 10, angle: Math.PI };
  const rows2 = decideStep(world, "u1", lookingAway, openGrid, 2);
  assert.ok(rows2.length > 0, "an unobserved anomaly must append exactly one movement row");
  world = admit(world, rows2);
  const afterLookAway = positionOf(world, "u1")!;
  const delta = Math.hypot(afterLookAway.x - afterLookAt.x, afterLookAway.z - afterLookAt.z);
  assert.ok(delta > 0, `expected a nonzero step on look-away, got delta ${delta}`);
  assert.ok(Math.abs(delta - 0.5) < 1e-9, `expected the step length to equal the configured speed (0.5), got ${delta}`);
});

test("unwitnessed: alternating look-at/look-away over many ticks moves it only on the look-away ticks", () => {
  let world = worldFromRows(spawn("u2", 10, 10, { speed: 0.3 }));
  const player = { x: 0, z: 10 };
  let observedTicks = 0;
  let movedTicks = 0;
  for (let t = 1; t <= 10; t++) {
    const lookAt = t % 2 === 1; // odd ticks: look at it. even ticks: look away.
    const before = positionOf(world, "u2")!;
    const rows = decideStep(world, "u2", { ...player, angle: lookAt ? 0 : Math.PI }, openGrid, t);
    world = admit(world, rows);
    const after = positionOf(world, "u2")!;
    const moved = Math.hypot(after.x - before.x, after.z - before.z) > 1e-9;
    if (lookAt) {
      assert.strictEqual(moved, false, `tick ${t} (look-at) should not move it`);
      observedTicks++;
    } else {
      assert.strictEqual(moved, true, `tick ${t} (look-away) should move it`);
      movedTicks++;
    }
  }
  assert.strictEqual(observedTicks, 5);
  assert.strictEqual(movedTicks, 5);
});
