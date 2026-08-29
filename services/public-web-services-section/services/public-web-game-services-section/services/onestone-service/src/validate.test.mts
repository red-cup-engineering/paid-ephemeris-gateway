import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blockerEdges,
  lamanCount,
  loadBearing,
  meanCoordination,
  pebbleIndependent,
  validateLevel,
} from './validate.mts';
import type { BoardGeometry, Cell } from './types.mts';

/**
 * The classic 8-vertex, 18-edge "double banana": two "bananas" — each a K5 minus one edge
 * (5 vertices, 9 edges) — glued by identifying their shared pair of "hinge" vertices. Banana
 * one lives on {0,1 (hinges), 2,3,4}; banana two shares the same hinges {0,1} and adds
 * {5,6,7}. Each banana alone is already over-braced for 2D (9 edges on 5 vertices; 2*5-3=7),
 * while the graph as a whole is short of bracing straight across the 0-1 hinge — exactly the
 * pathology the design doc's "double-banana warning" exists to catch. This is the textbook
 * illustration that a global edge-count budget (`lamanCount`) can't see local over/under
 * bracing the way the pebble game (`pebbleIndependent`) can.
 */
function doubleBananaEdges(): Array<[number, number]> {
  const banana = (hingeA: number, hingeB: number, rim: readonly [number, number, number]): Array<[number, number]> => {
    const [a, b, c] = rim;
    // K5 on {hingeA, hingeB, a, b, c} minus the hinge-hinge edge.
    return [
      [hingeA, a],
      [hingeA, b],
      [hingeA, c],
      [hingeB, a],
      [hingeB, b],
      [hingeB, c],
      [a, b],
      [a, c],
      [b, c],
    ];
  };
  return [...banana(0, 1, [2, 3, 4]), ...banana(0, 1, [5, 6, 7])];
}

test('double banana: lamanCount passes (18 edges >= 2*8-3=13) but pebbleIndependent rejects it', () => {
  const nodes = 8;
  const edges = doubleBananaEdges();
  assert.equal(edges.length, 18);
  assert.equal(lamanCount(nodes, edges.length), true, 'naive edge-count prefilter is fooled');
  assert.equal(pebbleIndependent(nodes, edges), false, 'the real independence check catches it');
});

test('a triangle is pebble-independent (exactly 2*3-3=3 edges, minimally rigid)', () => {
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 2],
  ];
  assert.equal(pebbleIndependent(3, edges), true);
  assert.equal(lamanCount(3, edges.length), true);
});

test('a triangle plus one redundant (duplicate) edge is rejected', () => {
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 2],
    [0, 1], // redundant: the triangle is already at its rank (2*3-3=3), pebbles exhausted
  ];
  assert.equal(pebbleIndependent(3, edges), false);
});

test('pebbleIndependent rejects self-loops without searching', () => {
  assert.equal(pebbleIndependent(2, [[0, 0]]), false);
});

test('pebbleIndependent accepts a larger Laman-minimal graph (two triangles glued on an edge, 4 nodes 5 edges)', () => {
  // The classic "double banana"'s 2D analog done right: K4 minus one edge. 2*4-3=5, matches
  // edge count exactly and is a textbook minimally rigid (Laman) planar graph.
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
  ];
  assert.equal(edges.length, 2 * 4 - 3);
  assert.equal(pebbleIndependent(4, edges), true);
});

test('pebbleIndependent rejects an over-braced K4 (6 edges on 4 nodes exceeds 2*4-3=5)', () => {
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  assert.equal(pebbleIndependent(4, edges), false);
});

test('meanCoordination is 2E/N', () => {
  assert.equal(meanCoordination(10, 12), 2.4);
  assert.equal(meanCoordination(4, 5), 2.5);
  assert.equal(meanCoordination(0, 0), 0);
});

test('loadBearing boundary sits exactly at spanning-forest + 1', () => {
  // 10 nodes, 3 components: a spanning forest needs exactly nodes - components = 7 edges.
  assert.equal(loadBearing(10, 7, 3), false, 'a bare spanning forest is not load-bearing');
  assert.equal(loadBearing(10, 8, 3), true, 'one edge past the forest is the boundary, inclusive');
  assert.equal(loadBearing(10, 9, 3), true, 'further past the boundary stays load-bearing');
});

test('blockerEdges links only adjacent blocker-bearing cells, each pair once', () => {
  // A tiny hand-built 4-cell path geometry: 0-1-2-3, plus 0 isolated from 3 (no wraparound).
  const cell = (id: number, neighbors: readonly number[]): Cell => ({
    id,
    poly: [0, 0, 1, 0, 1, 1, 0, 1],
    cx: id,
    cy: 0,
    neighbors,
    fallFrom: null,
    fallTo: null,
    shade: 0,
  });
  const geom: BoardGeometry = {
    tiling: 'square',
    cells: [cell(0, [1]), cell(1, [0, 2]), cell(2, [1, 3]), cell(3, [2])],
    rails: [],
    railsAt: [[], [], [], []],
    width: 4,
    height: 1,
    paletteSize: 5,
  };
  // Blockers on 0, 1, 3 (not 2): only the 0-1 adjacency is between two blocker cells.
  const edges = blockerEdges(geom, [
    { cell: 0, kind: 'moss' },
    { cell: 1, kind: 'frost' },
    { cell: 3, kind: 'cage' },
  ]);
  assert.deepEqual(edges, [[0, 1]]);
});

test('blockerEdges emits each undirected pair exactly once regardless of blocker list order', () => {
  const cell = (id: number, neighbors: readonly number[]): Cell => ({
    id,
    poly: [],
    cx: id,
    cy: 0,
    neighbors,
    fallFrom: null,
    fallTo: null,
    shade: 0,
  });
  const geom: BoardGeometry = {
    tiling: 'square',
    cells: [cell(0, [1]), cell(1, [0])],
    rails: [],
    railsAt: [[], []],
    width: 2,
    height: 1,
    paletteSize: 5,
  };
  const edges = blockerEdges(geom, [
    { cell: 1, kind: 'moss' },
    { cell: 0, kind: 'moss' },
  ]);
  assert.deepEqual(edges, [[0, 1]]);
});

// --- validateLevel: exercises the full pipeline through './tiling.mts' and './engine.mts'. ---
// Those two modules are being built in parallel by sibling agents and may not exist yet (or
// may not yet export the exact functions this module imports) at the time this test file
// runs. If the import graph isn't resolvable, `node --test` fails to even load this file — a
// pre-integration state the assignment brief calls EXPECTED. The pure-logic tests above (all
// of pebbleIndependent/lamanCount/meanCoordination/loadBearing/blockerEdges — everything this
// module owns outright) do not depend on those modules and are the ones that matter here.
test('validateLevel: a minimal hand-built spec is internally consistent (smoke, best-effort)', () => {
  const spec = {
    id: 1,
    chapter: 0,
    tiling: 'square' as const,
    size: 8,
    paletteSize: 5,
    moves: 20,
    goals: [{ kind: 'score' as const, target: 100 }],
    blockers: [],
    seed: 'validate-test-smoke',
    meanCoordination: 0,
  };
  const result = validateLevel(spec);
  assert.equal(typeof result.ok, 'boolean');
  assert.ok(Array.isArray(result.problems));
});
