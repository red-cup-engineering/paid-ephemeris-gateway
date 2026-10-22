// verdier — Verdier duality on substitution settlings, as computable integer linear algebra.
//
// The second frontier piece re-derived in the playground, now settled and migrated OUT into the stable
// catalog. The `obstruction` module computes the settling-associated sheaf H¹ over arbitrary firing data;
// this module handles the SUBSTITUTION case, where the cohomology is the Anderson–Putnam direct limit of
// ℤⁿ under the substitution matrix M, and reads off the Verdier duality H¹ ≅ H₁ (sheaf ≅ cosheaf) — true
// because M and Mᵀ share a Smith normal form. It adds the d-frame value-category gauge (the Klein-four
// self-duality) on top.
//
// What is computed is exact integer linear algebra (rank, det, Smith normal form, matrix commutation) —
// the ℤ-module-level Verdier duality, which is the part that classifies. The categorical derived
// equivalence (the genuine open gap in the corpus) is deliberately out of scope. Mirrors the corpus
// tools `bucket-3/tools/verdier-dual/compute.py` and `bucket-3/tools/strong-mld-orbits/compute.py`.

// the integer linear algebra — the honest layer over our ℤ in number/matrix (no host arithmetic).
export {
  transpose, determinant, rank, smithNormalForm, matmul, matEqual,
} from "@lenticule-science/metrologic/number/matrix";

// the substitution morphism (the monoid endomorphism of A*), its iteration/orbit, the matrix DERIVED as
// its abelianization (the commutative shadow on ℤ^A), and its fixed-point closure (for `closure` to measure)
export { substitute, iterate, orbit, abelianize, fixedPointClosure } from "./substitution.mjs";

// the spectral facts of an integer matrix: char poly, primitivity, Pisot, exact Perron convergents
export { charPoly, isPrimitive, isPisot, perronPoly, perronConvergent } from "./spectral.mjs";

// Verdier duality on substitution settlings (Anderson–Putnam direct limits)
export { colimStructure, verdierDual, verdierHolds, stepNInvariant } from "./verdier.mjs";

// the d-frame value-category gauge and self-duality
export {
  FOUR, GAUGE, fixedSet, firingPatternSelfDual, inducedPermutation, substitutionRuleSelfDual,
} from "./gauge.mjs";
