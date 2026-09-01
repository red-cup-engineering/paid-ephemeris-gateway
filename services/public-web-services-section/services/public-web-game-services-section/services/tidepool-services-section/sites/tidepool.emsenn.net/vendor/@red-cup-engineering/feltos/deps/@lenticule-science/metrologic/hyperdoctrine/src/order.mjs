// order.mjs — the two σ-dual orders, exposed as operation bundles keyed by a tag, so the rest of the
// hyperdoctrine can be written once and instantiated per order instead of forking on knowledge/truth
// throughout. Everything here delegates to `../../bilattice/src/charge.mjs` — no lattice math is
// re-derived, only re-packaged. The truth order's `leq` is not itself exported by charge.mjs, so it is
// built from `leqKnowledge` via the σ-conjugation the bilattice laws already prove (`joinT = σ∘joinK∘σ`):
// comparing under truth is comparing the σ-swapped charges under knowledge.

import { joinKnowledge, meetKnowledge, joinTruth, meetTruth, leqKnowledge } from "../../bilattice/src/charge.mjs";

/** @typedef {import("../../bilattice/src/charge.mjs").Charge} Charge */

export const KNOWLEDGE = "knowledge";
export const TRUTH = "truth";

const sigma = (c) => ({ value: [c.value[0], !c.value[1]], evidence: c.evidence }); // the order-swap (flip the neg side)
const leqTruth = (a, b) => leqKnowledge(sigma(a), sigma(b));

const bare = (value) => ({ value, evidence: [[], []] });

/**
 * @typedef {{ join: (pair: {left:Charge,right:Charge}) => Charge, meet: (pair: {left:Charge,right:Charge}) => Charge,
 *   leq: (a: Charge, b: Charge) => boolean, bottom: Charge, top: Charge }} OrderOps
 */

const OPS = {
  // knowledge: ⊥ = absurd [F,F] (the join identity), ⊤ = stable [T,T] (the meet identity).
  [KNOWLEDGE]: Object.freeze({
    join: joinKnowledge, meet: meetKnowledge, leq: leqKnowledge,
    bottom: bare([false, false]), top: bare([true, true]),
  }),
  // truth: bottom = F [F,T] (the join/∨_t identity), top = T [T,F] (the meet/∧_t identity, "designated true").
  [TRUTH]: Object.freeze({
    join: joinTruth, meet: meetTruth, leq: leqTruth,
    bottom: bare([false, true]), top: bare([true, false]),
  }),
};

/**
 * Look up an order's operation bundle by tag. Throws on anything but `KNOWLEDGE`/`TRUTH` — an order tag
 * is a closed choice, not an open string.
 * @param {string} order @returns {OrderOps}
 */
export function orderOps(order) {
  const ops = OPS[order];
  if (!ops) throw new TypeError(`orderOps: unknown order "${order}" — expected KNOWLEDGE or TRUTH`);
  return ops;
}

/** The order's name, for messages/labels ("knowledge" | "truth"). */
export const orderKind = (order) => { orderOps(order); return order; };

/** Is `charge` valued at the order's designated (top) element? The Lawvere comprehension predicate. */
export const designated = (charge, order) => sameValue(charge, orderOps(order).top);

/** Structural equality on the value bits only (evidence is not compared — two charges can differ in
 * witnesses while reading the same FOUR place). */
export function sameValue(a, b) {
  return a.value[0] === b.value[0] && a.value[1] === b.value[1];
}
