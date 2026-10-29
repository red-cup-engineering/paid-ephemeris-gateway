// cohomology.mjs — the d-frame-valued (bigraded) cohomology of a substitution settling.
//
// The Ab-valued H¹ (the obstruction/verdier rank) is a SHADOW of a finer, two-sided object. d-frame
// data values each cell in the bilattice FOUR, so each firing contributes to a TRUTH side (L₊) and/or a
// FALSITY side (L₋) according to its value:
//
//   t → (1, 0)  truth-only      f → (0, 1)  falsity-only
//   ⊤ → (1, 1)  both sides       ⊥ → (0, 0)  neither
//
// The d-frame cohomology is the pair (L₊-rank, L₋-rank); the shadow comparison
//   S(H¹_dFrm) = (H¹(Fᵏ), H¹(Fᵏ⁻)) = (ℤ^{#letters on truth side}, ℤ^{#letters on falsity side})
// recovers the two abelian shadows. For a primitive non-singular substitution the firing total
// (truth-only + falsity-only + ⊤ + ⊥) equals the Ab-valued rank n; a singular matrix (Thue–Morse) drops
// the rank below the firing count — some firings collapse in cohomology.
//
// Mirrors `predication-categories/bucket-3/tools/d-frame-cohomology/compute.py`.

import * as Z from "@lenticule-science/metrologic/number/integer";
import { rank, transpose } from "@lenticule-science/metrologic/number/matrix";
import { FOUR, toCharge } from "@lenticule-science/metrologic/chu";

const liftMat = (M) => M.map((row) => row.map(Z.fromInt));

/**
 * A bilattice value's contribution to the (truth, falsity) sides of the d-frame — READ off the floor, not
 * hand-written. A FOUR value's charge value bits are exactly `[believesTrue, believesFalse]` (chu/four:
 * t=[true,false], f=[false,true], ⊤=[true,true], ⊥=[false,false]) — which IS (hasPositive, hasNegative),
 * the (L₊, L₋) contribution. So `toCharge(v).value` gives the contribution directly; nothing is injected.
 */
export const SIDE_CONTRIBUTION = Object.fromEntries(
  Object.values(FOUR).map((v) => [v, toCharge(v).value]),
);

/** Classify a firing by its bilattice value's d-frame contribution. */
export function classifyFiring(value) {
  const [plus, minus] = SIDE_CONTRIBUTION[value];
  if (plus && minus) return "top-firing";
  if (plus) return "truth-only";
  if (minus) return "falsity-only";
  return "bot-firing";
}

/** Per-firing d-frame structure over a value alphabet: each firing's value, type, and (L₊, L₋) ranks. */
export function perFiringDframe(values) {
  return values.map((v) => {
    const [plus, minus] = SIDE_CONTRIBUTION[v];
    return {
      value: v,
      firingType: classifyFiring(v),
      lPlus: plus ? 1 : 0,
      lMinus: minus ? 1 : 0,
      consistency: plus && minus ? "fails-on-singleton-pair" : "trivial",
    };
  });
}

/**
 * The d-frame cohomology of a substitution settling: the per-firing structure (over the bilattice-value
 * alphabet), the firing-type counts, the Ab-valued rank, and the bigraded shadow S(H¹_dFrm) = (truth
 * side, falsity side). `shadowMatchesAbRank` checks the per-firing accounting against the Ab rank (holds
 * for non-singular matrices; fails — by design — for singular ones, where firings collapse).
 * @param {number[][]} M @param {string[]} values the bilattice-value alphabet (matches M's rows/columns)
 */
export function dframeCohomology(M, values) {
  if (values.length !== M.length) throw new RangeError("value count must match matrix size");
  const perFiring = perFiringDframe(values);
  const counts = { "truth-only": 0, "falsity-only": 0, "top-firing": 0, "bot-firing": 0 };
  for (const d of perFiring) counts[d.firingType]++;

  const lPlusCount = perFiring.filter((d) => d.lPlus).length; // truth-only + ⊤
  const lMinusCount = perFiring.filter((d) => d.lMinus).length; // falsity-only + ⊤
  const abRank = rank(transpose(liftMat(M))); // H¹ = rank of the Anderson–Putnam limit (over our ℤ)

  return {
    values,
    perFiring,
    firingCounts: counts,
    abRank,
    singular: abRank < M.length,
    shadow: { truthSide: `Z^${lPlusCount}`, falsitySide: `Z^${lMinusCount}`, lPlus: lPlusCount, lMinus: lMinusCount },
    shadowMatchesAbRank: perFiring.length === abRank,
  };
}
