/**
 * Event / event-structure codec — the polarized prime event structures that
 * are the objects of $\mathbf{CGS}$ before symmetry.
 *
 * An event is `{id, polarity}`; a prime event structure $(E, \leq, \#)$ is a
 * list of events plus causality and conflict edge lists.  Edges are ordered
 * pairs `[from, to]`, serialized as two-element string arrays.  Decode reuses
 * the `event` and `eventStructure` constructors, so the result is a real frozen
 * carrier with the same edge normalization the algebra applies.
 */
import { event, eventStructure } from "../index.mjs";
import type { Event, EventPair, PrimeEventStructure } from "../index.mjs";
import { asArray, asObject, asString, field } from "./json.mjs";
import type { Json } from "./json.mjs";
import { decodePolarity, encodePolarity } from "./polarity.mjs";

/** Encode an event to `{id, polarity}`. */
export function encodeEvent(value: Event): Json {
  return { id: value.id, polarity: encodePolarity(value.polarity) };
}

/** Decode `{id, polarity}` back to the frozen `Event`. */
export function decodeEvent(json: unknown): Event {
  const obj = asObject(json, "event");
  const id = asString(field(obj, "id", "event"), "event.id");
  return event(id, decodePolarity(field(obj, "polarity", "event")));
}

function encodePair(pair: EventPair): Json {
  return [pair[0], pair[1]];
}

function decodePair(json: unknown, what: string): EventPair {
  const arr = asArray(json, what);
  if (arr.length !== 2) {
    throw new TypeError(`game-codecs: expected 2-element ${what}, got length ${arr.length}`);
  }
  return [asString(arr[0], `${what}.from`), asString(arr[1], `${what}.to`)] as const;
}

/** Encode a prime event structure to `{events, causality, conflict}`. */
export function encodeEventStructure(value: PrimeEventStructure): Json {
  return {
    events: value.events.map(encodeEvent),
    causality: value.causality.map(encodePair),
    conflict: value.conflict.map(encodePair),
  };
}

/** Decode `{events, causality, conflict}` back to the frozen `PrimeEventStructure`. */
export function decodeEventStructure(json: unknown): PrimeEventStructure {
  const obj = asObject(json, "eventStructure");
  const events = asArray(field(obj, "events", "eventStructure"), "eventStructure.events").map(decodeEvent);
  const causality = asArray(field(obj, "causality", "eventStructure"), "eventStructure.causality").map(
    (p) => decodePair(p, "causality"),
  );
  const conflict = asArray(field(obj, "conflict", "eventStructure"), "eventStructure.conflict").map(
    (p) => decodePair(p, "conflict"),
  );
  return eventStructure(events, causality, conflict);
}

/** Encode a single `[from, to]` edge pair (shared by arena symmetry codecs). */
export { encodePair as encodeEventPair, decodePair as decodeEventPair };
