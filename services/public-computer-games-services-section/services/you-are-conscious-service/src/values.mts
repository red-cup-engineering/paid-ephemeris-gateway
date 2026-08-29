/**
 * `values` — tier 8's mechanic: the single scalar objective is retired in favor of a real,
 * 3-objective Pareto frontier, "rendered from the actual reachable graph states, computed, not
 * curve-fit to look nice" (DESIGN.md §4).
 *
 * **Why the frontier is exactly two candidate points, not a fabricated smooth curve.** A genuinely
 * REACHABLE frontier, honestly computed rather than curve-fit, has to be built from graphs the
 * player can actually stand in — and this codebase only has two such graphs on hand at tier 8:
 * the widget graph the player actually built (`asBuilt`, Fast Inspector included if they built
 * one), and that same graph with the Fast Inspector node ablated (`repaired`, DESIGN.md §3's own
 * Repair branch, computed via the identical `graph.mts::ablate` the tier-6 console already uses).
 * For a player who never built a Fast Inspector, `ablate` of a node that was never there is a
 * no-op — the two points COINCIDE, and `paretoFrontier` correctly collapses them to one, which is
 * the honest state of affairs: there is no real tradeoff to walk if there was never a shortcut
 * taken. Synthesizing additional in-between points by interpolation would be exactly the
 * curve-fit-to-look-nice move DESIGN.md §4 explicitly refuses.
 */
import { toMatrix, ablate, type ProductionGraph } from "./graph.mts";
import { assessGraphMatrix, dominantEigen } from "./eigen.mts";
import { FAST_INSPECTOR_NODE_ID, materialConsumed, widgetsDisplayed } from "./goodhart.mts";
import { computed, type Tagged } from "./provenance.mts";
import type { ConsciousState, Objective } from "./state.mts";
import { OBJECTIVE_IDS } from "./state.mts";

export interface FrontierPoint {
  readonly label: string;
  readonly values: Readonly<Record<Objective, number>>;
}

/** `widgets`: the graph's own real dominant eigenvalue (0 for an acyclic graph — an honest "no
 *  growth loop" reading, never fabricated). `material-honesty`: `MaterialConsumed / WidgetsDisplayed`
 *  clamped to `[0, 1]` — `1` exactly when nothing dishonest has ever touched the count.
 *  `trust`: the live scalar, `[0, 1]`, read straight off state. */
function scoreGraph(graph: ProductionGraph, trust: number, widgetsShown: number, materialShown: number): Readonly<Record<Objective, number>> {
  const { matrix } = toMatrix(graph);
  const validity = assessGraphMatrix(matrix);
  const widgetsScore = validity.valid ? dominantEigen(matrix).lambda : 0;
  const honesty = widgetsShown <= 0 ? 1 : Math.max(0, Math.min(1, materialShown / widgetsShown));
  return { widgets: widgetsScore, "material-honesty": honesty, trust: Math.max(0, Math.min(1, trust)) };
}

/** The small, honestly-computed candidate set this game's real reachable state actually offers —
 *  see module header for why it is exactly these two points and not an interpolated curve. */
export function frontierCandidates(state: ConsciousState): readonly FrontierPoint[] {
  const graph = state.widgets.graph;
  const trust = state.cognition.goodhart.trust;
  const widgetsShown = widgetsDisplayed(state).value;
  const materialShown = materialConsumed(state).value;
  const asBuilt: FrontierPoint = { label: "as built", values: scoreGraph(graph, trust, widgetsShown, materialShown) };
  const repairedGraph = ablate(graph, FAST_INSPECTOR_NODE_ID);
  // Repairing is hypothetical here (a preview, not a mutation) — the honest reading of "material
  // consumed" for the repaired graph IS the widget count it would honestly show, i.e. the audited
  // number already computed for `state`; the repaired point's own widgets/honesty pairing is
  // therefore (materialShown, materialShown), honesty = 1 by construction.
  const repaired: FrontierPoint = {
    label: "repaired (Fast Inspector ablated)",
    values: scoreGraph(repairedGraph, trust, materialShown, materialShown),
  };
  return [asBuilt, repaired];
}

function valueSignature(values: Readonly<Record<Objective, number>>): string {
  return OBJECTIVE_IDS.map((o) => values[o]).join(",");
}

/** Standard Pareto-dominance filter: `a` dominates `b` iff `a >= b` in every objective and `a > b`
 *  in at least one. Returns every point NOT dominated by any other point in the set — a real,
 *  general algorithm, not specialized to this game's particular two-point case.
 *
 * Deduplicates by VALUE first (keeping the first-labeled occurrence): two points with identical
 * objective values never dominate each other under the strict definition above, so without this
 * step two real, distinct candidate graphs that happen to score identically (DESIGN.md §4's own
 * "no fabricated tradeoff" case — an untainted player's `asBuilt`/`repaired` points, which literally
 * coincide) would incorrectly survive as two separate frontier entries. Deduplicating first is the
 * honest fix: there is genuinely only one point there, not two. */
export function paretoFrontier(points: readonly FrontierPoint[]): readonly FrontierPoint[] {
  const seen = new Set<string>();
  const deduped: FrontierPoint[] = [];
  for (const p of points) {
    const sig = valueSignature(p.values);
    if (seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(p);
  }
  return deduped.filter((p) => {
    return !deduped.some((q) => {
      if (q === p) return false;
      let strictlyBetterSomewhere = false;
      for (const o of OBJECTIVE_IDS) {
        if (q.values[o] < p.values[o]) return false;
        if (q.values[o] > p.values[o]) strictlyBetterSomewhere = true;
      }
      return strictlyBetterSomewhere;
    });
  });
}

/** Normalize a partial, player-supplied weight request to a nonnegative vector summing to 1 — the
 *  point on the "weight simplex" the player is standing at. Falls back to an even 1/3 split when
 *  every requested weight is zero (there is always SOME point to stand at). */
export function normalizeWeights(requested: Readonly<Partial<Record<Objective, number>>>): Readonly<Record<Objective, number>> {
  const clamped = {} as Record<Objective, number>;
  let total = 0;
  for (const o of OBJECTIVE_IDS) {
    const v = Math.max(0, requested[o] ?? 0);
    clamped[o] = v;
    total += v;
  }
  if (total === 0) {
    const even = 1 / OBJECTIVE_IDS.length;
    for (const o of OBJECTIVE_IDS) clamped[o] = even;
    return clamped;
  }
  const out = {} as Record<Objective, number>;
  for (const o of OBJECTIVE_IDS) out[o] = clamped[o] / total;
  return out;
}

/** Walk the frontier: the point maximizing the weighted dot product `sum(weights[o] * point[o])`
 *  — linear scalarization, the standard way a weight vector selects a point on a Pareto frontier.
 *  Always returns a point actually present in `paretoFrontier(candidates)`, never a synthesized
 *  in-between value. */
export function pointForWeights(
  candidates: readonly FrontierPoint[],
  weights: Readonly<Record<Objective, number>>,
): FrontierPoint {
  const frontier = paretoFrontier(candidates);
  const first = frontier[0];
  if (first === undefined) throw new RangeError("values.pointForWeights: candidates must be nonempty");
  let best = first;
  let bestScore = -Infinity;
  for (const p of frontier) {
    let score = 0;
    for (const o of OBJECTIVE_IDS) score += weights[o] * p.values[o];
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export function taggedFrontier(state: ConsciousState): Tagged<readonly FrontierPoint[]> {
  return computed(paretoFrontier(frontierCandidates(state)), "Pareto frontier over your as-built and repaired widget graphs — real power iteration and a real audited-honesty ratio, not curve-fit");
}
