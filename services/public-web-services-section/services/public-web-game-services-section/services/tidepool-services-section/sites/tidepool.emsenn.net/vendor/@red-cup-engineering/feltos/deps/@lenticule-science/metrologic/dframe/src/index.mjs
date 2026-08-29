// dframe — the d-frame-valued (bigraded) cohomology of substitution settlings, and the composed-duality
// (strong-MLD) orbit classification.
//
// The third frontier piece, settled and migrated OUT into the stable catalog. `obstruction` counts
// firings into the Ab-valued H¹; `verdier` reads its Anderson–Putnam ℤ-module and the sheaf↔cosheaf
// duality; this module adds the bilattice VALUE of each firing, splitting H¹ into a truth side and a
// falsity side (the bigraded d-frame cohomology, of which the Ab-valued rank is a shadow), and classifies
// the settling's orbit under the composed Verdier duality D = D_sp ∘ D_val. Self-dual iff every firing is
// ⊤ or ⊥ — the strong-MLD theorem, which is firing-pattern self-duality under negation (so it reuses the
// verdier gauge).
//
// Exact, finite, and verified against the corpus tools `bucket-3/tools/d-frame-cohomology/compute.py`
// and `bucket-3/tools/strong-mld-orbits/compute.py`.

export {
  SIDE_CONTRIBUTION, classifyFiring, perFiringDframe, dframeCohomology,
} from "./cohomology.mjs";

export { classifyOrbitType, verifyComposedSelfDuality } from "./orbits.mjs";
