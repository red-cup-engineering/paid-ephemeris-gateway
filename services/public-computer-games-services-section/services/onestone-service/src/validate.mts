/**
 * `validate` — the math QA oracle: level generation is only as honest as its checker.
 *
 * The design doctrine (see DESIGN.md §2) is blunt about *why* this module exists: a bare
 * edge-count budget on the blocker constraint graph is not a solvability proof. The classic
 * "double banana" graph is the textbook demonstration — it satisfies every naive edge-count
 * threshold you can throw at it while still being combinatorially broken (locally over-braced
 * in two clusters, globally under-braced across the hinge that joins them). So this module
 * runs the real thing: the Jacobs–Hendrickson (2,3)-pebble game, a constructive algorithm for
 * deciding independence in the generic 2D rigidity matroid. `lamanCount` is kept and exported
 * specifically so the double-banana asymmetry is testable and demonstrable, not because it is
 * trustworthy on its own — see its own doc comment.
 *
 * The pebble game, briefly: every vertex starts with k=2 "pebbles" (free bracing capacity).
 * Inserting an edge (u, v) requires l+1=4 pebbles collectible on {u, v} combined — the (2,3)
 * parameters that make the count matroid here exactly Laman's plane-rigidity matroid (rank
 * 2n−3). When the two endpoints don't already have enough pebbles between them, we search the
 * directed graph of already-inserted edges for a free pebble elsewhere and "gather" it home by
 * reversing the directed path that leads to it (an augmenting-path search, same shape as
 * bipartite matching / max-flow). If no augmenting path exists, the edge is dependent on the
 * edges already present — for our purposes, that specific edge is redundant bracing, and the
 * whole graph is therefore NOT generically independent. `pebbleIndependent` returns false the
 * first time that happens, deliberately not trying to salvage a maximal independent subset —
 * level QA wants a hard reject, not a "best effort" board.
 */
import type { BlockerPlacement, BoardGeometry, CellId, LevelSpec } from './types.mts';
import { buildGeometry } from './tiling.mts';
import { applyBlockers, legalMoves, spawnBoard } from './engine.mts';

/** Pebble count per vertex and the +1 over `l` pebbles required to insert an edge — the (2,3)
 * parameters that make this exactly the plane bar-joint rigidity matroid (Laman's matroid). */
const PEBBLES_PER_VERTEX = 2;
const PEBBLES_REQUIRED_TO_INSERT = 4; // l + 1, l = 3

/**
 * Directed pebble-game state for one run of the algorithm. `pebbles[v]` is v's current free
 * pebble count (0..PEBBLES_PER_VERTEX); `out[v]` is the set of vertices w such that the
 * directed edge v→w is currently "covering" a previously-inserted graph edge (v spent one of
 * its pebbles to acquire that edge). Reversing v→w to w→v is how a free pebble at w is walked
 * back to v without ever destroying or creating a pebble — the total pebble count in the whole
 * game is invariant at `PEBBLES_PER_VERTEX * nodes` for the entire run.
 */
interface PebbleState {
  pebbles: number[];
  out: Array<Set<number>>;
}

function makePebbleState(nodes: number): PebbleState {
  return {
    pebbles: new Array<number>(nodes).fill(PEBBLES_PER_VERTEX),
    out: Array.from({ length: nodes }, () => new Set<number>()),
  };
}

/**
 * DFS search for a directed path from `v` out to some vertex holding a free pebble, following
 * only edges this search hasn't already visited (an undirected-visited set keeps the search
 * finite even though edges themselves are directed and can point back into visited territory).
 * The starting vertex's own pebble count is never treated as a "find" — the caller already
 * knows it (that's why it's searching) — only vertices reached via at least one hop qualify.
 */
function findPebblePath(state: PebbleState, start: number, blocked: number): number[] | null {
  const visited = new Set<number>([blocked]);
  visited.add(start);
  for (const next of state.out[start] ?? []) {
    const path = search(next, visited);
    if (path) return [start, ...path];
  }
  return null;

  function search(v: number, seen: Set<number>): number[] | null {
    if (seen.has(v)) return null;
    seen.add(v);
    if ((state.pebbles[v] ?? 0) > 0) return [v];
    for (const next of state.out[v] ?? []) {
      const path = search(next, seen);
      if (path) return [v, ...path];
    }
    return null;
  }
}

/** Walk a found free pebble from the far end of `path` back to `path[0]`, reversing every
 * directed edge along the way. Net effect: `pebbles[path[0]]` gains one, the source vertex at
 * the far end loses one, every intermediate vertex is unchanged (it loses then regains). */
function collectAlong(state: PebbleState, path: readonly number[]): void {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i] as number;
    const b = path[i + 1] as number;
    state.out[a]?.delete(b);
    state.out[b]?.add(a);
  }
  const source = path[path.length - 1] as number;
  state.pebbles[source] = (state.pebbles[source] ?? 0) - 1;
  const target = path[0] as number;
  state.pebbles[target] = (state.pebbles[target] ?? 0) + 1;
}

/** Try to raise `pebbles[start]` by one via an augmenting search that avoids stealing directly
 * from `blocked` (the edge's other endpoint — its pebbles are already counted in the caller's
 * combined total, so "collecting" one from it would be a zero-sum move, not progress). */
function gatherOne(state: PebbleState, start: number, blocked: number): boolean {
  const path = findPebblePath(state, start, blocked);
  if (!path) return false;
  collectAlong(state, path);
  return true;
}

/**
 * The (2,3)-pebble game: decide whether `edges` is an independent set in the generic 2D
 * bar-joint rigidity matroid on `nodes` vertices. Inserts edges one at a time in the given
 * order; the first edge that cannot collect `PEBBLES_REQUIRED_TO_INSERT` pebbles on its
 * endpoints (directly, or via augmenting search) proves the set dependent and this returns
 * false immediately. Self-loops are never independent (an edge needs two distinct endpoints
 * to brace anything) and are rejected without search.
 */
export function pebbleIndependent(nodes: number, edges: ReadonlyArray<readonly [number, number]>): boolean {
  const state = makePebbleState(nodes);
  for (const [u, v] of edges) {
    if (u === v) return false;
    while ((state.pebbles[u] ?? 0) + (state.pebbles[v] ?? 0) < PEBBLES_REQUIRED_TO_INSERT) {
      if (gatherOne(state, u, v)) continue;
      if (gatherOne(state, v, u)) continue;
      return false;
    }
    // Spend one pebble at whichever endpoint has one to spare to cover the new edge.
    const from = (state.pebbles[u] ?? 0) > 0 ? u : v;
    const to = from === u ? v : u;
    state.pebbles[from] = (state.pebbles[from] ?? 0) - 1;
    state.out[from]?.add(to);
  }
  return true;
}

/**
 * The cheap `2n − 3` edge-count prefilter for plane rigidity — necessary but NOT sufficient.
 * This is deliberately the naive check the design doc warns against: it only asks "are there
 * enough edges, in total, anywhere in the graph" and says nothing about WHERE they are. The
 * double-banana graph is the canonical proof this is unsound in isolation — it has 18 edges on
 * 8 vertices (well past the 2·8−3=13 threshold, so `lamanCount` reports true) while being
 * locally over-braced within each "banana" and under-braced across the shared hinge, which
 * `pebbleIndependent` (the real independence check) correctly rejects. Kept only as a cheap
 * early-out and as the demonstrable half of that asymmetry — never trust it alone.
 */
export function lamanCount(nodes: number, edges: number): boolean {
  return edges >= 2 * nodes - 3;
}

/** Mean coordination number `2E/N` of a graph with `edgeCount` edges over `cellCount` nodes —
 * the rigidity-percolation difficulty dial (Phillips–Thorpe isostatic point is 2.4). */
export function meanCoordination(cellCount: number, edgeCount: number): number {
  return cellCount === 0 ? 0 : (2 * edgeCount) / cellCount;
}

/**
 * The `loadBearing_iff_critical` spanning-forest-plus-one test: a graph is load-bearing (has
 * at least one cycle beyond what's needed to merely connect its pieces) iff its edge count
 * strictly exceeds a spanning forest's, i.e. `edges >= (nodes - components) + 1`. A spanning
 * forest alone (`edges === nodes - components`) connects everything but braces nothing extra;
 * one edge past that is the first edge that could possibly be redundant/load-bearing bracing.
 */
export function loadBearing(nodes: number, edges: number, components: number): boolean {
  return edges >= nodes - components + 1;
}

/**
 * Constraint edges of the blocker graph: adjacent (shared-edge-neighbor) pairs of cells that
 * both carry a blocker. Only blocker-bearing cells participate — an unblocked cell can't be
 * part of the "is this layout over/under-braced" question the pebble game is answering. Each
 * undirected pair is emitted once regardless of iteration order.
 */
export function blockerEdges(
  geom: BoardGeometry,
  blockers: readonly BlockerPlacement[],
): Array<[CellId, CellId]> {
  const blockerCells = new Set<CellId>(blockers.map((b) => b.cell));
  const seen = new Set<string>();
  const edges: Array<[CellId, CellId]> = [];
  for (const cellId of blockerCells) {
    const cell = geom.cells[cellId];
    if (!cell) continue;
    for (const neighbor of cell.neighbors) {
      if (!blockerCells.has(neighbor)) continue;
      const lo = Math.min(cellId, neighbor);
      const hi = Math.max(cellId, neighbor);
      const key = `${lo}:${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([lo, hi]);
    }
  }
  return edges;
}

/**
 * Full level QA: build the geometry, place blockers, spawn the board, and check every
 * doctrine the design document promises. Never a partial or "warnings only" result — a level
 * either passes every check or `validateLevel` reports each way it failed, so level authoring
 * (`levels.mts`) can hard-assert on `.ok` for all 60 shipped levels.
 */
export function validateLevel(spec: LevelSpec): { ok: boolean; problems: string[] } {
  const problems: string[] = [];

  const geom = buildGeometry(spec.tiling, spec.size, spec.paletteSize);

  if (spec.paletteSize > geom.paletteSize) {
    problems.push(
      `palette ${spec.paletteSize} exceeds geometry's built palette bound ${geom.paletteSize}`,
    );
  }

  let state = spawnBoard(geom, spec.seed);
  state = applyBlockers(state, spec.blockers);

  const moves = legalMoves(geom, state);
  if (moves.length < 1) {
    problems.push('no legal move exists on the spawned, blocker-applied board');
  }

  const edges = blockerEdges(geom, spec.blockers);
  if (!pebbleIndependent(geom.cells.length, edges)) {
    problems.push('blocker constraint graph is not pebble-independent (over/under-braced)');
  }

  const blockerNodeCount = new Set<CellId>(spec.blockers.map((b) => b.cell)).size;
  const actualCoordination = meanCoordination(blockerNodeCount, edges.length);
  if (Math.abs(actualCoordination - spec.meanCoordination) > 0.05) {
    problems.push(
      `meanCoordination ${actualCoordination.toFixed(3)} is not within 0.05 of spec ${spec.meanCoordination}`,
    );
  }

  const geodeCount = spec.blockers.filter((b) => b.kind === 'geode').length;
  const mossCount = spec.blockers.filter((b) => b.kind === 'moss').length;
  for (const goal of spec.goals) {
    if (goal.kind === 'collectColor' && (goal.color === undefined || goal.color >= spec.paletteSize || goal.color < 0)) {
      problems.push(`collectColor goal references color ${goal.color} outside palette ${spec.paletteSize}`);
    }
    if (goal.kind === 'breakGeodes' && goal.target > geodeCount) {
      problems.push(`breakGeodes goal target ${goal.target} exceeds placed geode count ${geodeCount}`);
    }
    if (goal.kind === 'clearMoss' && goal.target > mossCount) {
      problems.push(`clearMoss goal target ${goal.target} exceeds placed moss count ${mossCount}`);
    }
  }

  return { ok: problems.length === 0, problems };
}
