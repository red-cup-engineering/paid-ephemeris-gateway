/**
 * `tiling-rhombille.test` — geometry-level checks for the rhombille cell builder.
 *
 * Split into two tiers: pure `cells(size)` shape checks that need nothing but this module
 * (count, 4-sided polys, shade distribution, the equilateral-rhombus side-length property
 * that makes the construction correct in the first place), and a `compileGeometry`-backed
 * adjacency check that needs `tiling-core.mts` (owned by a sibling agent, built in
 * parallel). The adjacency test dynamically imports that sibling and skips itself — rather
 * than failing the whole file — if it is not there yet, so the tests this module is
 * actually responsible for still run and report green pre-integration.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cells } from './tiling-rhombille.mts';

/** Centered-hexagonal-number hex count for a radius-`s` patch, times 3 rhombi per hex. */
function expectedCount(size: number): number {
  const hexCount = 3 * size * (size + 1) + 1;
  return 3 * hexCount;
}

test('cell count matches 3 * (3*s*(s+1) + 1) across sizes', () => {
  for (const size of [0, 1, 2, 3, 4]) {
    assert.equal(cells(size).length, expectedCount(size), `size=${size}`);
  }
});

test('every polygon is a 4-sided rhombus (8 coordinate numbers)', () => {
  const raw = cells(2);
  assert.ok(raw.length > 0);
  for (const c of raw) {
    assert.equal(c.poly.length, 8, 'poly must encode exactly 4 (x,y) vertices');
  }
});

test('every rhombus has 4 equal-length sides (the construction is actually a rhombus)', () => {
  const raw = cells(2);
  for (const c of raw) {
    const [cx0, cy0, x0, y0, x1, y1, x2, y2] = c.poly;
    const side = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
    const s0 = side(cx0, cy0, x0, y0);
    const s1 = side(x0, y0, x1, y1);
    const s2 = side(x1, y1, x2, y2);
    const s3 = side(x2, y2, cx0, cy0);
    assert.ok(Math.abs(s0 - s1) < 1e-9, `side0 vs side1: ${s0} vs ${s1}`);
    assert.ok(Math.abs(s1 - s2) < 1e-9, `side1 vs side2: ${s1} vs ${s2}`);
    assert.ok(Math.abs(s2 - s3) < 1e-9, `side2 vs side3: ${s2} vs ${s3}`);
  }
});

test('shade is always 0|1|2, and all three orientations occur', () => {
  const raw = cells(2);
  const seen = new Set<number>();
  for (const c of raw) {
    assert.ok(c.shade === 0 || c.shade === 1 || c.shade === 2, `bad shade ${c.shade}`);
    seen.add(c.shade);
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
});

/**
 * The compileGeometry-backed tier. `tiling-core.mts` is another agent's file and may not
 * exist yet — dynamic import + try/catch keeps a missing sibling from failing this whole
 * suite; the test self-skips instead, matching the "note which tests are blocked" doctrine.
 */
type CompileGeometryFn = (
  tiling: string,
  raw: ReturnType<typeof cells>,
  paletteSize: number,
) => {
  cells: ReadonlyArray<{ id: number; cx: number; cy: number; neighbors: readonly number[] }>;
};

test('via compileGeometry: adjacency is symmetric and interior rhombi have 4 edge-neighbors', async (t) => {
  let compileGeometry: CompileGeometryFn | undefined;
  try {
    const core = (await import('./tiling-core.mts')) as { compileGeometry: CompileGeometryFn };
    compileGeometry = core.compileGeometry;
  } catch {
    compileGeometry = undefined;
  }
  if (!compileGeometry) {
    t.skip('tiling-core.mts not present yet (built by a sibling agent) — blocked pre-integration');
    return;
  }

  // size=1: the center hex (q=0,r=0) has all 6 neighbor hexes present, so its 3 rhombi
  // are fully interior — each should end up with exactly 4 edge-neighbors (2 spoke-shared
  // siblings within the same hex + 2 boundary-shared rhombi from the 2 adjacent hexes).
  const raw = cells(1);
  const geom = compileGeometry('rhombille', raw, 5);

  for (const cell of geom.cells) {
    for (const nb of cell.neighbors) {
      const other = geom.cells[nb];
      assert.ok(other, `neighbor id ${nb} of cell ${cell.id} must resolve to a real cell`);
      assert.ok(
        other.neighbors.includes(cell.id),
        `adjacency not symmetric: ${cell.id} -> ${nb} but not back`,
      );
    }
  }

  const centerHexRhombi = raw.filter((c) => Math.abs(c.poly[0] ?? NaN) < 1e-6 && Math.abs(c.poly[1] ?? NaN) < 1e-6);
  assert.equal(centerHexRhombi.length, 3, 'the center hex must contribute exactly 3 rhombi');

  // compileGeometry normalizes the bounding box to the origin (DESIGN.md: "bounding box
  // normalized to origin"), so raw (pre-shift) centroids must be shifted by the same
  // amount as the raw polygons' own bounding box before matching against compiled cells.
  const allX = raw.flatMap((c) => c.poly.filter((_, i) => i % 2 === 0));
  const allY = raw.flatMap((c) => c.poly.filter((_, i) => i % 2 === 1));
  const shiftX = -Math.min(...allX);
  const shiftY = -Math.min(...allY);

  for (const rc of centerHexRhombi) {
    const target = { cx: rc.cx + shiftX, cy: rc.cy + shiftY };
    const match = geom.cells.find((gc) => Math.hypot(gc.cx - target.cx, gc.cy - target.cy) < 1e-6);
    assert.ok(match, 'must find the compiled cell matching this raw rhombus centroid');
    assert.equal(match?.neighbors.length, 4, `interior rhombus expected 4 neighbors, got ${match?.neighbors.length}`);
  }
});
