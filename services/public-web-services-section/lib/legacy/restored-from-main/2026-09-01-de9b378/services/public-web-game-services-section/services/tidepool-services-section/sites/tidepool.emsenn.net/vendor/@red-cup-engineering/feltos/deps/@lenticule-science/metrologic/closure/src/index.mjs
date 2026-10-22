// closure — the closure ordinal as a typed morphism: transfinite iteration of a monotone operator to its
// least fixed point.
//
// The point is NOT to compute κ when κ is uncountable (impossible on a finite machine) — it is to have the
// morphism, correctly typed, usable at every finite observation, and honestly non-terminating exactly when
// the closure is. `approx(L, Φ, α)` folds Φ over an ordinal NOTATION (zero / succ / limit-with-fundamental
// -sequence); `closureOrdinal(L, Φ)` searches the notations for the least fixed point and names the regime
// it lands in (finite / scott / transfinite / aperiodic). The one place that can run forever is `L.sup` —
// the sup of an ω-chain — which is exactly where the mathematics of the closure ordinal lives.
//
// This is the constructive, type-checked counterpart of the floor's `settle` (the finite case, κ < ω) and
// of `obstruction`'s firing structure (a firing = a stage where F strictly grows; an NSC firing = growth
// at a limit stage). A piece that settles migrates into @lenticule-science/metrologic.

export {
  zero, succ, limit, isZero, isSucc, isLimit, fin, plusFin, OMEGA, omegaTimes, OMEGA_SQ, toFinite, show,
} from "./ordinal.mjs";

export { approx, orbit, stabilizingSup } from "./iterate.mjs";

export { closureOrdinal, leastFixedPoint, regimeOfOrdinal } from "./closure.mjs";

export { reachability, omegaPlusOne, tower, fromBilattice } from "./lattices.mjs";
