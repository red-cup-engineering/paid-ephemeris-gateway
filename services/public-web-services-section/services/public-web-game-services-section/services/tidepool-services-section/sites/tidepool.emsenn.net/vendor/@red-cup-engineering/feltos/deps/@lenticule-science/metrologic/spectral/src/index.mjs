// spectral — the spectral morphisms of a substitution, re-derived honestly over our own numbers.
//
// The redo of the imported spectral math (verdier/spectral.mjs, which leans on Faddeev–LeVerrier and a
// Routh–Hurwitz stability test). The organizing idea: root-location relative to the unit circle is the
// INVERSION DUALITY z ↦ 1/z — the spectral face of the Anderson–Putnam colimit's ×M-invertibility and of
// Verdier's transpose dual — and the unit circle is its self-dual fixed locus, the spectral analog of the
// Klein gauge's fixed set {⊤, ⊥}. Pisot / Salem / cyclotomic / Mahler are readings of where the roots
// sit. Starts with the inversion dual and the self-dual (on-circle) locus, exact over our ℤ; the full
// expansion-type root count (a degree-peeling descent) and its ℚ reflection coefficients follow.

export * as inversion from "./inversion.mjs";
export * as location from "./location.mjs";
