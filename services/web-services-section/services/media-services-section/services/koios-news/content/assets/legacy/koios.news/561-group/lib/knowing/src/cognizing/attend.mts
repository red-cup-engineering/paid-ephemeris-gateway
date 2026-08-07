/**
 * cognizing/attend — knowing/knowledge-state → knowing/knowledge-state: ATTENTION as base-change f*.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md); its richer carrier is the
 * comonad context C(Meme) = a held SECTION of memes. `attend` is the ATTENTION faculty:
 * it restricts the held section to a sub-region — the choice of a fiber. This is the
 * predication-hyperdoctrine reindexing f* (pullback/base-change along a substitution),
 * read here as SPECIALIZATION: the held field is restricted to the cells whose predicate
 * label or ≤_k-standing names the chosen region. With no criterion, attention defaults
 * to the whole field (f* along the identity). The kept memes are re-summarized through
 * the same ≤_k fold (stateFromMemes), so attention lands a genuine knowledge-state.
 * Total over any knowledge-state. Grounded in the reindexing functor f* and the
 * specialization generator of the predication hyperdoctrine.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonValue,
} from "@emsenn/relating";
import { admitState, heldMemesOf, stateFromMemes, standingOf } from "./section.mjs";
import type { KnowledgeState } from "./carriers.mjs";

const STATE_CARRIER_ID = "knowing/knowledge-state";

const STANDINGS = ["absurd", "active", "potential", "stable"] as const;

/** The predicate label a held meme's cell carries (its predicate Mark's value). */
const predicateLabelOf = (m: { readonly cell: { readonly predicate?: { readonly mark?: { readonly value?: unknown } } } }): string =>
  String(m.cell.predicate?.mark?.value ?? "");

/** attend — restrict the held section to the chosen fiber (attention = base-change f*). */
export const attendAction: Action = action({
  verb: "attend",
  inputFormat: "json",
  outputFormat: "json",
  options: ["predicate", "standing"],
  summary: "Attend a knowledge-state: restrict the held section to a sub-region (base-change/specialization f*).",
  description: `Domain: ${STATE_CARRIER_ID} — a held section, the comonad context C(Meme). Codomain: ${STATE_CARRIER_ID} — the restricted section re-summarized through the ≤_k fold. ATTENTION = base-change/specialization, the choice of fiber: --predicate keeps cells whose predicate label contains the string, --standing keeps cells of that ≤_k-standing (absurd|active|potential|stable); with neither, attention defaults to the whole field (f* along identity). Grounded in the predication-hyperdoctrine reindexing f* and the specialization generator.`,
  domainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  codomainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const state = admitState(input as JsonValue, "attend");
    const predicate = typeof args["predicate"] === "string" && args["predicate"].trim() !== "" ? args["predicate"] : null;
    const standing = STANDINGS.includes(args["standing"] as (typeof STANDINGS)[number]) ? (args["standing"] as (typeof STANDINGS)[number]) : null;
    const kept = heldMemesOf(state).filter((m) => {
      if (predicate !== null && !predicateLabelOf(m as never).includes(predicate)) return false;
      if (standing !== null && standingOf(m) !== standing) return false;
      return true;
    });
    const result: KnowledgeState = stateFromMemes(state.base, kept);
    return jsonResource(result as unknown as JsonValue, "knowledge state");
  },
});
