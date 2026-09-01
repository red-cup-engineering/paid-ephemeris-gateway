/**
 * `eigen` — dominant eigenvalue + eigenvector of a real square matrix, by power iteration.
 *
 * Ported from the research spike (`stoke-spike/power-iteration.mts`) with the one fix the spike's
 * own §5 flagged as a known rough edge before shipping: the original convergence check watched
 * the raw L2 distance between successive *iterate directions*, which under-detects convergence
 * when the dominant eigenvalue is negative (the direction sign-flips every step forever, even
 * once the vector has otherwise settled onto the eigenvector's *line*). This version measures
 * distance to that line — `min(||next-v||, ||next+v||)` — instead of distance to the point `v`,
 * which is sign-agnostic by construction (a flip to `-v` is zero distance from the line) while
 * keeping the exact same convergence rate/precision the spike's original point-distance check
 * had whenever no sign flip occurs (the two are identical in that case). A pure lambda-delta
 * check was tried first and rejected: the Rayleigh quotient converges faster than the eigenvector
 * itself, so stopping on lambda alone left the returned vector short of the 1e-9 precision
 * `eigen.test.mts`'s analytic Fibonacci case checks for.
 *
 * WHY THIS FILE EXISTS RATHER THAN CALLING `@lenticule-science/metrologic` DIRECTLY: per the spike's finding,
 * `@lenticule-science/metrologic/spectral` (the documented subpath) never touches a matrix or an eigenvector at
 * all, and `@lenticule-science/metrologic/verdier/spectral` (the subpath that DOES have real dominant-eigenvalue
 * machinery — `isPrimitive`/`perronConvergent`) is built on von-Neumann unary naturals with no
 * magnitude cap, which the spike measured crashing (stack overflow) or hanging (15s+, no return)
 * on a 4x4 matrix with entries as small as 8 — unusable for a live game's stock counts. This
 * module is the small pure port the spike's own instruction called for. `@lenticule-science/metrologic/verdier/spectral`
 * is still used, deliberately, but only offline: see `eigen.fixture.test.mts` for a small-integer
 * cross-check against `perronConvergent`/`isPrimitive`, never on the hot path.
 *
 * Pure, deterministic: fixed iteration count, no RNG, no wall-clock, no hidden state.
 */

export interface EigenResult {
  /** Estimated dominant eigenvalue (Rayleigh quotient at the final iterate). */
  readonly lambda: number;
  /** Estimated dominant eigenvector. L1-normalized to shares summing to 1 when one-signed
   *  (the common, PF-hypothesis-satisfying case); left as the raw L2-unit vector when the result
   *  is mixed-sign, so a hypothesis violation is visible rather than hidden by a division that
   *  would silently distort it (see the spike's negative-synergy probe). */
  readonly vector: readonly number[];
  /** Successive Rayleigh-quotient estimates, one per iteration — inspect for convergence or
   *  oscillation; kept in the result rather than discarded, unlike the house's own
   *  `perronConvergent`, specifically so a caller (or the UI) can show *how* a number was
   *  computed, not just the final value. */
  readonly history: readonly number[];
  readonly converged: boolean;
}

const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
const matVec = (M: readonly (readonly number[])[], v: readonly number[]): number[] => M.map((row) => dot(row, v));
const l2norm = (v: readonly number[]): number => Math.sqrt(dot(v, v));
const l1sum = (v: readonly number[]): number => v.reduce((s, x) => s + x, 0);

/**
 * Dominant eigenvalue/eigenvector of a square real matrix M via power iteration:
 * `v_{k+1} = M v_k / ||M v_k||_2`, with lambda read off as the Rayleigh quotient `v^T M v` at
 * each step.
 *
 * Guarantees (Perron-Frobenius, when M is nonnegative and irreducible): a unique real dominant
 * eigenvalue lambda > 0 with a strictly positive eigenvector, and this iteration converges to it
 * from any strictly positive start. Outside those hypotheses (reducible, zero rows, negative
 * entries) this function still RUNS and returns a number — it does not detect or refuse invalid
 * input; `assessGraph`/`graph.mts`'s validity checks are the caller's job to run first. Convergence
 * and correctness outside the hypotheses are exactly what `pf-edge-cases.test.mts` characterizes.
 */
export function dominantEigen(
  M: readonly (readonly number[])[],
  { iterations = 200, tol = 1e-12, seedVector }: { iterations?: number; tol?: number; seedVector?: readonly number[] } = {},
): EigenResult {
  const n = M.length;
  if (n === 0) return { lambda: 0, vector: [], history: [], converged: true };
  let v = seedVector ? [...seedVector] : Array(n).fill(1 / Math.sqrt(n));
  const startNorm = l2norm(v);
  v = startNorm > 0 ? v.map((x) => x / startNorm) : v;
  const history: number[] = [];
  let converged = false;
  for (let k = 0; k < iterations; k++) {
    const w = matVec(M, v);
    const norm = l2norm(w);
    const lambda = dot(v, w); // Rayleigh quotient v^T M v (v already unit-norm)
    history.push(lambda);
    if (norm === 0) {
      // v is in the kernel / an invariant zero subspace — no further direction to iterate toward.
      return { lambda: 0, vector: v, history, converged: true };
    }
    const next = w.map((x) => x / norm);
    // Distance from `next` to the LINE through `v` (not to the point `v`): the smaller of the
    // two point-distances, to `v` and to `-v`. Sign-agnostic, so a negative dominant eigenvalue's
    // every-step sign flip still reads as "converged" once the direction itself has settled. See
    // the module header for why this replaced both the spike's original point-distance check and
    // a tried-and-rejected lambda-only check.
    const distToPlusV = l2norm(next.map((x, i) => x - (v[i] ?? 0)));
    const distToMinusV = l2norm(next.map((x, i) => x + (v[i] ?? 0)));
    const delta = Math.min(distToPlusV, distToMinusV);
    v = next;
    if (delta < tol) {
      converged = true;
      history.push(dot(v, matVec(M, v))); // one more Rayleigh quotient at the settled direction
      break;
    }
  }
  const finalLambda = history[history.length - 1] ?? 0;
  const sum = l1sum(v);
  const allNonNeg = v.every((x) => x >= -1e-9);
  const allNonPos = v.every((x) => x <= 1e-9);
  const vector = (allNonNeg || allNonPos) && Math.abs(sum) > 1e-12 ? v.map((x) => x / sum) : v;
  return { lambda: finalLambda, vector, history, converged };
}

export interface GraphValidity {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * The spike's engine-design recommendation, made executable: "matrix must be entrywise
 * nonnegative ... and should be checked for a cycle (nonzero eigenvalue) — a purely acyclic graph
 * has an honest 'no growth loop yet' state, not a fabricated multiplier." `prestige.mts` calls
 * this before it will show any computed lambda/mixture; a graph that fails this gate gets an
 * honest "not yet" UI state instead of a number.
 */
export function assessGraphMatrix(M: readonly (readonly number[])[]): GraphValidity {
  for (const row of M) {
    for (const x of row) {
      if (x < 0) return { valid: false, reason: "matrix has a negative entry — not a valid PF production matrix" };
    }
  }
  const { lambda } = dominantEigen(M);
  if (Math.abs(lambda) < 1e-9) {
    return { valid: false, reason: "no growth loop yet — this production graph is acyclic (dominant eigenvalue is 0)" };
  }
  return { valid: true };
}
