/**
 * cognizing/morphisms/absorb — the learning step of the comonad on Meme.
 *
 * absorb is the LEARNING generator of knowing-as-the-comonad-on-Meme
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md): meme in, meme out,
 * the cell preserved IDENTICALLY while the charge climbs the KNOWLEDGE order ≤_k.
 * Where communicating's `ground` takes up a PARTNER's evidence, absorb takes up the
 * knower's OWN first-person observation — the same `joinKnowledge` mechanism, but
 * the witness is self-supplied. It is one firing of the settlement filtration: a
 * single ≤_k increment `v_τ <_k v_{τ+1}`, a knowledge increment, a lesson. The
 * orbit of absorb is the settling-coalgebra orbit — reflecting is the run that
 * converges, ruminating the run that never settles.
 *
 * The knower's increment is the side it witnesses for itself:
 *   for     → potential, witness on the TRUTH side   (observed in support)
 *   against → active,    witness on the FALSITY side  (observed against)
 *
 * Total (any meme, any evidence string, any side) and faithful (the genuine
 * `joinKnowledge` of positing/bilattice-charge — both sides grow, ≤_k climbs).
 */
import {
  action,
  jsonResource,
  isMeme,
  meme,
  mark,
  charge,
  chargeValue,
  joinKnowledge,
  type Action,
  type JsonValue,
  type JsonRecord,
  type Meme,
} from "@emsenn/relating";

/** The carrier `$id` both slots reference: knowing is the comonad on Meme. */
const MEME_CARRIER_ID = "relating/articulating/predicating/positing/meme";
const memeRef = Object.freeze({ $ref: MEME_CARRIER_ID });

/** Admit a meme from the wire, refusing a non-meme at the boundary. */
function admitMeme(input: JsonValue, verb: string): Meme {
  if (typeof input === "object" && input !== null && isMeme(input as object)) return input as unknown as Meme;
  throw new TypeError(`${verb}: expected a meme carrier (predication.fiber.meme)`);
}

/** absorb — the learning step: knowledge-join the meme's charge with the knower's
 *  own observation; one ≤_k increment of the settling orbit. */
export const absorbAction: Action = action({
  verb: "absorb",
  inputFormat: "json",
  outputFormat: "json",
  options: ["evidence", "side"],
  summary: "Take up the knower's own observation as evidence and knowledge-join it onto the meme's charge — one ≤_k increment, a lesson.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The LEARNING step of the comonad on Meme — one firing of the settlement filtration, a single ≤_k increment (v_τ <_k v_{τ+1}), a knowledge increment / a lesson. The cell is preserved identically; the charge becomes joinKnowledge(prior.charge, increment), where the increment is the knower's OWN first-person observation (for witnesses truth as potential, against witnesses falsity as active). Same mechanism as communicating's ground, but the evidence is first-person, not a partner's.",
  domainSchema: memeRef,
  codomainSchema: memeRef,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const prior = admitMeme(input as JsonValue, "absorb");
    const e = String(args.evidence ?? "observation");
    const side = args.side === "against" ? "against" : "for";
    const increment = side === "against"
      ? charge(chargeValue("active"), [[], [mark(e)]])
      : charge(chargeValue("potential"), [[mark(e)], []]);
    const learned = meme(prior.cell, joinKnowledge(prior.charge, increment));
    return jsonResource(learned, "meme");
  },
});
