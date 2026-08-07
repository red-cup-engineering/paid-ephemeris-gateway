/**
 * Prime event structures — the objects of $\mathbf{CGS}$ before symmetry.
 *
 * Castellan-Clairambault-Winskel take the objects of the concurrent-games
 * category to be prime event structures $(E, \leq, \#)$: a set of events with a
 * causal partial order $\leq$ (an event may not occur until its causes have)
 * and an irreflexive symmetric conflict relation $\#$ (two events in conflict
 * never both occur), with conflict inherited upward along causality.  A
 * *configuration* is a finite, down-closed, conflict-free set of events — a
 * reachable position of the running game.
 *
 * Each event carries a polarity, making the structure a *polarized* prime event
 * structure — the raw board on which Player and Opponent move.
 */
import { type Polarity, isPolarity } from "../polarity.mjs";

export interface Event {
  readonly kind: "game.event";
  readonly id: string;
  readonly polarity: Polarity;
}

/** An edge of a binary relation over event ids, stored as an ordered pair. */
export type EventPair = readonly [from: string, to: string];

export interface PrimeEventStructure {
  readonly kind: "game.eventStructure";
  readonly events: readonly Event[];
  /** Causality edges `[a, b]` read as $a \leq b$ ($a$ causally precedes $b$). */
  readonly causality: readonly EventPair[];
  /** Conflict edges `[a, b]` read as $a \mathbin{\#} b$ (symmetric; stored once). */
  readonly conflict: readonly EventPair[];
}

export function event(id: string, polarity: Polarity): Event {
  return Object.freeze({ kind: "game.event" as const, id, polarity });
}

export function eventStructure(
  events: readonly Event[],
  causality: readonly EventPair[] = [],
  conflict: readonly EventPair[] = [],
): PrimeEventStructure {
  return Object.freeze({
    kind: "game.eventStructure" as const,
    events: Object.freeze([...events]),
    causality: Object.freeze(causality.map((pair) => Object.freeze([pair[0], pair[1]] as const))),
    conflict: Object.freeze(conflict.map((pair) => Object.freeze([pair[0], pair[1]] as const))),
  });
}

export const eventIds = (structure: PrimeEventStructure): readonly string[] =>
  Object.freeze(structure.events.map((e) => e.id));

export const eventById = (structure: PrimeEventStructure, id: string): Event | null =>
  structure.events.find((e) => e.id === id) ?? null;

const hasPair = (pairs: readonly EventPair[], from: string, to: string): boolean =>
  pairs.some((pair) => pair[0] === from && pair[1] === to);

/** $a \leq b$ in the reflexive-transitive closure of the causality edges. */
export function causes(structure: PrimeEventStructure, a: string, b: string): boolean {
  if (a === b) return true;
  const seen = new Set<string>([a]);
  let frontier: readonly string[] = [a];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const x of frontier) {
      for (const pair of structure.causality) {
        if (pair[0] === x && !seen.has(pair[1])) {
          if (pair[1] === b) return true;
          seen.add(pair[1]);
          next.push(pair[1]);
        }
      }
    }
    frontier = next;
  }
  return false;
}

/** $a \mathbin{\#} b$ — conflict is symmetric, so test both stored orientations. */
export function conflicts(structure: PrimeEventStructure, a: string, b: string): boolean {
  return hasPair(structure.conflict, a, b) || hasPair(structure.conflict, b, a);
}

/** The causes of `id`: every event $c$ with $c \leq id$ (including `id`). */
export function downSet(structure: PrimeEventStructure, id: string): readonly string[] {
  return Object.freeze(eventIds(structure).filter((c) => causes(structure, c, id)));
}

export interface ConfigurationWitness {
  readonly kind: "game.configuration:witness";
  readonly events: readonly string[];
}

export interface ConfigurationObstruction {
  readonly kind: "game.configuration-obstruction";
  readonly events: readonly string[];
  readonly reason: "unknown-event" | "not-down-closed" | "conflict";
  readonly offending: EventPair;
}

export type ConfigurationJudgment = ConfigurationWitness | ConfigurationObstruction;

/**
 * Judge whether a set of event ids is a configuration: every id is known, the
 * set is down-closed under causality, and it is conflict-free.
 */
export function configurationJudgment(structure: PrimeEventStructure, events: readonly string[]): ConfigurationJudgment {
  const present = new Set(events);
  for (const id of events) {
    if (eventById(structure, id) === null) {
      return Object.freeze({ kind: "game.configuration-obstruction" as const, events: Object.freeze([...events]), reason: "unknown-event" as const, offending: Object.freeze([id, id] as const) });
    }
  }
  for (const id of events) {
    for (const cause of downSet(structure, id)) {
      if (!present.has(cause)) {
        return Object.freeze({ kind: "game.configuration-obstruction" as const, events: Object.freeze([...events]), reason: "not-down-closed" as const, offending: Object.freeze([cause, id] as const) });
      }
    }
  }
  for (const a of events) {
    for (const b of events) {
      if (a < b && conflicts(structure, a, b)) {
        return Object.freeze({ kind: "game.configuration-obstruction" as const, events: Object.freeze([...events]), reason: "conflict" as const, offending: Object.freeze([a, b] as const) });
      }
    }
  }
  return Object.freeze({ kind: "game.configuration:witness" as const, events: Object.freeze([...events]) });
}

export function isConfiguration(structure: PrimeEventStructure, events: readonly string[]): boolean {
  return configurationJudgment(structure, events).kind === "game.configuration:witness";
}

export function isEvent(value: unknown): value is Event {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Event>;
  return candidate.kind === "game.event" && typeof candidate.id === "string" && isPolarity(candidate.polarity);
}

export function isPrimeEventStructure(value: unknown): value is PrimeEventStructure {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PrimeEventStructure>;
  return candidate.kind === "game.eventStructure"
    && Array.isArray(candidate.events)
    && candidate.events.every(isEvent)
    && Array.isArray(candidate.causality)
    && Array.isArray(candidate.conflict);
}
