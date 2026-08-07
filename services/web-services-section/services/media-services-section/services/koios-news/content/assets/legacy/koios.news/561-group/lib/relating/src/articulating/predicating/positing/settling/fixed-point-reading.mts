import { chargeValue, joinKnowledgeValue, valueOf, type ChargeValue } from "../../../../articulating/carriers.mjs";
import { relationFromMatrix, relationMatrix, type RelationCarrier, type RelationMatrixCarrier } from "../../../../articulating/carriers.mjs";
import { predicationPredicateCoincidenceHolds, predicationTermCoincidenceHolds } from "../../../../articulating/carriers.mjs";
import { cohomology, type CohomologyCarrier } from "./cohomology.mjs";
import { count, type Natural } from "../../../../articulating/carriers.mjs";
import { chargeAt } from "../fiber.mjs";
import { entitySet, predicateSet, type Cell, type EntitySet, type PredicationPredicate, type PredicationTerm, type PredicateSet } from "../../../../articulating/carriers.mjs";
import { valuationConsistency, type PredicationValuationConsistencyCarrier } from "./valuation-consistency.mjs";
import { type FixedPointBoundObject, type FixedPointCarrier, type FixedPointExtremum, type FixedPointOrderObject } from "./fixed-point.mjs";
import { type SheafCarrier } from "./sheaf.mjs";

/**
 * A reading of one fixed-point extremum of a predication valuation: pairs the
 * extremum's order, bound and itself with the cohomology of its sheaf and the
 * information extracted from that sheaf's section.
 */
export interface MemeTopologyFixedPointReading {
  readonly kind: "meme-topology.fixedPointReading";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly extremum: FixedPointExtremum;
  readonly cohomology: CohomologyCarrier;
  readonly information: MemeTopologyInformation;
}

/**
 * The four fixed-point readings of a fixed-point carrier: the least and
 * greatest fixed points along the knowledge order and along the truth order.
 */
export interface MemeTopologyFixedPointReadings {
  readonly kind: "meme-topology.fixedPointReadings";
  readonly knowledgeLeast: MemeTopologyFixedPointReading;
  readonly knowledgeGreatest: MemeTopologyFixedPointReading;
  readonly truthLeast: MemeTopologyFixedPointReading;
  readonly truthGreatest: MemeTopologyFixedPointReading;
}

/**
 * The information content of a sheaf section, viewed as a relation: the entity
 * set of points, the predicate set of states, the deduplicated entries, the
 * relation matrix over points and states, the relation derived from it, and the
 * valuation consistency of the section.
 */
export interface MemeTopologyInformation {
  readonly kind: "meme-topology.information";
  readonly points: EntitySet;
  readonly states: PredicateSet;
  readonly entryCarrier: MemeTopologyInformationEntriesCarrier;
  readonly relationMatrix: RelationMatrixCarrier<PredicationTerm, PredicationPredicate>;
  readonly relation: RelationCarrier<PredicationTerm, PredicationPredicate>;
  readonly valuationConsistency: PredicationValuationConsistencyCarrier;
}

/**
 * A single information entry: a point (predication term), a state (predication
 * predicate), and the charge value assigned to that point-state pair.
 */
export interface MemeTopologyInformationEntry {
  readonly kind: "meme-topology.informationEntry";
  readonly point: PredicationTerm;
  readonly state: PredicationPredicate;
  readonly value: ChargeValue;
}

/**
 * A carrier for a collection of information entries: the frozen list of entries
 * and its rank as the natural count of those entries.
 */
export interface MemeTopologyInformationEntriesCarrier {
  readonly kind: "meme-topology.informationEntries";
  readonly entries: readonly MemeTopologyInformationEntry[];
  readonly rank: Natural;
}

/**
 * Builds the reading of a single fixed-point extremum: carries the extremum's
 * order and bound, computes the cohomology of the extremum's sheaf, and
 * extracts the information of that sheaf.
 */
export function fixedPointReading(extremum: FixedPointExtremum): MemeTopologyFixedPointReading {
  return Object.freeze({
    kind: "meme-topology.fixedPointReading" as const,
    order: extremum.order,
    bound: extremum.bound,
    extremum,
    cohomology: cohomology(extremum.sheaf),
    information: informationOfSheaf(extremum.sheaf),
  });
}

/**
 * Builds all four readings from a fixed-point carrier: the least and greatest
 * knowledge fixed points and the least and greatest truth fixed points.
 */
export function fixedPointReadings(fixed: FixedPointCarrier): MemeTopologyFixedPointReadings {
  return Object.freeze({
    kind: "meme-topology.fixedPointReadings" as const,
    knowledgeLeast: fixedPointReading(fixed.knowledge.least),
    knowledgeGreatest: fixedPointReading(fixed.knowledge.greatest),
    truthLeast: fixedPointReading(fixed.truth.least),
    truthGreatest: fixedPointReading(fixed.truth.greatest),
  });
}

/**
 * Returns the charge assigned to a target cell by the reading's extremum sheaf
 * section.
 */
export function readCharge(reading: MemeTopologyFixedPointReading, target: Cell): ReturnType<typeof chargeAt> {
  return chargeAt(reading.extremum.sheaf.section, target);
}

/**
 * Constructs a frozen information entry from a point, a state, and a charge
 * value.
 */
export const memeTopologyInformationEntry = (
  point: PredicationTerm,
  state: PredicationPredicate,
  value: ChargeValue,
): MemeTopologyInformationEntry => Object.freeze({
  kind: "meme-topology.informationEntry" as const,
  point,
  state,
  value,
});

/**
 * Constructs a frozen entries carrier from a list of information entries,
 * copying the entries and recording the rank as their natural count.
 */
export const memeTopologyInformationEntries = (
  entries: readonly MemeTopologyInformationEntry[],
): MemeTopologyInformationEntriesCarrier => Object.freeze({
  kind: "meme-topology.informationEntries" as const,
  entries: Object.freeze([...entries]),
  rank: count(entries),
});

/**
 * Returns the entity set of the points of an entries carrier,
 * coincidence-reduced by predication term coincidence.
 */
export const memeTopologyInformationPoints = (entries: MemeTopologyInformationEntriesCarrier): EntitySet =>
  entitySet(entries.entries.map((entry) => entry.point), predicationTermCoincidenceHolds);

/**
 * Returns the predicate set of the states of an entries carrier,
 * coincidence-reduced by predication predicate coincidence.
 */
export const memeTopologyInformationStates = (entries: MemeTopologyInformationEntriesCarrier): PredicateSet =>
  predicateSet(entries.entries.map((entry) => entry.state), predicationPredicateCoincidenceHolds);

/**
 * Builds the relation matrix over the given points and states from an entries
 * carrier, placing each entry's charge value at its point-state cell under term
 * and predicate coincidence.
 */
export const memeTopologyInformationRelationMatrix = (
  points: EntitySet,
  states: PredicateSet,
  entries: MemeTopologyInformationEntriesCarrier,
): RelationMatrixCarrier<PredicationTerm, PredicationPredicate> =>
  relationMatrix(
    points,
    states,
    entries.entries.map((entry) => [entry.point, entry.state, entry.value] as const),
    { samePoint: predicationTermCoincidenceHolds, sameState: predicationPredicateCoincidenceHolds },
  );

/**
 * Extracts the information of a sheaf: walks every fiber assignment,
 * deduplicating entries by point and state and joining colliding charge values
 * under the knowledge order, then assembles the points, states, relation
 * matrix, derived relation, and valuation consistency.
 */
export function informationOfSheaf(sheaf: SheafCarrier): MemeTopologyInformation {
  const entries: MemeTopologyInformationEntry[] = [];
  for (const fiber of sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const value = valueOf(assignment.charge);
      const index = entries.findIndex((candidate) =>
        predicationTermCoincidenceHolds(candidate.point, assignment.cell.subject)
        && predicationPredicateCoincidenceHolds(candidate.state, assignment.cell.predicate));
      if (index < 0) entries.push(memeTopologyInformationEntry(assignment.cell.subject, assignment.cell.predicate, value));
      else entries[index] = memeTopologyInformationEntry(entries[index]!.point, entries[index]!.state, joinKnowledgeValue(entries[index]!.value, value));
    }
  }
  const entryCarrier = memeTopologyInformationEntries(entries);
  const points = memeTopologyInformationPoints(entryCarrier);
  const states = memeTopologyInformationStates(entryCarrier);
  const informationMatrix = memeTopologyInformationRelationMatrix(points, states, entryCarrier);
  return Object.freeze({
    kind: "meme-topology.information" as const,
    points,
    states,
    entryCarrier,
    relationMatrix: informationMatrix,
    relation: relationFromMatrix(informationMatrix, { absent: chargeValue("absurd") }),
    valuationConsistency: valuationConsistency(sheaf.section),
  });
}
