/**
 * `graph` — the Widget production graph, as data. Inherited unmodified from stoke-service's
 * `graph.mts` (same convention, same safety rails): nodes are buildings/faculties, edges are
 * reinvestment pipes. A `ProductionGraph` is a plain, JSON-safe, immutable value; nothing here is
 * a class or hides mutable state.
 *
 * Convention: for an edge `{ from: A, to: B, rate: r }`, every tick `B` gains `r * stock[A]`.
 * `M[target][source] = rate` of the edge `source -> target`.
 *
 * This game's one addition to what the graph is USED for, not to the graph shape itself: the
 * self-model tier's Fast Inspector is an ordinary node with an ordinary `baseGeneration` and an
 * ordinary edge into `widget` — see `goodhart.mts`. That it fits without any new graph primitive
 * is the point: the dishonesty at tier 6 is dishonest about what the number MEANS, not about the
 * mechanism, which is exactly why `ablate()` (`goodhart.mts`) — literally graph-node removal, the
 * mechanism `eigen.mts`'s power iteration already knows how to run on — is enough to audit it.
 */

export interface ProductionNode {
  readonly id: string;
  readonly label: string;
  /** Per-tick production this node generates on its own, independent of any edge. */
  readonly baseGeneration: number;
}

export interface ProductionEdge {
  readonly from: string;
  readonly to: string;
  /** Nonnegative reinvestment rate — negative edges are not representable here; see
   *  `assertNonNegativeEdge`/`NegativeEdgeRateError` below. */
  readonly rate: number;
}

export interface ProductionGraph {
  readonly nodes: readonly ProductionNode[];
  readonly edges: readonly ProductionEdge[];
}

export class NegativeEdgeRateError extends RangeError {
  constructor(edge: ProductionEdge) {
    super(`edge ${edge.from} -> ${edge.to} has rate ${edge.rate}: production-graph edges must be nonnegative (see graph.mts header)`);
    this.name = "NegativeEdgeRateError";
  }
}

export function assertValidGraph(graph: ProductionGraph): void {
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (ids.size !== graph.nodes.length) throw new RangeError("assertValidGraph: duplicate node id");
  for (const edge of graph.edges) {
    if (edge.rate < 0) throw new NegativeEdgeRateError(edge);
    if (!ids.has(edge.from)) throw new RangeError(`assertValidGraph: edge references unknown node "${edge.from}"`);
    if (!ids.has(edge.to)) throw new RangeError(`assertValidGraph: edge references unknown node "${edge.to}"`);
  }
}

/** Stable node order — sorted by id — so `toMatrix`'s output is deterministic regardless of the
 *  order nodes/edges were added in. */
export function nodeOrder(graph: ProductionGraph): readonly string[] {
  return graph.nodes.map((n) => n.id).slice().sort();
}

export interface GraphMatrix {
  readonly order: readonly string[];
  readonly matrix: readonly (readonly number[])[];
}

/** The production matrix M, per the header convention. Deliberately excludes `baseGeneration` —
 *  reflection (`reflect.mts`) prices the player's *reinvestment structure*, not raw extraction. */
export function toMatrix(graph: ProductionGraph): GraphMatrix {
  assertValidGraph(graph);
  const order = nodeOrder(graph);
  const index = new Map(order.map((id, i) => [id, i]));
  const n = order.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (const edge of graph.edges) {
    const target = index.get(edge.to);
    const source = index.get(edge.from);
    if (target === undefined || source === undefined) continue;
    matrix[target]![source] = (matrix[target]![source] ?? 0) + edge.rate;
  }
  return { order, matrix };
}

/** The exogenous base-generation vector `b`, in the same node order `toMatrix` uses. */
export function baseVector(graph: ProductionGraph, order: readonly string[]): readonly number[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n.baseGeneration]));
  return order.map((id) => byId.get(id) ?? 0);
}

export function isNonNegative(graph: ProductionGraph): boolean {
  return graph.edges.every((e) => e.rate >= 0);
}

/**
 * `ablate` — remove one node (and every edge touching it) from a graph, returning a fresh graph
 * with everything else held fixed. This is the tier-6 introspection console's own mechanic
 * (§4: "pause any single node or edge and hold everything else fixed, showing exactly what that
 * one piece was contributing"), and it is ALSO the load-bearing primitive `goodhart.mts` uses to
 * compute the honest `MaterialConsumed` audit number: rerun `tick.mts::advance` on the
 * Fast-Inspector-ablated graph from the same starting stocks, over the same tick range, and read
 * off what `widget` would honestly be. One mechanism, two uses — the player's own tool IS the
 * audit, not a hidden shadow calculation with its own separate logic to trust.
 */
export function ablate(graph: ProductionGraph, nodeId: string): ProductionGraph {
  return {
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  };
}
