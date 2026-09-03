/**
 * `stability` — the Hall rigidity criterion. DESIGN.md §4: a straight code reuse, not new math.
 *
 * `pebbleIndependent`, `lamanCount`, `meanCoordination`, and `loadBearing` below are vendored
 * verbatim (byte-identical bodies, comments preserved) from
 * `onestone-service/src/validate.mts` — the Jacobs–Hendrickson (2,3)-pebble game for the
 * generic 2D bar-joint rigidity matroid (Laman's matroid). Vendored as a copy, not a
 * cross-service import: each service in this tree ships its own Dockerfile and deploys
 * independently (see `onestone-service/DEPLOY.md`'s pattern) — a live cross-service import
 * would couple two independent deploys for four small, pure, geometry-agnostic functions with
 * no external state. The `BoardGeometry`/`BlockerPlacement`/board-specific plumbing in the
 * original does not port and is not needed here.
 *
 * What IS new here (not in `validate.mts` — level QA never needed it): `connectedComponents`,
 * a plain union-find, and `hallStability`, the per-hall test that combines the vendored checks
 * per DESIGN.md §4: `stable ⟺ components === 1 ∧ loadBearing(...) ∧ pebbleIndependent(...)`.
 *
 * Disclosure (DESIGN.md's own doctrine, restated here): the graph and the algorithm are real
 * and correctly computed. What is flavor is the *interpretation* — "a concept-dependency graph
 * is generically rigid" is not a claim about pedagogy or cognition, it is a metaphor riding on
 * a real, computable graph property.
 */
import type { Door, Hall, RoomId } from './types.mts';

// ---- vendored verbatim from onestone-service/src/validate.mts (begin) -------------------

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

// ---- vendored verbatim from onestone-service/src/validate.mts (end) ---------------------

/** Plain union-find. New for Lantern — level QA in `onestone` never needed a component count. */
export function connectedComponents(nodes: number, edges: ReadonlyArray<readonly [number, number]>): number {
  const parent = Array.from({ length: nodes }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      const p = parent[x] as number;
      parent[x] = parent[p] as number;
      x = p;
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (const [u, v] of edges) union(u, v);
  const roots = new Set<number>();
  for (let i = 0; i < nodes; i++) roots.add(find(i));
  return roots.size;
}

export interface HallGraph {
  nodeCount: number;
  edges: Array<[number, number]>;
  components: number;
}

/** Build the undirected intra-hall graph: nodes = the hall's rooms, edges = doors (hard + soft,
 * deduplicated undirected) with both endpoints inside the hall. DESIGN.md §4, step 1. */
export function buildHallGraph(roomIds: readonly RoomId[], doors: readonly Door[]): HallGraph {
  const index = new Map<RoomId, number>();
  roomIds.forEach((id, i) => index.set(id, i));
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (const d of doors) {
    const a = index.get(d.from);
    const b = index.get(d.to);
    if (a === undefined || b === undefined) continue; // one or both endpoints outside the hall
    if (a === b) continue; // self-loop, never a brace
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}:${hi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([lo, hi]);
  }
  const components = connectedComponents(roomIds.length, edges);
  return { nodeCount: roomIds.length, edges, components };
}

/**
 * Per-hall stability test, DESIGN.md §4, step 3: `stable ⟺ components === 1 ∧ loadBearing(...)
 * ∧ pebbleIndependent(...)`. `loadBearing` demands at least one cycle beyond a bare spanning
 * tree (cross-links, not just a prerequisite chain — "bracing"); `pebbleIndependent` demands
 * none of those cross-links is redundant bracing under the (2,3)-counting rule.
 */
export function hallStability(roomIds: readonly RoomId[], doors: readonly Door[]): boolean {
  if (roomIds.length < 2) return false;
  const graph = buildHallGraph(roomIds, doors);
  if (graph.components !== 1) return false;
  if (!loadBearing(graph.nodeCount, graph.edges.length, graph.components)) return false;
  if (!pebbleIndependent(graph.nodeCount, graph.edges)) return false;
  return true;
}

/** Compute `stable` for every hall and return updated copies (DESIGN.md's `Hall.stable`). */
export function withStability(halls: readonly Omit<Hall, 'stable'>[], doors: readonly Door[]): Hall[] {
  return halls.map((h) => ({ ...h, stable: hallStability(h.rooms, doors) }));
}

/** Reversible stability bonus, DESIGN.md §4: while a hall is stable, every room in it gets its
 * *effective* stability multiplied by this factor when computing dimming schedules — the raw
 * stored `S` is untouched. Recomputed at every compile; nothing needs to be migrated. */
export const STABLE_HALL_BONUS = 1.25;
