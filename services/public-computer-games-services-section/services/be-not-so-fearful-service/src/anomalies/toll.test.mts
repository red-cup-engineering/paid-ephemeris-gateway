// toll.test — passive-until-taken, then unconditional pursuit (no LOS/territory escape) until a
// sustained line-of-sight break, and the "triggered" latch is genuinely permanent (append-only
// evidence, never un-set by anything short of re-reading a fresh world).
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import { spawn, trigger, decideStep, isTriggered, positionOf, BREAK_TICKS_TO_CALM } from "./toll.mts";

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("toll: passive before the item is taken — never moves, regardless of player position", () => {
  let world = worldFromRows(spawn("tl1", 10, 10, { speed: 1 }));
  const start = positionOf(world, "tl1")!;
  for (let t = 1; t <= 20; t++) {
    const player = { x: t, z: t }; // walking right past it
    const rows = decideStep(world, "tl1", player, 0, t);
    assert.deepStrictEqual(rows, [], "a passive Toll must append nothing at all");
    world = admit(world, rows);
  }
  const end = positionOf(world, "tl1")!;
  assert.deepStrictEqual(end, start);
  assert.strictEqual(isTriggered(world, "tl1"), false);
});

test("toll: taking the item triggers an immediate, unconditional pursuit — no LOS or territory check", () => {
  let world = worldFromRows(spawn("tl2", 10, 10, { speed: 0.6 }));
  world = admit(world, [trigger("tl2", 1)]);
  assert.strictEqual(isTriggered(world, "tl2"), true);

  const player = { x: 20, z: 10 };
  const before = positionOf(world, "tl2")!;
  // ticksSinceLosBreak=0 (freshly triggered, LOS irrelevant to the trigger itself) — it should STILL
  // chase, because the design is explicit: unconditional, no LOS escape.
  const rows = decideStep(world, "tl2", player, 0, 2);
  assert.ok(rows.length > 0, "a triggered Toll must move toward the player even with a live LOS break count of 0 (irrelevant while under the calm threshold)");
  world = admit(world, rows);
  const after = positionOf(world, "tl2")!;
  const distBefore = Math.hypot(before.x - player.x, before.z - player.z);
  const distAfter = Math.hypot(after.x - player.x, after.z - player.z);
  assert.ok(distAfter < distBefore, "should close distance on the player once triggered");
});

test("toll: pursuit continues across many ticks regardless of LOS, only stopping at the sustained-break threshold", () => {
  let world = worldFromRows(spawn("tl3", 0, 0, { speed: 0.5 }));
  world = admit(world, [trigger("tl3", 1)]);
  const player = { x: 100, z: 0 };
  let t = 2;
  // just under the calm threshold: still pursuing.
  world = admit(world, decideStep(world, "tl3", player, BREAK_TICKS_TO_CALM - 1, t++));
  const posUnderThreshold = positionOf(world, "tl3")!;
  assert.ok(posUnderThreshold.x > 0, "should have moved while under the sustained-break threshold");

  // at/over the threshold: pursuit ends, no further movement.
  const before = positionOf(world, "tl3")!;
  world = admit(world, decideStep(world, "tl3", player, BREAK_TICKS_TO_CALM, t++));
  const after = positionOf(world, "tl3")!;
  assert.deepStrictEqual(after, before, "at the sustained-break threshold, it should hold position");
});

test("toll: the trigger latch is permanent — re-triggering is a no-op, and it never reverts to passive on its own", () => {
  let world = worldFromRows(spawn("tl4", 0, 0, { speed: 0.4 }));
  world = admit(world, [trigger("tl4", 1)]);
  assert.strictEqual(isTriggered(world, "tl4"), true);
  // pursue, then sustain a break long enough to stop moving...
  const player = { x: 50, z: 0 };
  let t = 2;
  for (let i = 0; i < 5; i++) world = admit(world, decideStep(world, "tl4", player, 0, t++));
  world = admit(world, decideStep(world, "tl4", player, BREAK_TICKS_TO_CALM, t++));
  // ...it is STILL triggered (the latch does not un-set just because pursuit paused this tick).
  assert.strictEqual(isTriggered(world, "tl4"), true);
});
