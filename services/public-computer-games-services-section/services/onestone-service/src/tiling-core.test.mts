/**
 * `tiling-core.test` — hand-built raw cells, not a real tiling generator, so these tests pin
 * down `compileGeometry`'s contract (adjacency, gravity, rails) independent of whether
 * tiling-square/-hex/-rhombille exist yet or agree with it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileGeometry } from './tiling-core.mts';
import type { RawCell } from './tiling-core.mts';

/** n x n unit squares, row-major ids (row 0 = top, +y = down = gravity direction). */
function squarePatch(n: number): RawCell[] {
  const cells: RawCell[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = col;
      const y = row;
      cells.push({
        poly: [x, y, x + 1, y, x + 1, y + 1, x, y + 1],
        cx: x + 0.5,
        cy: y + 0.5,
        shade: 0,
      });
    }
  }
  return cells;
}

/** Two unit squares stacked vertically: cell 0 directly above cell 1. */
function twoCellVertical(): RawCell[] {
  return [
    { poly: [0, 0, 1, 0, 1, 1, 0, 1], cx: 0.5, cy: 0.5, shade: 0 },
    { poly: [0, 1, 1, 1, 1, 2, 0, 2], cx: 0.5, cy: 1.5, shade: 0 },
  ];
}

test('3x3 square patch: adjacency is symmetric', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  for (const cell of geom.cells) {
    for (const nid of cell.neighbors) {
      assert.ok(geom.cells[nid]!.neighbors.includes(cell.id), `${nid} should list ${cell.id} back`);
    }
  }
});

test('3x3 square patch: interior/edge/corner cells have the expected degree', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  // id layout: 0 1 2 / 3 4 5 / 6 7 8 (row-major)
  assert.equal(geom.cells[0]!.neighbors.length, 2); // corner
  assert.equal(geom.cells[1]!.neighbors.length, 3); // top edge
  assert.equal(geom.cells[4]!.neighbors.length, 4); // center
  // no diagonal adjacency: corner 0 must not list its diagonal neighbor 4
  assert.ok(!geom.cells[0]!.neighbors.includes(4));
});

test('3x3 square patch: fallTo chains point down a column and end at the bottom row', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  // column 0: 0 -> 3 -> 6 -> null
  assert.equal(geom.cells[0]!.fallTo, 3);
  assert.equal(geom.cells[3]!.fallTo, 6);
  assert.equal(geom.cells[6]!.fallTo, null);
  // every bottom-row cell (6,7,8) is a gravity dead end
  assert.equal(geom.cells[7]!.fallTo, null);
  assert.equal(geom.cells[8]!.fallTo, null);
});

test('3x3 square patch: fallFrom is the strict inverse of fallTo', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  for (const cell of geom.cells) {
    if (cell.fallTo !== null) {
      assert.equal(geom.cells[cell.fallTo]!.fallFrom, cell.id);
    }
    if (cell.fallFrom !== null) {
      assert.equal(geom.cells[cell.fallFrom]!.fallTo, cell.id);
    }
  }
});

test('3x3 square patch: spawn mouths are exactly the top row', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  const mouths = geom.cells.filter((c) => c.fallFrom === null).map((c) => c.id).sort((a, b) => a - b);
  assert.deepEqual(mouths, [0, 1, 2]);
});

test('3x3 square patch: exactly 3 row rails + 3 column rails, each length 3', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  assert.equal(geom.rails.length, 6);
  for (const rail of geom.rails) assert.equal(rail.cells.length, 3);

  const families = new Set(geom.rails.map((r) => r.family));
  assert.equal(families.size, 2, 'rows and columns are two distinct direction families');
  for (const fam of families) {
    assert.equal(geom.rails.filter((r) => r.family === fam).length, 3);
  }

  const asSets = geom.rails.map((r) => [...r.cells].sort((a, b) => a - b).join(','));
  // rows
  assert.ok(asSets.includes('0,1,2'));
  assert.ok(asSets.includes('3,4,5'));
  assert.ok(asSets.includes('6,7,8'));
  // columns
  assert.ok(asSets.includes('0,3,6'));
  assert.ok(asSets.includes('1,4,7'));
  assert.ok(asSets.includes('2,5,8'));
});

test('3x3 square patch: railsAt records exactly the row-rail and column-rail for every cell', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  for (const cell of geom.cells) {
    assert.equal(geom.railsAt[cell.id]!.length, 2);
    for (const railIdx of geom.railsAt[cell.id]!) {
      assert.ok(geom.rails[railIdx]!.cells.includes(cell.id));
    }
  }
});

test('3x3 square patch: bounding box is normalized to the origin', () => {
  const geom = compileGeometry('square', squarePatch(3), 5);
  assert.equal(geom.width, 3);
  assert.equal(geom.height, 3);
  let minX = Infinity;
  let minY = Infinity;
  for (const cell of geom.cells) {
    for (let i = 0; i < cell.poly.length; i += 2) {
      minX = Math.min(minX, cell.poly[i]!);
      minY = Math.min(minY, cell.poly[i + 1]!);
    }
  }
  assert.equal(minX, 0);
  assert.equal(minY, 0);
});

test('an offset raw patch still normalizes to the origin (compileGeometry ignores input origin)', () => {
  const offset = squarePatch(3).map((c) => ({
    poly: c.poly.map((v, i) => (i % 2 === 0 ? v + 40 : v - 17)),
    cx: c.cx + 40,
    cy: c.cy - 17,
    shade: c.shade,
  }));
  const geom = compileGeometry('square', offset, 5);
  assert.equal(geom.width, 3);
  assert.equal(geom.height, 3);
  assert.equal(geom.cells[0]!.cx, 0.5);
  assert.equal(geom.cells[0]!.cy, 0.5);
});

test('paletteSize passes through unchanged', () => {
  const geom = compileGeometry('square', squarePatch(3), 7);
  assert.equal(geom.paletteSize, 7);
});

test('2-cell sanity: vertical pair gets a fallTo/fallFrom link but no rail (chain too short)', () => {
  const geom = compileGeometry('square', twoCellVertical(), 5);

  assert.equal(geom.cells.length, 2);
  assert.deepEqual([...geom.cells[0]!.neighbors], [1]);
  assert.deepEqual([...geom.cells[1]!.neighbors], [0]);

  // cell 0 is above cell 1 -> falls into it
  assert.equal(geom.cells[0]!.fallTo, 1);
  assert.equal(geom.cells[1]!.fallFrom, 0);
  // bottom of the field / nothing above the top
  assert.equal(geom.cells[1]!.fallTo, null);
  assert.equal(geom.cells[0]!.fallFrom, null);

  // only 2 cells: a straight chain here can be at most length 2, below the >=3 rail minimum
  assert.equal(geom.rails.length, 0);
  assert.deepEqual(geom.railsAt[0], []);
  assert.deepEqual(geom.railsAt[1], []);
});

test('2-cell sanity: horizontal pair has no gravity link at all (sideways dot is below the 0.25 threshold)', () => {
  const horizontal: RawCell[] = [
    { poly: [0, 0, 1, 0, 1, 1, 0, 1], cx: 0.5, cy: 0.5, shade: 0 },
    { poly: [1, 0, 2, 0, 2, 1, 1, 1], cx: 1.5, cy: 0.5, shade: 0 },
  ];
  const geom = compileGeometry('square', horizontal, 5);
  assert.equal(geom.cells[0]!.fallTo, null);
  assert.equal(geom.cells[1]!.fallTo, null);
  assert.equal(geom.cells[0]!.fallFrom, null);
  assert.equal(geom.cells[1]!.fallFrom, null);
  // both cells are spawn mouths
  assert.equal(geom.cells.filter((c) => c.fallFrom === null).length, 2);
});

test('empty raw input compiles to an empty geometry', () => {
  const geom = compileGeometry('square', [], 5);
  assert.deepEqual(geom.cells, []);
  assert.deepEqual(geom.rails, []);
  assert.deepEqual(geom.railsAt, []);
  assert.equal(geom.width, 0);
  assert.equal(geom.height, 0);
});
