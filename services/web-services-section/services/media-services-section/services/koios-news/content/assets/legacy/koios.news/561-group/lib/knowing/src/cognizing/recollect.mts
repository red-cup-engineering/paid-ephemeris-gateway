/**
 * cognizing/recollect — [Meme] → knowing/knowledge-state: MEMORY as the ≤_k fold.
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md);
 * its richer carrier is the comonad context C(Meme) = a held section of memes.
 * `recollect` is the MEMORY faculty: it folds a collection of memes into that section
 * along the knowledge order ≤_k (coincident cells joined by joinKnowledge), the act
 * that turns a stream of held memes into one standing body of knowledge — "the depth
 * is the memory" (content/CLAUDE.md). The fold is confluent (conflicts settle stable,
 * the section glues, H¹=0); the summary reports how much is held, settled, and
 * contested. Total over any collection of memes.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonValue,
} from "@emsenn/relating";
import { admitMemes, stateFromMemes } from "./section.mjs";

const MEME_CARRIER_ID = "relating/articulating/predicating/positing/meme";
const STATE_CARRIER_ID = "knowing/knowledge-state";

/** recollect — fold a collection of memes into the held knowledge-state section. */
export const recollectAction: Action = action({
  verb: "recollect",
  inputFormat: "json",
  outputFormat: "json",
  options: ["base"],
  summary: "Recollect a collection of memes into one held knowledge-state section (memory: the ≤_k fold).",
  description: `Domain: an array of meme carriers (${MEME_CARRIER_ID}) or { memes: [...] }; --base labels the region. Codomain: ${STATE_CARRIER_ID} — the held section, the comonad context C(Meme). MEMORY: coincident cells are folded by the knowledge-order join (joinKnowledge), conflicts accumulate as the ≤_k top (the section glues, H¹=0), and the summary reports held/settled/contested. Grounded in positing/fiber.mts composeFibers, sheaf, and 'the depth is the memory'.`,
  domainSchema: Object.freeze({ type: "array", items: Object.freeze({ $ref: MEME_CARRIER_ID }) }),
  codomainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const base = typeof args["base"] === "string" && args["base"].trim() !== "" ? args["base"].trim() : "section";
    return jsonResource(stateFromMemes(base, admitMemes(input as JsonValue, "recollect")) as unknown as JsonValue, "knowledge state");
  },
});
