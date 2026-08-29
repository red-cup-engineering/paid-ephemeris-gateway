import { test } from "node:test";
import assert from "node:assert/strict";
import { circleLayout, pointToward } from "../js/layout.mjs";

test("circleLayout places a single node exactly at the center", () => {
  const positions = circleLayout(["a"], { cx: 100, cy: 100 });
  assert.deepEqual(positions.get("a"), { x: 100, y: 100 });
});

test("circleLayout of an empty list returns an empty map", () => {
  const positions = circleLayout([]);
  assert.equal(positions.size, 0);
});

test("circleLayout places every node at the same distance (radius) from the center", () => {
  const positions = circleLayout(["a", "b", "c", "d"], { radius: 100, cx: 0, cy: 0 });
  for (const [, p] of positions) {
    const dist = Math.hypot(p.x, p.y);
    assert.ok(Math.abs(dist - 100) < 1e-9, `expected radius 100, got ${dist}`);
  }
});

test("circleLayout is deterministic: same input, same output", () => {
  const a = circleLayout(["x", "y", "z"]);
  const b = circleLayout(["x", "y", "z"]);
  assert.deepEqual([...a.entries()], [...b.entries()]);
});

test("circleLayout's first id is placed at 12 o'clock (straight up from center)", () => {
  const positions = circleLayout(["a", "b", "c"], { radius: 100, cx: 0, cy: 0 });
  const p = positions.get("a")!;
  assert.ok(Math.abs(p.x) < 1e-9, `expected x~0, got ${p.x}`);
  assert.ok(p.y < 0, `expected negative y (up, in SVG's y-down coordinate space), got ${p.y}`);
});

test("pointToward shortens the segment from the b end by exactly `shorten` px", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  const p = pointToward(a, b, 20);
  assert.ok(Math.abs(p.x - 80) < 1e-9);
  assert.ok(Math.abs(p.y - 0) < 1e-9);
});

test("pointToward with coincident points does not divide by zero (returns b, not NaN)", () => {
  const p = pointToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 10);
  assert.equal(Number.isNaN(p.x), false);
  assert.equal(Number.isNaN(p.y), false);
  assert.deepEqual(p, { x: 5, y: 5 });
});
