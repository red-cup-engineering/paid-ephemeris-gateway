/**
 * `provenance` — the disclosure discipline: computed and authored numbers can coexist as long as
 * the game never lies about which is which. Made into an actual type every number in the UI is
 * forced through.
 *
 * There are exactly two provenances:
 *   - `"computed-from-your-graph"` — the number is the direct output of running real linear
 *     algebra (`eigen.mts`'s power iteration, or a plain sum/matrix-vector product) over the
 *     player's *own* production graph, as they actually built it. Nobody hand-tuned it.
 *   - `"designed-flavor"` — the number is a curve, constant, or bonus a designer chose. It may
 *     be *informed* by computed numbers (the prestige bonus multiplier reads the accumulated
 *     lambda history) but the shape of the curve itself was authored, not derived.
 *
 * A `Tagged<T>` is never just a `T` — every quantity that reaches the UI is wrapped, so the
 * provenance travels with the value instead of living only in a comment that can drift out of
 * sync with the code. `web/js/format.mjs`'s `badgeClass`/`badgeText`/`taggedNumber` render
 * `.provenance` directly; they have no other way to decide which badge to draw, which is the
 * point.
 */

export type Provenance = "computed-from-your-graph" | "designed-flavor";

export interface Tagged<T> {
  readonly value: T;
  readonly provenance: Provenance;
  /** Short human-readable source note shown in the badge tooltip, e.g. "power iteration over
   *  your 5-node graph" or "prestige bonus curve, +10% per lambda banked". Required — an
   *  untagged-but-technically-typed value is exactly the failure mode this module exists to
   *  prevent. */
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
 * `combine` — the ONLY sanctioned way to build a number out of both a computed and an authored
 * input (e.g. `finalOutput = computedRate * authoredMultiplier`). The result is honestly tagged
 * `"designed-flavor"`, never silently reported as computed, because per the house rule a value
 * touched by even one authored input is no longer a pure readout of the player's graph — it must
 * carry the weaker (authored) label. `label` should name both ingredients so the badge tooltip
 * stays honest about what got blended in.
 */
export function combine<A, B, R>(a: Tagged<A>, b: Tagged<B>, fn: (a: A, b: B) => R, label: string): Tagged<R> {
  return { value: fn(a.value, b.value), provenance: "designed-flavor", label };
}
