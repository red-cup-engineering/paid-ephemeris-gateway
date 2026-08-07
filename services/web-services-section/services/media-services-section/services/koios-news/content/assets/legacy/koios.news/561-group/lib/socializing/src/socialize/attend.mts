/**
 * socialize/attend — listen↑: a member residuates the field.
 *
 * attend is endomorphic on the Social Field (field → field) — the social lift of
 * communicating's `listen`. The `member` takes up its in-transit memes (charge
 * `potential`): each such meme's charge moves to the uptake side (`active`),
 * witnessed by the attending member. Linearity is enforced — an already-`active`
 * meme is a spent resource and is REFUSED (the listen residuum consumes once).
 *
 * Reuses relating's `valueOf`/`meme`/`charge`/`chargeValue`/`mark` — the exact
 * `listenAction` uptake transition, ranged over the field's edges into `member`.
 */
import {
  action,
  jsonResource,
  isMeme,
  meme as buildMeme,
  charge,
  chargeValue,
  valueOf,
  mark,
  type Action,
  type ChargeCarrier,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import {
  admitField,
  type Field,
  type FieldMember,
} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";

/** The bilattice value name of a meme's charge (potential in transit, active taken up). */
function chargeName(meme: JsonRecord): string {
  return valueOf((meme as unknown as { readonly charge: ChargeCarrier }).charge).name;
}

/** attend — take up the member's in-transit memes, moving each charge to active. */
export const attendAction: Action = action({
  verb: "attend",
  inputFormat: "json",
  outputFormat: "json",
  options: ["member"],
  summary: "listen↑: the member takes up its in-transit (potential) memes, moving each charge to active (witnessed by the attender); spent (active) memes are refused.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The options.member takes up its in-transit memes: each potential meme's charge becomes active, witnessed by the attending member; an already-active meme is a spent resource and is refused (linearity). The social lift of communicating's listen.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "attend");
    const index = Number(args.member ?? 0);
    if (!Number.isInteger(index) || index < 0 || index >= field.members.length) {
      throw new RangeError(`attend: member index ${String(args.member)} out of range`);
    }
    const member = field.members[index]!;
    const attenderName = String((member.agent as JsonRecord).identity ?? `member-${index}`);
    const witness = mark(attenderName);

    const taken: readonly JsonRecord[] = member.memes.map((meme) => {
      if (!isMeme(meme as object)) return meme;
      const name = chargeName(meme);
      if (name === "active") {
        throw new TypeError("attend: this meme is a spent resource (already taken up / active)");
      }
      if (name !== "potential") return meme; // only in-transit memes are taken up
      return buildMeme(
        (meme as unknown as { readonly cell: never }).cell,
        charge(chargeValue("active"), [[], [witness]]),
      ) as unknown as JsonRecord;
    });

    const members: readonly FieldMember[] = field.members.map((m, i) =>
      i === index ? Object.freeze({ ...m, memes: Object.freeze(taken) }) : m,
    );

    const next: Field = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
