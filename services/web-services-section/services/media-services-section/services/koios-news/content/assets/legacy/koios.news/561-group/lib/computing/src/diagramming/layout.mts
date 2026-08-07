/**
 * layout — a generic layered (Sugiyama) graph layout, shared by every graph the
 * renderers draw.
 *
 * The dependency DAG and the per-package symbol graph are different graphs but
 * the same geometry problem: rank nodes into rows by longest path, order each
 * row to thin out crossings, then place boxes on a grid. This module owns that
 * geometry over a minimal `(ids, edges)` interface; the renderers map their own
 * node types onto the placed points.
 *
 * Ranking is by longest path along *incoming* edges: a node with no incoming
 * edge is a source at rank 0 (the top), and every other node ranks one below the
 * deepest source that reaches it. For the dependency graph (edge dependent →
 * dependency) that puts consumers at the top and foundations at the base. Cycles
 * — symbol graphs can have them (mutually recursive types) — are broken by a
 * memoized walk with an on-stack guard, so a back-edge adds no rank.
 */
export interface LayoutEdge {
  readonly from: string;
  readonly to: string;
}

export interface LayoutGeometry {
  /** Node box width/height in px. */
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  /** Horizontal gap within a row; vertical gap between rows. */
  readonly hGap: number;
  readonly vGap: number;
  /** Document margin in px. */
  readonly margin: number;
  /** Barycenter ordering sweeps. More = fewer crossings, slower. */
  readonly sweeps: number;
}

export const LAYOUT_DEFAULTS: LayoutGeometry = {
  nodeWidth: 184,
  nodeHeight: 26,
  hGap: 22,
  vGap: 78,
  margin: 32,
  sweeps: 6,
};

/** One node placed in the plane: its rank (row from the top) and box centre. */
export interface PlacedPoint {
  readonly rank: number;
  readonly cx: number;
  readonly cy: number;
}

export interface GraphGeometry {
  /** id → placed point. */
  readonly points: ReadonlyMap<string, PlacedPoint>;
  /** Greatest rank (number of rows minus one). */
  readonly maxRank: number;
  readonly width: number;
  readonly height: number;
}

// Longest path along incoming edges. Memoized, with an on-stack guard so a
// cycle can't recurse forever — a back-edge contributes no rank.
function rankByLongestPath(
  ids: readonly string[],
  edges: readonly LayoutEdge[],
): Map<string, number> {
  const incoming = new Map<string, string[]>(); // node -> nodes with an edge into it
  for (const id of ids) incoming.set(id, []);
  for (const e of edges) incoming.get(e.to)?.push(e.from);
  const rank = new Map<string, number>();
  const onStack = new Set<string>();
  const visit = (id: string): number => {
    const cached = rank.get(id);
    if (cached !== undefined) return cached;
    if (onStack.has(id)) return 0; // cycle edge — no contribution
    onStack.add(id);
    let r = 0;
    for (const m of incoming.get(id) ?? []) r = Math.max(r, 1 + visit(m));
    onStack.delete(id);
    rank.set(id, r);
    return r;
  };
  for (const id of ids) visit(id);
  return rank;
}

// Group ids into rows by rank, preserving input order within a row.
function rowsByRank(
  ids: readonly string[],
  rank: Map<string, number>,
  maxRank: number,
): string[][] {
  const rows: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of ids) rows[rank.get(id) ?? 0]!.push(id);
  return rows;
}

// Barycenter ordering: alternately sweep down and up, reordering each row so a
// node sits near the average slot of its neighbours in the adjacent row. The
// adjacency is undirected — an adjacent row only ever holds one edge direction,
// so slot-filtering against the neighbour row picks the right neighbours either
// way. Cheap crossing-reduction, good enough at this scale.
function orderRows(
  rows: string[][],
  edges: readonly LayoutEdge[],
  sweeps: number,
): void {
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string): void => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
  };
  for (const e of edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  const slotOf = (row: string[]): Map<string, number> =>
    new Map(row.map((id, i) => [id, i]));
  const sweep = (neighbourRow: string[], row: string[]): void => {
    const slot = slotOf(neighbourRow);
    const bary = new Map<string, number>();
    row.forEach((id, i) => {
      const ns = (adj.get(id) ?? []).map((m) => slot.get(m)).filter((v): v is number => v !== undefined);
      bary.set(id, ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : i);
    });
    row.sort((a, b) => bary.get(a)! - bary.get(b)! || a.localeCompare(b));
  };
  for (let s = 0; s < sweeps; s++) {
    if (s % 2 === 0) {
      for (let d = 1; d < rows.length; d++) sweep(rows[d - 1]!, rows[d]!);
    } else {
      for (let d = rows.length - 2; d >= 0; d--) sweep(rows[d + 1]!, rows[d]!);
    }
  }
}

/** Lay a graph out in the plane. Pure geometry — no SVG, no node payloads.
 *  Rank 0 (sources) sits at the top; rows centre horizontally; the caller maps
 *  its own nodes onto the returned points by id. */
export function layoutGraph(
  ids: readonly string[],
  edges: readonly LayoutEdge[],
  geom: LayoutGeometry = LAYOUT_DEFAULTS,
): GraphGeometry {
  const { nodeWidth, nodeHeight, hGap, vGap, margin, sweeps } = geom;
  const rank = rankByLongestPath(ids, edges);
  const maxRank = ids.reduce((m, id) => Math.max(m, rank.get(id) ?? 0), 0);
  const rows = rowsByRank(ids, rank, maxRank);
  orderRows(rows, edges, sweeps);

  const stepX = nodeWidth + hGap;
  const stepY = nodeHeight + vGap;
  const widest = rows.reduce((m, r) => Math.max(m, r.length), 1);
  const innerWidth = widest * stepX - hGap;

  const points = new Map<string, PlacedPoint>();
  for (let d = 0; d <= maxRank; d++) {
    const row = rows[d]!;
    const rowWidth = row.length * stepX - hGap;
    const startX = margin + (innerWidth - rowWidth) / 2;
    const cy = margin + d * stepY + nodeHeight / 2;
    row.forEach((id, i) => {
      points.set(id, { rank: d, cx: startX + i * stepX + nodeWidth / 2, cy });
    });
  }

  const width = innerWidth + 2 * margin;
  const height = (maxRank + 1) * stepY - vGap + 2 * margin;
  return { points, maxRank, width, height };
}
