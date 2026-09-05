// kernel — the single seam between Aletheon and the cleaned-up voidmath kernel
// (@561/development.active.math-kernel, formerly voidmath-kernel-cleanup). Everything that touches the kernel
// imports from HERE, so the whole coupling to that experimental package is one relative path
// (no pnpm install / workspace link needed at runtime — we reach the sibling package directly).
//
// We use TWO layers of the kernel:
//   1. the bilattice CHARGE operations (joinKnowledge, present, isTop, negate, meetTruth) —
//      the value-algebra that Aletheon's world-truth runs on directly, every combat event.
//   2. the full four-regime DESCENT (articulate -> predicate -> posit -> settle) — exercised by
//      world.test.mjs to prove the SAME verdicts come out of the real pipeline on minted
//      utterances, exactly the way the kernel's own tests probe it.
//
// A charge is `{ value: [pos, neg], evidence: [posWitnesses, negWitnesses] }` (booleans + lossless
// witness lists), the shape every kernel charge op consumes and returns.

// CHARGE value-algebra and the four-regime DESCENT both live in @lenticule-science/metrologic now,
// as named exports of grouped modules (formerly per-script defaults in the sibling kernel).
export {
  joinKnowledge,
  meetTruth,
  joinTruth,
  negate,
  conflate, // [powers] K₄ gauge's other unary
  present,
  isTop,
} from "@lenticule-science/metrologic/bilattice/charge";

export { articulate, predicate, posit, settle } from "@lenticule-science/metrologic/bilattice/descent";
