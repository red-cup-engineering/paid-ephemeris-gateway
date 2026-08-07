/**
 * capability — an agent's capability/provision fiber.
 *
 * This is the individual-agent face of the work/governance substrate: what *an*
 * agent can do, as a fiber of bilattice charges over capability (and, when an
 * agent currently holds one, authority) coordinate carriers. It is the
 * "capability and duty marks" this package was always meant to carry.
 *
 * A `Fiber` maps coordinates to charge values: `absurd` = ⊥ (no info),
 * `potential` = t (provided), `active` = f (denied), `stable` = ⊤ (held
 * contradiction, e.g. an unauthorized grant). The *matching* of an agent's
 * provisions against a work's requirements (residuation δ) is a governing
 * concern and lives in `@emsenn/animating/becoming/doing/working/governing/algebra`; the
 * fiber-*bundle* structure (sections, propagation) is geometry and lives above.
 * Here we keep only the fiber and the agent's provision of it.
 */

import {
  charge,
  chargeValue,
  mark,
  predicationTermIdentity,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
  type PredicationTerm,
} from "@emsenn/relating";

export type FiberAxis = "capability" | "authority";

export interface FiberCoordinate {
  readonly kind: "animating.fiber.coordinate";
  readonly term: PredicationTerm;
}

export interface FiberEntry {
  readonly kind: "animating.fiber.entry";
  readonly coordinate: FiberCoordinate;
  readonly charge: ChargeCarrier;
  readonly value: ChargeValueName;
}

/** A finite bilattice-valued section over capability or authority coordinates. */
export interface Fiber {
  readonly kind: "animating.fiber";
  readonly entries: readonly FiberEntry[];
}

/** An agent's provisions: the capabilities it brings, and any authorities it
 *  currently holds (an office confers these — see becoming/doing/working/governing/algebra). */
export interface AgentProvisions {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}

/** Build a fiber from coordinates or an existing carrier section. Coordinates
 * become potential provisions. */
export function fiber(coordinates?: readonly FiberCoordinate[]): Fiber;
export function fiber(section: Fiber): Fiber;
export function fiber(
  input: readonly FiberCoordinate[] | Fiber | undefined = [],
): Fiber {
  if (isFiber(input)) return input;
  return fiberFromEntries(input.map((coordinate) => fiberEntry(coordinate, "potential")));
}

/** Build an agent's provision fibers from admitted carrier sections. */
export function provisions(input: {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}): AgentProvisions {
  return Object.freeze({
    ...(input.capabilities === undefined ? {} : { capabilities: fiber(input.capabilities) }),
    ...(input.authorities === undefined ? {} : { authorities: fiber(input.authorities) }),
  });
}

export function fiberEntry(coordinate: FiberCoordinate, value: ChargeValueName = "potential"): FiberEntry {
  return Object.freeze({
    kind: "animating.fiber.entry" as const,
    coordinate,
    charge: chargeForCoordinate(coordinate, value),
    value,
  });
}

export function fiberCoordinate(term: PredicationTerm): FiberCoordinate {
  return Object.freeze({
    kind: "animating.fiber.coordinate" as const,
    term,
  });
}

export function fiberValue(section: Fiber, coordinate: FiberCoordinate): ChargeCarrier {
  return section.entries.find((entry) => sameCoordinate(entry.coordinate, coordinate))?.charge
    ?? chargeForCoordinate(coordinate, "absurd");
}

export function fiberFromEntries(entries: readonly FiberEntry[]): Fiber {
  const section: FiberEntry[] = [];
  for (const entry of entries) {
    const index = section.findIndex((candidate) => sameCoordinate(candidate.coordinate, entry.coordinate));
    if (index === -1) section.push(entry);
    else section[index] = entry;
  }
  return Object.freeze({
    kind: "animating.fiber" as const,
    entries: Object.freeze(section),
  });
}

function isFiber(value: object): value is Fiber {
  return "kind" in value && value.kind === "animating.fiber";
}

function sameCoordinate(left: FiberCoordinate, right: FiberCoordinate): boolean {
  return predicationTermIdentity(left.term, right.term).kind === "predication.termIdentity:witness";
}

function chargeForCoordinate(coordinate: FiberCoordinate, value: ChargeValueName): ChargeCarrier {
  const witness = mark(Object.freeze(["animating", "fiber-value", coordinate, value] as const));
  const evidence = value === "potential"
    ? Object.freeze([Object.freeze([witness]), Object.freeze([])] as const)
    : value === "active"
      ? Object.freeze([Object.freeze([]), Object.freeze([witness])] as const)
      : value === "stable"
        ? Object.freeze([Object.freeze([witness]), Object.freeze([witness])] as const)
        : Object.freeze([Object.freeze([]), Object.freeze([])] as const);
  const carrier = charge(chargeValue(value), evidence);
  return valueOf(carrier).name === value ? carrier : charge(chargeValue(value));
}
