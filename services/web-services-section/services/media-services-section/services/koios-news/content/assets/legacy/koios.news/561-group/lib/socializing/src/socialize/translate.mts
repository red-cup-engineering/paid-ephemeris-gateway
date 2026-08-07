/**
 * socialize/translate — the inter-observer perspective map V(α), the OFF-DIAGONAL
 * realization of communicating's translate.
 *
 * This is socializing's translate, and it is GENUINELY social: it is the translation
 * settling-morphism `α : from → to` of the observer category `O` — the perspective map
 * `V(α) : V(from) → V(to)` of the multi-observer system (content/_archive
 * spatiotemporal-knowledge-presheaf `multi-observer-system.md`: "each morphism α is a
 * translation from one observer's perspective to another's"). It carries observer
 * `from`'s memes ACROSS the edge into observer `to`'s frame, where they land as
 * received-and-re-signed.
 *
 * It supersedes the stalkwise `translate↑` (each agent re-signing its OWN memes), which
 * was the degenerate diagonal: there is no genuine translation without a second
 * observer to translate TO. Per CLAUDE.md (port-then-delete), the stalkwise lift is
 * removed; no capability is lost — the within-agent Lotman re-signing remains
 * `@emsenn/communicating`'s `translate`, which this morphism REUSES as the codec,
 * applied off-diagonally along `V(α)`.
 *
 * `translate(from, to)` requires a directed translation `from → to` in `O` (the
 * morphism is the medium and names the target frame: the `to`-side semiosphere of its
 * channel, else the `to`-observer's identity). Each of `from`'s memes is re-signed into
 * that frame by communicating's translate and appended to `to`'s stalk. `from` is
 * unchanged — translation copies a perspective across, it does not consume the source.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { translateAction as communicatingTranslate } from "@emsenn/communicating";

import {
  admitField,
  translationBetween,
  type Field,
  type FieldMember,
  type Translation,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";

/** Range-check an observer index against the field. */
function observerIndex(field: Field, value: JsonValue, role: string): number {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index >= field.members.length) {
    throw new RangeError(`translate: ${role} index ${String(value)} out of range`);
  }
  return index;
}

/** The target frame the translation crosses into: the `to`-side semiosphere named on
 *  the translation's channel, falling back to the target observer's identity. */
function targetFrame(arrow: Translation, receiver: FieldMember, to: number): string {
  const channel = arrow.channel as JsonRecord;
  const toSphere = channel.to as JsonRecord | undefined;
  const sphereName = toSphere && typeof toSphere.name === "string" ? toSphere.name : undefined;
  if (sphereName !== undefined && sphereName !== "") return sphereName;
  const identity = (receiver.agent as JsonRecord).identity;
  return typeof identity === "string" && identity !== "" ? identity : `observer-${to}`;
}

/** translate — carry `from`'s memes into `to`'s frame along the translation V(α). */
export const translateAction: Action = action({
  verb: "translate",
  inputFormat: "json",
  outputFormat: "json",
  options: ["from", "to"],
  summary: "The inter-observer perspective map V(α): carry observer `from`'s memes across the translation edge into observer `to`'s frame (re-signed by communicating's translate).",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The translation settling-morphism α: from → to of the observer category O — V(α): V(from) → V(to). Requires a directed translation from → to in O (the morphism is the medium and names the target frame: the to-side semiosphere of its channel, else the to-observer's identity). Each of from's memes is re-signed into that frame by @emsenn/communicating's translate (object preserved, vehicle re-expressed) and appended to to's stalk; from is unchanged. The genuinely-social, off-diagonal translate — supersedes the stalkwise translate↑.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "translate");
    const from = observerIndex(field, (args.from ?? 0) as JsonValue, "from");
    const to = observerIndex(field, (args.to ?? 1) as JsonValue, "to");
    if (from === to) {
      throw new RangeError("translate: a translation crosses BETWEEN two distinct observers (from ≠ to)");
    }
    const arrow = translationBetween(field.base, from, to);
    if (!arrow) {
      throw new RangeError(`translate: no translation morphism ${from} → ${to} in the observer category`);
    }
    const sender = field.members[from]!;
    const receiver = field.members[to]!;
    const frame = targetFrame(arrow, receiver, to);

    const translated: readonly JsonRecord[] = sender.memes
      .filter((m) => isMeme(m))
      .map((m) => communicatingTranslate.run({ meme: m, target: frame } as JsonValue, {}) as unknown as JsonRecord);

    const members: readonly FieldMember[] = field.members.map((member, index) =>
      index === to
        ? Object.freeze({ ...member, memes: Object.freeze([...member.memes, ...translated]) })
        : member,
    );
    const next: Field = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
