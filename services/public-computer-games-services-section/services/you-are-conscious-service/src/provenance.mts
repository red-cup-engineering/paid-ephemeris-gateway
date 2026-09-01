/**
 * `provenance` — the disclosure discipline, inherited unmodified from stoke-service: a computed
 * and an authored number can coexist as long as the game never lies about which is which. There
 * are exactly two provenances, never three — see this game's DESIGN.md ("What's inherited from
 * Stoke") for why a third, mystical-sounding provenance for "things the machine itself decided"
 * is deliberately refused even though this is, of all games, the one most tempted to invent one.
 * The one new honesty-audit concept this game adds — `taintedBy` on a `ReflectionRecord`
 * (`reflect.mts`) — is a RECORD-level field, not a number's provenance, and is kept structurally
 * apart from `Tagged<T>` for exactly that reason.
 *
 *   - `"computed-from-your-graph"` — direct output of real math (power iteration, a matrix-vector
 *     product, a Brier score, a Pareto-dominance check) over the player's own state, as they
 *     actually built or played it. Nobody hand-tuned it.
 *   - `"designed-flavor"` — a curve, constant, or bonus a designer chose. May be *informed* by
 *     computed numbers, but its shape was authored, not derived.
 */

export type Provenance = "computed-from-your-graph" | "designed-flavor";

export interface Tagged<T> {
  readonly value: T;
  readonly provenance: Provenance;
  /** Short human-readable source note shown in the badge tooltip. Required — an untagged-but-
   *  technically-typed value is exactly the failure mode this module exists to prevent. */
  readonly label: string;
}

export function computed<T>(value: T, label: string): Tagged<T> {
  return { value, provenance: "computed-from-your-graph", label };
}

export function authored<T>(value: T, label: string): Tagged<T> {
  return { value, provenance: "designed-flavor", label };
}

export function isComputed<T>(t: Tagged<T>): boolean {
  return t.provenance === "computed-from-your-graph";
}

export function isAuthored<T>(t: Tagged<T>): boolean {
  return t.provenance === "designed-flavor";
}

/**
 * The ONLY sanctioned way to build a number out of both a computed and an authored input. The
 * result is honestly tagged `"designed-flavor"` — a value touched by even one authored input is
 * no longer a pure readout and must carry the weaker label. `label` should name both ingredients.
 */
export function combine<A, B, R>(a: Tagged<A>, b: Tagged<B>, fn: (a: A, b: B) => R, label: string): Tagged<R> {
  return { value: fn(a.value, b.value), provenance: "designed-flavor", label };
}
