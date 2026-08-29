// orbits.mjs — the composed-duality (strong-MLD) orbit type of a settling.
//
// The Verdier duality composes a SPATIAL swap (sheaf ↔ cosheaf) with a VALUE swap D_val = bilattice
// negation (t ↔ f, fixing ⊤, ⊥). Acting on a settling's firings, D_val:
//   truth-only (t)   ↔ falsity-only (f)     (swapped)
//   ⊤-firing, ⊥-firing                      (fixed)
//
// So — the strong-MLD theorem — a settling is self-dual under the composed duality D iff EVERY firing is
// a ⊤- or ⊥-firing (none truth-only or falsity-only). The orbit stratifies:
//   • self-dual        (orbit 1): every firing ⊤/⊥.
//   • truth-only orbit (orbit 2): all firings truth-only → D_val sends it to the all-falsity settling.
//   • falsity-only orbit (orbit 2): the mirror.
//   • exchange-mixed   (orbit 2): truth- and falsity-only firings, no symmetric ones.
//   • mixed: both symmetric (⊤/⊥) and asymmetric firings.
//
// The "self-dual iff every firing ⊤/⊥" statement is exactly firing-pattern self-duality under negation
// (negation's fixed set is {⊤, ⊥}) — so it reuses the verdier gauge, tying the two modules together.
//
// Mirrors `predication-categories/bucket-3/tools/strong-mld-orbits/compute.py`.

import { GAUGE, firingPatternSelfDual } from "@lenticule-science/metrologic/verdier/gauge";

/**
 * Classify a settling's composed-duality orbit from its firing values (the bilattice-value alphabet).
 * @param {string[]} values
 * @returns {{ firingCounts: object, orbitType: string, orbitSize: number|"variable", selfDual: boolean, negated: string[] }}
 */
export function classifyOrbitType(values) {
  const counts = { "truth-only": 0, "falsity-only": 0, "top": 0, "bot": 0 };
  for (const v of values) counts[v === "t" ? "truth-only" : v === "f" ? "falsity-only" : v]++;
  const { "truth-only": nT, "falsity-only": nF, top: nTop, bot: nBot } = counts;

  let orbitType, orbitSize;
  if (nT === 0 && nF === 0) {
    orbitType = "self-dual"; orbitSize = 1;
  } else if (nTop === 0 && nBot === 0) {
    orbitSize = 2;
    orbitType = nF === 0 ? "truth-only orbit" : nT === 0 ? "falsity-only orbit" : "exchange-mixed";
  } else {
    orbitType = "mixed"; orbitSize = "variable";
  }

  return {
    firingCounts: counts,
    orbitType,
    orbitSize,
    selfDual: orbitType === "self-dual",
    negated: values.map((v) => GAUGE.negation[v]), // the value-category dual (bilattice negation)
  };
}

/**
 * Verify the strong-MLD theorem: composed-duality self-duality ⟺ every firing is ⊤ or ⊥ ⟺ firing-pattern
 * self-duality under negation. Returns the three booleans and whether they agree (they always do).
 * @param {string[]} values
 */
export function verifyComposedSelfDuality(values) {
  const composed = classifyOrbitType(values).selfDual;
  const everySymmetric = values.every((v) => v === "top" || v === "bot");
  const negationFixed = firingPatternSelfDual(values, "negation"); // negation fixes {⊤, ⊥}
  return { composed, everySymmetric, negationFixed, agree: composed === everySymmetric && everySymmetric === negationFixed };
}
