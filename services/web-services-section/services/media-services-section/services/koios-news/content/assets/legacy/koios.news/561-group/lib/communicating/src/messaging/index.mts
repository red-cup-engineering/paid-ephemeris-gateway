/**
 * messaging — message passing as a communicating capability, downstream of
 * @emsenn/relating-experimental and grounded in the research corpus.
 *
 * The corpus fixes the ontology (and a message is NOT an utterance — it is richer,
 * built atop relating's outputs):
 *   - Channel (Information › Terms › Channel): "a medium through which something
 *     travels"; *requires directed-relation*; has capacity/noise; `delivered-via`
 *     is a predicate. A channel is a directed relation between semiospheres.
 *   - Resource-sensitivity (Information › Texts): relating is LINEAR logic —
 *     "using a premise consumes it." So a message is a linear RESOURCE: produced
 *     by a speaker, carried by a channel, and CONSUMED once on receipt. This is
 *     the richer structure utterances lack.
 *   - Predication-as-residuation: the speaker extends (`⊙`, generative) and the
 *     listener restricts (`⇒`, interpretive) — the two residual endpoints.
 *
 * Content is admitted through communicating's own articulation (the package
 * articulates its OWN data); relating injects only the Mark, and the message's
 * epistemic charge lives in relating's four-valued bilattice (potential in
 * transit, active once taken up).
 */
import { charge, chargeValue, valueOf, witnessedPotential, mark, type ChargeCarrier } from "@emsenn/relating-experimental";

import { semiosphere, type SemiosphereCarrier } from "../speaking/signifying/index.mjs";
import { admitCommunication, articulateCommunication, type ArticulateResult } from "../speaking/listening/parsing/index.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { read, type Reading } from "../holography/index.mjs";

/** A speaker: the extending (`⊙`, generative) endpoint of a channel. */
export interface SpeakerCarrier {
  readonly kind: "communicating.messaging.speaker";
  readonly name: string;
  readonly semiosphere: SemiosphereCarrier;
}

/** A listener: the restricting (`⇒`, interpretive) endpoint of a channel. */
export interface ListenerCarrier {
  readonly kind: "communicating.messaging.listener";
  readonly name: string;
  readonly semiosphere: SemiosphereCarrier;
}

/** A channel: a directed relation between semiospheres, a medium with capacity.
 *  The channel shapes what travels; it does not create it. */
export interface ChannelCarrier {
  readonly kind: "communicating.messaging.channel";
  readonly medium: string;
  readonly from: SemiosphereCarrier;
  readonly to: SemiosphereCarrier;
  /** capacity in marks per delivery; null = unbounded (Shannon idealization). */
  readonly capacity: number | null;
}

/** A message's linear status: a resource is sent once and received (consumed) once. */
export type MessageStatus = "sent" | "received";

/** A message: a linear resource carried `delivered-via` a channel from speaker to
 *  listener. Its content is an admitted communicating articulation, not a bare
 *  utterance; its charge is the message's epistemic value in the bilattice. */
export interface MessageCarrier {
  readonly kind: "communicating.messaging.message";
  readonly text: string;
  readonly content: ArticulateResult;
  readonly speaker: SpeakerCarrier;
  readonly listener: ListenerCarrier;
  readonly channel: ChannelCarrier;
  readonly status: MessageStatus;
  readonly charge: ChargeCarrier;
}

/** A listener's uptake: the reading the restricting endpoint settles from a
 *  received message, with the message it consumed and the now-active charge. */
export interface UptakeCarrier {
  readonly kind: "communicating.messaging.uptake";
  readonly consumed: MessageCarrier;
  readonly reading: Reading;
  readonly charge: ChargeCarrier;
}

/** Construct a speaker bound to a semiosphere (its own by default). */
export const speaker = (name: string, within: SemiosphereCarrier = semiosphere(name)): SpeakerCarrier =>
  Object.freeze({ kind: "communicating.messaging.speaker" as const, name, semiosphere: within });

/** Construct a listener bound to a semiosphere (its own by default). */
export const listener = (name: string, within: SemiosphereCarrier = semiosphere(name)): ListenerCarrier =>
  Object.freeze({ kind: "communicating.messaging.listener" as const, name, semiosphere: within });

/** Open a channel: a directed relation between two semiospheres. */
export function openChannel(
  medium: string,
  from: SemiosphereCarrier,
  to: SemiosphereCarrier,
  capacity: number | null = null,
): ChannelCarrier {
  return Object.freeze({ kind: "communicating.messaging.channel" as const, medium, from, to, capacity });
}

/** A channel for a speaker→listener pair, named for its medium. */
export const channelBetween = (medium: string, from: SpeakerCarrier, to: ListenerCarrier, capacity: number | null = null): ChannelCarrier =>
  openChannel(medium, from.semiosphere, to.semiosphere, capacity);

/** Whether a channel admits a text without exceeding its capacity. */
export const withinCapacity = (channel: ChannelCarrier, text: string): boolean =>
  channel.capacity === null || text.length <= channel.capacity;

/**
 * Send a message: the speaker extends a content into a linear resource in transit.
 *
 * The content is admitted and articulated through communicating's own surface; the
 * charge is `potential` (witnessed by the speaker) until the listener takes it up.
 * Throws if the channel's capacity cannot carry the content.
 */
export function sendMessage(
  speakerOf: SpeakerCarrier,
  listenerOf: ListenerCarrier,
  channel: ChannelCarrier,
  text: string,
  bundle: CompiledBundle,
): MessageCarrier {
  if (!withinCapacity(channel, text)) {
    throw new RangeError(`channel ${JSON.stringify(channel.medium)} capacity ${channel.capacity} cannot carry ${text.length} marks`);
  }
  return Object.freeze({
    kind: "communicating.messaging.message" as const,
    text,
    content: articulateCommunication(admitCommunication(text.trim()), bundle),
    speaker: speakerOf,
    listener: listenerOf,
    channel,
    status: "sent" as const,
    charge: witnessedPotential(mark(speakerOf.name)),
  });
}

/**
 * Receive a message: the listener restricts the in-transit resource to an uptake,
 * CONSUMING it. Linearity is enforced — receiving an already-received message
 * throws, because the resource was spent on first use.
 */
export function receiveMessage(message: MessageCarrier, bundle: CompiledBundle): UptakeCarrier {
  if (message.status === "received") {
    throw new TypeError("receiveMessage: this message is a spent resource (already received once)");
  }
  return Object.freeze({
    kind: "communicating.messaging.uptake" as const,
    consumed: Object.freeze({ ...message, status: "received" as const, charge: charge(chargeValue("active")) }),
    reading: read(message.text.trim(), bundle),
    charge: charge(chargeValue("active")),
  });
}

/** The bilattice value name of a message's charge (potential in transit, active taken up). */
export const messageChargeName = (message: MessageCarrier): string => valueOf(message.charge).name;
