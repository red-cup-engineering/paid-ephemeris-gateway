/**
 * assignment — the unit of work an office holds.
 *
 * Theory: PredWork `assignment.md`. The load-bearing fact: assignment is
 * **`to-office`, never to a session or agent directly**. The session, *qua* the
 * office's current incumbent, picks up work by walking the office's in-edges on
 * `to-office`. The session never owns work; the office owns work, and the session
 * is the current body natural. This is what replaces the per-model work board:
 * "which model does it go to" is not a routing field on the work — it is derived
 * from δ-readiness of whoever holds the office the work is assigned to.
 *
 * The assignment carries the requirement fibers δ-dispatch reads: the capabilities
 * and authorities the work demands.
 */

import { charge, chargeValue, mark, type ChargeCarrier, type PredicationTerm } from "@emsenn/relating";
import { requirements, type WorkRequirements } from "./dispatch.mjs";

/**
 * The lifecycle reading of an assignment. A potential charge is open; later
 * claim/discharge events add evidence in the ordinary bilattice.
 */
export type AssignmentStatus = ChargeCarrier;

/**
 * A unit of work owned by an office: identified by a predication term,
 * addressed to an office term via toOffice, carrying the capability and
 * authority requirement fibers δ-dispatch reads, and a lifecycle charge. Work
 * is assigned to-office and never to a session or agent directly.
 */
export interface Assignment {
  readonly term: PredicationTerm;
  readonly toOffice: PredicationTerm;
  readonly requirements: WorkRequirements;
  readonly status: AssignmentStatus;
}

/** Construct an assignment to an office from admitted requirement fibers. */
export function assignment(input: {
  readonly term: PredicationTerm;
  readonly toOffice: PredicationTerm;
  readonly requirements?: WorkRequirements;
  readonly status?: AssignmentStatus;
}): Assignment {
  return Object.freeze({
    term: input.term,
    toOffice: input.toOffice,
    requirements: requirements(input.requirements ?? {}),
    status: input.status ?? charge(chargeValue("potential"), [[mark(Object.freeze(["animating", "assignment", input.term, "open"] as const))], []]),
  });
}
