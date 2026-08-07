/**
 * office — the body politic that holds work, as one richer office fiber.
 *
 * Theory: PredGov `office-as-double-settlement.md`. An office is, fully, a
 * double-settlement entity: structural cells (normative-structure, action-domain,
 * deontic-profile) plus two required predicates (recognition, induction) whose
 * joint affirmation is *dignitas*. That settling structure — installation over
 * stages, dignitas, succession ("dignitas non moritur") — is the governance
 * *topology* and lives in the layer above.
 *
 * This algebra slice keeps the office's structural cells plus what δ-dispatch
 * reads: the **authority fiber** (the deontic profile — authorities transferred to
 * whoever currently holds the office; per capability propagation, when dignitas
 * settles the office's profile becomes the incumbent's), alongside the office
 * term, forward duties, structural capability section, and evidence carriers.
 * The agent (body natural) brings its own *capabilities*; the office (body
 * politic) confers *authorities*.
 */

import type { PredicationTerm } from "@emsenn/relating";
import { fiber, type Fiber } from "../../../algebra/index.mjs";
import type { DutyName, WorkEvidenceCarrier } from "../../algebra/index.mjs";

/**
 * An office as one richer fiber - the body politic, holding the structural
 * cells δ-dispatch reads: its predication term, the authority fiber (deontic
 * profile transferred to the current incumbent), optional forward duties (munus
 * axis), the office's capability section, and evidence carriers.
 */
export interface Office {
  readonly term: PredicationTerm;
  /** The office's deontic profile as an authority fiber — each authority a
   *  `potential` provision transferred to the current incumbent (δ-dispatch). */
  readonly authorities: Fiber;
  /** Forward obligations the office carries (structural; *munus* axis). */
  readonly duties?: readonly DutyName[];
  /** The office's capability section — structural evidence about what the seat is for. */
  readonly capabilities?: Fiber;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}

/**
 * Inputs to the office constructor: the authority fiber the office confers,
 * forward duties, the capability section, and evidence carriers.
 */
export interface OfficeOptions {
  /** Authority fiber the office confers. */
  readonly authorities?: Fiber;
  readonly duties?: readonly DutyName[];
  readonly capabilities?: Fiber;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}

/** Construct an office from a predication term and what it carries. The authority fiber is built
 *  through the canonical fiber builder — an office *provisions* authorities, exactly
 *  as an agent provisions capabilities. An office with no `authorities` has an empty
 *  fiber (reads `absurd` downstream — confers nothing). */
export function office(term: PredicationTerm, options: OfficeOptions = {}): Office {
  return Object.freeze({
    term,
    authorities: options.authorities === undefined ? fiber() : fiber(options.authorities),
    ...(options.duties === undefined ? {} : { duties: Object.freeze([...options.duties]) }),
    ...(options.capabilities === undefined ? {} : { capabilities: options.capabilities }),
    ...(options.evidence === undefined ? {} : { evidence: Object.freeze([...options.evidence]) }),
  });
}
