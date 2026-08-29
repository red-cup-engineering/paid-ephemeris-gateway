// skills — SKILL-BY-USE progression, a SECOND advancement axis beside character level
// (progression.mjs). Where `level`/`xp` is a single number the trace accumulates, a SKILL is a
// PER-ABILITY degree the actor earns by DOING: every successful use of an ability files reinforcing
// evidence for that ability's skill, and the skill's bilattice cell settles to a glyph (t/f/⊤)
// while a numeric level is derived from how much evidence has accrued. Project-Gorgon-style: the
// blade gets sharper because you swung it, the sorcery deeper because you cast it.
//
// We do NOT reinvent the evidence/cell machinery — we WRAP tab's `practice` morphism, which already
// encodes the whole skill convention:
//
//   tab practice (verified by reading
//   @561-group/tab/being/doing/practicing/scripts/practice.mjs):
//
//     practice({ root, agent, actor, skill, outcome, t }) -> { rows, level }
//       outcome : "success" | "fail"
//       t       : OPTIONAL deterministic stamp PREFIX (a STRING, default "practice"); practice
//                 builds its own `<prefix>:NNNNNN` counter from it — NOT a clock thunk.
//       rows    : the {row,id} results doing()/declareConverse appended, in order
//       level   : { skill, predicate, converse, outcome } — a HANDLE (predicate names + outcome),
//                 NOT a number. (The task's spec guessed `{ rows, level:<number> }`; the real
//                 morphism returns this handle, so the numeric level is OURS to derive — see below.)
//
//   Skill convention practice uses on the trace:
//     - a SUCCESS files a positive row { e:actor, a:"skill:<name>", v:<name> } — affirms the cell
//     - a FAIL declares `(skill:<name> has-converse unskill:<name>)` then files
//       { e:actor, a:"unskill:<name>", v:<name> } — negative evidence for the SAME cell
//     - `skill:`/`unskill:` predicates ACCRUE (non-functional): every event survives the fold, so
//       a skill only-succeeded settles to t, only-failed to f, BOTH to ⊤ (a contested skill).
//     - the append-only trace IS the practice history, so we recover a numeric level by COUNTING
//       the accrued evidence rows (rowsFor) and mapping the success count through a curve.
//
// CONTRACT shared with the other engine mutations: (root, ...args, t, dirty), where t is a
// () => string clock thunk and dirty is a Set the caller collects touched subjects in. We pass
// t() (one stamp string) to practice as its prefix — unique per call so successive practices in a
// tick never collide on a counter.

import practice from "@561-group/fizzos/practicing";
import { rowsFor } from "#substrate";
import { view, glyphOf } from "#engine/_world.mjs";

// SKILLS — the map from a ruinfold ABILITY or ACTION name to the SKILL it levels. Several abilities
// can train one skill (heavy + cleave + a plain melee swing all sharpen the blade); a skill is a
// broad competence, not one move. Extend freely — the keys are ability/action ids, the values skill
// names that become `skill:<name>` cells on the actor.
export const SKILLS = {
  melee: "blade",
  heavy: "blade",
  cleave: "blade",
  bolt: "sorcery",
  "second-wind": "mending",
};

// skillFor — which skill (if any) an ability/action name levels. Returns the skill name or null.
export function skillFor(abilityOrAction) {
  return Object.prototype.hasOwnProperty.call(SKILLS, abilityOrAction) ? SKILLS[abilityOrAction] : null;
}

// levelCurve — successes -> numeric skill level. Same shape of idea as character xp (each level
// costs a little more), but cheap and monotone: floor(sqrt(successes)) + 1. So 0 successes = 1,
// 1..3 = 2, 4..8 = 3, 9..15 = 4, ... — early levels come fast, later ones slow down.
export function levelCurve(successes) {
  return Math.floor(Math.sqrt(successes)) + 1;
}

// practiceSkill — file ONE practice event for `skill` on `actor` with the given outcome, by WRAPPING
// tab's practice morphism. The actor is both agent and actor (a player/NPC trains themselves).
// We pass t() (a single stamp string) as practice's deterministic prefix, add the actor to `dirty`
// so the tick snapshots them, and return practice's own { rows, level } result unchanged.
//   practiceSkill(root, actor, skill, outcome, t, dirty) -> { rows, level }
//     outcome : "success" | "fail"
export async function practiceSkill(root, actor, skill, outcome, t, dirty) {
  const result = await practice({ root, agent: actor, actor, skill, outcome, t: t() });
  dirty.add(actor);
  return result;
}

// _countEvidence — count an actor's accrued practice rows for one skill, straight off the trace
// (rowsFor reads the subject's log). A success is a `skill:<name>` row carrying the skill name as
// its value; a fail is an `unskill:<name>` row carrying the same. We match value too so unrelated
// rows that happen to share a predicate prefix can't leak in. Returns { successes, fails }.
async function _countEvidence(root, actor, skill) {
  const positive = `skill:${skill}`;
  const negative = `unskill:${skill}`;
  let successes = 0;
  let fails = 0;
  for (const row of await rowsFor(root, actor)) {
    if (row.e !== actor || row.v !== skill) continue;
    if (row.a === positive) successes += 1;
    else if (row.a === negative) fails += 1;
  }
  return { successes, fails };
}

// levelOf — the actor's standing in ONE skill: the numeric level derived from accrued successes
// via levelCurve, plus the SETTLED bilattice glyph of the skill cell (t = only succeeded, f = only
// failed, ⊤ = contested/both, ⊥ = never touched). The level reads off the success EVIDENCE; the
// glyph reads off the FOLD — two views of the same trace.
//   levelOf(root, actor, skill) -> { skill, level, glyph, successes, fails }
export async function levelOf(root, actor, skill) {
  const { successes, fails } = await _countEvidence(root, actor, skill);
  const thing = await view(root, actor);
  const glyph = glyphOf(thing, `skill:${skill}`, skill);
  return { skill, level: levelCurve(successes), glyph, successes, fails };
}

// skillsOf — every skill this actor has TOUCHED (any practice row, success or fail), each as a
// levelOf record. We discover touched skills by scanning the actor's rows for `skill:`/`unskill:`
// predicates rather than assuming the SKILLS map, so a skill trained through any path shows up.
//   skillsOf(root, actor) -> Array<{ skill, level, glyph, successes, fails }>
export async function skillsOf(root, actor) {
  const touched = new Set();
  for (const row of await rowsFor(root, actor)) {
    if (row.e !== actor) continue;
    if (typeof row.a === "string" && row.a.startsWith("skill:")) touched.add(row.a.slice("skill:".length));
    else if (typeof row.a === "string" && row.a.startsWith("unskill:")) touched.add(row.a.slice("unskill:".length));
  }
  const out = [];
  for (const skill of touched) out.push(await levelOf(root, actor, skill));
  return out;
}
