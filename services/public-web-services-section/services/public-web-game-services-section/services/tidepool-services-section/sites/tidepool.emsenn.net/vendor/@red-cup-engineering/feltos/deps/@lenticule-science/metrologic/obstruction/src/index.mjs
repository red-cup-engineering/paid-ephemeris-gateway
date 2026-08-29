// @lenticule-science/metrologic/obstruction — the temporal firing cohomology of settlings, on the 561-group floor.
//
// The barrel: the temporal core. A SETTLING is a monotone sequence of stages, each designating a set
// of predication cells (knowledge accumulates); H¹ is the free abelian group on the cells first
// designated at a LIMIT stage. The settling.mjs reading is pure (zero imports); the floor.mjs bridge
// reads a bilattice settling off `@lenticule-science/metrologic/bilattice` and matches the apex H¹ to the void.
//
// A narrower import is also available for the pure reading —
//   import { h1, classify } from "@lenticule-science/metrologic/obstruction/settling";
//
// The cellular cochain reading — ker δ⁰ / im δ⁰ of the settled relation (H⁰ = #components, H¹ = first
// Betti number) — is also here (cochain.mjs), computed combinatorially over the floor.

// the temporal firing cohomology, over settlings-as-data (pure)
export {
  settling, increments, firings, nscFirings, h1, clInv, mldEquivalent, classify, depth,
} from "./settling.mjs";

// the bridge to the bilattice floor, and the void-dual read
export { designatedCells, settlingOf, voidCone, gradedVoid, apexVoidMatch } from "./floor.mjs";

// the cellular cohomology of the settled relation, read combinatorially (H⁰ = #components, H¹ = Betti)
export { cohomologyOfRelation, settledRelation, cohomologyOf } from "./cochain.mjs";
