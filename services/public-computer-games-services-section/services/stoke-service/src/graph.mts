/**
 * `graph` — the production graph, as data. Nodes are buildings/resources; edges are reinvestment
 * pipes ("this fraction of A's stock is produced into B, every tick"). Nothing here is a class or
 * hides mutable state: a `ProductionGraph` is a plain, JSON-safe, immutable value, exactly the
 * shape `tick.mts` and `eigen.mts` both read and nothing else writes except through the pure
 * `intents.mts` reducers.
 *
 * Convention, carried over unchanged from the spike (`stoke-spike/spike.mts`): for an edge
 * `{ from: A, to: B, rate: r }`, every tick `B` gains `r * stock[A]`. The player never edits a
 * matrix directly — they build nodes and connect edges, and `toMatrix` is the one place that
 * turns their graph into the `number[][]` `eigen.mts` actually does linear algebra on.
 *
 * `M[target][source] = rate` of the edge `source -> target` — the spike's own matrix convention,
 * kept verbatim so a reader can check this module against the spike's worked examples directly.
 */

export interface ProductionNode {
  readonly id: string;
  readonly label: string;
  /** Per-tick production this node generates on its own, independent of any edge — the
   *  exogenous "source" term. A pure extraction building (Wood) has a positive baseGeneration
   *  and no incoming edges; a pure sink (Museum, Gold) typically has baseGeneration 0. Purchased
   *  building levels are folded into this number by `intents.mts`'s `build`/`upgrade` reducers,
   *  not tracked as a separate multiplier here — `graph.mts` only ever holds the *current*
   *  effective rate, never a formula. */
  readonly baseGeneration: number;
}

export interface ProductionEdge {
  readonly from: string;
  readonly to: string;
  /** Nonnegative reinvestment rate. Negative "synergy" edges are deliberately not representable
   *  here — the spike's probe (§4) found PF's positivity guarantee, and the house's own exact
   *  tooling, both break down on negative entries. A negative-cost mechanic, if ever wanted, must
   *  be modeled as a separate `designed-flavor`-tagged penalty applied outside this matrix, per
   *  the spike's engine-design recommendation — never as an edge here. `assertNonNegativeEdge`
   *  enforces this at construction, not just by convention. */
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
 *  order nodes/edges were added in, which matters for both replay-hash stability and for
 *  `eigen.mts`'s output being reproducible across identical graphs built via different intent
 *  sequences (e.g. build A then B, vs build B then A). */
export function nodeOrder(graph: ProductionGraph): readonly string[] {
  return graph.nodes.map((n) => n.id).slice().sort();
}

export interface GraphMatrix {
  readonly order: readonly string[];
  readonly matrix: readonly (readonly number[])[];
}

/** The production matrix M, per the header convention: `M[target][source] = rate`. This is the
 *  ONLY matrix `eigen.mts` ever sees — it deliberately excludes `baseGeneration` (the exogenous
 *  term), because prestige (`prestige.mts`) prices the player's *reinvestment structure*, not
 *  their raw extraction rate. See `tick.mts` for where `baseGeneration` re-enters as the affine
 *  term `b` in the actual stock-evolution step. */
export function toMatrix(graph: ProductionGraph): GraphMatrix {
  assertValidGraph(graph);
  const order = nodeOrder(graph);
  const index = new Map(order.map((id, i) => [id, i]));
  const n = order.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (const edge of graph.edges) {
    const target = index.get(edge.to);
    const source = index.get(edge.from);
    if (target === undefined || source === undefined) continue; // unreachable after assertValidGraph, kept defensive
    matrix[target]![source] = (matrix[target]![source] ?? 0) + edge.rate;
  }
  return { order, matrix };
}

/** The exogenous base-generation vector `b`, in the same node order `toMatrix` uses — the two
 *  MUST be built from the same `nodeOrder(graph)` call or their indices desync; callers that need
 *  both (only `tick.mts` does) get both from this pair, never re-derive order independently. */
export function baseVector(graph: ProductionGraph, order: readonly string[]): readonly number[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n.baseGeneration]));
  return order.map((id) => byId.get(id) ?? 0);
}

/** True iff every edge rate is >= 0. `toMatrix`/`assertValidGraph` already enforce this at
 *  construction, so in practice this is always true for any `ProductionGraph` that exists in
 *  memory — exposed anyway as an explicit, cheap pre-check `eigen.mts`'s validity gate can name
 *  in its own reasoning, per the spike's "validity gate before showing any computed number"
 *  recommendation, without re-deriving the property from scratch. */
export function isNonNegative(graph: ProductionGraph): boolean {
  return graph.edges.every((e) => e.rate >= 0);
}
