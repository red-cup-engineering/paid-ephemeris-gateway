// Theorem-shaped tests for the skill/discipline layer — the corpus's own agentics on the ludic
// substrate: a discipline = a behaviour; a skill = a typed reusable design mastered when material +
// admitted, composing via the cut; the skillful-work quartet. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  designFromActs,
  discipline,
  admits,
  skill,
  mastery,
  composes,
  nucleus,
  phase,
  SKILLFUL_WORK,
} from "../dist/index.mjs";

const D = (entries) => designFromActs(new Map(entries));
const M = D([["", "proponent"], ["0", "proponent"]]);                     // a honed play — no ballast
const A = D([["", "proponent"], ["0", "proponent"], ["1", "proponent"]]); // a play carrying ballast (locus 1)
const C1 = D([["", "opponent"], ["0", "opponent"]]);                      // the practice's counter-play

test("DISCIPLINE = a behaviour: the magic-circle'd set of plays that count; admits its own, not the counter", () => {
  const performing = discipline("performing", [M], [M, C1]);
  assert.equal(performing.kind, "playing.discipline");
  assert.equal(admits(performing, M), true, "M's play counts in the practice");
  assert.equal(admits(performing, C1), false, "the counter-play is not a play OF the practice");
});

test("MASTERY = material + admitted: a honed skill goes material in its discipline (no ballast)", () => {
  const performing = discipline("performing", [M], [M, C1]);
  const phrasing = skill("phrasing", M, "procedure");
  const m = mastery(phrasing, performing);
  assert.equal(m.material, true, "M is incarnated with no ballast against the practice");
  assert.equal(m.admitted, true);
  assert.equal(m.mastered, true);
});

test("an ADMITTED but UN-HONED skill carries ballast — admitted yet not mastered (becoming, not arrived)", () => {
  const craft = discipline("craft", [A], [A, C1]);
  const rough = skill("rough", A, "process");
  const m = mastery(rough, craft);
  assert.equal(m.admitted, true, "the play counts in the practice");
  assert.equal(m.material, false, "but it carries ballast — wasted commitment, not yet honed");
  assert.equal(m.mastered, false);
});

test("skills COMPOSE via the cut: the output of one meets the input of the other (orthogonal)", () => {
  const ask = skill("ask", A, "inquiry");
  const answer = skill("answer", C1, "derivation");
  assert.equal(composes(ask, answer), true, "their designs are orthogonal — the interaction converges");
  assert.equal(composes(ask, ask), false, "a skill does not chain with itself (no Daimon collision)");
});

test("the SKILLFUL-WORK quartet is the σ/Δ nuclei × phase", () => {
  assert.deepEqual([...SKILLFUL_WORK].sort(), ["derivation", "inquiry", "procedure", "process"]);
  // σ = meaning (inquiry, derivation); Δ = execution (procedure, process).
  assert.equal(nucleus("inquiry"), "meaning");
  assert.equal(nucleus("derivation"), "meaning");
  assert.equal(nucleus("procedure"), "execution");
  assert.equal(nucleus("process"), "execution");
  // phase: opening (the question / the method) vs settled (the proof / the run).
  assert.equal(phase("inquiry"), "opening");
  assert.equal(phase("procedure"), "opening");
  assert.equal(phase("derivation"), "settled");
  assert.equal(phase("process"), "settled");
});
