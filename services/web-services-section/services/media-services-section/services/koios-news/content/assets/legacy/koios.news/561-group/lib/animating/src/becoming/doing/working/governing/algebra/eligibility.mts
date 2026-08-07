/**
 * eligibility — governance's deontic charge algebra.
 *
 * A governance decision is not a boolean gate. Each requirement an operation
 * places on an agent (a skill held, an office occupied, an incumbency uncontested)
 * is a piece of evidence carrying a bilattice charge; the decision is the
 * knowledge-join of those charges, settled into one decision charge whose value
 * names the outcome (the-ways #3, contradiction is load-bearing; #8, running is
 * settling).
 *
 * This is the domain algebra the orchestrator must *consume*, not recompute. It
 * lives here on the one descent (`@emsenn/relating`), never on a private engine.
 * Former orchestration code that aggregated these charges belongs here once it
 * can be stated as this eligibility morphism.
 */

import { bottom, joinKnowledge, valueOf, type ChargeCarrier, type ChargeValueName } from "@emsenn/relating";

/**
 * Aggregate the evidence charges for an eligibility judgment into one decision
 * charge by knowledge-join. The identity is `bottom` (no evidence either way),
 * so an empty requirement set settles to no-evidence — never to a spurious
 * affirmation. Conflicting evidence (an affirmation and a denial of the same
 * requirement) settles to the held contradiction (`stable`, ⊤), surfaced rather
 * than thrown.
 */
export function eligibilityCharge(charges: readonly ChargeCarrier[]): ChargeCarrier {
  return charges.reduce<ChargeCarrier>((left, right) => joinKnowledge(left, right), bottom);
}

/** The settled value name of a charge — the office/decision status. */
export function chargeStatus(charge: ChargeCarrier): ChargeValueName {
  return valueOf(charge).name;
}

/**
 * An incumbency is contested when its charge is anything but plain `potential`
 * (token given, claim not yet contradicted): `active` (denied), `stable` (held
 * contradiction ⊤), or `absurd` (no evidence). Only `potential` is an
 * uncontested hold.
 */
export function isContested(charge: ChargeCarrier): boolean {
  return chargeStatus(charge) !== "potential";
}
