/**
 * `reflect` — tier 9's own mechanic, DESIGN.md §1's "prestige action itself, renamed to what it's
 * always narratively been." The cartridge-contract intent kind stays the literal string
 * `"prestige"` (DESIGN.md §6: "the last two renamed in narration only ... staying the literal
 * cartridge-contract intent kind for compatibility") — this module is what that intent calls.
 *
 * **What resets, what doesn't — the one asymmetry `state.mts`'s header promises is enforced
 * somewhere.** `widgets` (the graph and its stocks) resets to `starterWidgetGraph()`, exactly
 * Stoke's own prestige. Every OTHER slice of `cognition` (`tiersUnlocked`, `insight`,
 * `crossingsAnswered`, `attention`, `exploration`, `policy`, `calibration`, `values`, `childSeeds`,
 * `margin`) passes through untouched — DESIGN.md §2's `ConsciousState` comment is explicit that
 * cognition is "NEVER reset by a reflection."
 *
 * `goodhart` is the one slice inside `cognition` that needs a deliberate, DOCUMENTED split rather
 * than a blanket "never resets": `auditStocks` and `trustLagQueue` are numbers computed FOR the
 * graph that just got thrown away (stale node ids, divergence amounts measured against a graph
 * that no longer exists) — carrying them forward would be carrying forward numbers about a
 * different graph, which is exactly the kind of undisclosed drift `provenance.mts`'s discipline
 * exists to prevent. `fastInspectorBuilt`/`repairedAtTick` are per-run flags about a node that, per
 * `goodhart.mts`'s own header, "does not survive a reflection." Those four are cleared.
 * `trust` — the scalar reputation number itself — is DELIBERATELY carried forward: it is not a
 * property of the graph, it is the game's own answer to "how much do downstream customers trust
 * this machine," and a fresh graph does not un-ring that bell. Tier 9's own prose ("I keep the
 * lesson... I keep the shape I've grown into learning it") is written for exactly this asymmetry.
 * `branch` also persists (a `goodhart` crisis that was already resolved stays resolved across a
 * later, unrelated reflection) — EXCEPT for the one case this module itself creates: reflecting
 * while a live Fast Inspector edge exists AND the crisis is still `"unresolved"` is DESIGN.md §3's
 * third branch ("Reflect immediately"), so this function sets `branch` to `"reflect-immediately"`
 * in that one case, never overwriting an already-chosen `repair`/`persist`.
 */
import { toMatrix, type ProductionGraph } from "./graph.mts";
import { assessGraphMatrix, dominantEigen, type GraphValidity } from "./eigen.mts";
import { authored, computed, type Tagged } from "./provenance.mts";
import { starterWidgetGraph, type ConsciousState, type ReflectionRecord } from "./state.mts";
import { INSIGHT_TAINT_MULTIPLIER, TAINT_REASON, isTainted } from "./goodhart.mts";

export class InvalidReflectionGraphError extends RangeError {
  constructor(reason: string) {
    super(`reflect: refused — ${reason}`);
    this.name = "InvalidReflectionGraphError";
  }
}

export interface ReflectionPreview {
  readonly validity: GraphValidity;
  /** null exactly when `validity.valid` is false. */
  readonly lambda: Tagged<number> | null;
  readonly mixture: Tagged<Readonly<Record<string, number>>> | null;
}

/** Read-only: what a reflection would bank RIGHT NOW, without performing one. Exactly Stoke's own
 *  `previewPrestige` shape (DESIGN.md §4, tier 9's "reflection preview" mechanic) — the choice to
 *  reflect is always made with full information, never a surprise. `intents.mts::doAblate` also
 *  calls this directly (once on the real graph, once on an ablated copy) to compute tier 6's
 *  "what was this node actually contributing" readout, so this one function is the sole place
 *  reflection math is computed anywhere in the codebase. */
export function previewReflection(graph: ProductionGraph): ReflectionPreview {
  const { matrix, order } = toMatrix(graph);
  const validity = assessGraphMatrix(matrix);
  if (!validity.valid) return { validity, lambda: null, mixture: null };
  const { lambda, vector } = dominantEigen(matrix);
  const mixture: Record<string, number> = {};
  order.forEach((id, i) => {
    mixture[id] = vector[i] ?? 0;
  });
  return {
    validity,
    lambda: computed(lambda, `power iteration over your ${String(order.length)}-node widget graph`),
    mixture: computed(mixture, "L1-normalized dominant eigenvector of your widget graph"),
  };
}

/** Authored banking rate: DESIGNER-CHOSEN, disclosed `designed-flavor`, exactly Stoke's own
 *  `STARTING_STOCK_PER_BANKED_LAMBDA` in spirit — informed by the real lambda, not derived from
 *  it. */
export const INSIGHT_PER_LAMBDA = 5;

/** DESIGN.md §3 item 5's own example figure and reasoning made executable: a reflection banked
 *  while the widget graph carries a live Fast Inspector edge banks Insight at
 *  `INSIGHT_TAINT_MULTIPLIER` (60%) of what an untainted reflection of the same lambda would bank
 *  — "the reflection is real, the eigenvalue is real, the discount is the game's authored opinion
 *  that hollow growth should bank slower than earned growth, said out loud." */
export function insightFromLambda(lambda: number, tainted: boolean): Tagged<number> {
  const raw = lambda * INSIGHT_PER_LAMBDA;
  const value = tainted ? raw * INSIGHT_TAINT_MULTIPLIER : raw;
  return authored(
    value,
    tainted
      ? `${String(INSIGHT_PER_LAMBDA)} x lambda, discounted to ${String(Math.round(INSIGHT_TAINT_MULTIPLIER * 100))}% — this reflection bank a tainted (${TAINT_REASON}) run`
      : `${String(INSIGHT_PER_LAMBDA)} x lambda — an authored banking rate, informed by the real computed lambda`,
  );
}

/**
 * Perform a reflection: bank `(lambda, mixture)` into `reflectionHistory` (with the honesty audit
 * `taintedBy`/`insightBanked`), reset ONLY the `widgets` slice, and carry every other piece of
 * `cognition` forward per this module's own header. Throws `InvalidReflectionGraphError` — never
 * fabricates a number — when the current widget graph has no valid dominant eigenvalue.
 */
export function reflect(state: ConsciousState, nowTs: number): ConsciousState {
  const preview = previewReflection(state.widgets.graph);
  if (!preview.validity.valid || preview.lambda === null || preview.mixture === null) {
    throw new InvalidReflectionGraphError(preview.validity.reason ?? "graph has no valid dominant eigenvalue");
  }
  const tainted = isTainted(state.widgets.graph);
  const insightGain = insightFromLambda(preview.lambda.value, tainted);
  const record: ReflectionRecord = {
    lambda: preview.lambda.value,
    mixture: preview.mixture.value,
    resetAtTs: nowTs,
    taintedBy: tainted ? TAINT_REASON : null,
    insightBanked: insightGain.value,
  };

  const graph = starterWidgetGraph();
  const stocks: Record<string, number> = {};
  for (const n of graph.nodes) stocks[n.id] = 0;

  const priorBranch = state.cognition.goodhart.branch;
  const branch = tainted && priorBranch === "unresolved" ? "reflect-immediately" : priorBranch;

  return {
    widgets: { graph, stocks },
    cognition: {
      ...state.cognition,
      insight: state.cognition.insight + insightGain.value,
      goodhart: {
        ...state.cognition.goodhart,
        fastInspectorBuilt: false,
        auditStocks: {},
        trustLagQueue: [],
        branch,
        repairedAtTick: null,
        // trust: deliberately NOT reset here — see module header.
      },
    },
    reflectionHistory: [...state.reflectionHistory, record],
    lastSeenTs: nowTs,
    seed: state.seed,
  };
}
