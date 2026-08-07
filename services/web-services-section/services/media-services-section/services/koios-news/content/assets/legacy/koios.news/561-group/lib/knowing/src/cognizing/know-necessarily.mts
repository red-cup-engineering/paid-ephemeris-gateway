/**
 * cognizing/know-necessarily — { meme, worlds } → knowing/modal-standing: NECESSITY (box).
 *
 * MODAL knowing lifts the comonad on Meme across a WORLD-SET W: each world is a held
 * knowledge-state (a fiber of the knowledge presheaf indexed by W), and the four-valued
 * bilattice-accessibility-relation defaults to total (S5). The meme's modal standing is
 * bigraded — necessity (box) is the ≤_k MEET of its standing taken across every accessible
 * world, the ≤_k top (stable) vacuously over no worlds; possibility (diamond) is the dual
 * ≤_k JOIN. This morphism is the box: the meme is known necessarily iff it holds across ALL
 * accessible worlds. Pure, total, no I/O.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import { admitState, lookupStanding, meetK, type Standing } from "./section.mjs";
import type { ModalStanding } from "./carriers.mjs";

/** know-necessarily — box: the ≤_k meet of the meme standing across accessible worlds. */
export const knowNecessarilyAction: Action = action({
  verb: "know-necessarily",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Box: the knowledge-order meet of the meme standing across accessible worlds.",
  description:
    "box = the knowledge-order meet of the meme standing across accessible worlds. Domain: { meme, worlds } where each world is a knowing/knowledge-state fiber over the world-set W. Codomain: knowing/modal-standing. The meme is known necessarily iff it holds across ALL accessible worlds; value is the ≤_k MEET of its per-world standings, which is the ≤_k top (stable) vacuously over no worlds (S5, total bilattice-accessibility-relation). The dual bigraded operator is diamond (≤_k join).",
  domainSchema: Object.freeze({
    type: "object",
    properties: Object.freeze({
      meme: Object.freeze({ $ref: "relating/articulating/predicating/positing/meme" }),
      worlds: Object.freeze({ type: "array", items: Object.freeze({ $ref: "knowing/knowledge-state" }) }),
    }),
  }),
  codomainSchema: Object.freeze({ $ref: "knowing/modal-standing" }),
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("know-necessarily: expected { meme, worlds }");
    }
    const rec = input as { meme?: JsonValue; worlds?: JsonValue };
    const meme = rec.meme;
    if (typeof meme !== "object" || meme === null || !isMeme(meme)) {
      throw new TypeError("know-necessarily: meme must be a meme carrier");
    }
    const rawWorlds = Array.isArray(rec.worlds) ? rec.worlds : [];
    const worlds = rawWorlds.map((w) => admitState(w, "know-necessarily.world"));
    const standings = worlds.map((w) => lookupStanding(w, meme as unknown as Meme));
    const value: Standing = standings.reduce<Standing>((acc, s) => meetK(acc, s), "stable");
    const heldIn = standings.filter((s) => s !== "absurd").length;
    const result: ModalStanding = {
      kind: "knowing.modal-standing",
      modality: "necessity",
      value,
      worlds: worlds.length,
      heldIn,
    };
    return jsonResource(result as unknown as JsonValue, "modal standing");
  },
});
