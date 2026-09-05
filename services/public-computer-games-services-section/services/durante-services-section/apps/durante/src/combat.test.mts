// combat.test.mts — proves twist #3: A WEAPON'S EFFECT IS EVIDENCE. Hitscan geometry (nearest live
// demon in the crosshair cone, occluded by a nearer wall), and shoot()'s seam from intent to the wound
// row the caller must fold. The legacy combat.test.mjs this stands in for never existed on disk (port
// digest §1) — written fresh.

import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows, admitLog, grid, predicate } from "@red-cup-engineering/abrash/world";
import { hitDemon, shoot } from "./combat.mjs";
import { spawn } from "./demon.mjs";

function admit(world, rows) {
  let w = world;
  for (const r of rows) w = admitLog(w, r.e, [r]).world;
  return w;
}

test("hitDemon: a demon dead ahead within range and radius is struck", () => {
  const hit = hitDemon({ x: 0, z: 0, angle: 0 }, [{ id: 0, x: 5, z: 0, radius: 0.4 }]);
  assert.ok(hit);
  assert.equal(hit.id, 0);
  assert.ok(Math.abs(hit.dist - 5) < 1e-9);
});

test("hitDemon: a demon behind the player (negative `along`) is not struck", () => {
  const hit = hitDemon({ x: 0, z: 0, angle: 0 }, [{ id: 0, x: -5, z: 0, radius: 0.4 }]);
  assert.equal(hit, null);
});

test("hitDemon: a demon outside the crosshair's perpendicular radius is missed", () => {
  const hit = hitDemon({ x: 0, z: 0, angle: 0 }, [{ id: 0, x: 5, z: 3, radius: 0.4 }]);
  assert.equal(hit, null);
});

test("hitDemon: a demon beyond `range` is not struck", () => {
  const hit = hitDemon({ x: 0, z: 0, angle: 0 }, [{ id: 0, x: 100, z: 0, radius: 0.4 }], { range: 24 });
  assert.equal(hit, null);
});

test("hitDemon: of two demons in the cone, the NEARER one is struck", () => {
  const hit = hitDemon({ x: 0, z: 0, angle: 0 }, [
    { id: "far", x: 8, z: 0, radius: 0.4 },
    { id: "near", x: 3, z: 0, radius: 0.4 },
  ]);
  assert.equal(hit.id, "near");
});

test("shoot: a clear shot at a live demon LANDS and returns exactly one wound row", () => {
  let w = admit(worldFromRows([]), spawn(0, 5, 0, { toughness: 3 }));
  const g = grid(w);
  const result = shoot(w, g, { x: 0, z: 0, angle: 0 }, [0], 10);
  assert.equal(result.fired, true);
  assert.equal(result.landed, true);
  assert.equal(result.demonId, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].a, "not-alive");
});

test("shoot: a wall CLOSER than the demon occludes the shot — it misses", () => {
  let w = admit(worldFromRows([]), spawn(0, 5, 0, { toughness: 3 }));
  w = admit(w, [predicate("voxel:2,0", "solid", "wall", 1)]);
  const g = grid(w);
  const result = shoot(w, g, { x: 0, z: 0, angle: 0 }, [0], 10);
  assert.equal(result.landed, false);
  assert.equal(result.rows.length, 0);
});

test("shoot: a dead demon cannot be wounded again (excluded from the live-demon read)", () => {
  let w = admit(worldFromRows([]), spawn(0, 5, 0, { toughness: 1 }));
  w = admit(w, spawn(0, 5, 0, { toughness: 1 })); // no-op re-admit (deduped), then actually kill it:
  w = admit(w, [{ e: "demon:0", a: "not-alive", v: "demon", t: 2 }]);
  const g = grid(w);
  const result = shoot(w, g, { x: 0, z: 0, angle: 0 }, [0], 10);
  assert.equal(result.landed, false);
});

test("shoot: firing with no live demons in the id list still reports fired:true, landed:false", () => {
  const w = worldFromRows([]);
  const g = grid(w);
  const result = shoot(w, g, { x: 0, z: 0, angle: 0 }, [], 10);
  assert.equal(result.fired, true);
  assert.equal(result.landed, false);
});
