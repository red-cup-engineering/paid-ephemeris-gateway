/**
 * `engine-topology-specials.test` — additional coverage for the topology-native special-piece
 * system that `engine.mts::findMatches`/`fireSwapSpecials` already implements (see
 * `TILESLOTS-DESIGN.md` §3, which documents the shipped system rather than proposing a new
 * one). This file adds exactly the coverage `engine.test.mts` did not yet have:
 *
 *  1. Formation detection exercised on real square/hex/rhombille geometries (not just square),
 *     including the "ring is geometrically impossible on square" claim as an actual assertion,
 *     not just a doc comment.
 *  2. The combo matrix's "strictly better than the sum of parts" property, tested by comparing
 *     a compound swap's clear-set against the union of what each side would clear firing solo
 *     from the exact same post-swap cell.
 *  3. Determinism of compound-swap outcomes (including the one pair, prism+striped, whose
 *     target color is drawn from the seeded RNG stream rather than either tile's own color).
 *  4. A cascade-termination bound test for specials that re-trigger other specials mid-step:
 *     every fired cell fires at most once (the `alreadyFired` set in `runStep::drainSpecials`
 *     is the actual termination mechanism — see the note above `settleLoop` in `engine.mts`
 *     explaining why "Knaster-Tarski" is the wrong citation and the acyclic-fall/bounded-board
 *     argument is the right one), and a real multi-hop chain settles to a fixed point.
 *
 * No changes to `engine.mts`, `tiling-core.mts`, or `types.mts` are needed or made — every
 * property below is exercised entirely through the existing public API (`buildGeometry`,
 * `findMatches`, `applyMove`, `spawnBoard`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BoardState, CellId, Tile } from './types.mts';
import { buildGeometry } from './tiling.mts';
import { applyMove, findMatches, spawnBoard } from './engine.mts';
import { makeRng } from './seed.mts';

function plain(color: number): Tile {
  return { color, special: 'none', moss: false, frost: false, cage: false, geode: 0 };
}

function special(color: number, kind: Tile['special']): Tile {
  return { color, special: kind, moss: false, frost: false, cage: false, geode: 0 };
}

// =================================================================================================
// 1. Formation detection across topologies
// =================================================================================================

/** The cell with the most edge-neighbors in this geometry (ties broken by lowest id) — the
 * natural place to build a "full star"/"full ring" fixture with room on every side. */
function maxDegreeCell(geom: ReturnType<typeof buildGeometry>): CellId {
  let best = 0;
  let bestDeg = -1;
  for (const c of geom.cells) {
    if (c.neighbors.length > bestDeg) {
      best = c.id;
      bestDeg = c.neighbors.length;
    }
  }
  return best;
}

/** A "ring hub" candidate: a cell whose own neighbor set forms one connected component under
 * mutual (neighbor-of-neighbor) adjacency — i.e. a cell some OTHER match could fully enclose
 * without also containing the hub itself. This is exactly `closesRing`'s bounded-interior test,
 * evaluated here independently (over raw `Cell.neighbors`, not `engine.mts` internals) so the
 * fixture-search and the code-under-test aren't the same logic circularly confirming itself. */
function findRingHub(geom: ReturnType<typeof buildGeometry>): CellId | undefined {
  for (const cell of geom.cells) {
    const nbrs = cell.neighbors;
    if (nbrs.length < 3) continue;
    const nbrSet = new Set(nbrs);
    // BFS among nbrs using only edges that stay within nbrSet (i.e. two of the hub's own
    // neighbors that are themselves adjacent to each other).
    const start = nbrs[0]!;
    const seen = new Set<CellId>([start]);
    const stack = [start];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const curCell = geom.cells[cur]!;
      for (const n of curCell.neighbors) {
        if (!nbrSet.has(n) || seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    if (seen.size === nbrs.length) return cell.id;
  }
  return undefined;
}

test('formation: square has no ring-hub candidate at all (ring is geometrically impossible there)', () => {
  const geom = buildGeometry('square', 8, 5);
  assert.equal(
    findRingHub(geom),
    undefined,
    'a square cell has 4 pairwise-non-adjacent orthogonal neighbors — none should form a connected ring',
  );
});

test('formation: hex has a ring-hub candidate (an interior cell whose full 6-neighborhood is a connected ring)', () => {
  const geom = buildGeometry('hex', 4, 5);
  const hub = findRingHub(geom);
  assert.ok(hub !== undefined, 'expected at least one interior hex cell enclosable by its own neighborhood');
});

test('formation: rhombille ALSO has no ring-hub candidate — an undocumented gap this suite surfaces', () => {
  // Every rhombille cell is a rhombus with exactly 4 sides, so it can never have more than 4
  // neighbors (confirmed empirically: the shipped chapter-3 geometry's degree histogram tops
  // out at 4, same as square — see this file's companion report). `engine.mts`'s own doc
  // comment for `closesRing` only claims ring becomes reachable "first" on hex; it does not
  // claim later chapters inherit that reachability, and empirically (checked exhaustively over
  // every one of the 111 cells in the shipped radius-3 rhombille board) NONE of them have a
  // neighbor set that closes back on itself the way hex's do. This is recorded as a hard
  // assertion, not a hedge, precisely so a future rhombille-geometry change that fixes this
  // gap (or an accidental regression that breaks hex the same way) is caught immediately.
  const geom = buildGeometry('rhombille', 3, 5);
  const hub = findRingHub(geom);
  assert.equal(hub, undefined, 'rhombille (radius 3): no cell\'s neighbor set forms a connected ring');
});

/**
 * A finding this suite surfaced that predates it (neither `TILESLOTS-DESIGN.md` nor
 * `engine.mts`'s doc comments call it out): **nova's junction requirement (a member cell with
 * 3+ in-group same-color neighbors) is geometrically unreachable on square OR rhombille, not
 * just ring** — the same rail-scan-runs-first mechanism that makes ring square-impossible also
 * makes nova impossible there. `findMatches` scans every rail for 3+ runs BEFORE it ever scans
 * for blobs, and claimed cells are excluded from blob search entirely. A cell's neighbors split
 * into "rail-opposite" pairs (two neighbors that sit directly on either side of it on some
 * rail) and unpaired neighbors; the max same-color neighbor selection that never completes an
 * opposite pair (and so never trips the rail scanner) is `pairs + unpaired`. Both square and
 * (surprisingly) rhombille cap out at 4 neighbors arranged as exactly 2 full opposite pairs
 * EVERYWHERE (confirmed below across every cell, not just one hub) — `4 - 2 = 2 < 3`, so no
 * cell there can ever reach nova's junction threshold without the rail scanner claiming the
 * would-be blob first. Hex cells reach up to 6 neighbors in 3 opposite pairs — `6 - 3 = 3`,
 * exactly meeting the threshold — which is why nova is reachable there (and only there, among
 * the three shipped tilings) and why it needs a 5th cell one hop further out rather than a pure
 * 1-ring "plus" shape (a bare hub + 3 safe neighbors is only 4 cells, one short of nova's
 * 5-cell minimum).
 */
function railOpposites(geom: ReturnType<typeof buildGeometry>, hubId: CellId): Array<[CellId, CellId]> {
  const pairs: Array<[CellId, CellId]> = [];
  for (const railIdx of geom.railsAt[hubId] ?? []) {
    const rail = geom.rails[railIdx];
    if (!rail) continue;
    const idx = rail.cells.indexOf(hubId);
    const prev = rail.cells[idx - 1];
    const next = rail.cells[idx + 1];
    if (prev !== undefined && next !== undefined) pairs.push([prev, next]);
  }
  return pairs;
}

/** Max same-color neighbors a cell could carry without ever completing a rail-opposite pair —
 * the structural ceiling on junction size described above. */
function maxSafeJunctionDegree(geom: ReturnType<typeof buildGeometry>, cellId: CellId): number {
  const pairs = railOpposites(geom, cellId);
  const paired = new Set(pairs.flat());
  const unpaired = geom.cells[cellId]!.neighbors.filter((n) => !paired.has(n));
  return pairs.length + unpaired.length;
}

test('formation: nova is structurally unreachable on EVERY square cell (max safe junction degree < 3 everywhere)', () => {
  const geom = buildGeometry('square', 6, 5);
  for (const cell of geom.cells) {
    assert.ok(
      maxSafeJunctionDegree(geom, cell.id) < 3,
      `square cell ${cell.id} has max safe junction degree >= 3 — nova should be reachable there`,
    );
  }
});

test('formation: nova is structurally unreachable on EVERY rhombille cell too — the same mechanism as square, undocumented until now', () => {
  const geom = buildGeometry('rhombille', 3, 5);
  for (const cell of geom.cells) {
    assert.ok(
      maxSafeJunctionDegree(geom, cell.id) < 3,
      `rhombille cell ${cell.id} has max safe junction degree >= 3 — nova should be reachable there`,
    );
  }
});

test('formation: hex has cells whose max safe junction degree reaches 3 — the precondition nova formation needs', () => {
  const geom = buildGeometry('hex', 4, 5);
  const ok = geom.cells.some((c) => maxSafeJunctionDegree(geom, c.id) >= 3);
  assert.ok(ok, 'expected at least one hex cell with max safe junction degree >= 3');
});

/** All k-subsets of `arr` (small inputs only — used for a bounded neighbor search, not
 * anything board-scale). */
function combos<T>(arr: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, chosen: T[]): void => {
    if (chosen.length === k) {
      out.push(chosen.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i]!);
      rec(i + 1, chosen);
      chosen.pop();
    }
  };
  rec(0, []);
  return out;
}

/**
 * Search for a genuine 5-cell nova fixture at `hubId`: try every 3-subset of the hub's
 * neighbors plus every 1-hop extension cell, and use `findMatches` itself as the oracle for
 * whether a given concrete cell set actually mints nova (rather than trusting hand geometry —
 * see this file's earlier debugging: a "safe" trio by the opposite-pair rule can still trip an
 * UNRELATED rail through the extension cell, so the only trustworthy check is the real one).
 * Returns the working cell set, or undefined if none of these candidates work.
 */
function findNovaFixture(
  geom: ReturnType<typeof buildGeometry>,
  seed: string,
  hubId: CellId,
  color: number,
): CellId[] | undefined {
  const base = spawnBoard(geom, seed);
  const hub = geom.cells[hubId]!;
  for (const trio of combos(hub.neighbors, Math.min(3, hub.neighbors.length))) {
    if (trio.length < 3) continue;
    const soFar = new Set<CellId>([hubId, ...trio]);
    const extCandidates = new Set<CellId>();
    for (const t of trio) for (const n of geom.cells[t]!.neighbors) if (!soFar.has(n)) extCandidates.add(n);
    for (const ext of extCandidates) {
      const cellSet = [hubId, ...trio, ext];
      const tiles = base.tiles.slice();
      for (const c of cellSet) tiles[c] = plain(color);
      const state: BoardState = { tiles, seed, draws: 0 };
      const groups = findMatches(geom, state);
      const g = groups.find((gr) => gr.color === color && gr.shape === 'blob' && gr.mints === 'nova' && gr.cells.length === 5);
      if (g) return cellSet;
    }
  }
  return undefined;
}

test('formation: hex mints nova on a real, search-verified 5-cell junction fixture', () => {
  const geom = buildGeometry('hex', 4, 5);
  const hubId = maxDegreeCell(geom);
  const color = geom.paletteSize + 3;
  const cellSet = findNovaFixture(geom, 'hex-nova-seed', hubId, color);
  assert.ok(cellSet, 'expected at least one working nova fixture at the max-degree hex hub');
  const base = spawnBoard(geom, 'hex-nova-seed');
  const tiles = base.tiles.slice();
  for (const c of cellSet!) tiles[c] = plain(color);
  const groups = findMatches(geom, { tiles, seed: 'hex-nova-seed', draws: 0 });
  const group = groups.find((g) => g.color === color)!;
  assert.equal(group.shape, 'blob');
  assert.equal(group.cells.length, 5);
  assert.equal(group.mints, 'nova');
  assert.equal(group.origin, hubId, "nova's origin should be the junction cell itself");
});

test('formation: hex mints ring when a match closes a cycle around one non-matched cell', () => {
  const geom = buildGeometry('hex', 4, 5);
  const hubId = findRingHub(geom);
  assert.ok(hubId !== undefined, 'precondition: hex must have a ring-hub for this test to mean anything');
  const hub = geom.cells[hubId!]!;
  const outColor = geom.paletteSize + 3;
  const base = spawnBoard(geom, 'hex-ring-seed');
  const tiles = base.tiles.slice();
  // Color every neighbor of the hub (the enclosing ring) the same out-of-palette color; leave
  // the hub itself untouched so it is the one non-matched enclosed cell.
  for (const n of hub.neighbors) tiles[n] = plain(outColor);
  const state: BoardState = { tiles, seed: 'hex-ring-seed', draws: 0 };
  const groups = findMatches(geom, state);
  const ring = groups.find((g) => g.color === outColor);
  assert.ok(ring, 'expected the colored ring of neighbors to be found as one match group');
  assert.equal(ring.cells.length, hub.neighbors.length, 'the whole neighbor ring should be one connected blob');
  assert.equal(ring.mints, 'ring', 'a match enclosing a non-member cell on all sides should mint ring, not nova');
  assert.ok(!ring.cells.includes(hubId!), 'the enclosed hub cell must NOT itself be part of the match');
});

test('formation: square never mints ring even when all 4 neighbors of a cell share a color (they cannot form one connected group without the hub)', () => {
  const geom = buildGeometry('square', 6, 5);
  const hubId = maxDegreeCell(geom);
  const hub = geom.cells[hubId]!;
  assert.equal(hub.neighbors.length, 4);
  const outColor = geom.paletteSize + 3;
  const base = spawnBoard(geom, 'square-no-ring-seed');
  const tiles = base.tiles.slice();
  for (const n of hub.neighbors) tiles[n] = plain(outColor);
  const state: BoardState = { tiles, seed: 'square-no-ring-seed', draws: 0 };
  const groups = findMatches(geom, state);
  // On square, the 4 orthogonal neighbors are pairwise non-adjacent, so they can never be found
  // as ONE connected blob — each stays its own isolated 1-cell "match" (too small to register)
  // rather than a 4-cell ring.
  const ringLike = groups.find((g) => g.color === outColor);
  assert.equal(ringLike, undefined, 'square neighbors of a hub are not mutually adjacent — no match should form at all');
});

// =================================================================================================
// 2 & 3. Combo matrix: strictly-better-than-sum, and determinism
// =================================================================================================

const COMBO_GEOM = buildGeometry('square', 8, 5);
// Two adjacent interior cells, row-major id = row*8+col: cell 26 (row3,col2) / cell 27 (row3,col3).
const CX = 26;
const CY = 27;

/** Build a board where cellA/cellB hold `kindA`/`kindB` ('none' = plain background tile, left
 * untouched at its natural spawned color) and swap them, returning the settle result. Colors for
 * actual special tiles use an out-of-palette value so they can never coincidentally extend an
 * ordinary match of their own. */
function comboBoard(seed: string, kindA: Tile['special'], kindB: Tile['special']): BoardState {
  const base = spawnBoard(COMBO_GEOM, seed);
  const tiles = base.tiles.slice();
  const outColor = COMBO_GEOM.paletteSize + 4;
  // Both cells always get an explicit, out-of-palette color (never a leftover natural spawned
  // color) — otherwise a "plain" side relocating its ordinary in-palette color to the other
  // cell can coincidentally complete an unrelated ordinary match there, contaminating the
  // clear-set comparison with cells the special blast itself never touched.
  tiles[CX] = kindA === 'none' ? plain(outColor + 10) : special(outColor, kindA);
  tiles[CY] = kindB === 'none' ? plain(outColor + 11) : special(outColor + 1, kindB);
  return { tiles, seed, draws: 0 };
}

function clearedSet(state: BoardState): Set<CellId> {
  const result = applyMove(COMBO_GEOM, state, { a: CX, b: CY });
  assert.equal(result.legal, true, 'expected the special swap to be legal');
  assert.ok(result.steps.length >= 1, 'expected at least one cascade step');
  return new Set(result.steps[0]!.cleared);
}

function unionOf(a: Set<CellId>, b: Set<CellId>): Set<CellId> {
  return new Set([...a, ...b]);
}

function isSuperset(sup: Set<CellId>, sub: Set<CellId>): boolean {
  for (const x of sub) if (!sup.has(x)) return false;
  return true;
}

test('combo: striped+striped compound is a STRICT superset of the two solo blasts (all rails through both cells, not each cell\'s longest)', () => {
  const seed = 'combo-striped-striped';
  const soloA = clearedSet(comboBoard(seed, 'striped', 'none'));
  const soloB = clearedSet(comboBoard(seed, 'none', 'striped'));
  const combo = clearedSet(comboBoard(seed, 'striped', 'striped'));
  const union = unionOf(soloA, soloB);
  assert.ok(isSuperset(combo, union), 'compound striped+striped must clear at least everything either rail alone would');
  // CX/CY are horizontally adjacent (row 3, cols 2/3): on the 8x8 square board railBlast's
  // tie-break sends BOTH solo blasts down the same row rail, so the old railBlast-union
  // compound cleared exactly what one solo did — the defect the 2026-08-19 verify pass
  // caught. The compound now fires EVERY rail through both cells, so the two column rails
  // must appear in the clear set on top of the shared row.
  assert.ok(combo.size > union.size, 'striped+striped must clear strictly more than the two solo blasts combined');
  const colRailA = [2, 10, 18, 26, 34, 42, 50, 58];
  for (const c of colRailA) assert.ok(combo.has(c), `column rail of cell 26 must be in the compound blast (missing ${c})`);
});

test('combo: striped+nova compound is a STRICT superset of the two solo blasts (the cascading case)', () => {
  const seed = 'combo-striped-nova';
  const soloA = clearedSet(comboBoard(seed, 'nova', 'none'));
  const soloB = clearedSet(comboBoard(seed, 'none', 'striped'));
  const combo = clearedSet(comboBoard(seed, 'nova', 'striped'));
  const union = unionOf(soloA, soloB);
  assert.ok(isSuperset(combo, union), 'compound striped+nova must clear at least everything the two solos would');
  assert.ok(
    combo.size > union.size,
    `expected striped+nova to strictly exceed the solo union (${union.size}), got combo=${combo.size}`,
  );
});

test('combo: prism+prism compound is a STRICT superset of the two solo color-clears (it clears the whole board)', () => {
  const seed = 'combo-prism-prism';
  const soloA = clearedSet(comboBoard(seed, 'prism', 'none'));
  const soloB = clearedSet(comboBoard(seed, 'none', 'prism'));
  const combo = clearedSet(comboBoard(seed, 'prism', 'prism'));
  const union = unionOf(soloA, soloB);
  assert.ok(isSuperset(combo, union));
  assert.ok(combo.size > union.size, 'prism+prism clears the entire board — must exceed any two-color union');
  assert.equal(combo.size, COMBO_GEOM.cells.length, 'prism+prism clears literally every cell');
});

test('combo: prism+striped draws its target color independently of either swapped tile (documented, tested honestly)', () => {
  // Unlike the other three named pairs, `fireSwapSpecials`'s prism+striped branch does NOT
  // derive its target color from either side of the swap — it draws a fresh color from the
  // seeded RNG stream (`makeRng(`${seed}#draw${drawIndex.n}`)`) and clears every cell of THAT
  // color, each one firing its own rail. That color is unrelated to the plain-tile color a
  // solo-prism-vs-plain swap would use, or to the position a solo-striped rail would fire from
  // — so "compound ⊇ union(solo prism, solo striped)" is not a property this pair's
  // implementation guarantees in general. What IS guaranteed, and is what this test proves: the
  // draw is deterministic (reproducible from `seed` + the draw index engine.mts actually uses),
  // and the compound result is a strict superset of "solo prism with that SAME drawn color" —
  // the fair, apples-to-apples comparison for this pair.
  const seed = 'combo-prism-striped';
  const state = comboBoard(seed, 'prism', 'striped');
  // Reproduce the exact deterministic draw `fireSwapSpecials` makes: drawIndex.n starts at
  // `state.draws` (0 here) and this compound branch is the first RNG consumer in the step.
  const drawnColor = makeRng(`${seed}#draw${state.draws}`).int(0, Math.max(0, COMBO_GEOM.paletteSize - 1));

  // Fair solo-prism baseline: swap the prism against a plain tile of exactly `drawnColor`, so
  // its solo blast targets the same color the compound will independently draw.
  const soloPrismBoard = comboBoard(seed, 'prism', 'none');
  soloPrismBoard.tiles[CY] = plain(drawnColor);
  const soloPrism = clearedSet(soloPrismBoard);

  const combo = clearedSet(state);
  assert.ok(
    isSuperset(combo, soloPrism),
    'prism+striped compound must clear at least every cell of the color it draws (the solo-prism-with-that-color baseline)',
  );
  assert.ok(combo.size > soloPrism.size, 'the compound additionally fires a rail from every one of those cells');
});

test('combo: determinism — prism+striped (the one pair with RNG-drawn color) gives identical results for identical seeds', () => {
  const seed = 'combo-determinism-seed';
  const a = applyMove(COMBO_GEOM, comboBoard(seed, 'prism', 'striped'), { a: CX, b: CY });
  const b = applyMove(COMBO_GEOM, comboBoard(seed, 'prism', 'striped'), { a: CX, b: CY });
  assert.deepEqual(a, b, 'the same seed must draw the same compound target color and produce the same cascade');
});

test('combo: determinism — every named pair is reproducible for the same seed', () => {
  const pairs: Array<[Tile['special'], Tile['special']]> = [
    ['striped', 'striped'],
    ['striped', 'nova'],
    ['prism', 'prism'],
    ['prism', 'striped'],
  ];
  for (const [kindA, kindB] of pairs) {
    const seed = `combo-determinism-${kindA}-${kindB}`;
    const a = applyMove(COMBO_GEOM, comboBoard(seed, kindA, kindB), { a: CX, b: CY });
    const b = applyMove(COMBO_GEOM, comboBoard(seed, kindA, kindB), { a: CX, b: CY });
    assert.deepEqual(a, b, `${kindA}+${kindB} was not deterministic for the same seed`);
  }
});

// =================================================================================================
// 4. Cascade termination when specials re-trigger other specials mid-step
// =================================================================================================

/**
 * `engine.mts`'s own doc comment (above `settleLoop`) is explicit that "Knaster-Tarski" is the
 * WRONG citation for why cascades terminate — the real argument is (a) `fallTo` is acyclic, so
 * falls are bounded, and (b) within one step, `runStep::drainSpecials` tracks `alreadyFired` so
 * no cell can fire its special more than once, bounding a chain reaction by the board's cell
 * count. This test builds a real 2-hop chain (a striped tile's rail blast reaches a nova, whose
 * blast in turn reaches a second striped tile) and proves both halves of that argument hold in
 * practice: every special fires exactly once, and the result is a genuine fixed point.
 */
test('cascade termination: a 2-hop special chain (striped -> nova -> striped) fires each special exactly once and settles', () => {
  const geom = buildGeometry('square', 8, 5);
  const base = spawnBoard(geom, 'chain-seed');
  const tiles = base.tiles.slice();
  const outA = geom.paletteSize + 3;
  const outB = geom.paletteSize + 4;
  const outC = geom.paletteSize + 5;

  // Row 0 is cells 0..7. A striped tile at cell 1's row-rail is row 0 (ties resolve to the
  // horizontal family first, per `compileGeometry`'s family ordering) — its blast reaches
  // cell 5, which holds a nova. Nova's 1-ring from cell 5 (row0,col5) includes cell 13
  // (row1,col5), which holds a second striped tile whose OWN row-rail (row 1) is a fresh set
  // of cells nothing upstream already touched.
  tiles[1] = special(outA, 'striped');
  tiles[5] = special(outB, 'nova');
  tiles[13] = special(outC, 'striped');

  const before: BoardState = { tiles, seed: 'chain-seed', draws: 0 };
  const result = applyMove(geom, before, { a: 0, b: 1 });
  assert.equal(result.legal, true);
  assert.ok(result.steps.length >= 1);

  const firstStep = result.steps[0]!;
  // All three specials fired.
  const firedCells = firstStep.fired.map((f) => f.cell);
  for (const c of [0, 5, 13]) {
    // The striped tile originally at cell 1 lands at cell 0 after the swap (swapTiles exchanges
    // the two indices), so its post-swap firing cell is 0, not 1.
    assert.ok(firedCells.includes(c), `expected cell ${c}'s special to have fired`);
  }
  // No cell fired twice — the concrete evidence that `alreadyFired` bounds the chain rather than
  // looping. (A duplicate would show up as a repeated id in `fired`.)
  assert.equal(new Set(firedCells).size, firedCells.length, 'a special fired more than once in one step');

  // Row 1 (cells 8..15), reached only via the second hop, must be fully cleared — proof the
  // chain actually propagated two hops deep, not just one.
  for (const c of [8, 9, 10, 11, 12, 13, 14, 15]) {
    assert.ok(firstStep.cleared.includes(c), `row 1 cell ${c} should have cleared via the chained striped blast`);
  }

  // Fixed point: the settled board has no outstanding matches.
  assert.equal(findMatches(geom, result.state).length, 0);
  // Sanity bound: the whole cascade never runs more steps than there are cells on the board —
  // a generous, but real, upper bound consistent with the acyclic-fall termination argument.
  assert.ok(result.steps.length <= geom.cells.length);
});

test('cascade termination: chain-reaction result is deterministic for the same seed', () => {
  const geom = buildGeometry('square', 8, 5);
  const build = (): BoardState => {
    const base = spawnBoard(geom, 'chain-determinism-seed');
    const tiles = base.tiles.slice();
    tiles[1] = special(geom.paletteSize + 3, 'striped');
    tiles[5] = special(geom.paletteSize + 4, 'nova');
    tiles[13] = special(geom.paletteSize + 5, 'striped');
    return { tiles, seed: 'chain-determinism-seed', draws: 0 };
  };
  const a = applyMove(geom, build(), { a: 0, b: 1 });
  const b = applyMove(geom, build(), { a: 0, b: 1 });
  assert.deepEqual(a, b);
});
