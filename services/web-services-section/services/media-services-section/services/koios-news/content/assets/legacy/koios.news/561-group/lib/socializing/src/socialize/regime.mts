/**
 * socialize/regime — the four-regime stratification of the multi-observer system,
 * classified by the closure ordinal κ.
 *
 * The corpus's four-regime dichotomy (content/_archive: `regime-record.md`,
 * `regime-classification-for-substrate.md`, `crdt-convergence-via-cohomological-calm.md`)
 * classifies every closure-driven settling by its closure ordinal κ — the stage at
 * which it quiesces — into exactly one of four regimes:
 *
 *   strict             κ < ω        quantifier-free rules, finite base
 *   scott-continuous   κ = ω        quantifier-free rules, ≥1 infinite base
 *   transfinite-bounded ω < κ < ω₁  ∀-blocks, countable cofinality
 *   aperiodic          κ ≥ ω₁       ∀-blocks, cofinality ≥ ω₁
 *
 * For socializing this is the SECOND, ORTHOGONAL stratification of consensus, distinct
 * from the opposition-cycle H¹ that `converge` already computes:
 *
 *   - The opposition-cycle H¹ (`section.obstruction`/`coordinationFree`) is the STATIC
 *     question — do the observers' fixed opinions glue into one global section? — the
 *     bilattice-network-sheaf consensus. It can be non-zero in ANY regime.
 *   - The REGIME is the DYNAMIC question — does iterating the CRDT merge toward that
 *     consensus need a coordination protocol? Per cohomological-CALM, the merge's
 *     connecting map δ⁰ VANISHES in the strict and Scott-continuous regimes (κ ≤ ω), so
 *     convergence is coordination-free BY REGIME there; in the transfinite-bounded and
 *     aperiodic regimes δ⁰ can be non-zero, so coordination may be genuinely required.
 *
 * The regime also fixes the FEDERATION discipline (`regime-record.md`,
 * `federation-convergence`): strict / Scott-continuous admit ENDPOINT-STATE shipping (a
 * merge may carry only the merged charge); transfinite-bounded / aperiodic must ship
 * the TRAJECTORY (the firing-ordinal record) to preserve the H¹ invariant across the
 * exchange. The regime is a DECLARED substrate parameter, not runtime-discovered — an
 * observer declares it on its agent; an undeclared observer defaults to `strict` (a
 * finite, quantifier-free settling).
 */

/** The four regimes, by the closure ordinal κ of the settling. */
export type Regime = "strict" | "scott-continuous" | "transfinite-bounded" | "aperiodic";

/** The four regimes in κ order (ascending closure ordinal). */
export const REGIMES: readonly Regime[] = Object.freeze([
  "strict",
  "scott-continuous",
  "transfinite-bounded",
  "aperiodic",
]);

/** The κ-rank of a regime (0 = strict … 3 = aperiodic): the ascending closure-ordinal order. */
export function regimeRank(regime: Regime): number {
  return REGIMES.indexOf(regime);
}

/** The federation discipline a merge/exchange must obey in a regime. */
export type FederationDiscipline = "endpoint-state" | "trajectory";

/** Coerce a value to a regime, defaulting to `strict` (the finite, quantifier-free case). */
export function asRegime(value: unknown): Regime {
  return typeof value === "string" && (REGIMES as readonly string[]).includes(value)
    ? (value as Regime)
    : "strict";
}

/**
 * The joint regime of a multi-observer system: the MAX-κ ("the meet" of admissible
 * disciplines — `multi-regime-session-discipline-is-meet`) over the observers' regimes.
 * A society spanning regimes must obey the strictest discipline its most-demanding
 * observer needs. The empty society is `strict` (nothing forces a higher κ).
 */
export function jointRegime(regimes: readonly Regime[]): Regime {
  return regimes.reduce<Regime>(
    (joint, regime) => (regimeRank(regime) > regimeRank(joint) ? regime : joint),
    "strict",
  );
}

/**
 * Whether convergence is coordination-free BY REGIME (the cohomological-CALM reading):
 * the merge's δ⁰ vanishes — hence H¹ is structurally absent for the merge — exactly in
 * the strict and Scott-continuous regimes (κ ≤ ω). In the transfinite-bounded and
 * aperiodic regimes it can be non-zero, so coordination may be genuinely required.
 */
export function coordinationFreeByRegime(regime: Regime): boolean {
  return regime === "strict" || regime === "scott-continuous";
}

/**
 * The federation discipline the regime forces: endpoint-state shipping is admissible in
 * the strict / Scott-continuous regimes; the transfinite-bounded / aperiodic regimes
 * must ship the trajectory to preserve the cohomological invariant across the exchange.
 */
export function federationDiscipline(regime: Regime): FederationDiscipline {
  return coordinationFreeByRegime(regime) ? "endpoint-state" : "trajectory";
}

/** Read an observer's DECLARED regime off its agent carrier; default `strict`. */
export function observerRegime(agent: { readonly regime?: unknown } | undefined): Regime {
  return asRegime(agent?.regime);
}
