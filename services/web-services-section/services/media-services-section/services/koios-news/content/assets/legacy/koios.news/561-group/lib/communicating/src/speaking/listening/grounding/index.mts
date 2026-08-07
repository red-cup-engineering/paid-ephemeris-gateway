/**
 * speaking/listening/grounding — common-ground carriers and update morphisms.
 *
 * A common ground is the communicative state participants treat as shared. It
 * grows by accepted assertions and refuses or removes propositions by challenge.
 */

/** The warrant by which a proposition is treated as shared. */
export type CommonGroundBasis =
  | "perceptual-co-presence"
  | "prior-discourse"
  | "community-membership"
  | "cultural-knowledge"
  | "accommodation";

/**
 * A proposition available for common-ground update.
 *
 * The proposition itself remains generic and opaque to this module; grounding
 * records uptake status, not the internal logic of the proposition.
 */
export interface CommonGroundProposition<Proposition = unknown> {
  readonly kind: "communicating.speaking.listening.grounding.proposition";
  readonly proposition: Proposition;
  readonly basis: CommonGroundBasis;
}

/** A finite common-ground state. */
export interface CommonGroundCarrier<Proposition = unknown> {
  readonly kind: "communicating.speaking.listening.grounding.commonGround";
  readonly propositions: readonly CommonGroundProposition<Proposition>[];
}

/**
 * A before/after common-ground morphism.
 *
 * The mode records whether the proposition was asserted, accommodated, or
 * challenged; the carrier records the resulting state.
 */
export interface CommonGroundUpdate<Proposition = unknown> {
  readonly kind: "communicating.speaking.listening.grounding.update";
  readonly before: CommonGroundCarrier<Proposition>;
  readonly after: CommonGroundCarrier<Proposition>;
  readonly proposition: CommonGroundProposition<Proposition>;
  readonly mode: "assertion" | "accommodation" | "challenge";
}

/** Construct a common-ground carrier from propositions already treated as shared. */
export const commonGround = <Proposition,>(
  propositions: readonly CommonGroundProposition<Proposition>[] = [],
): CommonGroundCarrier<Proposition> =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.commonGround" as const,
    propositions: Object.freeze([...propositions]),
  });

/** Construct a proposition with the basis by which it enters common ground. */
export const commonGroundProposition = <Proposition,>(
  proposition: Proposition,
  basis: CommonGroundBasis,
): CommonGroundProposition<Proposition> =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.proposition" as const,
    proposition,
    basis,
  });

const sameProposition = <Proposition,>(
  left: CommonGroundProposition<Proposition>,
  right: CommonGroundProposition<Proposition>,
): boolean => Object.is(left.proposition, right.proposition);

/** Add a proposition to common ground when it is not already present. */
export function assertIntoCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: CommonGroundProposition<Proposition>,
): CommonGroundUpdate<Proposition> {
  const propositions = carrier.propositions.some((item) => sameProposition(item, proposition))
    ? carrier.propositions
    : Object.freeze([...carrier.propositions, proposition]);
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update" as const,
    before: carrier,
    after: commonGround(propositions),
    proposition,
    mode: "assertion" as const,
  });
}

/** Add a proposition by accommodation rather than prior explicit assertion. */
export function accommodateCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: Proposition,
): CommonGroundUpdate<Proposition> {
  const accommodated = commonGroundProposition(proposition, "accommodation");
  const update = assertIntoCommonGround(carrier, accommodated);
  return Object.freeze({ ...update, mode: "accommodation" as const });
}

/** Remove a proposition from common ground by challenge. */
export function challengeCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: CommonGroundProposition<Proposition>,
): CommonGroundUpdate<Proposition> {
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update" as const,
    before: carrier,
    after: commonGround(carrier.propositions.filter((item) => !sameProposition(item, proposition))),
    proposition,
    mode: "challenge" as const,
  });
}
