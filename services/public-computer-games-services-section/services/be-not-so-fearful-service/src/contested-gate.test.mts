// contested-gate.test — the periodic open/close cycle is deterministic, bounded, and named-sites-only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOpenAt, ticksUntilFlip, passContestedWhereFor, REFLIP_CYCLE_TICKS } from "./contested-gate.mts";

test("contested-gate: starts closed, flips open at exactly one cycle, closed again at two cycles", () => {
  assert.strictEqual(isOpenAt(0), false);
  assert.strictEqual(isOpenAt(REFLIP_CYCLE_TICKS - 1), false);
  assert.strictEqual(isOpenAt(REFLIP_CYCLE_TICKS), true);
  assert.strictEqual(isOpenAt(REFLIP_CYCLE_TICKS * 2 - 1), true);
  assert.strictEqual(isOpenAt(REFLIP_CYCLE_TICKS * 2), false);
});

test("contested-gate: ticksUntilFlip counts down to exactly 0-adjacent at the boundary and resets after", () => {
  assert.strictEqual(ticksUntilFlip(0), REFLIP_CYCLE_TICKS);
  assert.strictEqual(ticksUntilFlip(REFLIP_CYCLE_TICKS - 1), 1);
  assert.strictEqual(ticksUntilFlip(REFLIP_CYCLE_TICKS), REFLIP_CYCLE_TICKS);
});

test("contested-gate: passContestedWhereFor only opts in the NAMED sites, never an arbitrary contested cell", () => {
  const sites = [{ x: 5, z: 5 }, { x: 9, z: 2 }];
  const gate = passContestedWhereFor(sites, REFLIP_CYCLE_TICKS); // an "open" tick
  assert.strictEqual(gate("voxel:5,5"), true);
  assert.strictEqual(gate("voxel:9,2"), true);
  assert.strictEqual(gate("voxel:1,1"), false, "an unnamed contested cell must never be opted open");
});

test("contested-gate: the same named site is closed during the closed half of the cycle", () => {
  const sites = [{ x: 5, z: 5 }];
  const closedGate = passContestedWhereFor(sites, 0); // tick 0 is the closed half
  assert.strictEqual(closedGate("voxel:5,5"), false);
  const openGate = passContestedWhereFor(sites, REFLIP_CYCLE_TICKS);
  assert.strictEqual(openGate("voxel:5,5"), true);
});

test("contested-gate: deterministic — identical (sites, tick) always produces the identical decision", () => {
  const sites = [{ x: 3, z: 3 }];
  for (const tick of [0, 150, 300, 450, 900, 12345]) {
    const a = passContestedWhereFor(sites, tick)("voxel:3,3");
    const b = passContestedWhereFor(sites, tick)("voxel:3,3");
    assert.strictEqual(a, b);
  }
});
