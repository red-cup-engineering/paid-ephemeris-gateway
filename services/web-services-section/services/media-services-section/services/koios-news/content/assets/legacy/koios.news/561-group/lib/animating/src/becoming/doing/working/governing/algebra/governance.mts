/**
 * governance — operation-gating and tool-admission, re-derived on the fleet's
 * own residuation substrate rather than re-implemented.
 *
 * "May agent A perform operation O under mode M?" is not a bespoke skill/office
 * check — it is exactly δ-dispatch: the mode says what an operation *requires*
 * (capabilities and authorities), the agent brings its capabilities, the office
 * it holds confers authorities (capability propagation), and readiness is the
 * residuation already defined in `./dispatch.mjs`. Eligibility is `readiness.ready`
 * (the conjunctive δ = potential); the decision *charge* is the paraconsistent
 * evidence summary via `./eligibility.mjs` — affirmed where provided, denied where
 * missing, a held contradiction (⊤) where a provision is itself contested. The
 * gate (ready/gap) and the charge are kept distinct, exactly as the-ways #3
 * (contradiction is load-bearing) and the deprecated swarm/governance.mts intended.
 *
 * Tool admission is the same shape with only the authority axis: a tool's scopes
 * are the authorities it requires; admission is readiness against the caller's
 * authority fiber.
 */

import {
  mark,
  negate,
  predicationTermIdentity,
  token,
  witnessedPotential,
  type ChargeCarrier,
  type PredicationTerm,
} from "@emsenn/relating";
import type { Fiber, FiberCoordinate } from "../../../algebra/index.mjs";
import { dispatchReadiness, requirements, type DispatchReadiness } from "./dispatch.mjs";
import { incumbentProvisions } from "./office-dispatch.mjs";
import { eligibilityCharge } from "./eligibility.mjs";
import type { Office } from "./office.mjs";

/** What an operation requires of whoever performs it. */
export interface OperationRequirement {
  readonly capabilities?: Fiber;
  readonly authorities?: Fiber;
}

/** A finite mode section entry: one operation and the fibers it requires. */
export interface OperationRequirementEntry {
  readonly operation: PredicationTerm;
  readonly requirement: OperationRequirement;
}

/** A governance regime: per operation, the capabilities and authorities required.
 *  An operation absent from the map is unrestricted. */
export interface Mode {
  readonly name: PredicationTerm;
  readonly operations: readonly OperationRequirementEntry[];
}

/** The open mode — every operation unrestricted. */
export const openMode: Mode = Object.freeze({
  name: token(mark(Object.freeze(["animating", "governance", "mode", "open"] as const))),
  operations: Object.freeze([]),
});

/**
 * Construct a governance regime from a mode term and a finite
 * operation-requirement section.
 */
export function mode(name: PredicationTerm, operations: readonly OperationRequirementEntry[] = []): Mode {
  return Object.freeze({
    name,
    operations: Object.freeze(operations.map((entry) => {
      return Object.freeze({
        operation: entry.operation,
        requirement: Object.freeze({
          ...(entry.requirement.capabilities === undefined
            ? {}
            : { capabilities: entry.requirement.capabilities }),
          ...(entry.requirement.authorities === undefined
            ? {}
            : { authorities: entry.requirement.authorities }),
        }),
      });
    })),
  });
}

/**
 * The result of gating an operation for an agent under a mode: names the agent,
 * operation, and mode, carries the underlying delta `readiness`, the
 * paraconsistent decision `charge`, and the conjunctive `eligible` gate
 * (readiness settled to potential).
 */
export interface GovernanceDecision {
  readonly agent: PredicationTerm;
  readonly operation: PredicationTerm;
  readonly mode: PredicationTerm;
  /** The δ-readiness behind the decision — gap and contested matches are diagnosable here. */
  readonly readiness: DispatchReadiness;
  /** Paraconsistent evidence summary: potential when fully provided, active when
   *  denied, ⊤ when evidence conflicts. Distinct from `eligible`. */
  readonly charge: ChargeCarrier;
  /** The conjunctive gate: δ settled to potential (every requirement provided). */
  readonly eligible: boolean;
}

/** Gate an operation for an agent under a mode. The agent brings `capabilities`;
 *  an `office` it holds confers authorities (capability propagation). */
export function governOperation(input: {
  readonly agent: PredicationTerm;
  readonly operation: PredicationTerm;
  readonly mode: Mode;
  readonly capabilities: Fiber;
  readonly office?: Office;
}): GovernanceDecision {
  const spec = input.mode.operations.find((entry) => sameTerm(entry.operation, input.operation))?.requirement ?? {};
  const req = requirements(spec);
  const provisions = input.office === undefined
    ? { capabilities: input.capabilities }
    : incumbentProvisions(input.capabilities, input.office);
  const readiness = dispatchReadiness(req, provisions);
  return Object.freeze({
    agent: input.agent,
    operation: input.operation,
    mode: input.mode.name,
    readiness,
    charge: decisionCharge(input.operation, readiness),
    eligible: readiness.ready,
  });
}

/**
 * The result of admitting a tool call: names the tool, carries the
 * authority-axis delta `readiness`, the paraconsistent decision `charge`, and
 * the `admitted` gate (readiness ready).
 */
export interface ToolAdmission {
  readonly tool: PredicationTerm;
  readonly readiness: DispatchReadiness;
  readonly charge: ChargeCarrier;
  readonly admitted: boolean;
}

/** Admit a tool call: the tool's `requires` are the authorities (scopes) it
 *  demands; `authorities` is what the caller holds. Admission is δ on the
 *  authority axis. */
export function admitTool(input: {
  readonly tool: PredicationTerm;
  readonly requires?: Fiber;
  readonly authorities: Fiber;
}): ToolAdmission {
  const req = requirements(input.requires === undefined ? {} : { authorities: input.requires });
  const readiness = dispatchReadiness(req, { authorities: input.authorities });
  return Object.freeze({
    tool: input.tool,
    readiness,
    charge: decisionCharge(input.tool, readiness),
    admitted: readiness.ready,
  });
}

/** Build the paraconsistent decision charge from the per-coordinate matches:
 *  provided → affirmed, missing → denied, contested (⊤) → both (held contradiction).
 *  No requirements → a lone affirmation that the act is unrestricted. */
function decisionCharge(subject: PredicationTerm, readiness: DispatchReadiness): ChargeCarrier {
  const evidence: ChargeCarrier[] = [];
  for (const m of [...readiness.capabilityMatches, ...readiness.authorityMatches]) {
    if (m.match === "potential") {
      evidence.push(witnessedPotential(decisionWitness(subject, m.coordinate, "provided")));
    } else if (m.match === "stable") {
      const witness = decisionWitness(subject, m.coordinate, "contested");
      evidence.push(witnessedPotential(witness));
      evidence.push(negate(witnessedPotential(witness)));
    } else {
      evidence.push(negate(witnessedPotential(decisionWitness(subject, m.coordinate, "missing"))));
    }
  }
  if (evidence.length === 0) evidence.push(witnessedPotential(unrestrictedDecisionWitness(subject)));
  return eligibilityCharge(evidence);
}

function decisionWitness(subject: PredicationTerm, coordinate: FiberCoordinate, reading: "provided" | "contested" | "missing") {
  return mark(Object.freeze(["animating", "governance-decision", subject, coordinate, reading] as const));
}

function unrestrictedDecisionWitness(subject: PredicationTerm) {
  return mark(Object.freeze(["animating", "governance-decision", subject, "unrestricted", "provided"] as const));
}

function sameTerm(left: PredicationTerm, right: PredicationTerm): boolean {
  return predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";
}
