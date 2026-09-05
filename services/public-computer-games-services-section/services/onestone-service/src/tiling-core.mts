/**
 * `tiling-core` — the shared geometry compiler every tessellation chapter builds on.
 *
 * onestone's whole differentiator is that the board is a graph, not a grid: a chapter author
 * only has to emit unit-scale polygons (`RawCell[]`) for their tiling, and `compileGeometry`
 * turns that into the tiling-agnostic `BoardGeometry` the ONE match/cascade engine consumes —
 * shared-edge adjacency, a baked +y gravity field, and precomputed straight-line rails. No
 * downstream module ever branches on `TilingKind`; every tiling-specific decision lives here,
 * once, so hex/rhombille/Cairo/Penrose/hat/Wang chapters cost a cell generator, not an engine
 * rewrite.
 *
 * Three deliberate design choices, each because raw floating polygon math is not trustworthy
 * enough to hang board topology on directly:
 *
 * 1. Adjacency is discovered by *edges*, not proximity or shared vertices — two cells are
 *    neighbors iff a full edge of one exactly matches a full edge of the other (a corner touch,
 *    as at a square-grid diagonal, is deliberately NOT adjacency). Coordinates are quantized to
 *    1e-4 before keying so that two cells' independently-computed shared edge (e.g. hex trig
 *    vs. rhombille trig meeting at the same vertex) still hashes identically despite float
 *    noise, without accidentally merging two genuinely different points.
 * 2. Gravity (`fallTo`/`fallFrom`) is a baked field, not a live physics sim, because settle
 *    order must be exactly reproducible. `fallTo` picks the neighbor most aligned with +y
 *    (down) among those exceeding a 0.25 alignment dot — a deliberate dead zone so a mostly-
 *    sideways neighbor (as hex/rhombille boards have) never gets mistaken for "downhill". On
 *    non-square tilings two upstream cells can both want the same downhill cell; the nearer
 *    center wins that contention and the loser's `fallTo` stays null (it becomes a local floor,
 *    not a false gravity link) — this keeps `fallTo`/`fallFrom` a strict, verifiable inverse
 *    pair rather than a many-to-one relation the engine would have to special-case.
 * 3. Rails generalize "row"/"column" to any tiling: at each cell, two neighbors are an
 *    "opposite-ish" through-pair when the incoming direction (previous cell -> this cell) and
 *    outgoing direction (this cell -> next cell) differ by less than 30 degrees — i.e. the walk
 *    doesn't meaningfully turn. That tolerance (not an exact 0/180 degree equality check) is
 *    what lets this same compiler serve hex's 3 axis families today and imperfectly-regular
 *    tilings (Cairo, Penrose) down the roadmap without a rewrite. Chains shorter than 3 cells
 *    cannot host a match and are dropped; family ids are the sorted distinct quantized
 *    directions, so family numbering is deterministic across runs regardless of build order.
 */
import type { BoardGeometry, Cell, CellId, Rail, TilingKind } from './types.mts';

/**
 * A tiling chapter's raw output before compilation: one polygon per cell, unit-scale, in any
 * consistent board coordinate system (compileGeometry normalizes origin and derives everything
 * else). `shade` is the cosmetic orientation index (rhombille's cube-illusion field); 0 for
 * tilings that don't use it.
 */
export interface RawCell {
  poly: number[];
  cx: number;
  cy: number;
  shade: number;
}

/** Quantization grain for edge-key coordinates — well below any real tiling's vertex spacing,
 * so it only absorbs float noise and never merges two distinct vertices. */
const EDGE_QUANT = 1e-4;

/** Straight-walk tolerance: the max degrees a chain may bend at one cell and still count as
 * "straight" for rail purposes (see module doc point 3). */
const RAIL_TOLERANCE_DEG = 30;

/** Minimum alignment with +y (gravity) for a neighbor to be considered "downhill" at all. */
const FALL_ALIGNMENT_MIN = 0.25;

interface Vec {
  x: number;
  y: number;
}

function normalize(dx: number, dy: number): Vec {
  const len = Math.hypot(dx, dy);
  return len === 0 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
}

function angleBetweenDeg(a: Vec, b: Vec): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Fold a direction into [0, pi) so a line and its reverse share one bucket, then round well
 * below the rail tolerance so float noise from independent trig can't split one family in two. */
function directionBucket(v: Vec): number {
  const folded = ((Math.atan2(v.y, v.x) % Math.PI) + Math.PI) % Math.PI;
  return Math.round(folded * 10000) / 10000;
}

function quantize(n: number): number {
  return Math.round(n / EDGE_QUANT) * EDGE_QUANT;
}

function pointKey(x: number, y: number): string {
  return `${quantize(x).toFixed(4)},${quantize(y).toFixed(4)}`;
}

/** Canonical key for an edge regardless of which endpoint/winding order it was walked from. */
function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = pointKey(x1, y1);
  const b = pointKey(x2, y2);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function addLink(adj: Map<CellId, Set<CellId>>, a: CellId, b: CellId): void {
  let sa = adj.get(a);
  if (!sa) {
    sa = new Set();
    adj.set(a, sa);
  }
  sa.add(b);
  let sb = adj.get(b);
  if (!sb) {
    sb = new Set();
    adj.set(b, sb);
  }
  sb.add(a);
}

/**
 * Walk one direction-family's link graph into maximal chains. Well-formed bounded tilings
 * produce simple paths (degree <= 2 everywhere), so we start from degree-<=1 endpoints; the
 * fallback pass over remaining nodes only matters for a pathological closed loop, which no v1
 * tiling produces — it still terminates (each step only advances into unvisited nodes) rather
 * than looping forever, just without a "closed cycle" record.
 */
function extractChains(adj: Map<CellId, Set<CellId>>): CellId[][] {
  const visited = new Set<CellId>();
  const nodes = [...adj.keys()].sort((a, b) => a - b);
  const endpoints = nodes.filter((n) => (adj.get(n)?.size ?? 0) <= 1);
  const order = [...endpoints, ...nodes];
  const chains: CellId[][] = [];
  for (const start of order) {
    if (visited.has(start)) continue;
    const chain: CellId[] = [start];
    visited.add(start);
    let curr = start;
    for (;;) {
      const nbrs = adj.get(curr);
      let next: CellId | undefined;
      if (nbrs) {
        for (const cand of nbrs) {
          if (!visited.has(cand)) {
            next = cand;
            break;
          }
        }
      }
      if (next === undefined) break;
      chain.push(next);
      visited.add(next);
      curr = next;
    }
    chains.push(chain);
  }
  return chains;
}

/** Mutable working shape while compiling; frozen into `Cell`s at the end. */
interface WorkingCell {
  id: CellId;
  poly: number[];
  cx: number;
  cy: number;
  shade: number;
  neighbors: CellId[];
}

/**
 * Compile raw per-tiling polygons into the tiling-agnostic `BoardGeometry` the engine runs on.
 * Pure: same `raw` always compiles to the same geometry (rail/family ordering is deterministic
 * by sorted ids and sorted bucket values, never insertion order of a Set/Map that could vary).
 */
export function compileGeometry(
  tiling: TilingKind,
  raw: readonly RawCell[],
  paletteSize: number,
): BoardGeometry {
  if (raw.length === 0) {
    return { tiling, cells: [], rails: [], railsAt: [], width: 0, height: 0, paletteSize };
  }

  // --- origin-normalize the bounding box of every polygon -----------------------------------
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of raw) {
    for (let i = 0; i < c.poly.length; i += 2) {
      const x = c.poly[i]!;
      const y = c.poly[i + 1]!;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const cells: WorkingCell[] = raw.map((c, id) => ({
    id,
    poly: c.poly.map((v, i) => (i % 2 === 0 ? v - minX : v - minY)),
    cx: c.cx - minX,
    cy: c.cy - minY,
    shade: c.shade,
    neighbors: [],
  }));

  // --- shared-edge adjacency via canonical quantized edge keys ------------------------------
  const edgeMap = new Map<string, CellId[]>();
  for (const cell of cells) {
    const n = cell.poly.length;
    for (let i = 0; i < n; i += 2) {
      const x1 = cell.poly[i]!;
      const y1 = cell.poly[i + 1]!;
      const j = (i + 2) % n;
      const x2 = cell.poly[j]!;
      const y2 = cell.poly[j + 1]!;
      const key = edgeKey(x1, y1, x2, y2);
      const holders = edgeMap.get(key);
      if (holders) holders.push(cell.id);
      else edgeMap.set(key, [cell.id]);
    }
  }
  for (const holders of edgeMap.values()) {
    // Normally exactly 2 cells share an edge key; connect every pair defensively in case a
    // degenerate input polygon set produces more (rather than silently dropping cells).
    for (let i = 0; i < holders.length; i++) {
      for (let j = 0; j < holders.length; j++) {
        if (i === j) continue;
        const a = cells[holders[i]!]!;
        const b = holders[j]!;
        if (!a.neighbors.includes(b)) a.neighbors.push(b);
      }
    }
  }
  for (const cell of cells) cell.neighbors.sort((a, b) => a - b);

  // --- +y gravity: rawFallTo per cell, then nearest-center contention resolution ------------
  const rawFallTo: Array<CellId | null> = cells.map(() => null);
  for (const cell of cells) {
    let bestDot = FALL_ALIGNMENT_MIN;
    let best: CellId | null = null;
    for (const nid of cell.neighbors) {
      const n = cells[nid]!;
      const dx = n.cx - cell.cx;
      const dy = n.cy - cell.cy;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const dot = dy / len; // alignment with gravity (0, 1)
      if (dot > bestDot) {
        bestDot = dot;
        best = nid;
      }
    }
    rawFallTo[cell.id] = best;
  }

  const contenders = new Map<CellId, CellId[]>();
  for (const cell of cells) {
    const target = rawFallTo[cell.id]!;
    if (target === null) continue;
    const arr = contenders.get(target);
    if (arr) arr.push(cell.id);
    else contenders.set(target, [cell.id]);
  }

  const fallTo: Array<CellId | null> = cells.map(() => null);
  const fallFrom: Array<CellId | null> = cells.map(() => null);
  for (const [target, sources] of contenders) {
    const t = cells[target]!;
    let winner = sources[0]!;
    let winnerDist = Math.hypot(cells[winner]!.cx - t.cx, cells[winner]!.cy - t.cy);
    for (let k = 1; k < sources.length; k++) {
      const s = sources[k]!;
      const d = Math.hypot(cells[s]!.cx - t.cx, cells[s]!.cy - t.cy);
      if (d < winnerDist) {
        winner = s;
        winnerDist = d;
      }
    }
    // The losing contenders keep fallTo === null (a local floor) rather than a falsified link,
    // preserving fallTo/fallFrom as a strict inverse pair for the engine to trust blindly.
    fallTo[winner] = target;
    fallFrom[target] = winner;
  }

  // --- rails: maximal straight chains, grouped into direction-bucket families ---------------
  const familyAdj = new Map<number, Map<CellId, Set<CellId>>>();
  for (const cell of cells) {
    const neighbors = cell.neighbors;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = 0; j < neighbors.length; j++) {
        if (i === j) continue;
        const p = cells[neighbors[i]!]!;
        const q = cells[neighbors[j]!]!;
        const inDir = normalize(cell.cx - p.cx, cell.cy - p.cy);
        const outDir = normalize(q.cx - cell.cx, q.cy - cell.cy);
        if (angleBetweenDeg(inDir, outDir) >= RAIL_TOLERANCE_DEG) continue;
        const bucket = directionBucket(outDir);
        let adj = familyAdj.get(bucket);
        if (!adj) {
          adj = new Map();
          familyAdj.set(bucket, adj);
        }
        addLink(adj, cell.id, p.id);
        addLink(adj, cell.id, q.id);
      }
    }
  }

  const rails: Rail[] = [];
  const railsAt: CellId[][] = cells.map(() => []);
  const buckets = [...familyAdj.keys()].sort((a, b) => a - b);
  buckets.forEach((bucket, familyIdx) => {
    const adj = familyAdj.get(bucket)!;
    for (const chain of extractChains(adj)) {
      if (chain.length < 3) continue; // shorter chains can never host a 3-run match
      const railIdx = rails.length;
      rails.push({ family: familyIdx, cells: chain });
      for (const cid of chain) railsAt[cid]!.push(railIdx);
    }
  });

  const outCells: Cell[] = cells.map((c) => ({
    id: c.id,
    poly: c.poly,
    cx: c.cx,
    cy: c.cy,
    neighbors: c.neighbors,
    fallFrom: fallFrom[c.id]!,
    fallTo: fallTo[c.id]!,
    shade: c.shade,
  }));

  return {
    tiling,
    cells: outCells,
    rails,
    railsAt,
    width: maxX - minX,
    height: maxY - minY,
    paletteSize,
  };
}
