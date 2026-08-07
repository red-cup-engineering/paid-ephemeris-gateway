/**
 * dispatch — readiness δ(A,T) by capability/authority residuation. The derived
 * replacement for "which model board does this work go to".
 *
 * Theory: `work/archive/capability-matching.md`, `capability-fiber-bundle.md`.
 * Each agent is a fiber of provision charges σ_A(c) (see `../../algebra/index.mjs`);
 * each work carries requirement charges ρ_T(c). The per-coordinate match is the
 * bilattice residuation ρ ⇒ σ — "the agent's provision suffices for the
 * requirement", here the Belnap material implication ¬ρ ∨_t σ. Readiness conjoins
 * the matches in the truth order:
 *
 *   δ^C(A,T) = ⋀_t over required capabilities  (ρ_T(c) ⇒ σ_A(c))
 *   δ^N(A,T) = ⋀_t over required authorities    (ρ_T(X) ⇒ σ_A(X))
 *   δ(A,T)   = δ^C ∧_t δ^N
 *
 * δ = potential (t) iff the agent positively provides every required capability
 * AND authority. The partial-match states are distinct and DIAGNOSABLE — a
 * capability gap calls for grant/training, an authority gap for delegation/
 * installation. A contradictory provision (σ = ⊤, e.g. an unauthorized grant)
 * surfaces as a contested ⊤ match — a disqualification witness, never a silent
 * reject.
 *
 * The provision side (an agent's `Fiber`) is the individual-agent substrate and
 * lives in `../../algebra/index.mjs`; the matching here is the collective concern.
 */

import {
  chargeValueName,
  charge,
  chargeValue,
  joinTruth,
  meetTruth,
  negate,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
} from "@emsenn/relating";
import {
  fiber,
  fiberValue,
  type AgentProvisions,
  type Fiber,
  type FiberCoordinate,
} from "../../../algebra/index.mjs";

export type { Fiber, AgentProvisions } from "../../../algebra/index.mjs";

/**
 * The requirement charges of a work item: per-axis `Fiber` records giving
 * ρ_T(c) over capabilities and ρ_T(X) over authorities. Either axis may be
 * absent, in which case nothing is required on that axis.
 */
export interface WorkRequirements {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}

/**
 * Diagnosis of which axes fail dispatch readiness: "none" when both axes are
 * ready, "capability" or "authority" when only that axis falls short, "both"
 * when neither is ready.
 */
export type DispatchGap = "none" | "capability" | "authority" | "both";

/**
 * The per-coordinate match at one capability or authority: the coordinate carrier,
 * its requirement charge ρ, its provision charge σ, and the residuation match ρ
 * ⇒ σ.
 */
export interface CoordMatch {
  readonly coordinate: FiberCoordinate;
  readonly requirement: ChargeValueName;
  readonly provision: ChargeValueName;
  readonly requirementCharge: ChargeCarrier;
  readonly provisionCharge: ChargeCarrier;
  readonly matchCharge: ChargeCarrier;
  /** ρ ⇒ σ. */
  readonly match: ChargeValueName;
}

/**
 * The readiness verdict δ(A,T) of an agent for a work item: the per-axis
 * readiness charges δ^C (capability) and δ^N (authority), their truth-meet δ,
 * the ready flag (δ = potential), the gap diagnosis, the contested flag (some
 * match settled to ⊤), and the per-coordinate matches on each axis.
 */
export interface DispatchReadiness {
  /** δ^C — capability-axis readiness. */
  readonly capability: ChargeValueName;
  /** δ^N — authority-axis readiness. */
  readonly authority: ChargeValueName;
  /** δ = δ^C ∧_t δ^N. */
  readonly delta: ChargeValueName;
  readonly ready: boolean;
  readonly gap: DispatchGap;
  /** Some match settled to ⊤ — a contradictory provision surfaced, not passed. */
  readonly contested: boolean;
  readonly capabilityMatches: readonly CoordMatch[];
  readonly authorityMatches: readonly CoordMatch[];
}

/** The per-coordinate residuation ρ ⇒ σ as the Belnap material implication
 *  ¬ρ ∨_t σ. With ρ = potential (required): matched iff σ = potential; an absent
 *  or denied provision fails; a contradictory provision (σ = ⊤) yields ⊤. */
export function residuate(requirement: ChargeValueName, provision: ChargeValueName): ChargeValueName {
  return chargeValueName(valueOf(residuateCharge(charge(chargeValue(requirement)), charge(chargeValue(provision)))));
}

function axisMatches(requirement: Fiber, provision: Fiber): CoordMatch[] {
  const matches: CoordMatch[] = [];
  for (const requirementEntry of requirement.entries) {
    const coordinate = requirementEntry.coordinate;
    const requirementName = requirementEntry.value;
    if (requirementName === "absurd") continue; // ⊥ requirement — not required
    const provisionCharge = fiberValue(provision, coordinate);
    const provisionName = chargeValueName(valueOf(provisionCharge));
    const matchCharge = residuateCharge(requirementEntry.charge, provisionCharge);
    matches.push(Object.freeze({
      coordinate,
      requirement: requirementName,
      requirementCharge: requirementEntry.charge,
      provision: provisionName,
      provisionCharge,
      matchCharge,
      match: chargeValueName(valueOf(matchCharge)),
    }));
  }
  return matches;
}

/** Truth-meet conjunction of the matches. The empty conjunction is potential (t),
 *  the truth-top identity — no requirements means ready on that axis. */
function conjoin(matches: readonly CoordMatch[]): ChargeValueName {
  let accumulator = charge(chargeValue("potential"));
  for (const entry of matches) accumulator = meetTruth(accumulator, entry.matchCharge);
  return chargeValueName(valueOf(accumulator));
}

/** Compute dispatch readiness of an agent for a work item, with diagnosable gaps. */
export function dispatchReadiness(work: WorkRequirements, agent: AgentProvisions): DispatchReadiness {
  const capabilityMatches = axisMatches(work.capabilities ?? fiber(), agent.capabilities ?? fiber());
  const authorityMatches = axisMatches(work.authorities ?? fiber(), agent.authorities ?? fiber());
  const capability = conjoin(capabilityMatches);
  const authority = conjoin(authorityMatches);
  const delta = chargeValueName(valueOf(meetTruth(charge(chargeValue(capability)), charge(chargeValue(authority)))));
  const capabilityOk = capability === "potential";
  const authorityOk = authority === "potential";
  const gap: DispatchGap = capabilityOk && authorityOk
    ? "none"
    : !capabilityOk && !authorityOk
      ? "both"
      : capabilityOk ? "authority" : "capability";
  const contested = [...capabilityMatches, ...authorityMatches].some((entry) => entry.match === "stable");
  return Object.freeze({
    capability,
    authority,
    delta,
    ready: delta === "potential",
    gap,
    contested,
    capabilityMatches: Object.freeze(capabilityMatches),
    authorityMatches: Object.freeze(authorityMatches),
  });
}

/** Build a work's requirement section from admitted requirement fibers. */
export function requirements(input: WorkRequirements): WorkRequirements {
  return Object.freeze({
    ...(input.capabilities === undefined ? {} : { capabilities: fiber(input.capabilities) }),
    ...(input.authorities === undefined ? {} : { authorities: fiber(input.authorities) }),
  });
}

function residuateCharge(requirement: ChargeCarrier, provision: ChargeCarrier): ChargeCarrier {
  return joinTruth(negate(requirement), provision);
}
