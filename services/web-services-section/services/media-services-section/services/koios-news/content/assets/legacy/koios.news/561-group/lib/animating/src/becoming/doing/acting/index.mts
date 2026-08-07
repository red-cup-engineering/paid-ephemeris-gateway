import {
  articulate,
  cell,
  claim,
  mark,
  predicateOfClaim,
  token,
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

const termOfPredicate = (predicate: PredicationPredicate): PredicationTerm =>
  token(predicate.claim.mark);

export const articulationVocabulary = Object.freeze({
  articulates: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "articulates"] as const)))),
  subject: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "articulates", "subject"] as const)))),
  predicate: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "articulates", "predicate"] as const)))),
  object: predicateOfClaim(claim(mark(Object.freeze(["animating", "agent", "articulates", "object"] as const)))),
});

export interface ArticulationInput {
  readonly locus: PredicationTerm;
  readonly event: PredicationTerm;
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object?: PredicationTerm;
}

/**
 * The doing-side act carrier: a bounded deed under a description, with the
 * acted claim and reification utterances that record who articulated what.
 */
export interface ArticulationCarrier {
  readonly kind: "animating.agent.articulation";
  readonly input: ArticulationInput;
  readonly cell: Cell;
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
  readonly reification: readonly Cell[];
  readonly cells: readonly Cell[];
  readonly utterances: readonly UtteranceCarrier[];
}

export function articulation(input: ArticulationInput): ArticulationCarrier {
  const articulatedCell = cell(input.subject, input.predicate, input.object ?? input.subject);
  const articulated = utteranceOfCell(articulatedCell);
  const reification = Object.freeze([
    cell(input.locus, articulationVocabulary.articulates, input.event),
    cell(input.event, articulationVocabulary.subject, input.subject),
    cell(input.event, articulationVocabulary.predicate, termOfPredicate(input.predicate)),
    cell(input.event, articulationVocabulary.object, input.object ?? input.subject),
  ]);
  const cells = Object.freeze([articulatedCell, ...reification]);
  return Object.freeze({
    kind: "animating.agent.articulation" as const,
    input,
    cell: articulatedCell,
    utterance: articulated,
    articulation: articulate(articulated),
    reification,
    cells,
    utterances: Object.freeze(cells.map(utteranceOfCell)),
  });
}
