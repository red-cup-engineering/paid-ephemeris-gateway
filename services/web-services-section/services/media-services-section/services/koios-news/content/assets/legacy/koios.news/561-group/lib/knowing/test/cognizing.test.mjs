// Theorem-shaped tests for knowing-as-the-comonad-on-Meme, run against the built dist.
// Each name is a falsifiable claim from dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md:
// knowing works the meme's knowledge order ≤_k — meme in, meme out — and the
// reflect/ruminate fork is one value of the general intelligence (regime) faculty.
import { test } from "node:test";
import assert from "node:assert/strict";

import { meme, cell, token, mark, charge, chargeValue } from "@emsenn/relating";
import {
  cognizeAction,
  absorbAction,
  reflectAction,
  ruminateAction,
  doubtAction,
  forgetAction,
  assessAction,
  gaugeAction,
  discernAction,
  recollectAction,
  inferAction,
  attendAction,
  consolidateAction,
  attractAction,
  attractorOf,
  contextualDreamFrontierAction,
  contextualDreamFrontierOf,
  contextualSpectrumAction,
  contextualSpectrumOf,
  samePatternAction,
  knowNecessarilyAction,
  knowPossiblyAction,
  cognizingTerms,
} from "../dist/index.mjs";

test("migrated meme-endomorphisms carry their CHL runTerm witnesses", () => {
  assert.deepEqual(cognizeAction.runTerm, cognizingTerms.cognize);
  assert.deepEqual(reflectAction.runTerm, cognizingTerms.reflect);
  assert.deepEqual(ruminateAction.runTerm, cognizingTerms.ruminate);
  assert.deepEqual(doubtAction.runTerm, cognizingTerms.doubt);
  assert.deepEqual(forgetAction.runTerm, cognizingTerms.forget);
});

// A minimal predicate literal: isCell only checks key presence and every cognizing
// morphism REUSES prior.cell.predicate (never inspects it), so this is faithful.
const pred = { kind: "predication.predicate", claim: { kind: "utterance.claim", hand: "right", mark: mark("knows") }, mark: mark("knows") };
const makeMeme = (subject, object, value, evidence = [[], []]) =>
  meme(cell(token(mark(subject)), pred, token(mark(object))), charge(chargeValue(value), evidence));

test("knowing-in/knowing-out: cognize (the ε-unit) preserves the cell and returns a meme", () => {
  const m = makeMeme("knower", "thing", "potential", [[mark("obs")], []]);
  const out = cognizeAction.run(m, {});
  assert.equal(out.kind, "predication.fiber.meme");
  // faithful transmission on the ≤_k axis (compare wire-shapes; the action JSON-projects)
  assert.deepEqual(out.cell, JSON.parse(JSON.stringify(m.cell)));
});

test("absorb is a ≤_k increment: potential + against-evidence settles to stable", () => {
  const m = makeMeme("knower", "thing", "potential", [[mark("obs")], []]);
  const learned = absorbAction.run(m, { evidence: "counter", side: "against" });
  const standing = assessAction.run(learned, {});
  assert.equal(standing.standing, "stable"); // both sides witnessed ⇒ ≤_k top
  assert.equal(standing.settled, true);
});

test("reflect converges (charge preserved) but ruminate is the aperiodic, never-settling regime", () => {
  const m = makeMeme("knower", "thing", "stable", [[mark("o")], [mark("c")]]);

  const reflected = reflectAction.run(m, {});
  assert.deepEqual(reflected.charge, JSON.parse(JSON.stringify(m.charge))); // ≤_k fixpoint preserved
  assert.equal(gaugeAction.run(reflected, {}).converges, true);

  const ruminated = ruminateAction.run(m, {});
  const regime = gaugeAction.run(ruminated, {});
  assert.equal(regime.regime, "aperiodic"); // κ≥ω₁ — settling that fails to settle
  assert.equal(regime.converges, false);
});

test("doubt descends ≤_k one step and forget annihilates to the ≤_k bottom (absurd)", () => {
  const m = makeMeme("knower", "thing", "stable", [[mark("o")], [mark("c")]]);
  assert.equal(assessAction.run(doubtAction.run(m, {}), {}).standing, "potential");
  assert.equal(assessAction.run(forgetAction.run(m, {}), {}).standing, "absurd");
});

test("discern reads the two derived equalities off the cell's diagonal", () => {
  const onDiagonal = discernAction.run(makeMeme("x", "x", "potential"), {});
  assert.equal(onDiagonal.onDiagonal, true);
  assert.equal(onDiagonal.classical, "t");
  assert.equal(onDiagonal.paraconsistent, "top");

  const offDiagonal = discernAction.run(makeMeme("x", "y", "potential"), {});
  assert.equal(offDiagonal.classical, "f");
  assert.equal(offDiagonal.paraconsistent, "bottom");
});

// ── wave 3: the C(Meme) knowledge-state grain ──

test("recollect folds coincident cells up ≤_k into one held section (memory)", () => {
  const a = makeMeme("s", "o", "potential", [[mark("t")], []]); // (s,o) truth-side
  const b = makeMeme("s", "o", "active", [[], [mark("f")]]);    // same cell, falsity-side
  const c = makeMeme("x", "y", "stable", [[mark("p")], [mark("q")]]);
  const state = recollectAction.run([a, b, c], { base: "demo" });
  assert.equal(state.kind, "knowing.knowledge-state");
  assert.equal(state.held, 2);     // (s,o) folded into one; (x,y) separate
  assert.equal(state.settled, 2);  // potential ∨_k active = stable; (x,y) already stable
});

test("infer is idempotent (the Kock–Zöberlein closure 2-monad)", () => {
  const state = recollectAction.run([makeMeme("s", "o", "potential", [[mark("t")], []])], { base: "demo" });
  const once = inferAction.run(state, {});
  const twice = inferAction.run(once, {});
  assert.deepEqual(twice, once); // closing twice = closing once
});

test("attend restricts the section to a fiber (attention = base-change f*)", () => {
  const state = recollectAction.run([
    makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]]),
    makeMeme("x", "y", "potential", [[mark("p")], []]),
  ], { base: "demo" });
  const stableOnly = attendAction.run(state, { standing: "stable" });
  assert.equal(stableOnly.held, 1);
  assert.equal(stableOnly.settled, 1);
});

test("consolidate reports the sheaf verdict (glues, consistency, settled fraction)", () => {
  const state = recollectAction.run([makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]])], { base: "demo" });
  const v = consolidateAction.run(state, {});
  assert.equal(v.kind, "knowing.consolidation");
  assert.equal(v.glues, true);          // the bilattice fold is confluent (H¹=0)
  assert.equal(v.settledFraction, 1);
  assert.equal(v.consistent, false);    // the held cell is a both-sides-witnessed contradiction
});

test("same-pattern judges two sections MLD-equivalent by their H¹ fingerprint", () => {
  const left = recollectAction.run([makeMeme("a", "b", "stable", [[mark("x")], [mark("y")]])], { base: "l" });
  const sameShape = recollectAction.run([makeMeme("c", "d", "stable", [[mark("u")], [mark("v")]])], { base: "r" });
  assert.equal(samePatternAction.run({ left, right: sameShape }, {}).equivalent, true);

  const otherShape = recollectAction.run([makeMeme("a", "b", "potential", [[mark("x")], []])], { base: "r" });
  assert.equal(samePatternAction.run({ left, right: otherShape }, {}).equivalent, false);
});

// ── wave 4: modal knowing (□/◇ over a world-set) ──

test("modal knowing: □ is the ≤_k meet across worlds, ◇ the ≤_k join (S5)", () => {
  const m = makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]]);
  const w1 = recollectAction.run([m], { base: "w1" });                                  // holds (s,o) stable
  const w2 = recollectAction.run([makeMeme("p", "q", "stable", [[mark("a")], [mark("b")]])], { base: "w2" }); // does not

  const box = knowNecessarilyAction.run({ meme: m, worlds: [w1, w2] }, {});
  assert.equal(box.modality, "necessity");
  assert.equal(box.value, "absurd");   // meet_k(stable, absurd) = absurd — not necessary

  const diamond = knowPossiblyAction.run({ meme: m, worlds: [w1, w2] }, {});
  assert.equal(diamond.modality, "possibility");
  assert.equal(diamond.value, "stable"); // join_k(stable, absurd) = stable — possible
  assert.equal(diamond.heldIn, 1);
});

test("attract reads MEMORY RECALL as attractor dynamics — cycle-free by the no-periodic-orbit theorem", () => {
  // a clean cue (two distinct one-sided memes) settles to its fixed-point attractor and is
  // fully RECALLABLE: the recall converges (cycle-free) to a contradiction-free pattern.
  const clean = attractorOf([
    makeMeme("a", "x", "potential", [[mark("e")], []]),
    makeMeme("b", "y", "potential", [[mark("e")], []]),
  ]);
  assert.equal(clean.kind, "knowing.attractor");
  assert.equal(clean.attractor, 2);
  assert.equal(clean.spurious, 0);
  assert.equal(clean.cycleFree, true, "the no-non-trivial-periodic-orbit theorem: recall never cycles");
  assert.equal(clean.terminates, true);
  assert.equal(clean.recallable, true);

  // a cue that asserts AND denies the SAME cell settles to a SPURIOUS attractor (⊤ told-both) —
  // a mixed/spurious recall, NOT a clean stored memory. The two coincident memes fold to one ⊤.
  const spurious = attractorOf([
    makeMeme("a", "x", "potential", [[mark("e")], []]),
    makeMeme("a", "x", "active", [[], [mark("f")]]),
  ]);
  assert.equal(spurious.attractor, 1, "coincident opposite charges fold to one attractor cell");
  assert.equal(spurious.spurious, 1, "the ⊤ told-both is a spurious recall");
  assert.equal(spurious.cycleFree, true, "still cycle-free — it converges, to a spurious fixed point");
  assert.equal(spurious.recallable, false, "a spurious (contradictory) attractor is not a clean recall");

  // a REFLEXIVE one-sided cue (a meme-about-a-meme, still one-sided) is the APERIODIC orbit —
  // a memory that keeps deepening and never fully settles (rumination): recall does NOT terminate.
  const inner = makeMeme("a", "x", "potential", [[mark("e")], []]);
  const reflexive = meme(cell(token(mark(inner)), pred, token(mark("y"))), charge(chargeValue("potential"), [[mark("e")], []]));
  const ruminating = attractorOf([reflexive]);
  assert.equal(ruminating.regime, "aperiodic");
  assert.equal(ruminating.terminates, false, "the aperiodic orbit never settles");
  assert.equal(ruminating.cycleFree, true, "even aperiodic: monotone-ascending, no periodic orbit");
  assert.equal(ruminating.recallable, false);

  // the verb is registered and dispatches a knowing/attractor resource.
  const out = attractAction.run([makeMeme("a", "x", "potential", [[mark("e")], []])], {});
  assert.equal(out.kind, "knowing.attractor");
});

import { contextualityOf } from "../dist/index.mjs";

test("contextuality (the SIGNED sibling of bind): frustration of agree/disagree constraints is the Z₂/H¹ obstruction", () => {
  // a balanced signed graph admits a global truth-assignment — NON-contextual.
  const balanced = contextualityOf(["A=B", "B=C", "A=C"]);
  assert.equal(balanced.kind, "knowing.contextuality");
  assert.equal(balanced.globalSection, true, "balanced ⇒ a consistent 2-colouring (global section) exists");
  assert.equal(balanced.contextual, false);
  assert.equal(balanced.frustration, 0);

  // the FRUSTRATED triangle A=B, B=C, A≠C: each pair is locally satisfiable, but no global
  // assignment satisfies all three — CONTEXTUAL (order effects / dissonance / conjunction fallacy).
  const frustrated = contextualityOf(["A=B", "B=C", "A!=C"]);
  assert.equal(frustrated.contextual, true, "an unbalanced cycle ⇒ no global section ⇒ contextual");
  assert.equal(frustrated.globalSection, false);
  assert.equal(frustrated.frustration, 1, "one constraint must be dropped for balance (the H¹ class)");

  // an odd cycle of inequalities (x≠y, y≠z, z≠x) is frustrated too — the negation (sign) is load-bearing.
  assert.equal(contextualityOf(["x!=y", "y!=z", "z!=x"]).contextual, true);
  // a non-contextual disagreement chain (even) glues fine.
  assert.equal(contextualityOf(["x!=y", "y!=z"]).globalSection, true);
});

test("contextual-spectrum bridges harmonic spectral residue with signed global-section obstruction", () => {
  const memes = [
    makeMeme("A", "B", "potential", [[mark("ab")], []]),
    makeMeme("B", "C", "potential", [[mark("bc")], []]),
    makeMeme("C", "A", "potential", [[mark("ca")], []]),
  ];
  const constraints = ["A=B", "B=C", "A!=C"];

  const bridge = contextualSpectrumOf({ memes, constraints });
  assert.equal(bridge.kind, "knowing.contextual-spectrum");
  assert.equal(bridge.hodge.irreducible, 1);
  assert.equal(bridge.contextuality.frustration, 1);
  assert.equal(bridge.obstruction.phase, "harmonic-contextual");
  assert.equal(bridge.praxis.action.includes("dream frontier"), true);

  const projected = contextualSpectrumAction.run({ memes, constraints }, {});
  assert.equal(projected.kind, "knowing.contextual-spectrum");
  assert.equal(projected.obstruction.phase, "harmonic-contextual");
});

test("contextual-dream-frontier promotes global-section obstruction into aperiodic residue", () => {
  const memes = [
    makeMeme("A", "B", "potential", [[mark("ab")], []]),
    makeMeme("B", "C", "potential", [[mark("bc")], []]),
    makeMeme("C", "A", "potential", [[mark("ca")], []]),
  ];
  const constraints = ["A=B", "B=C", "A!=C"];

  const frontier = contextualDreamFrontierOf({ memes, constraints, limit: 1 });
  assert.equal(frontier.kind, "knowing.contextual-dream-frontier");
  assert.equal(frontier.regime, "aperiodic");
  assert.equal(frontier.spectrum.obstruction.phase, "harmonic-contextual");
  assert.equal(frontier.bridge.active, true);
  assert.equal(frontier.observations.length, 2);
  assert.equal(frontier.residue.pairs.length, 1);
  assert.deepEqual(frontier.residue.pairs[0].finiteReachability, {
    "strict-finite": false,
    "scott-continuous": false,
    transfinite: false,
  });
  assert.equal(frontier.dream.candidates.length, 1);
  assert.equal(frontier.praxis.interventions.length, 1);
  assert.equal(frontier.theory.dream, "aperiodic-non-convergence");

  const projected = contextualDreamFrontierAction.run({ memes, constraints, limit: 1 }, {});
  assert.equal(projected.kind, "knowing.contextual-dream-frontier");
  assert.equal(projected.residue.pairs[0].strictRegimeExclusions.length, 3);
});
