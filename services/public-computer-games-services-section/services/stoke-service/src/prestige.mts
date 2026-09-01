/**
 * `prestige` — reset, keeping `(lambda, eigenvector-mixture)`, per the spike's engine-design
 * recommendation: "lambda is the displayed growth-rate number, tagged computed-from-your-graph;
 * the eigenvector, L1-normalized to shares summing to 1, IS the prestige loadout — the fixed
 * mixture the player is held to after reset. Any bonus on top ... must be a separate, additive,
 * designed-flavor-tagged number, never blended into lambda or the eigenvector itself."
 *
 * Two halves, kept structurally separate (never merged into one number the UI could mislabel):
 *   - `previewPrestige` / the lambda+mixture computed inside `reset` — pure readouts of power
 *     iteration over the player's actual graph, tagged `computed-from-your-graph`.
 *   - `startingStockBonus` — a designer-authored curve (linear in banked lambda; the shape itself
 *     was chosen, not derived), tagged `designed-flavor`, applied additively on reset.
 */
import { toMatrix, type ProductionGraph } from "./graph.mts";
import { assessGraphMatrix, dominantEigen, type GraphValidity } from "./eigen.mts";
import { authored, computed, type Tagged } from "./provenance.mts";
import { starterGraph, type PrestigeRecord, type StokeState } from "./state.mts";

export class InvalidPrestigeGraphError extends RangeError {
  constructor(reason: string) {
    super(`prestige.reset: refused — ${reason}`);
    this.name = "InvalidPrestigeGraphError";
  }
}

export interface PrestigePreview {
  readonly validity: GraphValidity;
  /** null exactly when `validity.valid` is false — there is no fabricated number to show. */
  readonly lambda: Tagged<number> | null;
  readonly mixture: Tagged<Readonly<Record<string, number>>> | null;
}

/** Read-only: what the prestige screen would show for `graph` RIGHT NOW, without performing a
 *  reset. Used both by the UI (to render the honest "not yet" state or the real numbers before
 *  the player commits) and by `reset` itself, which is defined in terms of this so the two can
 *  never drift apart. */
export function previewPrestige(graph: ProductionGraph): PrestigePreview {
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
    lambda: computed(lambda, `power iteration over your ${order.length}-node graph`),
    mixture: computed(mixture, "L1-normalized dominant eigenvector of your graph"),
  };
}

/** DESIGNER-CHOSEN curve, disclosed as such: +10% starting Wood stock per unit of lambda ever
 *  banked, across every past reset. The 10% figure and the "linear in lambda" shape are both
 *  authored decisions — nothing here is derived from the math, only informed by its output
 *  (`history`'s computed lambda values are real; how strongly they matter is a design choice). */
const STARTING_STOCK_PER_BANKED_LAMBDA = 10;

export function totalBankedLambda(history: readonly PrestigeRecord[]): number {
  return history.reduce((s, r) => s + r.lambda, 0);
}

export function startingStockBonus(history: readonly PrestigeRecord[]): Tagged<number> {
  const total = totalBankedLambda(history);
  return authored(
    STARTING_STOCK_PER_BANKED_LAMBDA * total,
    `prestige bonus curve: ${STARTING_STOCK_PER_BANKED_LAMBDA} x total banked lambda (${total.toFixed(4)}) — an authored rate, not a computed one`,
  );
}

/**
 * Perform a prestige reset: bank the current graph's `(lambda, mixture)` into `prestigeHistory`,
 * then return a fresh state on `starterGraph()` with an authored starting-stock bonus applied.
 * Refuses — throws `InvalidPrestigeGraphError`, does not fabricate a number — when the current
 * graph has no valid dominant eigenvalue (negative entries, or acyclic per `eigen.mts`'s gate).
 */
export function reset(state: StokeState, nowTs: number): StokeState {
  const preview = previewPrestige(state.graph);
  if (!preview.validity.valid || preview.lambda === null || preview.mixture === null) {
    throw new InvalidPrestigeGraphError(preview.validity.reason ?? "graph has no valid dominant eigenvalue");
  }
  const record: PrestigeRecord = {
    lambda: preview.lambda.value,
    mixture: preview.mixture.value,
    resetAtTs: nowTs,
  };
  const prestigeHistory = [...state.prestigeHistory, record];
  const bonus = startingStockBonus(prestigeHistory);
  const graph = starterGraph();
  const stocks: Record<string, number> = {};
  for (const n of graph.nodes) stocks[n.id] = 0;
  const woodId = graph.nodes[0]?.id;
  if (woodId !== undefined) stocks[woodId] = bonus.value;
  return { graph, stocks, prestigeHistory, lastSeenTs: nowTs, seed: state.seed };
}
