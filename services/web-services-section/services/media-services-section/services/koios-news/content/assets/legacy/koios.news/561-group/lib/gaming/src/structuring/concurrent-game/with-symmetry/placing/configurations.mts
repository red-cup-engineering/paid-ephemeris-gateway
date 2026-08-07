/**
 * Configurations as a Scott domain.
 *
 * The configurations of a prime event structure — its finite, down-closed,
 * conflict-free sets of events (game-algebra `configurationJudgment`) — form a
 * domain ordered by inclusion: a *finitary prime-algebraic domain* (a dI-domain
 * in the sense of Berry-Curien, the denotational home of stable/concurrent game
 * semantics).  Each configuration is a reachable position of the running game;
 * the order is "play has progressed at least as far".
 *
 * The defining asymmetry of this domain is that *meets are total but joins are
 * partial*:
 *
 *   - `meetConfigurations` (intersection) is always a configuration — the
 *     intersection of down-closed sets is down-closed, and a subset of a
 *     conflict-free set is conflict-free.
 *   - `joinConfigurations` (union) is down-closed but may break
 *     conflict-freeness; it exists only when the two positions are compatible.
 *     This *bounded-join* (consistent-completeness) is exactly the dI-domain /
 *     Scott-domain condition, so the join is a witness/obstruction judgment.
 *
 * The covering relation of the domain (`isCovering`) adds exactly one event:
 * configuration domains are ranked by cardinality, so $X \lessdot Y$ iff $X
 * \subsetneq Y$ with $|Y \setminus X| = 1$.
 */
import {
  type PrimeEventStructure,
  configurationJudgment,
  conflicts,
  eventIds,
  isConfiguration,
} from "../index.mjs";

export interface Configuration {
  readonly kind: "game-geometry.configuration";
  /** The event ids of this position, deduplicated and sorted. */
  readonly events: readonly string[];
}

const normalize = (events: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(events)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));

/** A configuration carrier from a set of event ids (assumed to be a configuration). */
export function configuration(events: readonly string[]): Configuration {
  return Object.freeze({ kind: "game-geometry.configuration" as const, events: normalize(events) });
}

/** Whether `value` is a configuration carrier. */
export function isConfigurationCarrier(value: unknown): value is Configuration {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Configuration>;
  return candidate.kind === "game-geometry.configuration" && Array.isArray(candidate.events);
}

/**
 * Enumerate every configuration of a FINITE event structure by filtering the
 * powerset of events through `configurationJudgment`.  Ordered by inclusion
 * (cardinality, then lexicographic) so the empty configuration comes first.
 */
export function configurations(structure: PrimeEventStructure): readonly Configuration[] {
  const ids = eventIds(structure);
  const result: Configuration[] = [];
  const total = 1 << ids.length;
  for (let mask = 0; mask < total; mask += 1) {
    const subset: string[] = [];
    for (let bit = 0; bit < ids.length; bit += 1) {
      if (mask & (1 << bit)) subset.push(ids[bit]!);
    }
    if (isConfiguration(structure, subset)) result.push(configuration(subset));
  }
  result.sort((a, b) =>
    a.events.length - b.events.length
    || (a.events.join(",") < b.events.join(",") ? -1 : a.events.join(",") > b.events.join(",") ? 1 : 0));
  return Object.freeze(result);
}

/** Inclusion order $X \subseteq Y$ on configurations. */
export function includesConfiguration(larger: Configuration, smaller: Configuration): boolean {
  const present = new Set(larger.events);
  return smaller.events.every((id) => present.has(id));
}

/**
 * The meet (greatest lower bound): set intersection.  Total — the intersection
 * of two configurations is always a configuration.
 */
export function meetConfigurations(left: Configuration, right: Configuration): Configuration {
  const present = new Set(right.events);
  return configuration(left.events.filter((id) => present.has(id)));
}

export interface JoinWitness {
  readonly kind: "game-geometry.join:witness";
  readonly join: Configuration;
}

export interface JoinObstruction {
  readonly kind: "game-geometry.join-obstruction";
  readonly reason: "conflict";
  /** The conflicting pair drawn one from each side that bars the join. */
  readonly offending: readonly [string, string];
}

export type JoinJudgment = JoinWitness | JoinObstruction;

/**
 * The join (least upper bound): set union.  Partial — the union is down-closed
 * but may carry a conflict, in which case the two positions are incompatible
 * and have no upper bound.  Witness on compatibility, obstruction on conflict.
 */
export function joinConfigurations(structure: PrimeEventStructure, left: Configuration, right: Configuration): JoinJudgment {
  for (const a of left.events) {
    for (const b of right.events) {
      if (conflicts(structure, a, b)) {
        return Object.freeze({
          kind: "game-geometry.join-obstruction" as const,
          reason: "conflict" as const,
          offending: Object.freeze([a, b] as const),
        });
      }
    }
  }
  const union = configuration([...left.events, ...right.events]);
  // Down-closure and conflict-freeness within each side already hold; the
  // cross-conflict check above is the only way the union could fail.
  const judgment = configurationJudgment(structure, union.events);
  if (judgment.kind !== "game.configuration:witness") {
    return Object.freeze({
      kind: "game-geometry.join-obstruction" as const,
      reason: "conflict" as const,
      offending: Object.freeze([judgment.offending[0], judgment.offending[1]] as const),
    });
  }
  return Object.freeze({ kind: "game-geometry.join:witness" as const, join: union });
}

/**
 * The covering relation of the domain: $X \lessdot Y$ iff $X \subsetneq Y$ and
 * exactly one event separates them.  Both arguments must be configurations of
 * the structure; an immediate covering step is a single legal move.
 */
export function isCovering(structure: PrimeEventStructure, smaller: Configuration, larger: Configuration): boolean {
  if (!isConfiguration(structure, smaller.events)) return false;
  if (!isConfiguration(structure, larger.events)) return false;
  if (!includesConfiguration(larger, smaller)) return false;
  return larger.events.length - smaller.events.length === 1;
}
