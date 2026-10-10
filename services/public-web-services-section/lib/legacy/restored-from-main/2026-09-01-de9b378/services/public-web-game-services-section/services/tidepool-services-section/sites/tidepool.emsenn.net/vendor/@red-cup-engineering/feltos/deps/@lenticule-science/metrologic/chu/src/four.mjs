// four.mjs — FOUR, the Belnap–Ginsberg four-valued bilattice, as a *reading* of the bilattice floor.
//
// This package exists because ~20 copies of this bilattice were hand-rolled across the repo, each
// re-deriving the same four-valued logic inline. This module re-derives NOTHING. A FOUR value is the
// floor's charge coordinate `value = [believesTrue, believesFalse]`, and every operation below is a
// bilattice morphism applied to that coordinate — `negate`/`conflate`/`join-*`/`meet-*` from
// `@lenticule-science/metrologic/bilattice`. FOUR is the floor's algebra wearing Belnap's names; the only thing
// local to this file is the naming (`t`/`f`/`bot`/`top`) and the charge⇄name codec.
//
//     t   = [true,  false]   true only            bot = [false, false]   neither — no evidence (⊥)
//     f   = [false, true ]   false only           top = [true,  true ]   both — contradiction (⊤)
//
// Two orders run on the pair, σ-dual to each other:
//   • knowledge ≤_k ("how determined"): both bits rise together. join ⊕ = OR/OR, meet ⊗ = AND/AND.
//   • truth     ≤_t ("which way"):       the negative bit is reversed. join ∨ = OR/AND, meet ∧ = AND/OR.
// Two involutions (the Klein gauge): `negate` swaps t↔f (truth flip); `conflate` swaps bot↔top.

import {
  joinKnowledge,
  meetKnowledge,
  joinTruth,
  meetTruth,
  negate as kernelNegate,
  conflate as kernelConflate,
  present,
} from "@lenticule-science/metrologic/bilattice/charge";

/**
 * The four bilattice values, by name. The string values are stable and may be compared with `===`.
 * @typedef {"t"|"f"|"bot"|"top"} Four
 */

/** The four named values. `T` true-only, `F` false-only, `BOT` ⊥ neither, `TOP` ⊤ both. */
export const FOUR = Object.freeze({ T: "t", F: "f", BOT: "bot", TOP: "top" });

/** Display glyphs for the four values (presentation only — never use for logic). */
export const GLYPH = Object.freeze({ t: "t", f: "f", bot: "⊥", top: "⊤" });

// name → the kernel charge value bits [believesTrue, believesFalse].
const BITS = Object.freeze({
  t: Object.freeze([true, false]),
  f: Object.freeze([false, true]),
  bot: Object.freeze([false, false]),
  top: Object.freeze([true, true]),
});
const NAMES = Object.freeze(Object.keys(BITS));

/** Is `v` one of the four named values? @param {unknown} v @returns {v is Four} */
export function isFour(v) {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(BITS, v);
}

/** Assert `v` is a Four and return it, else throw. @param {unknown} v @returns {Four} */
export function asFour(v) {
  if (!isFour(v)) throw new TypeError(`not a FOUR value: ${JSON.stringify(v)} (expected one of ${NAMES.join(", ")})`);
  return v;
}

/**
 * A math-kernel charge: a four-valued `value` over a lossless `evidence` carrier.
 * @typedef {{ value: [boolean, boolean], evidence: [unknown[], unknown[]] }} Charge
 */

/**
 * Lift a Four to an evidence-free kernel charge `{ value, evidence: [[], []] }` — the charge whose
 * value is this Four's bits and whose carrier holds no witnesses.
 * @param {Four} v @returns {Charge}
 */
export function toCharge(v) {
  return { value: [...BITS[asFour(v)]], evidence: [[], []] };
}

// the Four whose bits match this value pair (booleans, coerced) — total over 2×2.
function fourOfBits([positive, negative]) {
  const pos = !!positive;
  const neg = !!negative;
  for (const name of NAMES) if (BITS[name][0] === pos && BITS[name][1] === neg) return name;
  /* unreachable: 2×2 is total */ return FOUR.BOT;
}

/**
 * The Four read off a kernel charge — `present()`'s shadow (the value bits, discarding evidence).
 * @param {Charge} charge @returns {Four}
 */
export function fromCharge(charge) {
  return fourOfBits(present(charge));
}

// Lift a kernel charge-morphism to a Four-operation: name(s) → charge(s) → kernel op → name.
// This is the whole trick: the operations ARE the kernel's, just read on the evidence-free fiber.
const lift1 = (morphism) => (/** @type {Four} */ a) => fromCharge(morphism(toCharge(asFour(a))));
const lift2 = (morphism) => (/** @type {Four} */ a, /** @type {Four} */ b) =>
  fromCharge(morphism({ left: toCharge(asFour(a)), right: toCharge(asFour(b)) }));

// ── the two involutions (the Klein gauge) ───────────────────────────────────────────────────────
/** ¬ — the truth involution: swaps t↔f, fixes ⊥,⊤. `math-kernel/negate`. @type {(v: Four) => Four} */
export const negate = lift1(kernelNegate);
/** − — the knowledge involution: swaps ⊥↔⊤, fixes t,f. `math-kernel/conflate`. @type {(v: Four) => Four} */
export const conflate = lift1(kernelConflate);

// ── the two lattice orders, each with its join (lub) and meet (glb) ──────────────────────────────
/** ⊕ — knowledge join (lub in ≤_k); identity is ⊥. `math-kernel/join-knowledge`. @type {(a: Four, b: Four) => Four} */
export const knowledgeJoin = lift2(joinKnowledge);
/** ⊗ — knowledge meet (glb in ≤_k); identity is ⊤. `math-kernel/meet-knowledge`. @type {(a: Four, b: Four) => Four} */
export const knowledgeMeet = lift2(meetKnowledge);
/** ∨ — truth join (lub in ≤_t); identity is f. `math-kernel/join-truth`. @type {(a: Four, b: Four) => Four} */
export const truthJoin = lift2(joinTruth);
/** ∧ — truth meet (glb in ≤_t); identity is t. `math-kernel/meet-truth`. @type {(a: Four, b: Four) => Four} */
export const truthMeet = lift2(meetTruth);
