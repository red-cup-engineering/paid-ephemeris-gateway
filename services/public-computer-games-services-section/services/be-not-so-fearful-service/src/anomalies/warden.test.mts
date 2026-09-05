// warden.test — pure geometric containment with the doorway-baiting hysteresis: enter the rect and
// it turns hostile immediately; leave the rect but stay within the exit margin and it STAYS hostile
// (the whole point — a doorway lure has to actually work); clear the margin and it returns to patrol.
import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import { predicate } from "@red-cup-engineering/abrash/world";
import { spawn, subjectKey, decideStep, isHostile, positionOf, hostileStateFor } from "./warden.mts";

function admit(world: unknown, rows: { e: string }[]) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

const RECT = { x: 10, z: 10, w: 6, h: 6 }; // covers x:[10,16), z:[10,16)

test("hostileStateFor: entering the bare rect is always hostile, regardless of prior state", () => {
  assert.strictEqual(hostileStateFor(RECT, { x: 12, z: 12 }, false), true);
  assert.strictEqual(hostileStateFor(RECT, { x: 12, z: 12 }, true), true);
});

test("hostileStateFor: outside the rect but within the exit margin stays hostile ONLY if it already was — the doorway bait", () => {
  const justOutside = { x: 16.5, z: 12 }; // 0.5 cells past the east wall — inside the margin
  assert.strictEqual(hostileStateFor(RECT, justOutside, true), true, "already hostile: should still chase you to the doorway");
  assert.strictEqual(hostileStateFor(RECT, justOutside, false), false, "never was hostile: standing just outside should not spontaneously aggro");
});

test("hostileStateFor: clearing the exit margin returns to patrol", () => {
  const farOutside = { x: 25, z: 25 };
  assert.strictEqual(hostileStateFor(RECT, farOutside, true), false);
});

test("warden: full sequence — approach (patrol), enter (hostile+chase), retreat past margin (patrol again)", () => {
  let world = worldFromRows(spawn("w1", RECT, { x: 13, z: 13 }));
  const patrol = { x: 13, z: 13 };
  let t = 1;

  // approaching from outside: not yet hostile.
  let player = { x: 5, z: 13 };
  world = admit(world, decideStep(world, "w1", player, patrol, 0.3, t++));
  assert.strictEqual(isHostile(world, "w1"), false);

  // steps into the rect: hostile immediately, and starts closing distance on the player.
  player = { x: 12, z: 13 };
  const before = positionOf(world, "w1")!;
  world = admit(world, decideStep(world, "w1", player, patrol, 0.3, t++));
  assert.strictEqual(isHostile(world, "w1"), true);
  const afterEnter = positionOf(world, "w1")!;
  const distBefore = Math.hypot(before.x - player.x, before.z - player.z);
  const distAfter = Math.hypot(afterEnter.x - player.x, afterEnter.z - player.z);
  assert.ok(distAfter < distBefore, "hostile warden should close distance on the player");

  // player retreats to the doorway (just outside, within margin): STAYS hostile.
  player = { x: 16.3, z: 13 };
  world = admit(world, decideStep(world, "w1", player, patrol, 0.3, t++));
  assert.strictEqual(isHostile(world, "w1"), true, "should still be hostile just past the threshold");

  // player clears the margin entirely: returns to patrol.
  player = { x: 25, z: 25 };
  for (let i = 0; i < 5; i++) world = admit(world, decideStep(world, "w1", player, patrol, 0.3, t++));
  assert.strictEqual(isHostile(world, "w1"), false, "should have returned to patrol once clear of the margin");
});

test("warden: while patrolling (never hostile), a displaced warden drifts back toward its own patrol anchor, not the player", () => {
  let world = worldFromRows(spawn("w2", RECT, { x: 13, z: 13 }));
  // displace it away from its anchor (e.g. knocked off course), NOT via decideStep, so the drift the
  // test proves is decideStep's own doing, not just "it never left home".
  world = admit(world, [predicate(subjectKey("w2"), "at", "30,30", 1)]);
  const patrol = { x: 13, z: 13 };
  const player = { x: 0, z: 0 }; // outside the rect and far from the patrol anchor the whole time
  const startDist = Math.hypot(30 - patrol.x, 30 - patrol.z);
  let t = 2;
  for (let i = 0; i < 30; i++) world = admit(world, decideStep(world, "w2", player, patrol, 0.5, t++));
  assert.strictEqual(isHostile(world, "w2"), false);
  const pos = positionOf(world, "w2")!;
  const endDist = Math.hypot(pos.x - patrol.x, pos.z - patrol.z);
  assert.ok(endDist < startDist, `expected the displaced warden to close on its patrol anchor (start ${startDist}, end ${endDist})`);
  const distToPlayer = Math.hypot(pos.x - player.x, pos.z - player.z);
  assert.ok(endDist < distToPlayer, "should end up nearer its own anchor than the distant player");
});
