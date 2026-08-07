/**
 * speaking/illocuting — speech acts as locution, illocution, and perlocution.
 *
 * The surface names saying-as-doing directly: a locution carries form, sense,
 * and reference; an illocution gives force to propositional content; a
 * perlocution records the effected interpretant or common-ground movement.
 */

import { articulateCommunication, communicationDocument, type CommunicatingCarrier } from "../listening/parsing/index.mjs";
import type { ArticulateResult, CompiledBundle } from "../listening/parsing/index.mjs";

/** The force with which a locution is taken as an act. */
export type IllocutionaryForce =
  | "assertive"
  | "directive"
  | "commissive"
  | "expressive"
  | "declaration";

/**
 * The saying of a communicative form.
 *
 * A locution carries the surface form, the articulated sense read from it, and
 * the admitted communication carrier it came from.
 */
export interface LocutionaryAct {
  readonly kind: "communicating.speaking.illocuting.locution";
  readonly form: string;
  readonly sense: ArticulateResult;
  readonly reference: CommunicatingCarrier;
}

/** A locution supplied with force and propositional content. */
export interface IllocutionaryAct<Proposition = unknown> {
  readonly kind: "communicating.speaking.illocuting.illocution";
  readonly locution: LocutionaryAct;
  readonly force: IllocutionaryForce;
  readonly proposition: Proposition;
}

/** The effected uptake or consequence of an illocution. */
export interface PerlocutionaryAct<Proposition = unknown, Effect = unknown> {
  readonly kind: "communicating.speaking.illocuting.perlocution";
  readonly illocution: IllocutionaryAct<Proposition>;
  readonly effect: Effect;
}

/** The composite speech-act carrier: locution, illocution, and perlocution. */
export interface SpeechActCarrier<Proposition = unknown, Effect = unknown> {
  readonly kind: "communicating.speaking.illocuting.speechAct";
  readonly locution: LocutionaryAct;
  readonly illocution: IllocutionaryAct<Proposition>;
  readonly perlocution: PerlocutionaryAct<Proposition, Effect>;
}

/** Read an admitted communication carrier as a locutionary act. */
export function locute(carrier: CommunicatingCarrier, bundle: CompiledBundle): LocutionaryAct {
  const form = communicationDocument(carrier);
  if (form === null) throw new TypeError("locute: carrier token is not a communicating.document mark");
  return Object.freeze({
    kind: "communicating.speaking.illocuting.locution" as const,
    form,
    sense: articulateCommunication(carrier, bundle),
    reference: carrier,
  });
}

/** Give illocutionary force to a locution. */
export const illocute = <Proposition,>(
  locution: LocutionaryAct,
  force: IllocutionaryForce,
  proposition: Proposition,
): IllocutionaryAct<Proposition> =>
  Object.freeze({
    kind: "communicating.speaking.illocuting.illocution" as const,
    locution,
    force,
    proposition,
  });

/** Record the perlocutionary effect of an illocution. */
export const perlocute = <Proposition, Effect>(
  illocution: IllocutionaryAct<Proposition>,
  effect: Effect,
): PerlocutionaryAct<Proposition, Effect> =>
  Object.freeze({
    kind: "communicating.speaking.illocuting.perlocution" as const,
    illocution,
    effect,
  });

/** Compose locution, illocution, and perlocution into one speech-act carrier. */
export function speechAct<Proposition, Effect>(
  locution: LocutionaryAct,
  force: IllocutionaryForce,
  proposition: Proposition,
  effect: Effect,
): SpeechActCarrier<Proposition, Effect> {
  const illocution = illocute(locution, force, proposition);
  return Object.freeze({
    kind: "communicating.speaking.illocuting.speechAct" as const,
    locution,
    illocution,
    perlocution: perlocute(illocution, effect),
  });
}

/** Admit a communicating carrier directly into a complete speech act. */
export function performSpeechAct<Proposition, Effect>(
  carrier: CommunicatingCarrier,
  force: IllocutionaryForce,
  proposition: Proposition,
  effect: Effect,
  bundle: CompiledBundle,
): SpeechActCarrier<Proposition, Effect> {
  return speechAct(locute(carrier, bundle), force, proposition, effect);
}
