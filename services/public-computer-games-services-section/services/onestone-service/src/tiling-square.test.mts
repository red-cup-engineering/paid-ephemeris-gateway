import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cells } from './tiling-square.mts';

test('cells(size) emits size*size unit squares', () => {
  for (const size of [1, 3, 8]) {
    const raw = cells(size);
    assert.equal(raw.length, size * size);
  }
});

test('every cell is a closed 4-vertex unit square with centroid at its middle', () => {
  const raw = cells(4);
  for (const c of raw) {
    assert.equal(c.poly.length, 8);
    const xs = [c.poly[0], c.poly[2], c.poly[4], c.poly[6]];
    const ys = [c.poly[1], c.poly[3], c.poly[5], c.poly[7]];
    const minX = Math.min(...(xs as number[]));
    const maxX = Math.max(...(xs as number[]));
    const minY = Math.min(...(ys as number[]));
    const maxY = Math.max(...(ys as number[]));
    assert.equal(maxX - minX, 1);
    assert.equal(maxY - minY, 1);
    assert.equal(c.cx, minX + 0.5);
    assert.equal(c.cy, minY + 0.5);
    assert.equal(c.shade, 0);
  }
});

test('grid tiles the plane with no gaps or overlaps: every non-boundary edge is shared by exactly two cells', () => {
  const size = 5;
  const raw = cells(size);
  const edgeCounts = new Map<string, number>();
  const key = (x0: number, y0: number, x1: number, y1: number): string => {
    const a = `${x0.toFixed(4)},${y0.toFixed(4)}`;
    const b = `${x1.toFixed(4)},${y1.toFixed(4)}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };
  for (const c of raw) {
    const p = c.poly;
    for (let i = 0; i < p.length; i += 2) {
      const x0 = p[i] as number;
      const y0 = p[i + 1] as number;
      const j = (i + 2) % p.length;
      const x1 = p[j] as number;
      const y1 = p[j + 1] as number;
      const k = key(x0, y0, x1, y1);
      edgeCounts.set(k, (edgeCounts.get(k) ?? 0) + 1);
    }
  }
  let interior = 0;
  let boundary = 0;
  for (const count of edgeCounts.values()) {
    assert.ok(count === 1 || count === 2, `edge shared by unexpected count ${count}`);
    if (count === 2) interior++;
    else boundary++;
  }
  // interior edges: 2 * size * (size-1) for a size x size grid (rows + columns of shared edges)
  assert.equal(interior, 2 * size * (size - 1));
  // boundary edges: perimeter, 4 * size
  assert.equal(boundary, 4 * size);
});

test('row-major layout: row 0 sits above row 1 (smaller y), consistent with +y-down gravity', () => {
  const raw = cells(3);
  const first = raw[0];
  const belowFirst = raw[3]; // row 1, col 0
  assert.ok(first !== undefined && belowFirst !== undefined);
  assert.ok(belowFirst.cy > first.cy);
  assert.equal(first.cx, belowFirst.cx);
});
