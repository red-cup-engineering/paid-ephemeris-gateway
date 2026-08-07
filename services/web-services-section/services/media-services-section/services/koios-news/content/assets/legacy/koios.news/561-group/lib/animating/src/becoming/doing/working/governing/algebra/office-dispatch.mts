/**
 * office-dispatch — readiness of an office's incumbent for the work the office holds.
 *
 * This is where the per-model work board is *derived away*. There is no board and
 * no routing string. Given the office a piece of work is assigned to, the agent
 * currently holding that office, and the work's requirement fibers, readiness is
 * the δ-residuation already defined in `./dispatch.mjs` — nothing is recomputed here.
 *
 * The one piece of governance content this module adds is **capability
 * propagation** (per `office-as-double-settlement.md` §"Connection to capability
 * fiber bundle"): the incumbent's provisions are the agent's own *capabilities*
 * joined with the office's conferred *authorities*. The agent brings what it can
 * do; the office confers what it may do. δ then conjoins the capability match and
 * the authority match exactly as before — and the partial-match states stay
 * diagnosable: a capability gap calls for grant/training of the agent, an
 * authority gap for delegation/installation into a fuller office.
 */

import { chargeValueName, predicationTermIdentity, valueOf, type PredicationTerm } from "@emsenn/relating";
import type { AgentProvisions, Fiber } from "../../../algebra/index.mjs";
import { dispatchReadiness, type DispatchReadiness } from "./dispatch.mjs";
import type { Office } from "./office.mjs";
import type { Assignment } from "./assignment.mjs";

/** The incumbent's provisions: capabilities from the agent (body natural),
 *  authorities from the office (body politic). Capability propagation made concrete. */
export function incumbentProvisions(agentCapabilities: Fiber, office: Office): AgentProvisions {
  return Object.freeze({ capabilities: agentCapabilities, authorities: office.authorities });
}

/**
 * An open assignment paired with the office-holder's δ readiness for it:
 * `assignment` is the work, `readiness` the dispatch result of conjoining the
 * work's requirements against the incumbent's provisions.
 */
export interface RankedAssignment {
  readonly assignment: Assignment;
  readonly readiness: DispatchReadiness;
}

/** δ(incumbent, assignment): readiness of the office-holding agent for the work. */
export function assignmentReadiness(
  assignment: Assignment,
  agentCapabilities: Fiber,
  office: Office,
): DispatchReadiness {
  return dispatchReadiness(assignment.requirements, incumbentProvisions(agentCapabilities, office));
}

/** Open work the office holds — `toOffice` matches the office term, and the status charge is potential. */
export function openAssignmentsForOffice(
  assignments: readonly Assignment[],
  officeTerm: PredicationTerm,
): Assignment[] {
  return assignments.filter((a) =>
    predicationTermIdentity(a.toOffice, officeTerm).kind === "predication.termIdentity:witness"
    && chargeValueName(valueOf(a.status)) === "potential");
}

/** Sort key: ready first, then single-axis gaps, then double gaps, contested last.
 *  A contested (⊤) match is a disqualification witness, not a near-miss — it sinks. */
function rankOf(readiness: DispatchReadiness): number {
  if (readiness.ready) return 0;
  if (readiness.contested) return 4;
  if (readiness.gap === "both") return 3;
  return 2;
}

/** All open office work, each annotated with its δ readiness, ready-first.
 *  This is the office-derived replacement for "list the open items on your board". */
export function readyWork(
  assignments: readonly Assignment[],
  office: Office,
  agentCapabilities: Fiber,
): RankedAssignment[] {
  const open = openAssignmentsForOffice(assignments, office.term);
  const ranked = open.map((assignment) => ({
    assignment,
    readiness: assignmentReadiness(assignment, agentCapabilities, office),
  }));
  return ranked.sort((a, b) => rankOf(a.readiness) - rankOf(b.readiness));
}
