import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cells } from './tiling-hex.mts';

/** Unit-circumradius pointy-top hex apothem: R * cos(30deg) = sqrt(3)/2. */
const INRADIUS = Math.sqrt(3) / 2;

test('cell count is 3*size*(size+1)+1 for a radius-size hex patch', () => {
  for (let size = 0; size <= 5; size++) {
    assert.equal(cells(size).length, 3 * size * (size + 1) + 1, `size ${size}`);
  }
});

test('every polygon is a hexagon (6 vertices, 12 coordinate numbers)', () => {
  for (const c of cells(4)) {
    assert.equal(c.poly.length, 12);
  }
});

test('every polygon vertex sits at unit circumradius from its own center', () => {
  for (const c of cells(3)) {
    for (let i = 0; i < c.poly.length; i += 2) {
      const x = c.poly[i]!;
      const y = c.poly[i + 1]!;
      const d = Math.hypot(x - c.cx, y - c.cy);
      assert.ok(Math.abs(d - 1) < 1e-9, `vertex ${i / 2} of cell at (${c.cx},${c.cy}) has radius ${d}`);
    }
  }
});

test('no two cell centers are closer than the inradius (apothem)', () => {
  const list = cells(3);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      assert.ok(d >= INRADIUS - 1e-9, `centers (${a.cx},${a.cy}) and (${b.cx},${b.cy}) are ${d} apart`);
    }
  }
});

test('shade is always 0 (hex has no cube-illusion field)', () => {
  for (const c of cells(2)) {
    assert.equal(c.shade, 0);
  }
});

// The remaining checks need `compileGeometry`, owned by another builder in this parallel
// run. `tiling-hex.mts` itself has no runtime dependency on `tiling-core.mts` (only an
// erased `import type`), so this file degrades to a skip rather than a hard failure when
// tiling-core.mts hasn't landed yet.
const tilingCorePath = fileURLToPath(new URL('./tiling-core.mts', import.meta.url));
const tilingCoreReady = existsSync(tilingCorePath);

test(
  'compileGeometry: interior cells have exactly 6 neighbors, and 3 rail families exist',
  { skip: tilingCoreReady ? false : 'tiling-core.mts not yet built (pre-integration)' },
  async () => {
    const { compileGeometry } = await import('./tiling-core.mts');
    const size = 3;
    const raw = cells(size);
    const geom = compileGeometry('hex', raw, 5);

    // Recompute axial coordinates in the same enumeration order `cells` used, so we can
    // identify which compiled cells are strictly interior (boundary cells legitimately
    // have fewer than 6 neighbors — the hex patch's edge is a real edge).
    const axial: Array<{ q: number; r: number }> = [];
    for (let r = -size; r <= size; r++) {
      const qMin = Math.max(-size, -r - size);
      const qMax = Math.min(size, -r + size);
      for (let q = qMin; q <= qMax; q++) axial.push({ q, r });
    }

    let checked = 0;
    for (let i = 0; i < geom.cells.length; i++) {
      const { q, r } = axial[i]!;
      const interior = Math.abs(q) < size && Math.abs(r) < size && Math.abs(q + r) < size;
      if (!interior) continue;
      checked++;
      assert.equal(geom.cells[i]!.neighbors.length, 6, `interior cell (${q},${r})`);
    }
    assert.ok(checked > 0, 'expected at least one interior cell at size 3');

    const families = new Set(geom.rails.map((rail) => rail.family));
    assert.equal(families.size, 3, `expected 3 rail families, got [${[...families].join(',')}]`);
  }
);
