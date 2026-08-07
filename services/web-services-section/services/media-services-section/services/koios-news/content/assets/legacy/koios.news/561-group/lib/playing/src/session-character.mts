/**
 * session-character - read one agent-session as a performed character.
 *
 * A session self is not stored in an actor record. It is reconstructed from the
 * chronicle of what the session did: the plays yield the actor, the actor wears
 * masks at situation addresses, and role-distance/persona-shadow are read only
 * relative to a supplied troupe and universe.
 *
 * `playing` intentionally does not import `animating`: the dependency graph runs
 * the other way. Callers inject the animating interior, or inject the `perceive`
 * leg so this module can fold events append-only with prior events as memory.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";
import { characterAgent, identity, performedSelf, type CharacterAgent } from "./character-agent.mjs";
import { mask, performativity, personaShadow, roleDistance, type Performativity, type PersonaShadow, type RoleDistance } from "./persona.mjs";
import { designFromActionSet, type Chronicle } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import type { Design } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";
import type { Discipline } from "./discipline.mjs";
import type { Skill } from "./skill.mjs";

const optionalString = { type: "string", minLength: 1 } as const;
const addressSchema = { type: "array", items: { type: "integer", minimum: 0 } } as const;
const looseObjectSchema = { type: "object", additionalProperties: true } as const;

export const sessionEventWitnessSchema = {
  $id: "playing/session-character/event-witness",
  title: "SessionEventWitness",
  description:
    "One witnessed event in a session chronicle. The chronicle is the play carried by the event; harness/lane/office provide mask labels.",
  type: "object",
  additionalProperties: true,
  required: ["kind", "session", "chronicle"],
  properties: {
    kind: { const: "playing.session-character.event:witness" },
    session: optionalString,
    chronicle: looseObjectSchema,
    harness: optionalString,
    via: optionalString,
    lane: optionalString,
    office: optionalString,
  },
} as const;
export type SessionEventWitnessCarrier = FromSchema<typeof sessionEventWitnessSchema>;
export type SessionEventWitness = SessionEventWitnessCarrier & {
  readonly chronicle: Chronicle;
};
export const sessionEventWitnessCarrier = carrierFrom(sessionEventWitnessSchema);

export const sessionMaskSchema = {
  $id: "playing/session-character/mask",
  title: "SessionMask",
  description:
    "A session mask: the reconstructed actor delocated at a harness, lane, or office address.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "axis", "label", "at", "persona"],
  properties: {
    kind: { const: "playing.session-character.mask" },
    axis: { enum: ["harness", "lane", "office"] },
    label: optionalString,
    at: addressSchema,
    persona: looseObjectSchema,
  },
} as const;
export type SessionMaskCarrier = FromSchema<typeof sessionMaskSchema>;
export type SessionMask = Omit<SessionMaskCarrier, "persona"> & {
  readonly persona: Design;
};
export const sessionMaskCarrier = carrierFrom(sessionMaskSchema);

export const sessionSituationSchema = {
  $id: "playing/session-character/situation",
  title: "SessionSituationReading",
  description:
    "A parameterized reading of one reconstructed actor before a troupe and universe.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "personaShadow", "roleDistance"],
  properties: {
    kind: { const: "playing.session-character.situation" },
    name: optionalString,
    personaShadow: looseObjectSchema,
    roleDistance: looseObjectSchema,
  },
} as const;
export type SessionSituationCarrier = FromSchema<typeof sessionSituationSchema>;
export type SessionSituationReading = Omit<SessionSituationCarrier, "personaShadow" | "roleDistance"> & {
  readonly personaShadow: PersonaShadow;
  readonly roleDistance: RoleDistance;
};
export const sessionSituationCarrier = carrierFrom(sessionSituationSchema);

export const sessionCharacterReadingSchema = {
  $id: "playing/session-character/reading",
  title: "SessionCharacterReading",
  description:
    "The performed character reading of one session: animating interior, masks, character-agent bundle, and situation-sensitive moat readings.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "name",
    "events",
    "folds",
    "actor",
    "interior",
    "masks",
    "character",
    "performativity",
    "performedSelf",
    "identity",
    "baseline",
    "situation",
  ],
  properties: {
    kind: { const: "playing.session-character.reading" },
    name: optionalString,
    events: { type: "integer", minimum: 0 },
    folds: { type: "integer", minimum: 0 },
    actor: looseObjectSchema,
    interior: looseObjectSchema,
    masks: { type: "array", items: { $ref: "playing/session-character/mask" } },
    character: looseObjectSchema,
    performativity: looseObjectSchema,
    performedSelf: looseObjectSchema,
    identity: looseObjectSchema,
    baseline: { $ref: "playing/session-character/situation" },
    situation: { $ref: "playing/session-character/situation" },
  },
} as const;
export type SessionCharacterReadingCarrier = FromSchema<typeof sessionCharacterReadingSchema>;
export type SessionCharacterReading<Interior extends object = object> =
  Omit<
    SessionCharacterReadingCarrier,
    "actor" | "interior" | "masks" | "character" | "performativity" | "performedSelf" | "identity" | "baseline" | "situation"
  > & {
    readonly actor: Design;
    readonly interior: Interior;
    readonly masks: readonly SessionMask[];
    readonly character: CharacterAgent;
    readonly performativity: Performativity;
    readonly performedSelf: ReturnType<typeof performedSelf>;
    readonly identity: ReturnType<typeof identity>;
    readonly baseline: SessionSituationReading;
    readonly situation: SessionSituationReading;
  };
export const sessionCharacterReadingCarrier = carrierFrom(sessionCharacterReadingSchema);

export interface PerceiveFoldOptions {
  readonly identity: string;
}

export type SessionPerceive<Interior extends object> = (
  input: readonly SessionEventWitness[],
  memory: readonly SessionEventWitness[] | undefined,
  options: PerceiveFoldOptions,
) => Interior;

export interface SessionCharacterOptions<Interior extends object> {
  readonly name?: string;
  readonly interior?: Interior;
  readonly perceive?: SessionPerceive<Interior>;
  readonly disciplines?: readonly Discipline[];
  readonly skills?: readonly Skill[];
  readonly baselineUniverse?: readonly Design[];
}

const MASK_BASE: Readonly<Record<SessionMask["axis"], number>> = Object.freeze({
  harness: 1,
  lane: 2,
  office: 3,
});

function actorFromChronicle(events: readonly SessionEventWitness[]): Design {
  return designFromActionSet(events.flatMap((event) => [...event.chronicle.actions]));
}

function newestLabel(
  events: readonly SessionEventWitness[],
  read: (event: SessionEventWitness) => string | undefined,
  fallback: string,
): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const label = read(events[index]!);
    if (label !== undefined && label.trim() !== "") return label.trim();
  }
  return fallback;
}

function sessionName(events: readonly SessionEventWitness[], optionsName: string | undefined): string {
  if (optionsName !== undefined && optionsName.trim() !== "") return optionsName.trim();
  return newestLabel(events, (event) => event.session, "session");
}

function addressFor(axis: SessionMask["axis"], label: string): readonly number[] {
  const normalized = label.trim().toLowerCase();
  const suffix = [...normalized].map((char) => char.codePointAt(0) ?? 0);
  return Object.freeze([MASK_BASE[axis], ...(suffix.length === 0 ? [0] : suffix)]);
}

export function sessionMasks(actor: Design, events: readonly SessionEventWitness[]): readonly SessionMask[] {
  const specs: readonly { readonly axis: SessionMask["axis"]; readonly label: string }[] = Object.freeze([
    { axis: "harness", label: newestLabel(events, (event) => event.harness ?? event.via, "unknown-harness") },
    { axis: "lane", label: newestLabel(events, (event) => event.lane, "unknown-lane") },
    { axis: "office", label: newestLabel(events, (event) => event.office, "unknown-office") },
  ]);
  return Object.freeze(specs.map(({ axis, label }) => {
    const at = addressFor(axis, label);
    return Object.freeze({
      kind: "playing.session-character.mask" as const,
      axis,
      label,
      at,
      persona: mask(actor, at),
    });
  }));
}

export function foldSessionInterior<Interior extends object>(
  events: readonly SessionEventWitness[],
  perceive: SessionPerceive<Interior>,
  options: PerceiveFoldOptions,
): { readonly interior: Interior; readonly folds: number } {
  if (events.length === 0) {
    return Object.freeze({ interior: perceive(Object.freeze([]), undefined, options), folds: 1 });
  }
  const memory: SessionEventWitness[] = [];
  let interior: Interior | undefined;
  for (const event of events) {
    interior = perceive(Object.freeze([event]), memory.length === 0 ? undefined : Object.freeze([...memory]), options);
    memory.push(event);
  }
  return Object.freeze({ interior: interior!, folds: events.length });
}

function injectedInterior<Interior extends object>(
  events: readonly SessionEventWitness[],
  options: SessionCharacterOptions<Interior>,
  identityName: string,
): { readonly interior: Interior; readonly folds: number } {
  if (options.interior !== undefined) return Object.freeze({ interior: options.interior, folds: events.length });
  if (options.perceive !== undefined) {
    return foldSessionInterior(events, options.perceive, { identity: identityName });
  }
  throw new TypeError("session-character: inject an animating interior or a perceive fold");
}

function situationReading(
  name: string,
  actor: Design,
  troupe: readonly Design[],
  universe: readonly Design[],
): SessionSituationReading {
  return Object.freeze({
    kind: "playing.session-character.situation" as const,
    name,
    personaShadow: personaShadow(actor, troupe, universe),
    roleDistance: roleDistance(actor, troupe, universe),
  });
}

export function sessionCharacterReading<Interior extends object>(
  events: readonly SessionEventWitness[],
  troupe: readonly Design[],
  universe: readonly Design[],
  options: SessionCharacterOptions<Interior>,
): SessionCharacterReading<Interior> {
  const name = sessionName(events, options.name);
  const actor = actorFromChronicle(events);
  const folded = injectedInterior(events, options, name);
  const masks = sessionMasks(actor, events);
  const character = characterAgent(name, {
    personas: masks.map((entry) => entry.persona),
    disciplines: Object.freeze([...(options.disciplines ?? [])]),
    skills: Object.freeze([...(options.skills ?? [])]),
    plays: Object.freeze(events.map((event) => event.chronicle)),
  });
  const baselineUniverse = options.baselineUniverse ?? Object.freeze([actor, ...universe]);
  return Object.freeze({
    kind: "playing.session-character.reading" as const,
    name,
    events: events.length,
    folds: folded.folds,
    actor,
    interior: folded.interior,
    masks,
    character,
    performativity: performativity(actor),
    performedSelf: performedSelf(character),
    identity: identity(character),
    baseline: situationReading("baseline", actor, Object.freeze([]), baselineUniverse),
    situation: situationReading("situation", actor, troupe, universe),
  });
}
