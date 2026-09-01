// [powers] powers — the Klein-four (K₄) gauge of voidmath made PLAYABLE. The gauge is
// ⟨negate, conflate⟩ plus the two modal ops (possibilize ◇ / necessitate □) — all REAL kernel
// functions (server/world/kernel.mjs). Each of the four becomes a PLAYER POWER, spent for MARKS
// (the conserved quantum the marks feature added; cost from shared/constants MARK):
//
//   REFLECT  (negate)      — invert a target's life-charge. negate swaps the +/− evidence faces;
//                            a living t reflects to f. The living turns slain. A costly finisher.
//   BANISH   (conflate)    — conflate sends ⊤→⊥ (and t/f fixed). Meaningful only on a ⊤ Anomaly:
//                            the contradiction is reflected to ⊥ and the Anomaly DISSOLVES.
//   REVEAL   (possibilize) — the forward modal ◇, a knowledge-RAISE: widen the caster's interest
//                            radius for a few seconds, surfacing more of the world.
//   BIND     (necessitate) — the backward modal □, a knowledge-LOWER read as ROOTING: a bound
//                            creature is held in place (it cannot move) for N ticks.
//
// Pure data, browser-safe (no imports beyond constants) so the same file ships to both sides — the
// client reads it for the power bar, the server (server/world/powers.mjs) applies the effects with
// the actual kernel charge ops.

import { MARK } from "./constants.mjs";

// Each power: { key, name, glyph, cost, gloss }. `key` is the wire token (MSG.power.power); `glyph`
// is the gauge mark shown on the bar; `cost` is the marks spent; `gloss` is the one-line teaching.
export const POWERS = {
  reflect: {
    key: "reflect", name: "Reflect", glyph: "↔", cost: MARK.reflectCost,
    gloss: "negate — reflect a creature's evidence; the living t turns slain f. A finisher.",
  },
  banish: {
    key: "banish", name: "Banish", glyph: "⤓", cost: MARK.banishCost,
    gloss: "conflate — send a ⊤ Anomaly's contradiction to ⊥; it dissolves out of the world.",
  },
  reveal: {
    key: "reveal", name: "Reveal", glyph: "◇", cost: MARK.revealCost,
    gloss: "possibilize — raise your knowing; widen your sight to surface more of the world.",
  },
  bind: {
    key: "bind", name: "Bind", glyph: "□", cost: MARK.bindCost,
    gloss: "necessitate — lower a creature to stillness; it is rooted and cannot move.",
  },
};

// ORDER — the power-bar / keybind order: the two K₄ truth-pair gauge unaries first (Reflect=negate,
// Banish=conflate), then the two modal ops (Reveal=◇, Bind=□). Bound to keys Z X R B in main.mjs.
export const ORDER = ["reflect", "banish", "reveal", "bind"];

export const powerOf = (key) => POWERS[key] || null;
