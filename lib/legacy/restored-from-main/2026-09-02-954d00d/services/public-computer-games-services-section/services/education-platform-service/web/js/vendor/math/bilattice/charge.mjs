// charge.mjs — the carrier and its value-algebra.
//
// A charge is `{ value: [a₊, a₋], evidence: [pos-witnesses, neg-witnesses] }`. The `value` is the
// bilattice pair ⟨a₊, a₋⟩ ∈ FOUR — its four states by the two bits:
//     [F,F] absurd (no side)        [T,F] potential (has-potential, not active)
//     [F,T] active (engaged)        [T,T] stable   (both — fully made good)
// Two σ-dual orders run on the pair: knowledge (absurd ↕ stable, "how determined") and truth
// (active ↔ potential, "which way"). `value` is what the Klein gauge (`negate`, `conflate`) reflects;
// `evidence` is the lossless carrier — every op ACCUMULATES witnesses, never discards, so ⊤ ("told
// both") is reachable and the evidence marks which bits are given (witnessed) vs free (open).

import { union } from "./internal.mjs";

/**
 * A charge: a four-valued `value` over a lossless `evidence` carrier.
 * @typedef {{ value: [boolean, boolean], evidence: [unknown[], unknown[]] }} Charge
 */

/**
 * The FOUR-place reading of a charge: its value bits `[pos, neg]`, whether each side is ASSERTED in
 * the current reading. Deliberately distinct from whether evidence EXISTS — a charge may be valued ⊥
 * on a side while its carrier holds witnesses there (a meet lowered the value but kept the evidence).
 * @param {Charge} charge @returns {[boolean, boolean]}
 */
export const present = (charge) => charge.value;

/**
 * Is a charge valued ⊤ (told both)? Both value bits set. Reads the value, not the evidence.
 * @param {Charge} charge @returns {boolean}
 */
export const isTop = (charge) => { const [pos, neg] = present(charge); return !!pos && !!neg; };

/**
 * The truth involution: swap the positive and negative sides, value AND evidence together (reverses
 * truth, preserves knowledge). Nothing is discarded — the witnesses ride along to their new side.
 * @param {Charge} charge @returns {Charge}
 */
export function negate(charge) {
  return { value: [charge.value[1], charge.value[0]], evidence: [charge.evidence[1], charge.evidence[0]] };
}

/**
 * The knowledge involution (the Klein gauge's other unary): reflect the knowledge axis. On the VALUE
 * `[pos, neg] → [¬neg, ¬pos]` — swaps ⊥↔⊤, fixes t and f. The evidence stays where it is. Because it
 * complements the value without backing evidence, it is the one op that can raise a value above its
 * evidence (`conflate(⊥) = ⊤` with no witnesses) — which is how `brim` seeds its ceiling.
 * @param {Charge} charge @returns {Charge}
 */
export function conflate(charge) {
  return { value: [!charge.value[1], !charge.value[0]], evidence: charge.evidence };
}

/**
 * Knowledge-order join (lub in ≤_k): value bits OR'd componentwise, evidence accumulated. Both value
 * slots rise if either source asserts; evidence on both sides unions (never discards).
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function joinKnowledge({ left, right }) {
  return {
    value: [left.value[0] || right.value[0], left.value[1] || right.value[1]],
    evidence: [union(left.evidence[0], right.evidence[0]), union(left.evidence[1], right.evidence[1])],
  };
}

/**
 * Knowledge-order meet (glb in ≤_k): value bits AND'd componentwise, evidence accumulated. The VALUE
 * can fall to ⊥ where the sources disagree, but the EVIDENCE still unions — the witnesses that drove
 * the disagreement are kept (that retention is what lets ⊤ exist and what `gap` reads).
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function meetKnowledge({ left, right }) {
  return {
    value: [left.value[0] && right.value[0], left.value[1] && right.value[1]],
    evidence: [union(left.evidence[0], right.evidence[0]), union(left.evidence[1], right.evidence[1])],
  };
}

/**
 * Truth-order join (lub in ≤_t): value positive OR'd, value negative AND'd (truth reverses the
 * negative axis), evidence accumulated on both sides.
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function joinTruth({ left, right }) {
  return {
    value: [left.value[0] || right.value[0], left.value[1] && right.value[1]],
    evidence: [union(left.evidence[0], right.evidence[0]), union(left.evidence[1], right.evidence[1])],
  };
}

/**
 * Truth-order meet (glb in ≤_t): value positive AND'd, value negative OR'd, evidence accumulated.
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function meetTruth({ left, right }) {
  return {
    value: [left.value[0] && right.value[0], left.value[1] || right.value[1]],
    evidence: [union(left.evidence[0], right.evidence[0]), union(left.evidence[1], right.evidence[1])],
  };
}

/**
 * The knowledge order ≤_k on the VALUE: information only grows, componentwise (each side may gain
 * assertion, never lose it).
 * @param {Charge} a @param {Charge} b @returns {boolean}
 */
export const leqKnowledge = (a, b) => {
  const [ap, an] = present(a), [bp, bn] = present(b);
  return (!ap || bp) && (!an || bn);
};

/**
 * The ≤_k witness: returns `right` when `left ≤_k right` (knowledge only grows); throws otherwise.
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function compareKnowledge({ left, right }) {
  if (!leqKnowledge(left, right)) {
    throw new TypeError("compareKnowledge: no ≤_k witness — left has knowledge not present in right");
  }
  return right;
}

/**
 * The evidence-aggregation join. On the lossless carrier this is exactly `joinKnowledge`: union the
 * evidence on both sides, OR the value. Kept as a named morphism — "combine the evidence from two
 * sources" is its own reading even though the code is `joinKnowledge`.
 * @param {{ left: Charge, right: Charge }} pair @returns {Charge}
 */
export function aggregate(pair) {
  return joinKnowledge(pair);
}
