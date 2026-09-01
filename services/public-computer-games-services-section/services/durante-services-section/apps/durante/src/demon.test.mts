// demon.test.mts — proves twist #2: THE ENEMY IS HELD ⊤. A demon's vitality is the FOLD of its `alive`
// cell: spawn affirms, each wound denies; between the first wound and the kill it reads WOUNDED (⊤,
// alive AND denied, still hunting), and only settles to DEAD once wounds reach toughness — the kill is a
// settle, not a subtraction. The legacy demon.test.mjs this stands in for never existed on disk (port
// digest §1) — written fresh, proving the exact t -> ⊤ -> f progression the legacy README described.

import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog } from "@red-cup-engineering/abrash/world";
import {
  spawn, wound, move, vitalityOf, positionOf, speedOf, chaseStep, woundsOf, VITAL, demonKey,
} from "./demon.mjs";

function admit(world, rows) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("spawn: produces alive/at/toughness/speed rows for the demon's subject", () => {
  const rows = spawn(0, 3, 4, { toughness: 2, speed: 0.2 });
  assert.equal(rows.length, 4);
  assert.ok(rows.every((r) => r.e === "demon:0"));
});

test("vitalityOf: a freshly spawned demon reads ALIVE (t), hunting, zero wounds", () => {
  const w = admit(worldFromRows([]), spawn(0, 3, 4, { toughness: 3 }));
  const v = vitalityOf(w, 0);
  assert.equal(v.vital, VITAL.ALIVE);
  assert.equal(v.alive, true);
  assert.equal(v.wounds, 0);
});

test("vitalityOf: THE PROGRESSION — one wound short of toughness reads WOUNDED (⊤), still hunting", () => {
  let w = admit(worldFromRows([]), spawn(0, 3, 4, { toughness: 3 }));
  w = admit(w, [wound(0, 2)]);
  const v = vitalityOf(w, 0);
  assert.equal(v.vital, VITAL.WOUNDED);
  assert.equal(v.alive, true);
  assert.equal(v.wounds, 1);
});

test("vitalityOf: wounds reaching toughness SETTLES the demon to DEAD (f), no longer hunting", () => {
  let w = admit(worldFromRows([]), spawn(0, 3, 4, { toughness: 3 }));
  w = admit(w, [wound(0, 2), wound(0, 3), wound(0, 4)]);
  const v = vitalityOf(w, 0);
  assert.equal(v.vital, VITAL.DEAD);
  assert.equal(v.alive, false);
  assert.equal(v.wounds, 3);
});

test("vitalityOf: an un-spawned demon reads ABSENT (⊥), not on the board", () => {
  const v = vitalityOf(worldFromRows([]), 99);
  assert.equal(v.vital, VITAL.ABSENT);
  assert.equal(v.alive, false);
});

test("woundsOf: counts every deny-witness on the alive cell — evidence linear, none overwritten", () => {
  let w = admit(worldFromRows([]), spawn(0, 3, 4, { toughness: 5 }));
  w = admit(w, [wound(0, 2), wound(0, 3)]);
  assert.equal(woundsOf(w, 0), 2);
});

test("positionOf: reads the demon's functional `at` cell (latest-t wins)", () => {
  let w = admit(worldFromRows([]), spawn(0, 3, 4));
  w = admit(w, [move(0, 5, 6, 2)]);
  assert.deepEqual(positionOf(w, 0), { x: 5, z: 6 });
});

test("positionOf: an un-spawned demon has no position", () => {
  assert.equal(positionOf(worldFromRows([]), 42), null);
});

test("speedOf: reads the demon's functional `speed` cell, default 0.12 if never spawned", () => {
  let w = admit(worldFromRows([]), spawn(0, 0, 0, { speed: 0.3 }));
  assert.equal(speedOf(w, 0), 0.3);
  assert.equal(speedOf(worldFromRows([]), 999), 0.12);
});

test("chaseStep: steps exactly `speed` units toward the target, along the straight line", () => {
  const step = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 2);
  assert.ok(Math.abs(step.x - 2) < 1e-9);
  assert.ok(Math.abs(step.z - 0) < 1e-9);
});

test("chaseStep: from === to yields no movement (normalize of the zero vector is safe)", () => {
  const step = chaseStep({ x: 3, z: 3 }, { x: 3, z: 3 }, 1);
  assert.deepEqual(step, { x: 3, z: 3 });
});

test("demonKey: names the trace subject demon:<id>", () => {
  assert.equal(demonKey(7), "demon:7");
});
