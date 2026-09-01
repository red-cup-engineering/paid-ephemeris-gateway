/**
 * Registry-level tests: build all three chapter-1 geometries through `buildGeometry` and
 * check the tiling-agnostic invariants `tiling-core.compileGeometry` promises, plus the
 * per-tiling cell-count math this registry is trusted to wire up correctly.
 *
 * NOTE (pre-integration): this suite imports `tiling-core.mts`, `tiling-hex.mts`, and
 * `tiling-rhombille.mts`, which are being written in parallel by sibling agents against the
 * same DESIGN.md contract and may not exist yet at the time this file is first run. If any
 * of those imports are missing, `node --test` fails to even load this module — that failure
 * is EXPECTED pre-integration and is not a defect in the files this agent owns
 * (tiling-square.mts / tiling.mts). Re-run once the sibling modules land.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGeometry, defaultSize } from './tiling.mts';
import type { BoardGeometry } from './types.mts';

const PALETTE = 5;

/** Cell count of a radius-`s` pointy-top hex patch (|q|,|r|,|q+r| <= s): 3s(s+1)+1. */
function hexCellCount(s: number): number {
  return 3 * s * (s + 1) + 1;
}

function assertAdjacencySymmetric(geom: BoardGeometry): void {
  for (const cell of geom.cells) {
    for (const n of cell.neighbors) {
      const neighbor = geom.cells[n];
      assert.ok(neighbor !== undefined, `neighbor id ${n} out of range`);
      assert.ok(
        neighbor.neighbors.includes(cell.id),
        `adjacency not symmetric: ${cell.id} -> ${n} but not back`,
      );
    }
  }
}

function assertFallFromInverse(geom: BoardGeometry): void {
  for (const cell of geom.cells) {
    if (cell.fallTo !== null) {
      const target = geom.cells[cell.fallTo];
      assert.ok(target !== undefined);
      assert.equal(target.fallFrom, cell.id, `fallTo/fallFrom not inverse at ${cell.id}`);
    }
  }
}

function assertNonMouthCellsHaveFallFrom(geom: BoardGeometry): void {
  // A "mouth" is a cell with no fallFrom (it refills from off-board). Every other cell MUST
  // have a fallFrom, or refill/cascade would have nowhere to draw a replacement tile from.
  for (const cell of geom.cells) {
    if (cell.fallFrom === null) continue; // mouth: fine
    assert.ok(
      geom.cells.some((c) => c.id === cell.fallFrom),
      `cell ${cell.id} has dangling fallFrom ${cell.fallFrom}`,
    );
  }
}

test('square geometry: size*size cells, symmetric adjacency, fallFrom coverage, 16 rails on 8x8', () => {
  const size = 8;
  const geom = buildGeometry('square', size, PALETTE);
  assert.equal(geom.cells.length, size * size);
  assertAdjacencySymmetric(geom);
  assertFallFromInverse(geom);
  assertNonMouthCellsHaveFallFrom(geom);
  // 8x8 square board: 8 row rails + 8 column rails = 16.
  assert.equal(geom.rails.length, 16);
});

test('hex geometry: 3s(s+1)+1 cells, symmetric adjacency, fallFrom coverage', () => {
  const size = 4;
  const geom = buildGeometry('hex', size, PALETTE);
  assert.equal(geom.cells.length, hexCellCount(size));
  assertAdjacencySymmetric(geom);
  assertFallFromInverse(geom);
  assertNonMouthCellsHaveFallFrom(geom);
});

test('rhombille geometry: 3x the hex-patch cell count at the same radius, symmetric adjacency, fallFrom coverage', () => {
  const size = 3;
  const geom = buildGeometry('rhombille', size, PALETTE);
  // Per DESIGN.md: "3 rhombi per hex of a radius-`size` hex patch".
  assert.equal(geom.cells.length, 3 * hexCellCount(size));
  assertAdjacencySymmetric(geom);
  assertFallFromInverse(geom);
  assertNonMouthCellsHaveFallFrom(geom);
});

test('defaultSize matches DESIGN.md per-tiling defaults', () => {
  assert.equal(defaultSize('square'), 8);
  assert.equal(defaultSize('hex'), 4);
  assert.equal(defaultSize('rhombille'), 3);
});

test('every geometry has at least one spawn mouth (a cell with no fallFrom)', () => {
  for (const [tiling, size] of [
    ['square', defaultSize('square')],
    ['hex', defaultSize('hex')],
    ['rhombille', defaultSize('rhombille')],
  ] as const) {
    const geom = buildGeometry(tiling, size, PALETTE);
    assert.ok(
      geom.cells.some((c) => c.fallFrom === null),
      `${tiling} has no spawn mouth`,
    );
  }
});
