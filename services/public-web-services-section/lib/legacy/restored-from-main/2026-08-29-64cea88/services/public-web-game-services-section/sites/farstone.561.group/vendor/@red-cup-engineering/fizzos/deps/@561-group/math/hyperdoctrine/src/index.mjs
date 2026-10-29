// @561-group/math/hyperdoctrine — the categorical hyperdoctrine over the bilattice, on zero
// dependencies. OPT-IN: nothing in @561-group/math/bilattice imports this; it is a consumer of the
// bilattice floor (charge.mjs's join/meet/leq), not a dependency of it.
//
// A predicate morphism `u: J → I` between finite index sets induces reindexing `u*` (pullback) and its
// two adjoints, `∃_u ⊣ u* ⊣ ∀_u` (quantification along the fibration) — proven at both σ-dual orders
// (knowledge, truth). Frobenius reciprocity and Beck–Chevalley are properties of these three, proven in
// the test suite rather than exposed as separate morphisms (they are theorems ABOUT reindex/exists/
// forall, not new operations). Comprehension (`{i : φ(i)}` ⊣ `Ext`) closes the doctrine: reading a
// fiber's designated locus off as a support, and back.
//
// The narrower imports:
//   import { reindex, existsAlong, forallAlong } from "@561-group/math/hyperdoctrine/adjoints";
//   import { comprehend, extend }                from "@561-group/math/hyperdoctrine/comprehension";
//   import { KNOWLEDGE, TRUTH }                   from "@561-group/math/hyperdoctrine/order";

export { KNOWLEDGE, TRUTH, orderOps, orderKind, designated, sameValue } from "./order.mjs";
export { assertMorphism, assertFiberComplete } from "./morphism.mjs";
export { reindex, existsAlong, forallAlong, meetFiber, leqFiber, pullbackSquare } from "./adjoints.mjs";
export { comprehend, extend } from "./comprehension.mjs";
