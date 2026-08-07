/**
 * opinion — socializing's OPINION DYNAMICS: DeGroot averaging and the Friedkin–Johnsen model with
 * stubborn agents. Where `consensus.mts`/`face.mts` read WHETHER fixed opinions glue, this models HOW
 * they evolve and whether they converge at all. The package already computes the social graph's
 * Laplacian (`spectralConsensus`); opinion dynamics is the heat flow ON that graph.
 *
 * DeGroot (1974): xₜ₊₁ = W xₜ over a row-stochastic trust matrix W — repeated averaging drives a
 * connected, aperiodic society to consensus (the dominant left eigenvector weighting). Friedkin–
 * Johnsen (1990): xᵢ,ₜ₊₁ = λᵢ Σⱼ Wᵢⱼ xⱼ,ₜ + (1−λᵢ) sᵢ — each agent is pulled toward the social
 * average with susceptibility λᵢ but anchored to its innate opinion sᵢ with stubbornness (1−λᵢ). The
 * crucial empirical fact: with any stubborn agents (λᵢ < 1) holding different innate opinions, the
 * society reaches a PERSISTENT-DISAGREEMENT equilibrium, not consensus — the formal signature of
 * polarization and echo chambers. The observed contraction rate is governed by the graph's algebraic
 * connectivity (the Fiedler value); we report the empirical rate rather than an eigensolve.
 */

const EPSILON = 1e-9;

function normalizeRows(matrix: readonly (readonly number[])[]): number[][] {
  return matrix.map((row) => {
    const total = row.reduce((sum, value) => sum + Math.max(0, value), 0);
    return total <= 0
      ? row.map(() => 0)
      : row.map((value) => Math.max(0, value) / total);
  });
}

function apply(row: readonly number[], vector: readonly number[]): number {
  return row.reduce((sum, weight, index) => sum + weight * (vector[index] ?? 0), 0);
}

function spreadOf(vector: readonly number[]): number {
  return vector.length === 0 ? 0 : Math.max(...vector) - Math.min(...vector);
}

/** A uniform-averaging (DeGroot) trust matrix from an undirected neighbor list, including self-trust:
 *  each agent weights itself and each neighbor equally. A convenience for building W from a graph. */
export function averagingMatrix(size: number, edges: readonly (readonly [number, number])[]): number[][] {
  const matrix = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)));
  for (const [a, b] of edges) {
    matrix[a]![b]! = 1;
    matrix[b]![a]! = 1;
  }
  return normalizeRows(matrix);
}

/** The outcome of an opinion-dynamics run. */
export interface OpinionEquilibrium {
  readonly kind: "socializing.opinion-equilibrium";
  /** the opinions at the (approximate) equilibrium. */
  readonly opinions: readonly number[];
  /** the max−min spread of the equilibrium opinions. */
  readonly spread: number;
  /** the society reached CONSENSUS (spread below tolerance). */
  readonly consensus: boolean;
  /** PERSISTENT DISAGREEMENT: a stable equilibrium with a non-trivial spread (polarization). */
  readonly polarized: boolean;
  /** the iteration converged to a fixed point within the step budget. */
  readonly converged: boolean;
  /** the empirical contraction rate (spreadₜ₊₁/spreadₜ near the end) — small ⇒ fast mixing (large
   *  algebraic connectivity / Fiedler value); near 1 ⇒ a bottlenecked, slow-mixing society. */
  readonly contraction: number;
}

/**
 * degroot — iterate DeGroot averaging xₜ₊₁ = W xₜ from the initial opinions to a fixed point (or the
 * step budget). A connected, self-trusting society converges to consensus; a disconnected one
 * converges within components. Reports the equilibrium, spread, and empirical contraction rate.
 */
export function degroot(weights: readonly (readonly number[])[], initial: readonly number[], steps = 200): OpinionEquilibrium {
  const W = normalizeRows(weights);
  let opinions = [...initial];
  let previousSpread = spreadOf(opinions);
  let contraction = 0;
  let converged = false;
  for (let step = 0; step < steps; step += 1) {
    const next = W.map((row) => apply(row, opinions));
    const nextSpread = spreadOf(next);
    contraction = previousSpread <= EPSILON ? 0 : nextSpread / previousSpread;
    const delta = Math.max(...next.map((value, index) => Math.abs(value - (opinions[index] ?? 0))), 0);
    opinions = next;
    previousSpread = nextSpread;
    if (delta < EPSILON) { converged = true; break; }
  }
  const spread = spreadOf(opinions);
  return Object.freeze({
    kind: "socializing.opinion-equilibrium" as const,
    opinions: Object.freeze(opinions),
    spread,
    consensus: spread < 1e-6,
    polarized: converged && spread >= 1e-6,
    converged,
    contraction,
  });
}

/**
 * friedkinJohnsen — iterate the Friedkin–Johnsen update xᵢ ← λᵢ Σⱼ Wᵢⱼ xⱼ + (1−λᵢ) sᵢ to equilibrium.
 * `susceptibility[i]` = λᵢ ∈ [0,1] (1 = fully open / pure DeGroot, 0 = immovably stubborn at its innate
 * opinion). With any stubborn agents holding distinct innate opinions, the equilibrium is a persistent
 * disagreement — the model's signature result, and why a society of anchored agents never fully
 * converges. `innate` defaults to the initial opinions.
 */
export function friedkinJohnsen(
  weights: readonly (readonly number[])[],
  initial: readonly number[],
  susceptibility: readonly number[],
  innate: readonly number[] = initial,
  steps = 500,
): OpinionEquilibrium {
  const W = normalizeRows(weights);
  let opinions = [...initial];
  let previousSpread = spreadOf(opinions);
  let contraction = 0;
  let converged = false;
  for (let step = 0; step < steps; step += 1) {
    const next = W.map((row, i) => {
      const lambda = Math.min(1, Math.max(0, susceptibility[i] ?? 1));
      return lambda * apply(row, opinions) + (1 - lambda) * (innate[i] ?? 0);
    });
    const nextSpread = spreadOf(next);
    contraction = previousSpread <= EPSILON ? 0 : nextSpread / previousSpread;
    const delta = Math.max(...next.map((value, index) => Math.abs(value - (opinions[index] ?? 0))), 0);
    opinions = next;
    previousSpread = nextSpread;
    if (delta < EPSILON) { converged = true; break; }
  }
  const spread = spreadOf(opinions);
  return Object.freeze({
    kind: "socializing.opinion-equilibrium" as const,
    opinions: Object.freeze(opinions),
    spread,
    consensus: spread < 1e-6,
    polarized: converged && spread >= 1e-6,
    converged,
    contraction,
  });
}
