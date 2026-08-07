/**
 * agency-descent — the four-stage reading of the relating descent.
 *
 * One descent run, four projections. The bottom codomain is a glued individual
 * (H¹=0): a perceive→act loop settled across the four closure regimes.
 */
import {
  admitSeed,
  descend,
  animate,
  enact,
  labor,
  individuate,
  agent,
  perceive,
  act,
  reseed,
  glue,
  face,
} from "@emsenn/animating";

// ── one descent, four projections ───────────────────────────────────────────────
const SEED = "the-sky|is-blue\nthe-sky|is-vast\nthe-sea|is-blue";
const state = descend(admitSeed(SEED));

const becoming = animate(state);    // aperiodic — the void mark (cell)
const doing    = enact(state);      // transfinite — the fiber (sensing node)
const working  = labor(state);      // Scott-continuous — the charged presheaf
const governing = individuate(state); // finite — the glued sheaf (individual)

console.log("regime spine:", [becoming.regime, doing.regime, working.regime, governing.regime]);
// → ["aperiodic", "transfinite", "scott-continuous", "finite"]

console.log("stage spine:", [becoming.stage, doing.stage, working.stage, governing.stage]);
// → ["articulate", "predicate", "posit", "settle"]

// ── the bottom codomain: the perceive→act agent ─────────────────────────────────
const a = agent("the-sky|is-blue", {
  identity: "observer",
  goal: { predicate: "is-blue", charge: "potential" },
});
console.log("agent kind:", a.kind);         // "animating.agent"
console.log("goal satisfied:", a.goal.satisfied); // true — the seed carries the predicate

// ── perceive→act loop ────────────────────────────────────────────────────────────
const perceived = perceive("the-wind|is-cold", undefined, { identity: "observer" });
console.log("perception held:", perceived.perception.held); // 1

const output = act(SEED, { identity: "observer" });
console.log("act kind:", output.kind);          // "animating.agent.act"
console.log("commitments:", output.commitments.length);

// ── re-seed into the next spiral scale ──────────────────────────────────────────
const next = reseed(SEED, { identity: "observer" });
console.log("next kind:", next.kind);           // "animating.becoming"
console.log("open above:", next.openAbove);     // true

// ── glue three faculty faces into one interior agent ─────────────────────────────
const interior = glue(
  { communicating: "the-sky|is-blue", knowing: "the-self|is-aware", playing: "the-world|is-open" },
  { identity: "observer" },
);
console.log("glued:", interior.glued);          // true (H¹=0)
console.log("faces:", interior.faces.map(f => f.faculty));
// → ["communicating", "knowing", "playing"]

const knowledgeFace = face("knowing", [["the-self", "is-aware"], ["the-self", "is-bounded"]]);
console.log("face held:", knowledgeFace.held);  // 2
