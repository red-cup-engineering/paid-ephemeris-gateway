/**
 * cognizing/consolidate — knowing/knowledge-state → knowing/consolidation: does the
 * held section glue into a SHEAF? (the settled memory crystal).
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md);
 * its richer carrier is the comonad context C(Meme) = a held SECTION of memes. CONSOLIDATION
 * asks the sheaf question of that section: a sheaf is the {base, section} fixed point that
 * glues local settlements with H¹=0 (cohomologyVanishes). Because the bilattice fold is
 * confluent, the section always glues structurally; what `consolidate` reports is whether
 * it glues CLEANLY — `consistent` (no cell holds a both-sides-witnessed contradiction) and
 * `settledFraction` (how much of the held section has crystallized stable). Total over any
 * knowledge-state; pure, no I/O. Grounded in positing/fiber.mts sheaf and cohomologyVanishes.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonValue,
} from "@emsenn/relating";
import { admitState } from "./section.mjs";
import type { Consolidation } from "./carriers.mjs";

const STATE_CARRIER_ID = "knowing/knowledge-state";
const CONSOLIDATION_CARRIER_ID = "knowing/consolidation";

/** consolidate — verdict on whether the held section glues into a settled sheaf. */
export const consolidateAction: Action = action({
  verb: "consolidate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Consolidate the held knowledge-state section into a sheaf verdict (does it glue into the settled memory crystal?).",
  description: `Domain: ${STATE_CARRIER_ID} — the held section, the comonad context C(Meme). Codomain: ${CONSOLIDATION_CARRIER_ID} — the sheaf verdict. CONSOLIDATION asks the sheaf question: the {base, section} fixed point glues local settlements with H¹=0 (cohomologyVanishes). Reports held/settled/contested/glues plus consistent (contested===0) and settledFraction (settled/held). Grounded in positing/fiber.mts sheaf and cohomologyVanishes.`,
  domainSchema: Object.freeze({ $ref: STATE_CARRIER_ID }),
  codomainSchema: Object.freeze({ $ref: CONSOLIDATION_CARRIER_ID }),
  run: (input: unknown): JsonValue => {
    const state = admitState(input as JsonValue, "consolidate");
    const held = state.held;
    const settled = state.settled;
    const contested = state.contested;
    const glues = state.glues;
    const consistent = contested === 0;
    const settledFraction = held > 0 ? settled / held : 0;
    const verdict: Consolidation = {
      kind: "knowing.consolidation",
      held,
      settled,
      contested,
      glues,
      consistent,
      settledFraction,
    };
    return jsonResource(verdict as unknown as JsonValue, "consolidation");
  },
});
