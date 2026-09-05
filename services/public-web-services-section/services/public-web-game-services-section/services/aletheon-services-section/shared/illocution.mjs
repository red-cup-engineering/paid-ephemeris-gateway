// illocution — the Four Illocutionary Forces, the four kinds of charge a speech act can inject,
// one per value of the bilattice FOUR. Aletheon teaches the bilattice THROUGH SPEAKING: you do
// not read the math, you SAY it. Asserting puts positive evidence (→ t); Denying puts negative
// (→ f); Abstaining puts neither (⊥, the identity — no act); Contesting puts both at once (⊤,
// paraconsistently held). They compose by the knowledge-join ∨ₖ: Assert ∨ₖ Deny = Contest
// (t ∨ₖ f = ⊤). Each force IS a value of FOUR read as an act, so each one references the matching
// Codex Way (shared/codex.mjs, keyed by the same glyph). Grounded in the prior research's
// illocution/forces (…/library/forces/docs/forces.md): the Belnap speech-act partition.
// Pure data, no imports beyond the codex it names — browser-safe, shipped to both sides verbatim.

import { WAYS } from "./codex.mjs";

// Each force: { force, glyph, name, verb, gloss, way } — `way` is the matching Codex Way object,
// so the renderer and the Keepers can speak the full teaching from one place.
export const FORCES = {
  assert: {
    force: "assert", glyph: "t", name: "Asserting", verb: "assert",
    gloss: "positive evidence only — you say a thing IS, and so settle it toward t.",
    way: WAYS.t,
  },
  deny: {
    force: "deny", glyph: "f", name: "Denying", verb: "deny",
    gloss: "negative evidence only — you say a thing is NOT; the converse, said aloud, toward f.",
    way: WAYS.f,
  },
  abstain: {
    force: "abstain", glyph: "⊥", name: "Abstaining", verb: "abstain",
    gloss: "neither face — the identity, no act. You hold open, and the cell stays ⊥.",
    way: WAYS["⊥"],
  },
  contest: {
    force: "contest", glyph: "⊤", name: "Contesting", verb: "contest",
    gloss: "BOTH faces at once — assert and deny the same cell; the knowledge-join holds ⊤.",
    way: WAYS["⊤"],
  },
};

// ORDER — the speak-palette / keybind order: 1=Assert, 2=Deny, 3=Abstain, 4=Contest. The truth
// pair {Assert, Deny} first, then the knowledge pair {Abstain, Contest} — the two K₄ orbits.
export const ORDER = ["assert", "deny", "abstain", "contest"];

// lookups — by force name and by bilattice glyph (the same glyph the Codex Ways are keyed by).
export const forceOf = (name) => FORCES[name] || null;
export const forceByGlyph = (glyph) => Object.values(FORCES).find((f) => f.glyph === glyph) || null;
