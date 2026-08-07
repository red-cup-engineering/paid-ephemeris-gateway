/**
 * settling/fixed-point-reading — reading the four fixed-point extrema.
 *
 * Each extremum is read into its sheaf cohomology and the information of its
 * section (the section as a relation: points × states → charge, with valuation
 * consistency). The four readings — knowledge/truth × least/greatest — are the
 * complete settled picture of a posit presheaf.
 */
import { chargeValue, joinKnowledgeValue, valueOf, type ChargeValue } from "../bilattice-charge.mjs";
import { relationFromMatrix, relationMatrix, type RelationCarrier, type RelationMatrixCarrier } from "../../bilattice-relation.mjs";
import { termCoincides, predicateCoincides } from "../../predication.mjs";
import { cohomology, type CohomologyCarrier } from "./cohomology.mjs";
import { count, type Natural } from "./analysis/exact-number.mjs";
import { chargeAt } from "../fiber.mjs";
import { entitySet, predicateSet, type Cell, type EntitySet, type PredicationPredicate, type PredicationTerm, type PredicateSet } from "../../predication.mjs";
import { valuationConsistency, type PredicationValuationConsistencyCarrier } from "./valuation-consistency.mjs";
import { type FixedPointBoundObject, type FixedPointCarrier, type FixedPointExtremum, type FixedPointOrderObject } from "./fixed-point.mjs";
import { type SheafCarrier } from "./sheaf.mjs";

/** A reading of one fixed-point extremum: its cohomology and section information. */
export interface MemeTopologyFixedPointReading {
  readonly kind: "meme-topology.fixedPointReading";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly extremum: FixedPointExtremum;
  readonly cohomology: CohomologyCarrier;
  readonly information: MemeTopologyInformation;
}

/** The four fixed-point readings of a fixed-point carrier. */
export interface MemeTopologyFixedPointReadings {
  readonly kind: "meme-topology.fixedPointReadings";
  readonly knowledgeLeast: MemeTopologyFixedPointReading;
  readonly knowledgeGreatest: MemeTopologyFixedPointReading;
  readonly truthLeast: MemeTopologyFixedPointReading;
  readonly truthGreatest: MemeTopologyFixedPointReading;
}

/** The information content of a sheaf section, viewed as a relation. */
export interface MemeTopologyInformation {
  readonly kind: "meme-topology.information";
  readonly points: EntitySet;
  readonly states: PredicateSet;
  readonly entryCarrier: MemeTopologyInformationEntriesCarrier;
  readonly relationMatrix: RelationMatrixCarrier<PredicationTerm, PredicationPredicate>;
  readonly relation: RelationCarrier<PredicationTerm, PredicationPredicate>;
  readonly valuationConsistency: PredicationValuationConsistencyCarrier;
}

/** A single information entry (point, state, charge value). */
export interface MemeTopologyInformationEntry {
  readonly kind: "meme-topology.informationEntry";
  readonly point: PredicationTerm;
  readonly state: PredicationPredicate;
  readonly value: ChargeValue;
}

/** A collection of information entries, with rank. */
export interface MemeTopologyInformationEntriesCarrier {
  readonly kind: "meme-topology.informationEntries";
  readonly entries: readonly MemeTopologyInformationEntry[];
  readonly rank: Natural;
}

/** Read a single fixed-point extremum. */
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

/** Read all four extrema of a fixed-point carrier. */
export function fixedPointReadings(fixed: FixedPointCarrier): MemeTopologyFixedPointReadings {
  return Object.freeze({
    kind: "meme-topology.fixedPointReadings" as const,
    knowledgeLeast: fixedPointReading(fixed.knowledge.least),
    knowledgeGreatest: fixedPointReading(fixed.knowledge.greatest),
    truthLeast: fixedPointReading(fixed.truth.least),
    truthGreatest: fixedPointReading(fixed.truth.greatest),
  });
}

/** The charge a reading's section assigns to a target cell. */
export function readCharge(reading: MemeTopologyFixedPointReading, target: Cell): ReturnType<typeof chargeAt> {
  return chargeAt(reading.extremum.sheaf.section, target);
}

/** Construct an information entry. */
export const memeTopologyInformationEntry = (point: PredicationTerm, state: PredicationPredicate, value: ChargeValue): MemeTopologyInformationEntry =>
  Object.freeze({ kind: "meme-topology.informationEntry" as const, point, state, value });

/** Construct an entries carrier with rank. */
export const memeTopologyInformationEntries = (entries: readonly MemeTopologyInformationEntry[]): MemeTopologyInformationEntriesCarrier =>
  Object.freeze({ kind: "meme-topology.informationEntries" as const, entries: Object.freeze([...entries]), rank: count(entries) });

/** The point entity-set of an entries carrier. */
export const memeTopologyInformationPoints = (entries: MemeTopologyInformationEntriesCarrier): EntitySet =>
  entitySet(entries.entries.map((entry) => entry.point), termCoincides);

/** The state predicate-set of an entries carrier. */
export const memeTopologyInformationStates = (entries: MemeTopologyInformationEntriesCarrier): PredicateSet =>
  predicateSet(entries.entries.map((entry) => entry.state), predicateCoincides);

/** The relation matrix over points and states from an entries carrier. */
export const memeTopologyInformationRelationMatrix = (
  points: EntitySet,
  states: PredicateSet,
  entries: MemeTopologyInformationEntriesCarrier,
): RelationMatrixCarrier<PredicationTerm, PredicationPredicate> =>
  relationMatrix(
    points,
    states,
    entries.entries.map((entry) => [entry.point, entry.state, entry.value] as const),
    { samePoint: termCoincides, sameState: predicateCoincides },
  );

/** Extract the information of a sheaf (section as a relation + consistency). */
export function informationOfSheaf(sheaf: SheafCarrier): MemeTopologyInformation {
  const entries: MemeTopologyInformationEntry[] = [];
  for (const fiber of sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const value = valueOf(assignment.charge);
      const index = entries.findIndex((candidate) =>
        termCoincides(candidate.point, assignment.cell.subject) && predicateCoincides(candidate.state, assignment.cell.predicate));
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
