/**
 * cognizing/assess — Meme → knowing/knowledge-standing: the comonad counit as a reading.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `cognize` extracts the
 * standing as a meme (Meme → Meme, the endo unit); `assess` extracts the SAME ≤_k
 * standing as knowing's OWN carrier, `knowing/knowledge-standing` — a knowing-owned
 * reading whose identity is its bare-descent-path `$id` and whose type is inferred
 * from `knowledgeStandingSchema` by `FromSchema` (the schema literal, not a
 * hand-written interface or generated file, is the law). The base carrier (the meme)
 * is reused from relating-experimental; this reading is knowing's own.
 *
 * The standing is read off the charge's two sides on the knowledge order:
 *   truth present / falsity present → stable    (≤_k top — the settled fixpoint)
 *   truth present / falsity absent  → potential
 *   truth absent  / falsity present → active
 *   truth absent  / falsity absent  → absurd    (≤_k bottom)
 * `settled` is standing === "stable" (the reached fixpoint — a converged reflection,
 * never a rumination); `reflexive` is whether a Token nests another meme.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import type { KnowledgeStanding } from "./carriers.mjs";

const MEME_CARRIER_ID = "relating/articulating/predicating/positing/meme";
const STANDING_CARRIER_ID = "knowing/knowledge-standing";

/** Admit a meme from the wire, refusing a non-meme at the boundary. */
function admitMeme(input: JsonValue, verb: string): Meme {
  if (typeof input === "object" && input !== null && isMeme(input as object)) return input as unknown as Meme;
  throw new TypeError(`${verb}: expected a meme carrier (predication.fiber.meme)`);
}

/** The FOUR knowledge-order standing named by a charge's two sides. */
function standingOf(meme: Meme): KnowledgeStanding["standing"] {
  const truth = meme.charge.value[0].name === "present";
  const falsity = meme.charge.value[1].name === "present";
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
}

/** Whether a Token nests another meme (knowing-that-you-know). */
const nestsMeme = (value: unknown): boolean => typeof value === "object" && value !== null && isMeme(value as object);

/** assess — read a meme's ≤_k standing into knowing's own knowledge-standing carrier. */
export const assessAction: Action = action({
  verb: "assess",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Assess a meme's knowledge-order standing into knowing's own knowledge-standing carrier.",
  description: `Domain: a meme carrier (${MEME_CARRIER_ID}). Codomain: ${STANDING_CARRIER_ID} — knowing's own carrier, the ≤_k standing of the cognized meme (standing, whether it is settled at the ≤_k fixpoint, whether it is reflexive, and the evidence depth on each side). The reading counit of knowing-as-comonad.`,
  domainSchema: Object.freeze({ $ref: MEME_CARRIER_ID }),
  codomainSchema: Object.freeze({ $ref: STANDING_CARRIER_ID }),
  run: (input: unknown): JsonValue => {
    const meme = admitMeme(input as JsonValue, "assess");
    const standing = standingOf(meme);
    const result: KnowledgeStanding = {
      kind: "knowing.knowledge-standing",
      standing,
      settled: standing === "stable",
      reflexive: nestsMeme(meme.cell.subject.mark.value) || nestsMeme(meme.cell.object.mark.value),
      positiveEvidence: meme.charge.evidence[0].length,
      negativeEvidence: meme.charge.evidence[1].length,
    };
    return jsonResource(result, "knowledge standing");
  },
});
