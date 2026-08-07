import {
  articulate,
  cell,
  claim,
  mark,
  predicateOfClaim,
  type ArticulationCell,
  type Cell,
  type PredicationPredicate,
  type PredicationTerm,
  type UtteranceCarrier,
} from "@emsenn/relating";

const utteranceOfCell = (carrier: Cell): UtteranceCarrier =>
  Object.freeze({
    kind: "utterance.carrier" as const,
    token: carrier.subject,
    claim: carrier.predicate.claim,
  });

export const prehensionSubjectiveForms = Object.freeze({
  physical: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "prehension", "physical"] as const)))),
  conceptual: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "prehension", "conceptual"] as const)))),
  negative: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "prehension", "negative"] as const)))),
});

/**
 * A prehension: the constitutive relation by which a subject grasps a datum
 * under a subjective form.
 */
export interface Prehension {
  readonly kind: "animating.agent.prehension";
  readonly subject: PredicationTerm;
  readonly datum: PredicationTerm;
  readonly subjectiveForm: PredicationPredicate;
  readonly cell: Cell;
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
  readonly cells: readonly Cell[];
  readonly utterances: readonly UtteranceCarrier[];
}

/**
 * Constitute a prehension: a becoming-side grasp admitted into relating.
 */
export function prehend(
  subject: PredicationTerm,
  datum: PredicationTerm,
  subjectiveForm: PredicationPredicate,
): Prehension {
  const prehensionCell = cell(subject, subjectiveForm, datum);
  const admitted = utteranceOfCell(prehensionCell);
  return Object.freeze({
    kind: "animating.agent.prehension" as const,
    subject,
    datum,
    subjectiveForm,
    cell: prehensionCell,
    utterance: admitted,
    articulation: articulate(admitted),
    cells: Object.freeze([prehensionCell]),
    utterances: Object.freeze([admitted]),
  });
}
