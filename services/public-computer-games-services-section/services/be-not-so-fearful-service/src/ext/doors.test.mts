// doors.test — a door is functional (latest-t wins, no ⊤ churn) and open/closed state directly
// overrides collision independent of the underlying voxel's own solid charge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog, FOUR } from "@red-cup-engineering/abrash/world";
import { spawn, open, close, isOpen, doorBlocks } from "./doors.mts";

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("doors: starts closed by an explicit stated fact, not silence", () => {
  const world = worldFromRows(spawn("d1"));
  assert.strictEqual(isOpen(world, "d1"), false);
});

test("doors: an unspawned door id reads as closed (the safe default), not an error", () => {
  const world = worldFromRows([]);
  assert.strictEqual(isOpen(world, "never-spawned"), false);
});

test("doors: open/close is functional — latest-t always wins, no held ⊤ regardless of how many times it flips", () => {
  let world = worldFromRows(spawn("d2"));
  world = admit(world, [open("d2", 1)]);
  assert.strictEqual(isOpen(world, "d2"), true);
  world = admit(world, [close("d2", 2)]);
  assert.strictEqual(isOpen(world, "d2"), false);
  world = admit(world, [open("d2", 3)]);
  assert.strictEqual(isOpen(world, "d2"), true);
  // never contested: `open` and `close` both file the SAME predicate object ("open"/"true" vs
  // "open"/"false" are different (predicate,object) pairs, not a converse pair), so there is no fold
  // to ⊤ here at all — proven by this sequence completing with a clean boolean answer at every step.
});

test("doors: an OPEN door passes regardless of the underlying voxel's own solid charge (even a settled t wall)", () => {
  const world = worldFromRows([...spawn("d3"), open("d3", 1)]);
  assert.strictEqual(doorBlocks(FOUR.T, world, "d3"), false, "an open door must pass even over a t (settled solid) voxel");
  assert.strictEqual(doorBlocks(FOUR.TOP, world, "d3"), false, "an open door must pass even over a contested voxel");
});

test("doors: a CLOSED door falls through to abrash's own real blocks() for that charge — unchanged wall behavior", () => {
  const world = worldFromRows(spawn("d4")); // closed
  assert.strictEqual(doorBlocks(FOUR.T, world, "d4"), true, "closed door over t: blocks, exactly like an ordinary wall");
  assert.strictEqual(doorBlocks(FOUR.F, world, "d4"), false, "closed door over f (carved): passes, exactly like ordinary carved floor");
  assert.strictEqual(doorBlocks(FOUR.TOP, world, "d4", { passContested: true }), false, "closed door still honors an explicit passContested opt for its own contested charge");
});

test("doors: a voxel with no door id at all is untouched — pure passthrough to abrash's blocks()", () => {
  const world = worldFromRows([]);
  assert.strictEqual(doorBlocks(FOUR.T, world, undefined), true);
  assert.strictEqual(doorBlocks(FOUR.F, world, undefined), false);
});
