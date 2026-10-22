// cone.mjs — the cone duals of the finite generators.
//
// Each order carries a unit/counit cone pair over the one measured carrier:
//   • knowledge — settle (unit, LFP → sheaf, in descent.mjs) and brim (counit, GFP → cone).
//   • truth     — adjudicate (unit, LFP → verdict) and presume (counit, GFP → presumption).
// A bit is FREE when its evidence is empty (un-witnessed), GIVEN when witnessed. settle/adjudicate
// leave free bits low; brim/presume raise them to the order's top, then run the same closure. The
// slack between unit and counit is the void cone (read by gap/vanish in void.mjs).

import {
  commutate,
  possibilizeKnowledge,
  necessitateKnowledge,
  possibilizeTruth,
  necessitateTruth,
  lastValuation,
} from "./descent.mjs";
import { stringify as S } from "./internal.mjs";

// raise each FREE (un-witnessed) bit to the per-axis ceiling, keep GIVEN bits at their measured value.
// `freeNeg` is the value a free negative bit rises to: true for the knowledge-top ⊤ (brim), false for
// the truth-top potential [T,F] (presume). Evidence marks given vs free — no new primitive.
const ceilingWith = (freeNeg) => (valuation) => ({
  ...valuation,
  "fiber-algebras": valuation["fiber-algebras"].map((fa) => ({
    ...fa,
    assignments: fa.assignments.map(({ cell, charge }) => ({ cell, charge: {
      value: [charge.evidence[0].length ? charge.value[0] : true, charge.evidence[1].length ? charge.value[1] : freeNeg],
      evidence: charge.evidence,
    } })),
  })),
});

const ceilingKnowledge = ceilingWith(true); // free negative bit → ⊤
const ceilingTruth = ceilingWith(false); // free negative bit → potential [T,F]

/**
 * The knowledge greatest-fixed-point generator (the counit-cone). Raises every free bit to ⊤, then
 * runs settle's exact closure — the greatest state consistent with the givens, dual of settle's sheaf.
 * @param {object} category @returns {{ cone: { base: object, section: object } }}
 */
export function brim(category) {
  const { saturated: presheaf, residue: traces } = commutate(category);
  const ceilingTraces = traces.map((trace) => ({ ...trace, valuations: [ceilingKnowledge(trace.valuations[0])] }));
  let current = { presheaf, traces: ceilingTraces };
  let prev;
  do {
    prev = current;
    current = possibilizeKnowledge(necessitateKnowledge(current));
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  const section = lastValuation(current);
  return { cone: { base: section.base, section } };
}

/**
 * The truth-axis finite generator, the verdict-dual of settle. Iterates ◇_t ∘ □_t on the one carrier
 * to its fixed point — the truth reading (true vs false) of the same tellings settle reads knowledge-ward.
 * @param {object} category @returns {{ verdict: { base: object, section: object } }}
 */
export function adjudicate(category) {
  let current = category;
  let prev;
  do {
    prev = current;
    current = possibilizeTruth(necessitateTruth(current));
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  const section = lastValuation(current);
  return { verdict: { base: section.base, section } };
}

/**
 * The truth greatest-fixed-point generator (the counit-cone of the truth order). Raises every free bit
 * toward the truth-top potential [T,F], then runs adjudicate's exact closure — the greatest truth
 * consistent with the givens, dual of adjudicate's verdict.
 * @param {object} category @returns {{ presumption: { base: object, section: object } }}
 */
export function presume(category) {
  const ceilingTraces = category.traces.map((trace) => ({ ...trace, valuations: [ceilingTruth(trace.valuations[0])] }));
  let current = { ...category, traces: ceilingTraces };
  let prev;
  do {
    prev = current;
    current = possibilizeTruth(necessitateTruth(current));
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  const section = lastValuation(current);
  return { presumption: { base: section.base, section } };
}
