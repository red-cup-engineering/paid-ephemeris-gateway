/**
 * animating boundary — agenthood as a settled relating carrier read at its membrane.
 *
 * An agent individuates through prehension (see animating algebra): it constitutes
 * itself by grasping other terms. This package settles those prehensions into a
 * relating fixed-point readings whose sections are the agent's perspective:
 * what it has prehended, at what bilattice charge, across what predicates.
 *
 * Beyond settlement, this package provides the boundary-layer operations on
 * agent carriers: performing an articulation against a world, reading bearings
 * and membranes off settled sections, and regulation (setpoint-discrepancy
 * judgment). Measuring the change between two settled states is animating
 * analysis.
 *
 * Morphisms between agents are settling-morphisms — functions from one carrier to
 * another that translate one agent's perspective into another's.
 */

import {
  fixedPointReadingsOfUtterances,
  settleUtterances,
  sectionOf,
  token,
  type Mark,
  type MemeTopologyFixedPointReadings,
  type PredicationTerm,
  type SectionCarrier,
  type SectionEntry,
  type SettlementFiltration,
} from "@emsenn/relating";
import type { UtteranceCarrier } from "@emsenn/relating";
import type { Cell, ChargeValue } from "@emsenn/relating";
import { chargeValueNamed, chargeValueOfCarrier } from "../../algebra/index.mjs";
import {
  cellKey,
  predicateMatches,
  relationPairOf,
  sameBoundaryValue,
  termTouches,
  predicateOf,
  termOf,
  type AnimatingPredicateInput,
  type AnimatingTermInput,
} from "./relation-boundary.mjs";
import {
  articulation,
  type ArticulationInput,
  type ArticulationCarrier,
} from "../../acting/index.mjs";
import type { Prehension } from "../../../prehending/index.mjs";

export type {
  UtteranceCarrier,
  SectionCarrier,
  SectionEntry,
  Cell,
  ChargeValue,
  Prehension,
  ArticulationInput,
  ArticulationCarrier,
};
export type TermInput = AnimatingTermInput;
export type PredicateInput = AnimatingPredicateInput;

export { transition } from "./transition.mjs";
export type { ChargeShift, TransitionCarrier } from "./transition.mjs";

// ---------- private boundary helpers ----------

const truthPresent = (value: ChargeValue): boolean => value.coordinates[0].name === "present";

const absurd = (): ChargeValue => chargeValueNamed("absurd");

const sameCell = (left: Cell, right: Cell): boolean => cellKey(left) === cellKey(right);

const sectionValues = (carrier: AgentBoundaryCarrier): readonly { cell: Cell; value: ChargeValue }[] =>
  sectionOf(carrier.fixedPointReadings.knowledgeLeast).entries.map((entry) => ({
    cell: entry.cell,
    value: chargeValueOfCarrier(entry.charge),
  }));

export const settleBoundary = (utterances: readonly UtteranceCarrier[]): AgentBoundaryCarrier => {
  if (utterances.length === 0) throw new TypeError("a boundary settlement requires at least one utterance");
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "animating.agent.boundary.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as AgentBoundaryCarrier;
};

// ---------- AgentIndividuation — individuation state ----------

/**
 * An agent's individuation state: its term identity, the prehensions by which
 * it grasped other terms, and the utterances those prehensions yielded.
 */
export interface AgentIndividuation {
  readonly kind: "animating.agent.individuation";
  readonly term: PredicationTerm;
  readonly prehensions: readonly Prehension[];
  readonly utterances: readonly UtteranceCarrier[];
}

/**
 * Builds the agent term carried by an identity mark.
 */
export function agentTerm(identity: Mark): PredicationTerm {
  return token(identity);
}

/**
 * Builds a frozen AgentIndividuation from an identity mark and a list of
 * prehensions.
 */
export function agentIndividuation(identity: Mark, prehensions: readonly Prehension[]): AgentIndividuation {
  const term = agentTerm(identity);
  const utterances = prehensions.flatMap((p) => p.utterances);
  return Object.freeze({
    kind: "animating.agent.individuation" as const,
    term,
    prehensions: Object.freeze([...prehensions]),
    utterances: Object.freeze(utterances),
  });
}

// ---------- boundary settlement ----------

/**
 * An agent's settled boundary: the carrier whose readings present the agent's
 * perspective on what it has prehended.
 */
export interface AgentBoundaryCarrier {
  readonly kind: "animating.agent.boundary.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _agentBoundaryBrand: never;
}

/**
 * Settles a list of utterances into an AgentBoundaryCarrier by inducing the
 * relating settlement over them.
 */
export function induceAgentBoundary(utterances: readonly UtteranceCarrier[]): AgentBoundaryCarrier {
  return settleBoundary(utterances) as AgentBoundaryCarrier;
}

/**
 * Extends an existing agent boundary with a delta of further utterances,
 * returning the re-settled AgentBoundaryCarrier.
 */
export function extendAgentBoundary(
  carrier: AgentBoundaryCarrier,
  delta: readonly UtteranceCarrier[],
): AgentBoundaryCarrier {
  return settleBoundary([...carrier.utterances, ...delta]);
}

/**
 * Settles an AgentIndividuation's own utterances into an AgentBoundaryCarrier:
 * the agent's perspective as a boundary.
 */
export function induceAgentIndividuationBoundary(agent: AgentIndividuation): AgentBoundaryCarrier {
  return induceAgentBoundary(agent.utterances);
}

// ---------- performance — acting on a world ----------

/**
 * The result of performing an articulation against a world: the articulation
 * carrier, the whole boundary settled before and after, and the posterior
 * corpus of utterances.
 */
export interface PerformanceCarrier {
  readonly kind: "animating.agent.performance";
  readonly articulation: ArticulationCarrier;
  readonly before: AgentBoundaryCarrier;
  readonly after: AgentBoundaryCarrier;
  readonly posterior: readonly UtteranceCarrier[];
}

/** Perform an articulation against a standing corpus: the boundary before, the
 *  boundary after, both whole. An articulation acts on a boundary; founding a
 *  boundary is settlement. */
export function perform(prior: readonly UtteranceCarrier[], input: ArticulationInput): PerformanceCarrier {
  if (prior.length === 0) throw new TypeError("an articulation acts on a boundary; founding a boundary is settlement");
  const act = articulation(input);
  const posterior = Object.freeze([...prior, ...act.utterances]);
  return Object.freeze({
    kind: "animating.agent.performance" as const,
    articulation: act,
    before: settleBoundary(prior),
    after: settleBoundary(posterior),
    posterior,
  });
}

// ---------- bearing — did a claim's potential appear? ----------

/**
 * A bearing reading where a claim's potential appeared at a cell: the cell with
 * its charge value before and after settlement.
 */
export interface BearingAffirmation {
  readonly kind: "animating.agent.bearing.affirmation";
  readonly cell: Cell;
  readonly before: ChargeValue;
  readonly after: ChargeValue;
}

/**
 * A bearing reading where a cell's truth-presence stayed put between two
 * settled states: the cell and its unchanged charge value.
 */
export interface BearingSilence {
  readonly kind: "animating.agent.bearing.silence";
  readonly cell: Cell;
  readonly value: ChargeValue;
}

/**
 * A bearing reading where a claim's potential withdrew at a cell: the cell with
 * its charge value before and after. Evidence is monotone, so withdrawal
 * refuses a bearing name.
 */
export interface BearingObstruction {
  readonly kind: "animating.agent.bearing-obstruction";
  readonly cell: Cell;
  readonly before: ChargeValue;
  readonly after: ChargeValue;
}

/**
 * The outcome of a bearing read at a cell: an affirmation, a silence, or an
 * obstruction.
 */
export type BearingJudgment = BearingAffirmation | BearingSilence | BearingObstruction;

/** Between two settled states, at a cell, did the claim's potential appear (affirmation),
 *  stay put (silence), or withdraw (obstruction)?  Evidence is monotone, so withdrawal
 *  refuses a bearing name.  There is no denial: a contrary fact is its own claim. */
export function bearing(before: AgentBoundaryCarrier, after: AgentBoundaryCarrier, cell: Cell): BearingJudgment {
  const find = (carrier: AgentBoundaryCarrier): ChargeValue => {
    const match = sectionValues(carrier).find((entry) => sameCell(entry.cell, cell));
    return match?.value ?? absurd();
  };
  const earlier = find(before);
  const later = find(after);
  if (truthPresent(earlier) && !truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing-obstruction" as const, cell, before: earlier, after: later });
  }
  if (!truthPresent(earlier) && truthPresent(later)) {
    return Object.freeze({ kind: "animating.agent.bearing.affirmation" as const, cell, before: earlier, after: later });
  }
  return Object.freeze({ kind: "animating.agent.bearing.silence" as const, cell, value: later });
}

// ---------- membrane — a term's boundary situation ----------

/**
 * A term's boundary situation: every section entry whose subject or object
 * is the term, with the contested (stable) and open (absurd) entries singled
 * out.
 */
export interface BoundaryCarrier {
  readonly kind: "animating.agent.boundary";
  readonly entries: readonly SectionEntry[];
  /** Entries reading `stable` — held contradictions; derived, never admitted. */
  readonly stable: readonly SectionEntry[];
  /** Entries reading `absurd` — open residue. */
  readonly absurd: readonly SectionEntry[];
}

/**
 * Builds a BoundaryCarrier for a term over a section: collects the entries
 * mentioning the term as subject or object and partitions out those reading
 * stable and absurd.
 */
export function boundary(section: SectionCarrier, term: TermInput): BoundaryCarrier {
  const entries = section.entries.filter((entry) =>
    termTouches(entry.cell.subject, term) || termTouches(entry.cell.object, term));
  const named = (name: ChargeValue["name"]) =>
    Object.freeze(entries.filter((entry) => chargeValueOfCarrier(entry.charge).name === name));
  return Object.freeze({
    kind: "animating.agent.boundary" as const,
    entries: Object.freeze(entries),
    stable: named("stable"),
    absurd: named("absurd"),
  });
}

/** The stable and absurd entries of a boundary, where the situation is contested
 *  or open, optionally restricted to predicates the locus can perceive. */
export function affordances(
  boundaryCarrier: BoundaryCarrier,
  perceivable?: readonly PredicateInput[],
): readonly SectionEntry[] {
  const open = [...boundaryCarrier.stable, ...boundaryCarrier.absurd];
  if (perceivable === undefined) return Object.freeze(open);
  return Object.freeze(open.filter((entry) =>
    perceivable.some((input) => predicateMatches(entry.cell.predicate, input))));
}

// ---------- regulation — setpoint-discrepancy judgment ----------

/**
 * The terms a regulation reads against: the system, the variable being
 * regulated, the state predicate, the setpoint object, and the event naming a
 * correction articulation.
 */
export interface RegulationInput {
  readonly system: TermInput;
  readonly variable: TermInput;
  readonly statePredicate: PredicateInput;
  readonly setpoint: TermInput;
  /** Term naming the correction articulation, if one is proposed. */
  readonly event: TermInput;
}

/**
 * A regulation reading where the variable sits at its setpoint with no
 * deviation: the input and the setpoint's charge value.
 */
export interface RegulationWitness {
  readonly kind: "animating.agent.regulation:witness";
  readonly input: RegulationInput;
  readonly setpointValue: ChargeValue;
}

/**
 * Why a regulation read obstructs: "unposited" when the setpoint is absurd,
 * "deviating" when the variable holds co-states other than the setpoint.
 */
export type RegulationObstructionReason = "unposited" | "deviating";

/**
 * A regulation reading where the variable is off its setpoint: the input, the
 * reason, the setpoint's charge value, the standing deviations, and - for an
 * unposited setpoint - a proposed correction articulation.
 */
export interface RegulationObstruction {
  readonly kind: "animating.agent.regulation-obstruction";
  readonly input: RegulationInput;
  readonly reason: RegulationObstructionReason;
  readonly setpointValue: ChargeValue;
  /** Standing co-states of the variable other than the setpoint. */
  readonly deviations: readonly SectionEntry[];
  /** Proposed only for an unposited setpoint — what to do about deviation is
   *  policy at a locus, not fabric. */
  readonly correction?: ArticulationInput;
}

/**
 * The outcome of a regulation read: a witness when the variable holds its
 * setpoint, or an obstruction when it is unposited or deviating.
 */
export type RegulationJudgment = RegulationWitness | RegulationObstruction;

/**
 * Reads a regulation judgment off a settled carrier: finds the setpoint's
 * charge and the variable's deviating co-states, returning a deviating or
 * unposited obstruction otherwise a witness. An unposited obstruction carries a
 * proposed correction articulation.
 */
export function regulationRead(carrier: AgentBoundaryCarrier, input: RegulationInput): RegulationJudgment {
  const section = sectionOf(carrier.fixedPointReadings.knowledgeLeast);
  const setpointEntry = section.entries.find((entry) => {
    const pair = relationPairOf(entry.cell.subject);
    return pair !== undefined
      && sameBoundaryValue(pair.subject, input.variable)
      && sameBoundaryValue(pair.object, input.setpoint)
      && predicateMatches(entry.cell.predicate, input.statePredicate);
  });
  const setpointValue = setpointEntry === undefined ? absurd() : chargeValueOfCarrier(setpointEntry.charge);
  const deviations = Object.freeze(section.entries.filter((entry) =>
    relationPairOf(entry.cell.subject) !== undefined
    && sameBoundaryValue(relationPairOf(entry.cell.subject)!.subject, input.variable)
    && predicateMatches(entry.cell.predicate, input.statePredicate)
    && !sameBoundaryValue(relationPairOf(entry.cell.subject)!.object, input.setpoint)
    && truthPresent(chargeValueOfCarrier(entry.charge))));

  const obstruct = (
    reason: RegulationObstructionReason,
    correction?: ArticulationInput,
  ): RegulationObstruction => Object.freeze({
    kind: "animating.agent.regulation-obstruction" as const,
    input,
    reason,
    setpointValue,
    deviations,
    ...(correction === undefined ? {} : { correction }),
  });

  if (deviations.length > 0) return obstruct("deviating");
  if (setpointValue.name === "absurd") {
    return obstruct("unposited", {
      locus: termOf(input.system),
      event: termOf(input.event),
      subject: termOf(input.variable),
      predicate: predicateOf(input.statePredicate),
      object: termOf(input.setpoint),
    });
  }
  return Object.freeze({ kind: "animating.agent.regulation:witness" as const, input, setpointValue });
}

/**
 * The result of regulating a corpus: the regulation judgment and, when a
 * correction was proposed and performed, the resulting performance.
 */
export interface RegulationCarrier {
  readonly kind: "animating.agent.regulation";
  readonly judgment: RegulationJudgment;
  readonly performance?: PerformanceCarrier;
}

/**
 * Reads a regulation judgment over a prior corpus and, if the judgment proposes
 * a correction articulation, performs it - returning the judgment with any
 * resulting performance.
 */
export function regulate(prior: readonly UtteranceCarrier[], input: RegulationInput): RegulationCarrier {
  const judgment = regulationRead(settleBoundary(prior), input);
  if (judgment.kind === "animating.agent.regulation-obstruction" && judgment.correction !== undefined) {
    return Object.freeze({
      kind: "animating.agent.regulation" as const,
      judgment,
      performance: perform(prior, judgment.correction),
    });
  }
  return Object.freeze({ kind: "animating.agent.regulation" as const, judgment });
}
