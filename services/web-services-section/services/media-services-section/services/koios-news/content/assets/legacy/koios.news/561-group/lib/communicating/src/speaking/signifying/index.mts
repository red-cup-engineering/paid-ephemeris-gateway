/**
 * speaking/signifying — semiotic carriers for spoken communication.
 *
 * A sign relation is triadic: vehicle, object, interpretant. Semiosis advances
 * by taking an interpretant as a further sign-vehicle for the same object in a
 * semiosphere. The semiosphere boundary is a translation mechanism, not a codec.
 */

/**
 * A triadic sign relation.
 *
 * Domain data are kept generic because signification can be read over marks,
 * utterances, parses, external documents, or application objects. The carrier
 * only asserts the Peircean relation: vehicle stands for object to an
 * interpretant.
 */
export interface SignRelationCarrier<Vehicle = unknown, Object = unknown, Interpretant = unknown> {
  readonly kind: "communicating.speaking.signifying.signRelation";
  readonly vehicle: Vehicle;
  readonly object: Object;
  readonly interpretant: Interpretant;
}

/**
 * One semiosis step.
 *
 * The prior interpretant becomes the next sign vehicle while the object is
 * preserved. This is the categorical successor step of signification, not a
 * text generation operation.
 */
export interface SemiosisStepCarrier<
  Prior extends SignRelationCarrier = SignRelationCarrier,
  Next extends SignRelationCarrier = SignRelationCarrier,
> {
  readonly kind: "communicating.speaking.signifying.semiosisStep";
  readonly prior: Prior;
  readonly next: Next;
}

/** A named semiotic domain within which sign relations are interpreted. */
export interface SemiosphereCarrier {
  readonly kind: "communicating.speaking.signifying.semiosphere";
  readonly name: string;
}

/**
 * A translation from an external object into a sign relation in a semiosphere.
 *
 * This is a semantic boundary carrier. It deliberately does not claim to be a
 * byte codec or a lossless serialization.
 */
export interface SemiosphereBoundaryTranslation<External = unknown, Internal extends SignRelationCarrier = SignRelationCarrier> {
  readonly kind: "communicating.speaking.signifying.semiosphereBoundaryTranslation";
  readonly semiosphere: SemiosphereCarrier;
  readonly external: External;
  readonly internal: Internal;
}

/** Construct a semiosphere carrier. */
export const semiosphere = (name: string): SemiosphereCarrier =>
  Object.freeze({ kind: "communicating.speaking.signifying.semiosphere" as const, name });

/** Construct a sign relation from vehicle, object, and interpretant. */
export const signRelation = <Vehicle, Object, Interpretant>(
  vehicle: Vehicle,
  object: Object,
  interpretant: Interpretant,
): SignRelationCarrier<Vehicle, Object, Interpretant> =>
  Object.freeze({
    kind: "communicating.speaking.signifying.signRelation" as const,
    vehicle,
    object,
    interpretant,
  });

/** Advance semiosis by making the prior interpretant the next vehicle. */
export function advanceSemiosis<Vehicle, Object, Interpretant, NextInterpretant>(
  prior: SignRelationCarrier<Vehicle, Object, Interpretant>,
  interpretant: NextInterpretant,
): SemiosisStepCarrier<
  SignRelationCarrier<Vehicle, Object, Interpretant>,
  SignRelationCarrier<Interpretant, Object, NextInterpretant>
> {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosisStep" as const,
    prior,
    next: signRelation(prior.interpretant, prior.object, interpretant),
  });
}

/** Apply a boundary translation into a semiosphere and carry both sides. */
export function translateAcrossSemiosphereBoundary<External, Vehicle, Object, Interpretant>(
  sphere: SemiosphereCarrier,
  external: External,
  translate: (external: External) => SignRelationCarrier<Vehicle, Object, Interpretant>,
): SemiosphereBoundaryTranslation<External, SignRelationCarrier<Vehicle, Object, Interpretant>> {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosphereBoundaryTranslation" as const,
    semiosphere: sphere,
    external,
    internal: translate(external),
  });
}
