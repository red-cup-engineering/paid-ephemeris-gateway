/**
 * cognizing/know-possibly — { meme, worlds } → knowing/modal-standing: POSSIBILITY (diamond).
 *
 * MODAL knowing lifts the comonad on Meme across a WORLD-SET W: each world is a held
 * knowledge-state (a fiber of the knowledge presheaf indexed by W), and the four-valued
 * bilattice-accessibility-relation defaults to total (S5). The meme's modal standing is
 * bigraded — possibility (diamond) is the ≤_k JOIN of its standing taken across every
 * accessible world, the ≤_k bottom (absurd) vacuously over no worlds; necessity (box) is
 * the dual ≤_k MEET. This morphism is the diamond: the meme is known possibly iff it holds
 * in SOME accessible world. Pure, total, no I/O.
 */
import {
  action,
  jsonResource,
  isMeme,
  type Action,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import { admitState, lookupStanding, joinK, type Standing } from "./section.mjs";
import type { ModalStanding } from "./carriers.mjs";

/** know-possibly — diamond: the ≤_k join of the meme standing across accessible worlds. */
export const knowPossiblyAction: Action = action({
  verb: "know-possibly",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Diamond: the knowledge-order join of the meme standing across accessible worlds.",
  description:
    "diamond = the knowledge-order join of the meme standing across accessible worlds. Domain: { meme, worlds } where each world is a knowing/knowledge-state fiber over the world-set W. Codomain: knowing/modal-standing. The meme is known possibly iff it holds in SOME accessible world; value is the ≤_k JOIN of its per-world standings, which is the ≤_k bottom (absurd) vacuously over no worlds (S5, total bilattice-accessibility-relation). The dual bigraded operator is box (≤_k meet).",
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
      throw new TypeError("know-possibly: expected { meme, worlds }");
    }
    const rec = input as { meme?: JsonValue; worlds?: JsonValue };
    const meme = rec.meme;
    if (typeof meme !== "object" || meme === null || !isMeme(meme)) {
      throw new TypeError("know-possibly: meme must be a meme carrier");
    }
    const rawWorlds = Array.isArray(rec.worlds) ? rec.worlds : [];
    const worlds = rawWorlds.map((w) => admitState(w, "know-possibly.world"));
    const standings = worlds.map((w) => lookupStanding(w, meme as unknown as Meme));
    const value: Standing = standings.reduce<Standing>((acc, s) => joinK(acc, s), "absurd");
    const heldIn = standings.filter((s) => s !== "absurd").length;
    const result: ModalStanding = {
      kind: "knowing.modal-standing",
      modality: "possibility",
      value,
      worlds: worlds.length,
      heldIn,
    };
    return jsonResource(result as unknown as JsonValue, "modal standing");
  },
});
