/**
 * animating — end-to-end tests of the agency descent over the built package.
 *
 * The tests pin the load-bearing claims of dev/docs/notes/2026-06-21-animating-as-
 * agency-descent.md: the four stage readings are projections of ONE descent run
 * (not four separate computations); the bottom codomain is a glued individual
 * sheaf (H¹=0) read as a perceive→act loop; the goal is a bilattice-charged target
 * that the settled section either carries or not; perceive threads memory; reseed
 * re-poses the individual; and the kept seeds (handedness polarity) still hold.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { knowingFace } from "@emsenn/knowing";
import { communicatingFace } from "@emsenn/communicating";
import { playingFace } from "@emsenn/playing";
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
  peerHandedness,
  handednessFrom,
  dualHandedness,
  isSymmetricPeer,
  glue,
  face,
  project,
  factor,
} from "../dist/index.mjs";

const SEED = "the-sky|is-blue\nthe-sky|is-vast\nthe-sea|is-blue";

test("one descent, four readings — the stage carriers project the SAME state", () => {
  const state = descend(admitSeed(SEED));
  const b = animate(state);
  const d = enact(state);
  const w = labor(state);
  const g = individuate(state);

  // regime / stage / face spine, in order
  assert.deepEqual(
    [b.regime, d.regime, w.regime, g.regime],
    ["aperiodic", "transfinite", "scott-continuous", "finite"],
  );
  assert.deepEqual([b.stage, d.stage, w.stage, g.stage], ["articulate", "predicate", "posit", "settle"]);
  assert.deepEqual([b.face, d.face, w.face, g.face], ["animate", "agential", "agentic", "individual"]);
  assert.deepEqual([b.epistemic, d.epistemic, w.epistemic, g.epistemic], ["question", "judgement", "belief", "knowledge"]);

  // becoming: the aperiodic seed in pure potential
  assert.equal(b.kind, "animating.becoming");
  assert.equal(b.cells, 3);
  assert.equal(b.seed.length, 3);
  assert.equal(b.openAbove, true);

  // doing: the value-free predication base Φ = E × Π × E (the seat of communicating)
  assert.equal(d.valued, false);
  assert.equal(d.faculty, "communicating");
  assert.equal(d.entities, 2);
  assert.equal(d.predicates, 2);
  assert.equal(d.cells, 3);

  // working: the charged presheaf, value entered as a knowledge-monotone trace (seat of knowing).
  // `valuations` reads the settlement closure ORBIT (filtration.stages) — the real trace from
  // bottom to fixed point — not the presheaf's bottom-seed `traces` (which is structurally pinned to 1).
  assert.equal(w.valued, true);
  assert.equal(w.faculty, "knowing");
  assert.ok(w.valuations >= 1);
  assert.equal(w.valuations, state.filtration.stages.length, "working reads the real closure orbit, not the bottom-seed traces");
  assert.equal(w.cohomology.kind, "animating.working.cohomology");
  assert.equal(w.cohomology.cells, w.cells);
  assert.equal(w.cohomology.valuations, w.valuations);
  assert.equal(w.cohomology.h1, w.cohomology.laplacian.cohomology.firstCohomology.rank.members.length);
  assert.ok(w.cohomology.h1 > 0, "the shared generated working field carries its finite H1 loop receipt");
  assert.equal(w.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(w.cohomology.laplacian.kind, "predication.cohomology.laplacian");
  assert.equal(w.cohomology.laplacian.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");

  // governing: the glued individual sheaf, H¹=0
  assert.equal(g.settled, true);
  assert.equal(g.glued, g.cohomologyRank === 0);
  assert.equal(g.glued, true);
});

test("the spine: animate a seed into the interior agent (a perceive→act loop)", () => {
  const a = agent(SEED, { identity: "observer" });
  assert.equal(a.kind, "animating.agent");
  assert.equal(a.loop, "perceive->act");
  assert.equal(a.identity, "observer");
  assert.equal(a.settledBelow, true);
  assert.equal(a.openAbove, true);

  // the agent IS the glued individual sheaf the descent settles to
  const g = individuate(descend(admitSeed(SEED)));
  assert.equal(a.governing.glued, g.glued);
  assert.equal(a.perception.held, g.cells);

  // made-of: perception, action, goal
  assert.equal(a.perception.kind, "animating.agent.perception");
  assert.equal(a.action.kind, "animating.agent.action");
  assert.equal(a.goal.kind, "animating.agent.goal");

  // the associated milieu (Simondon): residual potential = cells not at the knowledge-top (not stable)
  assert.equal(a.milieu, a.perception.held - a.perception.contested);
});

test("the goal is a bilattice-charged target the settled section carries or not", () => {
  const carried = agent("the-sky|is-blue", { goal: { predicate: "is-blue", charge: "potential" } });
  assert.equal(carried.goal.predicate, "is-blue");
  assert.equal(carried.goal.satisfied, true);

  const absent = agent("the-sky|is-blue", { goal: { predicate: "is-green", charge: "potential" } });
  assert.equal(absent.goal.satisfied, false);
});

test("perceive threads memory (append-only), act emits commitments, reseed re-poses the individual", () => {
  const fresh = perceive("the-wind|is-cold", undefined, { identity: "observer" });
  const remembered = perceive("the-wind|is-cold", "the-sky|is-blue", { identity: "observer" });
  assert.ok(remembered.perception.held > fresh.perception.held, "memory grows the held section");

  const output = act(SEED, { identity: "observer" });
  assert.equal(output.kind, "animating.agent.act");
  assert.ok(Array.isArray(output.commitments));

  const next = reseed(SEED, { identity: "observer" });
  assert.equal(next.kind, "animating.becoming");
  assert.deepEqual(next.seed, ["observer|individuated"]);
  assert.equal(next.openAbove, true);
});

test("the kept polarity seed: handedness is Player/Opponent duality (-)^⊥", () => {
  assert.equal(isSymmetricPeer(peerHandedness()), true);
  // an agent that can recv/observe but not send/actuate is asymmetric, and its dual swaps the sides
  const sensor = handednessFrom(["recv", "observe"]);
  assert.equal(isSymmetricPeer(sensor), false);
  const dual = dualHandedness(sensor);
  assert.equal(dual.send, sensor.recv);
  assert.equal(dual.actuate, sensor.observe);
});

test("the holographic node: glue three boundary faces into the interior agent (global section)", () => {
  const a = glue(
    { communicating: "the-sky|is-blue", knowing: "the-self|is-aware", playing: "the-world|is-open" },
    { identity: "observer" },
  );
  // the agent is the interior bulk, seen through its three faces
  assert.equal(a.kind, "animating.agent");
  assert.equal(a.faces.length, 3);
  assert.deepEqual(a.faces.map((f) => f.faculty), ["communicating", "knowing", "playing"]);
  assert.deepEqual(a.faces.map((f) => f.direction), ["across", "inside", "outside"]);

  // glued is the sheaf condition (H¹=0 over the three-cover); here the faces agree
  assert.equal(a.glued, true);
  assert.equal(a.governing.glued, a.glued);

  // a single face is a local section over its cover
  const f = face("knowing", [["the-self", "is-aware"], ["the-self", "is-bounded"]]);
  assert.equal(f.kind, "animating.face");
  assert.equal(f.faculty, "knowing");
  assert.equal(f.direction, "inside");
  assert.equal(f.held, 2);

  // an absent face is the empty cover, and glue still founds the agent from the rest
  const partial = glue({ communicating: "a|p" });
  assert.equal(partial.faces.find((x) => x.faculty === "playing").held, 0);
});

test("the bulk consolidates each face's FOUR census (told-nothing/true/false/both) on its axis", () => {
  // communicating's ACROSS face on the TRUTH axis: the same subject both asserted and
  // denied pools to ⊤ (told-both) — the held truth contradiction (negation antitone).
  const a = glue({
    communicating: "the-sky|blue\nthe-sky|not blue",
    knowing: "the-self|is-aware",
    playing: "the-world|is-open",
  });
  for (const f of a.faces) {
    // every face carries the four-valued Belnap census it was read from (not the thin trio alone)
    assert.equal(typeof f.belnap.absurd, "number");
    // held cells are exactly the non-absurd corners; contested cells are exactly the told-both ⊤
    assert.equal(f.held, f.belnap.potential + f.belnap.active + f.belnap.stable, `${f.faculty} held = non-absurd census`);
    assert.equal(f.contested, f.belnap.stable, `${f.faculty} contested = told-both`);
  }
  const across = a.faces.find((f) => f.faculty === "communicating");
  assert.equal(across.axis, "truth");
  assert.equal(across.belnap.stable, 1, "asserted AND denied the same subject ⇒ one told-both cell");
  assert.equal(across.contested, 1);

  // a single projected face exposes its census directly (the thick reading is on the carrier)
  const f = face("communicating", [["x", "blue"], ["x", "not blue"]]);
  assert.equal(f.belnap.stable, 1);
  assert.equal(f.held, f.belnap.potential + f.belnap.active + f.belnap.stable);
});

test("the bulk consolidates each face's collective standing (the ≤_k join / aggregate)", () => {
  // a cell held both for and against accumulates to ⊤ told-both — the ≤_k join's top
  const a = glue({ knowing: "x|p\nx|not p", communicating: "y|q", playing: "z|r" });
  const byFaculty = (f) => a.faces.find((x) => x.faculty === f);

  assert.equal(byFaculty("knowing").aggregate, "stable", "for AND against on one cell ⇒ ⊤ collective standing");
  assert.equal(byFaculty("communicating").aggregate, "potential", "a lone for-assertion stands as potential");

  // the bulk's derived aggregate is FAITHFUL: it equals knowing's OWN joinK aggregate
  const membrane = descend(admitSeed("x|p\nx|not p")).utterances;
  assert.equal(byFaculty("knowing").aggregate, knowingFace(membrane).aggregate, "derived ∨_k = the faculty's own aggregate");

  // an empty face stands at the ≤_k bottom ⊥
  const partial = glue({ communicating: "a|b" });
  assert.equal(partial.faces.find((f) => f.faculty === "playing").aggregate, "absurd", "no contribution ⇒ ⊥ absurd");
});

test("playing's evidence twist product ⟨a₊,a₋⟩: denials read as AGAINST, opposition as the Daimon ⊤", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // FIX (was: playing read the all-positive generic descent, so a₋ and the Daimon were always 0).
  // a denial now commits the AGAINST side a₋ (Opponent), not another for-record.
  const denials = playingFace(m("x|p\ny|not q\nz|not r"));
  assert.equal(denials.forCount, 1, "one assertion ⇒ one a₊");
  assert.equal(denials.againstCount, 2, "two denials ⇒ two a₋ (was 0 before the fix)");
  // an assertion AND its denial of the same content pool to the Daimon ⊤ = ⟨1,1⟩ (told-both)
  const opposed = playingFace(m("alice|trusts\nalice|not trusts\nbob|helps"));
  assert.equal(opposed.daimonCount, 1, "asserted+denied ⇒ one Daimon ⊤ (was 0 before the fix)");
  assert.equal(opposed.forCount, 1, "the lone unopposed assertion (bob|helps) stays a₊");
});

test("communicating's real work: the collective LEAN (≤_t join — which way the membrane leans)", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // a lone assertion leans FOR; a lone denial leans AGAINST (the truth-order ∨_t direction)
  assert.equal(communicatingFace(m("x|p")).lean, "potential", "an assertion leans for");
  assert.equal(communicatingFace(m("x|not p")).lean, "active", "a denial leans against");
  // the same subject asserted AND denied is POLARIZED — told-both wins the ≤_t join
  assert.equal(communicatingFace(m("x|p\nx|not p")).lean, "stable", "asserted+denied ⇒ polarized lean ⊤");
  // mixed subjects: at least one strong FOR carries the collective lean for (∨_t is the LUB)
  assert.equal(communicatingFace(m("x|p\ny|not q")).lean, "potential", "one strong for carries the lean (∨_t)");
});

test("knowing's real work: the settling REGIME of the orbit (reflect vs ruminate — gauge/intelligence)", () => {
  const m = (seed) => descend(admitSeed(seed)).utterances;
  // a one-sided knowledge settles at ω — scott-continuous, REFLECTING (reaches a ≤_k fixpoint)
  const onesided = knowingFace(m("x|p"));
  assert.equal(onesided.regime.reflects, true, "a settling orbit reflects");
  assert.equal(onesided.regime.regime, "scott-continuous");
  // a knowledge resolved to ⊤ (told both, the ≤_k top) is strict-finite — fully settled
  const resolved = knowingFace(m("x|p\nx|not p"));
  assert.equal(resolved.aggregate, "stable");
  assert.equal(resolved.regime.regime, "strict-finite");
  assert.equal(resolved.regime.reflects, true);
});

test("the agent CONSOLIDATES its communicating face's LEAN as its STANCE (the ≤_t truth axis, dual to cognition's ≤_k)", () => {
  // the agent's truth STANCE is read off the communicating (across) face — the bulk no longer
  // discards the ≤_t lean. Negation is ANTITONE: asserting leans FOR, denying leans AGAINST.
  const asserts = agent("alice|trusts\nbob|helps");
  assert.equal(asserts.stance.kind, "animating.agent.stance");
  assert.equal(asserts.stance.lean, communicatingFace(descend(admitSeed("alice|trusts\nbob|helps")).utterances).lean,
    "the agent's stance lean IS its communicating face's lean (consolidated, not recomputed)");
  assert.equal(asserts.stance.lean, "potential", "an asserting agent leans FOR (≤_t up)");

  const denies = agent("alice|not trusts\nbob|not helps");
  assert.equal(denies.stance.lean, "active", "a denying agent leans AGAINST (≤_t down — negation antitone)");

  // a torn agent (asserts AND denies one thing) is polarized ⊤ on the truth axis.
  assert.equal(agent("alice|trusts\nalice|not trusts").stance.lean, "stable");
});

test("the agent's COHERENCE: Heider structural balance, consolidated from knowing's contextuality", () => {
  // a BALANCED sentiment triad (Heider): two friends share a common enemy — no dissonance.
  const balanced = agent("alice|likes bob\nalice|dislikes carol\nbob|dislikes carol");
  assert.equal(balanced.coherence.kind, "animating.agent.coherence");
  assert.equal(balanced.coherence.balanced, true, "a common-enemy triad is balanced (no dissonance)");
  assert.equal(balanced.coherence.dissonance, 0);
  assert.equal(balanced.coherence.ties, 3);

  // a DISSONANT triad: the friend of my friend is my enemy — an imbalanced (frustrated) signed cycle.
  const dissonant = agent("alice|likes bob\nbob|likes carol\nalice|dislikes carol");
  assert.equal(dissonant.coherence.balanced, false, "the friend-of-friend-is-enemy triad is imbalanced");
  assert.equal(dissonant.coherence.dissonance, 1, "one frustrated tie (the Z₂/H¹ obstruction = cognitive dissonance)");

  // non-sentiment claims contribute no tie — coherence is over the agent's SOCIAL beliefs.
  assert.equal(agent("alice|trusts-bob\nbob|helps").coherence.ties, 1, "trusts is a sentiment tie; helps is not");
});

test("the agent CONSOLIDATES its knowing face's regime as its COGNITION (does its knowledge reflect or ruminate)", () => {
  // the agent's interior knowledge regime is read off the knowing (inside) face and surfaced
  // as `cognition` — the bulk no longer discards knowing's gauge/regime faculty.
  const a = agent("x|p");
  assert.equal(a.cognition.kind, "animating.agent.cognition");
  assert.equal(a.cognition.regime, knowingFace(descend(admitSeed("x|p")).utterances).regime.regime,
    "the agent's cognition regime IS its knowing face's regime (consolidated, not recomputed)");
  assert.equal(a.cognition.reflects, true, "a settling agent reflects (its knowledge converges — recallable)");

  // a knowledge resolved to ⊤ is strict-finite (fully settled) — still reflecting.
  const resolved = agent("x|p\nx|not p");
  assert.equal(resolved.cognition.regime, "strict-finite");
  assert.equal(resolved.cognition.reflects, true);
});

test("the bulk consolidates each face's BIGRADED cohomology decomposition F^(k) ≅ F^(t) ⊕ F^(⊤)", () => {
  // a CONSISTENT face (no held contradictions) collapses: F^(⊤)=0, the bigrading degenerates
  // to single-graded truth cohomology — the strict/Scott regime, fully CALM / coordination-free
  const consistent = glue({ communicating: "y|q", knowing: "z|r", playing: "w|s" });
  for (const f of consistent.faces) {
    assert.equal(f.bigrade.contradiction, 0, "no told-both ⇒ empty contradiction row");
    assert.equal(f.bigrade.collapsed, true, "F^(⊤)=0 ⇒ bigrading collapses (consistent regime)");
    assert.equal(f.bigrade.truth + f.bigrade.contradiction, f.held, "F^(t) ⊕ F^(⊤) = the held content");
  }

  // an INCONSISTENT face (a subject asserted AND denied) is genuinely 2-dimensional:
  // the m=1 contradiction row carries content (= contested = belnap.stable)
  const incoherent = glue({ knowing: "x|p\nx|not p" });
  const k = incoherent.faces.find((f) => f.faculty === "knowing");
  assert.ok(k.bigrade.contradiction >= 1, "for AND against ⇒ non-empty contradiction row (inconsistent settling)");
  assert.equal(k.bigrade.collapsed, false, "F^(⊤)≠0 ⇒ genuinely 2-dimensional bigrading");
  assert.equal(k.bigrade.contradiction, k.contested, "the m=1 row is exactly the held contradictions");
});

test("the agent applies the NEGATION involution: a held contradiction (⊤) is genuinely reachable", () => {
  // the generic descent charges everything positive (contested ≡ 0); the agent now reads its
  // membrane with the bilattice negation involution `negate` (content/…/negation.md: ~⟨a₊,a₋⟩ =
  // ⟨a₋,a₊⟩), so an assertion AND its denial of one content pool to ⊤ (told-both).
  const coherent = agent("x|p\ny|q");
  assert.equal(coherent.perception.contested, 0, "no opposition ⇒ no held contradiction");
  const contradicted = agent("x|p\nx|not p");
  assert.equal(contradicted.perception.contested, 1, "asserted AND denied ⇒ one held contradiction ⊤ (was 0 before the involution)");
  assert.ok(contradicted.action.affordances >= 1, "the ⊤ cell is an open affordance the agent can act on");
});

test("the agent's CHARACTER (ēthos): the dispositional nucleus χ and behavioral space F_χ=Fix(χ)", () => {
  // a uniform agent that endorses every cell alike has NO selective character — F_χ = H
  const uniform = glue({ communicating: "x|p\ny|q", knowing: "z|r", playing: "w|s" });
  assert.equal(uniform.character.kind, "animating.agent.character");
  assert.equal(uniform.character.coherent, true, "a coherent agent endorses something (F_χ ≠ ∅)");
  assert.equal(uniform.character.constrains, false, "endorsing all cells alike ⇒ no selective disposition (F_χ = H)");

  // a diverse agent (a contested face) has a REAL character — a selective behavioral space F_χ ⊊ H
  const mixed = glue({ communicating: "a|trusts\na|not trusts", knowing: "b|knows", playing: "c|wins" });
  assert.equal(mixed.character.constrains, true, "a selective disposition ⇒ F_χ ⊊ H (a real character)");
  assert.equal(mixed.character.signature, "stable", "the contested agent's disposition leans ⊤ (told-both)");
  assert.ok(mixed.character.behavioralSpace >= 1, "the character endorses cells at its characteristic standing");
  // the identity + character together are the agent's PERSONA (the persistent identity bearing the character)
  assert.equal(typeof mixed.identity, "string");
});

test("the holographic projection: you see the agent only through its three faces", () => {
  const a = glue({ communicating: "the-sky|is-blue", knowing: "the-self|is-aware", playing: "the-world|is-open" }, { identity: "observer" });
  const view = project(a);
  assert.equal(view.kind, "animating.projection");
  assert.equal(view.identity, "observer");
  // the Mayer–Vietoris coordination-cost reading of H¹
  assert.equal(view.glued, true);
  assert.equal(view.coordination, "coordination-free");
  // every face of the bulk is recovered on the boundary
  assert.equal(view.communicating.faculty, "communicating");
  assert.equal(view.knowing.direction, "inside");
  assert.equal(view.playing.direction, "outside");
});

test("the act-factorization: L/I/P consolidated from each face's OWN reading (not a generic descend)", () => {
  const state = descend(admitSeed(SEED));
  const f = factor("communicating", state);
  assert.equal(f.kind, "animating.factorization");
  assert.equal(f.faculty, "communicating");
  assert.equal(f.axis, "truth"); // provisional agentive-triad axis
  assert.equal(f.dual, "producing"); // the personal-scale act is producing; its receiving dual is organizing's adjudication

  // The L/I/P is the face's settling FUNNEL — locution (raw locutionary acts: the
  // membrane utterances) ⊇ illocution (the distinct charged cells = the face's cover)
  // ⊇ perlocution (the cells that took settled effect = the face's held standing).
  assert.equal(f.locution, state.utterances.length, "locution = the membrane's locutionary acts");
  assert.ok(f.locution >= f.illocution && f.illocution >= f.perlocution, "L ⊇ I ⊇ P (the select→force→effect funnel)");

  // belnap is the face's OWN truth-axis census (not a generic section count): the face's
  // cover partitions into the FOUR, so illocution (cover) = the full census and
  // perlocution (held) = the non-absurd census.
  assert.equal(f.illocution, f.belnap.absurd + f.belnap.potential + f.belnap.active + f.belnap.stable, "illocution = cover = full FOUR census");
  assert.equal(f.perlocution, f.belnap.potential + f.belnap.active + f.belnap.stable, "perlocution = held = non-absurd census");

  // each faculty factors over its OWN structure on its OWN axis (provisional but total)
  assert.equal(factor("knowing", state).axis, "knowledge");
  assert.equal(factor("playing", state).axis, "evidence");
});

test("admitSeed accepts string lines and JSON array items", () => {
  const fromString = descend(admitSeed("a|p\nb|q"));
  const fromArray = descend(admitSeed([["a", "p"], { subject: "b", predicate: "q" }]));
  assert.equal(animate(fromString).cells, animate(fromArray).cells);
  assert.equal(enact(fromString).predicates, enact(fromArray).predicates);
});
