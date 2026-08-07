/**
 * socialize/admit — the initial-object inclusion `communicating ↪ socializing`, and
 * one of socializing's two SCALE-2-NATIVE morphisms (a lone agent has no one to be
 * admitted into a society with).
 *
 * admit is endomorphic on the Social Field (field → field): append a new `Member` (an
 * observer — an `agent`, reused from animating, carrying its local `memes`, reused from
 * relating) to `members`, and grow the OBSERVER CATEGORY `O` to connect the new
 * observer to the rest (default: `completeTranslations` over the new observer count —
 * the maximally-connected category, a translation morphism in each direction between
 * every pair). Admitting the FIRST observer is the one-agent society — a DISCRETE `O`
 * with no non-identity translations, exactly communicating's single-agent meme surface,
 * included as the initial object.
 *
 * The admitted agent is built/validated through animating's `agent` constructor (when
 * given a seed) or accepted as an already-built agent carrier; each admitted meme is
 * validated through relating's `isMeme`. The new section is left ungrounded; `converge`
 * (re)computes it.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonValue,
  type JsonRecord,
} from "@emsenn/relating";
import { agent as buildInteriorAgent } from "@emsenn/animating";

import {
  admitField,
  ungroundedSection,
  completeTranslations,
  type Field,
  type FieldMember,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";

/** Admit the agent from args: an already-built agent carrier, else a seed for `agent`. */
function admitMemberAgent(value: JsonValue): JsonRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as JsonRecord).kind === "animating.agent") {
    return value as JsonRecord;
  }
  // Build a fresh interior agent from the seed (string, record, or array).
  return buildInteriorAgent(value === undefined ? [] : value) as unknown as JsonRecord;
}

/** Admit the local memes from args, refusing a non-meme at the boundary. */
function admitMemberMemes(value: JsonValue): readonly JsonRecord[] {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item) && isMeme(item as object)) {
      return item as JsonRecord;
    }
    throw new TypeError("admit: each meme must be a meme carrier (predication.fiber.meme)");
  });
}

/** admit — append an observer (agent + local memes) and grow the observer category. */
export const admitAction: Action = action({
  verb: "admit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["agent", "memes"],
  summary: "Admit an observer (an agent + its local memes) into the Social Field; the one-observer case is the single-agent society (a discrete O) = communicating.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Appends a Member (observer: agent reused from animating, memes reused from relating) to members and grows the observer category O to connect it (default: completeTranslations over the new observer count — a translation morphism in each direction between every pair). The section is left ungrounded; converge recomputes it.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "admit");
    const member: FieldMember = Object.freeze({
      kind: "socializing.member" as const,
      agent: admitMemberAgent(args.agent as JsonValue),
      memes: admitMemberMemes(args.memes as JsonValue),
    });
    const members = Object.freeze([...field.members, member]);
    const next: Field = Object.freeze({
      kind: "socializing.social-field" as const,
      members,
      base: Object.freeze({
        kind: "socializing.social-base" as const,
        translations: completeTranslations(members.length),
      }),
      section: ungroundedSection(),
    });
    return jsonResource(next, "social-field");
  },
});
