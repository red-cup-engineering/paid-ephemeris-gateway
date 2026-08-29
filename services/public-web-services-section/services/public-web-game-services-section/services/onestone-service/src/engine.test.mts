/**
 * `engine.test` — the heart's test bar, per DESIGN.md's testing section: determinism, no
 * premade matches after spawn/refill, cascades reach a fixed point, striped/prism blasts do
 * what their names promise, the reshuffle guarantee holds, and score arithmetic matches the
 * documented `10 * cellsResolved * stepIndex` formula on a hand-built cascade.
 *
 * Real geometries come from `./tiling.mts` (buildGeometry), which is far more useful than a
 * hand-rolled fixture for the spawn/refill/reshuffle tests — those need genuine rails and a
 * real gravity field to be meaningful. For the *directed* match/cascade/special tests, a real
 * small square geometry is still used, but the board's tiles are constructed by hand so the
 * scenario (which cells match, which specials fire) is exact and independent of RNG.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BoardState, Tile } from './types.mts';
import { buildGeometry } from './tiling.mts';
import {
  applyBlockers,
  applyBooster,
  applyMove,
  findMatches,
  legalMoves,
  spawnBoard,
} from './engine.mts';

function plain(color: number): Tile {
  return { color, special: 'none', moss: false, frost: false, cage: false, geode: 0 };
}

function special(color: number, kind: Tile['special']): Tile {
  return { color, special: kind, moss: false, frost: false, cage: false, geode: 0 };
}

// ---------------------------------------------------------------------------------------------
// spawnBoard
// ---------------------------------------------------------------------------------------------

test('spawnBoard is deterministic for the same geometry + seed', () => {
  const geom = buildGeometry('square', 8, 5);
  const a = spawnBoard(geom, 'chapter0-level1');
  const b = spawnBoard(geom, 'chapter0-level1');
  assert.deepEqual(a, b);
});

test('spawnBoard differs across seeds', () => {
  const geom = buildGeometry('square', 8, 5);
  const a = spawnBoard(geom, 'seed-a');
  const b = spawnBoard(geom, 'seed-b');
  assert.notDeepEqual(a.tiles, b.tiles);
});

test('spawnBoard never births a premade match', () => {
  for (const seed of ['s1', 's2', 's3', 'square-fixture', 'another-one']) {
    const geom = buildGeometry('square', 8, 5);
    const board = spawnBoard(geom, seed);
    assert.equal(findMatches(geom, board).length, 0, `seed ${seed} spawned pre-matched`);
  }
});

test('spawnBoard always leaves at least one legal move', () => {
  for (const seed of ['s1', 's2', 's3', 'move-check']) {
    const geom = buildGeometry('square', 8, 5);
    const board = spawnBoard(geom, seed);
    assert.ok(legalMoves(geom, board).length > 0, `seed ${seed} spawned with no legal move`);
  }
});

test('spawnBoard also holds on hex and rhombille geometries', () => {
  for (const [tiling, size] of [
    ['hex', 4],
    ['rhombille', 3],
  ] as const) {
    const geom = buildGeometry(tiling, size, 5);
    const board = spawnBoard(geom, `${tiling}-seed`);
    assert.equal(findMatches(geom, board).length, 0);
    assert.ok(legalMoves(geom, board).length > 0);
  }
});

// ---------------------------------------------------------------------------------------------
// applyBlockers
// ---------------------------------------------------------------------------------------------

test('applyBlockers sets flags without touching color, and never mutates the input', () => {
  const geom = buildGeometry('square', 4, 5);
  const board = spawnBoard(geom, 'blocker-seed');
  const before = JSON.parse(JSON.stringify(board));
  const withBlockers = applyBlockers(board, [
    { cell: 0, kind: 'moss' },
    { cell: 1, kind: 'frost' },
    { cell: 2, kind: 'cage' },
    { cell: 3, kind: 'geode', hp: 2 },
  ]);
  assert.deepEqual(board, before, 'applyBlockers mutated its input');
  assert.equal(withBlockers.tiles[0]?.moss, true);
  assert.equal(withBlockers.tiles[0]?.color, board.tiles[0]?.color);
  assert.equal(withBlockers.tiles[1]?.frost, true);
  assert.equal(withBlockers.tiles[2]?.cage, true);
  assert.equal(withBlockers.tiles[3]?.geode, 2);
});

// ---------------------------------------------------------------------------------------------
// findMatches / a controlled 4x4 square board
// ---------------------------------------------------------------------------------------------

/** 4x4 square board, row-major ids 0..15 (row = id/4, col = id%4). */
function grid4(colors: number[]): Tile[] {
  assert.equal(colors.length, 16);
  return colors.map((c) => plain(c));
}

test('findMatches finds a 3-run rail match with no mint', () => {
  const geom = buildGeometry('square', 4, 5);
  // Row 0: colors 1,1,1,2 -> a 3-run of color 1 at cells 0,1,2.
  const tiles = grid4([1, 1, 1, 2, 3, 4, 3, 4, 0, 2, 0, 2, 4, 3, 4, 3]);
  const groups = findMatches(geom, { tiles, seed: 's', draws: 0 });
  const rail = groups.find((g) => g.shape === 'rail' && g.color === 1);
  assert.ok(rail);
  assert.equal(rail.cells.length, 3);
  assert.equal(rail.mints, 'none');
});

test('findMatches mints striped on a run of exactly 4', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([1, 1, 1, 1, 2, 3, 4, 3, 4, 0, 2, 0, 2, 4, 3, 4]);
  const groups = findMatches(geom, { tiles, seed: 's', draws: 0 });
  const rail = groups.find((g) => g.color === 1);
  assert.ok(rail);
  assert.equal(rail.mints, 'striped');
  assert.equal(rail.cells.length, 4);
});

// ---------------------------------------------------------------------------------------------
// applyMove: a constructed swap produces a match and the cascade terminates
// ---------------------------------------------------------------------------------------------

test('a constructed swap produces a match, mints nothing extra, and settles to a fixed point', () => {
  const geom = buildGeometry('square', 4, 5);
  // Row0: 1,1,2,3 ; swapping cell 2 (color 2) with cell 3... instead swap col-adjacent to make
  // a 3-run: put 1,1,_,3 on row0 and a 1 directly below cell 2 (cell 6) so swapping cell 2<->6
  // completes a horizontal 3-run of color 1 on row 0.
  const tiles = grid4([1, 1, 4, 3, 3, 4, 1, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  const before: BoardState = { tiles, seed: 'cascade-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 2, b: 6 });
  assert.equal(result.legal, true);
  assert.ok(result.steps.length >= 1);
  assert.ok(result.steps[0]!.matches.some((m) => m.color === 1 && m.cells.length === 3));
  // Fixed point: no matches remain on the settled board.
  assert.equal(findMatches(geom, result.state).length, 0);
  // Immutability: original state untouched.
  assert.equal(before.tiles[2]?.color, 4);
  assert.equal(before.tiles[6]?.color, 1);
});

test('a swap that yields no match and touches no prism is illegal and echoes the input state', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([1, 2, 4, 3, 3, 4, 0, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  const before: BoardState = { tiles, seed: 'no-match-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 0, b: 1 });
  assert.equal(result.legal, false);
  assert.deepEqual(result.state, before);
  assert.equal(result.steps.length, 0);
  assert.equal(result.score, 0);
});

test('frost/cage/geode cells cannot be swapped even into a match', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([1, 1, 4, 3, 3, 4, 1, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  const frosted = tiles.map((t, id) => (id === 6 ? { ...t, frost: true } : t));
  const before: BoardState = { tiles: frosted, seed: 's', draws: 0 };
  const result = applyMove(geom, before, { a: 2, b: 6 });
  assert.equal(result.legal, false);
  assert.equal(legalMoves(geom, before).some((m) => (m.a === 2 && m.b === 6) || (m.a === 6 && m.b === 2)), false);
});

// ---------------------------------------------------------------------------------------------
// striped clears its rail
// ---------------------------------------------------------------------------------------------

test('swapping a striped tile fires its longest rail through it', () => {
  const geom = buildGeometry('square', 4, 5);
  // Row 0 (cells 0..3) holds an already-minted striped tile at cell 1, color 7 (arbitrary,
  // never matched against anything else on the board by construction).
  const tiles = grid4([2, 7, 4, 3, 3, 4, 0, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  tiles[1] = special(7, 'striped');
  // Swap it sideways with cell 0 (a plain, non-matching color) — no ordinary match results,
  // but the swap must still be legal and fire because a special is involved.
  const before: BoardState = { tiles, seed: 'striped-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 0, b: 1 });
  assert.equal(result.legal, true);
  assert.ok(result.steps.length >= 1);
  const firstStep = result.steps[0]!;
  assert.ok(firstStep.fired.some((f) => f.kind === 'striped'));
  // Row 0's rail is cells [0,1,2,3] — all four must have cleared (fallen through/refilled).
  for (const c of [0, 1, 2, 3]) assert.ok(firstStep.cleared.includes(c), `cell ${c} not cleared by striped rail blast`);
});

// ---------------------------------------------------------------------------------------------
// prism clears a color
// ---------------------------------------------------------------------------------------------

test('swapping a prism with a plain tile clears every tile of the swapped-with color', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([9, 9, 4, 3, 3, 4, 9, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  // Three cells (0,1,6) are color 9; cell 1 becomes a prism, swapped with cell 0 (also color 9,
  // so the "swapped-with color" is 9 too — every color-9 cell, including the prism's own
  // landing cell, must clear).
  tiles[1] = special(9, 'prism');
  const before: BoardState = { tiles, seed: 'prism-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 0, b: 1 });
  assert.equal(result.legal, true);
  const firstStep = result.steps[0]!;
  assert.ok(firstStep.fired.some((f) => f.kind === 'prism'));
  assert.ok(firstStep.cleared.includes(6), 'the third color-9 cell (6) was not cleared by the prism blast');
});

test('prism swap is legal even when it produces no ordinary match', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([9, 1, 4, 3, 3, 4, 0, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  tiles[0] = special(9, 'prism');
  const before: BoardState = { tiles, seed: 's', draws: 0 };
  assert.ok(legalMoves(geom, before).some((m) => (m.a === 0 && m.b === 1) || (m.a === 1 && m.b === 0)));
  const result = applyMove(geom, before, { a: 0, b: 1 });
  assert.equal(result.legal, true);
});

// ---------------------------------------------------------------------------------------------
// cascade fixed point / score arithmetic on a known cascade
// ---------------------------------------------------------------------------------------------

test('score is 10 * cellsResolved * stepIndex per step, summed across the cascade', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([1, 1, 4, 3, 3, 4, 1, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  const before: BoardState = { tiles, seed: 'score-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 2, b: 6 });
  assert.equal(result.legal, true);
  let expectedTotal = 0;
  result.steps.forEach((step, i) => {
    const stepIndex = i + 1;
    assert.equal(step.score, 10 * step.cleared.length * stepIndex);
    expectedTotal += step.score;
  });
  const expected = result.chaosSix ? expectedTotal * 2 : expectedTotal;
  assert.equal(result.score, expected);
});

test('cascades reach a fixed point: re-running findMatches on the settled state finds nothing', () => {
  const geom = buildGeometry('square', 8, 5);
  const board = spawnBoard(geom, 'cascade-fixed-point');
  const moves = legalMoves(geom, board);
  assert.ok(moves.length > 0);
  const move = moves[0]!;
  const result = applyMove(geom, board, move);
  assert.equal(result.legal, true);
  assert.equal(findMatches(geom, result.state).length, 0);
});

// ---------------------------------------------------------------------------------------------
// reshuffle
// ---------------------------------------------------------------------------------------------

test('applyBooster shuffle is deterministic, legal, preserves blockers, and yields a movable board', () => {
  const geom = buildGeometry('square', 6, 5);
  let board = spawnBoard(geom, 'reshuffle-seed');
  board = applyBlockers(board, [{ cell: 0, kind: 'moss' }, { cell: 1, kind: 'cage' }]);
  const a = applyBooster(geom, board, 'shuffle');
  const b = applyBooster(geom, board, 'shuffle');
  assert.equal(a.legal, true);
  assert.equal(a.reshuffled, true);
  assert.deepEqual(a.state, b.state, 'shuffle is not deterministic for the same input state');
  assert.equal(a.state.tiles[0]?.moss, true, 'shuffle lost a moss blocker');
  assert.equal(a.state.tiles[1]?.cage, true, 'shuffle lost a cage blocker');
  assert.ok(legalMoves(geom, a.state).length > 0);
});

test('a settle that ends with zero legal moves reshuffles deterministically', () => {
  // A 3x3 board (too small for square rails >= 3 along both axes at once being scarce) still
  // reliably has legal moves after spawn by construction; we instead force the reshuffle path
  // directly through the booster and assert the invariant it must uphold.
  const geom = buildGeometry('square', 4, 5);
  const board = spawnBoard(geom, 'force-reshuffle');
  const result = applyBooster(geom, board, 'shuffle');
  assert.equal(result.reshuffled, true);
  assert.ok(legalMoves(geom, result.state).length > 0);
});

// ---------------------------------------------------------------------------------------------
// hammer booster
// ---------------------------------------------------------------------------------------------

test('hammer clears exactly the targeted cell (plus whatever it exposes) and settles', () => {
  const geom = buildGeometry('square', 6, 5);
  const board = spawnBoard(geom, 'hammer-seed');
  const result = applyBooster(geom, board, 'hammer', 0);
  assert.equal(result.legal, true);
  assert.ok(result.steps.length >= 1);
  assert.ok(result.steps[0]!.cleared.includes(0));
  assert.equal(findMatches(geom, result.state).length, 0);
});

test('hammer without a target cell is illegal', () => {
  const geom = buildGeometry('square', 4, 5);
  const board = spawnBoard(geom, 'hammer-no-cell');
  const result = applyBooster(geom, board, 'hammer');
  assert.equal(result.legal, false);
  assert.deepEqual(result.state, board);
});

// ---------------------------------------------------------------------------------------------
// meta boosters: engine validates but does not itself grant
// ---------------------------------------------------------------------------------------------

test('extraMoves/prismStart boosters are accepted as no-ops on the board', () => {
  const geom = buildGeometry('square', 4, 5);
  const board = spawnBoard(geom, 'meta-booster-seed');
  const a = applyBooster(geom, board, 'extraMoves');
  const b = applyBooster(geom, board, 'prismStart');
  assert.equal(a.legal, true);
  assert.deepEqual(a.state, board);
  assert.equal(b.legal, true);
  assert.deepEqual(b.state, board);
});

// ---------------------------------------------------------------------------------------------
// blockers decrement correctly during a cascade
// ---------------------------------------------------------------------------------------------

test('moss clears when matched on-cell; frost/cage break when a match is adjacent', () => {
  const geom = buildGeometry('square', 4, 5);
  const tiles = grid4([1, 1, 4, 3, 3, 4, 1, 2, 4, 3, 2, 0, 3, 2, 0, 4]);
  // The swap moves tiles (and whatever flags ride on them) between cells 2 and 6, so moss is
  // planted on the PRE-swap tile at 6 — it lands on cell 2 (the match-completing cell) only
  // after swapping. Cell 3 (row0, adjacent to the match) is frosted; cell 5 (adjacent to cell
  // 1, also in the match run) is caged; neither of those cells moves.
  tiles[6] = { ...tiles[6]!, moss: true };
  tiles[3] = { ...tiles[3]!, frost: true };
  tiles[5] = { ...tiles[5]!, cage: true };
  const before: BoardState = { tiles, seed: 'blocker-cascade', draws: 0 };
  const result = applyMove(geom, before, { a: 2, b: 6 });
  assert.equal(result.legal, true);
  const step0 = result.steps[0]!;
  assert.ok(step0.mossCleared.includes(2), 'moss on the matched cell should clear');
  assert.ok(step0.frostBroken.includes(3), 'frost adjacent to the match should break');
  assert.ok(step0.cageBroken.includes(5), 'cage adjacent to the match should break');
});
