/**
 * regime.test — the four-regime stratification of consensus, and its INDEPENDENCE from
 * the opposition-cycle H¹.
 *
 * socializing realizes the corpus's four-regime dichotomy (content/_archive:
 * regime-classification-for-substrate, regime-record, crdt-convergence-via-cohomological-calm):
 * every settling is classified by its closure ordinal κ into strict (κ<ω),
 * scott-continuous (κ=ω), transfinite-bounded (ω<κ<ω₁), or aperiodic (κ≥ω₁). The joint
 * regime of a society is the max-κ ("meet") over its observers. By cohomological-CALM,
 * the CRDT merge is coordination-free BY REGIME exactly in strict / scott-continuous (κ
 * ≤ ω); transfinite-bounded / aperiodic must ship the trajectory, not the endpoint.
 *
 * The load-bearing point these tests assert: the REGIME axis (dynamic — does the merge
 * need coordination?) is ORTHOGONAL to the OPPOSITION-H¹ axis (static — do the fixed
 * opinions glue?). A strict field can have opposed opinions (obstruction > 0) yet still
 * be coordination-free by regime; an aperiodic field can have agreeing opinions
 * (obstruction = 0) yet NOT be coordination-free by regime.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { meme, cell, token, mark, charge, chargeValue } from "@emsenn/relating";
import {
  emptyField,
  admitAction,
  broadcastAction,
  attendAction,
  convergeAction,
  REGIMES,
  regimeRank,
  asRegime,
  jointRegime,
  coordinationFreeByRegime,
  federationDiscipline,
  observerRegime,
} from "@emsenn/socializing";

/** A meme over a trivial cell, charged `potential` (truth witnessed). */
function seedMeme(label) {
  const c = cell(token(mark(label)), mark(`predicate:${label}`), token(mark("topic")));
  return meme(c, charge(chargeValue("potential"), [[mark(`${label}-w`)], []]));
}

/** An agent carrier optionally DECLARING its regime (the substrate parameter). */
function agentDeclaring(id, regime) {
  return regime === undefined
    ? { kind: "animating.agent", identity: id }
    : { kind: "animating.agent", identity: id, regime };
}

/** A society of observers, each declaring (or defaulting) a regime. */
function societyOf(declared) {
  let field = emptyField();
  declared.forEach((regime, i) => {
    field = admitAction.run(field, { agent: agentDeclaring(`o${i}`, regime) });
  });
  return field;
}

/** Override the observer category's translations so the comparison graph is `pairs`. */
function withEdges(field, pairs) {
  return { ...field, base: { kind: "socializing.social-base", translations: pairs.map(([source, target]) => ({
    kind: "socializing.translation", source, target,
    channel: { kind: "communicating.messaging.channel", medium: "t",
      from: { kind: "communicating.speaking.signifying.semiosphere", name: "a" },
      to: { kind: "communicating.speaking.signifying.semiosphere", name: "b" }, capacity: null } })) } };
}

/** Seed every observer with a positive meme; attend `negatives` to flip them active. */
function stances(field, negatives) {
  for (let i = 0; i < field.members.length; i++) field = broadcastAction.run(field, { from: i, to: i, meme: seedMeme(`m${i}`) });
  for (const i of negatives) field = attendAction.run(field, { member: i });
  return field;
}

// --- the four-regime model ---

test("the four regimes are κ-ordered: strict < scott-continuous < transfinite-bounded < aperiodic", () => {
  assert.deepEqual([...REGIMES], ["strict", "scott-continuous", "transfinite-bounded", "aperiodic"]);
  assert.ok(regimeRank("strict") < regimeRank("scott-continuous"));
  assert.ok(regimeRank("scott-continuous") < regimeRank("transfinite-bounded"));
  assert.ok(regimeRank("transfinite-bounded") < regimeRank("aperiodic"));
});

test("asRegime defaults an undeclared/invalid value to strict (finite, quantifier-free)", () => {
  assert.equal(asRegime(undefined), "strict");
  assert.equal(asRegime("nonsense"), "strict");
  assert.equal(asRegime("aperiodic"), "aperiodic");
  assert.equal(observerRegime(undefined), "strict");
  assert.equal(observerRegime({ regime: "transfinite-bounded" }), "transfinite-bounded");
});

test("the joint regime is the max-κ (meet) over observers — the strictest discipline wins", () => {
  assert.equal(jointRegime([]), "strict", "the empty society is strict");
  assert.equal(jointRegime(["strict", "strict"]), "strict");
  assert.equal(jointRegime(["strict", "aperiodic", "scott-continuous"]), "aperiodic", "one aperiodic observer escalates the whole society");
  assert.equal(jointRegime(["strict", "scott-continuous"]), "scott-continuous");
});

test("CALM by regime: coordination-free iff strict or scott-continuous (κ ≤ ω)", () => {
  assert.equal(coordinationFreeByRegime("strict"), true);
  assert.equal(coordinationFreeByRegime("scott-continuous"), true);
  assert.equal(coordinationFreeByRegime("transfinite-bounded"), false);
  assert.equal(coordinationFreeByRegime("aperiodic"), false);
});

test("federation discipline: endpoint-state in strict/scott, trajectory in transfinite/aperiodic", () => {
  assert.equal(federationDiscipline("strict"), "endpoint-state");
  assert.equal(federationDiscipline("scott-continuous"), "endpoint-state");
  assert.equal(federationDiscipline("transfinite-bounded"), "trajectory");
  assert.equal(federationDiscipline("aperiodic"), "trajectory");
});

// --- converge writes the regime stratification ---

test("converge classifies the joint regime and writes the CALM reading + federation discipline", () => {
  // a society of undeclared observers defaults to strict.
  let strictField = societyOf([undefined, undefined]);
  strictField = withEdges(stances(strictField, []), [[0, 1]]);
  const strictOut = convergeAction.run(strictField, {});
  assert.equal(strictOut.section.regime, "strict");
  assert.equal(strictOut.section.regimeCoordinationFree, true, "strict ⇒ coordination-free by regime");
  assert.equal(strictOut.section.federationDiscipline, "endpoint-state");

  // one observer declaring aperiodic escalates the joint regime.
  let aperiodicField = societyOf(["aperiodic", undefined]);
  aperiodicField = withEdges(stances(aperiodicField, []), [[0, 1]]);
  const aperiodicOut = convergeAction.run(aperiodicField, {});
  assert.equal(aperiodicOut.section.regime, "aperiodic", "max-κ over observers");
  assert.equal(aperiodicOut.section.regimeCoordinationFree, false, "aperiodic ⇒ NOT coordination-free by regime");
  assert.equal(aperiodicOut.section.federationDiscipline, "trajectory", "aperiodic must ship the trajectory");
});

// --- the load-bearing independence law: the two axes are orthogonal ---

test("INDEPENDENCE: a STRICT field with opposed opinions is coordination-free by regime yet does NOT glue", () => {
  // a 4-cycle of opposed opinions ⇒ opposition-H¹ > 0, but all observers are strict.
  let field = societyOf([undefined, undefined, undefined, undefined]);
  field = withEdges(stances(field, [1, 3]), [[0, 1], [1, 2], [2, 3], [3, 0]]);
  const out = convergeAction.run(field, {});
  // static opinion axis: the fixed opinions do NOT glue.
  assert.ok(out.section.obstruction > 0, "opposed-opinion cycle ⇒ static H¹ > 0");
  assert.equal(out.section.coordinationFree, false, "the opinions do not glue (static)");
  // dynamic regime axis: the merge is STILL coordination-free by regime (orthogonal).
  assert.equal(out.section.regime, "strict");
  assert.equal(out.section.regimeCoordinationFree, true, "regime coordination-freeness is independent of opinion gluing");
});

test("INDEPENDENCE: an APERIODIC field with agreeing opinions glues yet is NOT coordination-free by regime", () => {
  // two agreeing observers (no opposition) ⇒ opposition-H¹ = 0; both aperiodic.
  let field = societyOf(["aperiodic", "aperiodic"]);
  field = withEdges(stances(field, []), [[0, 1]]);
  const out = convergeAction.run(field, {});
  // static opinion axis: the opinions glue.
  assert.equal(out.section.obstruction, 0, "agreeing opinions ⇒ static H¹ = 0");
  assert.equal(out.section.coordinationFree, true, "the opinions glue (static)");
  // dynamic regime axis: convergence is NOT coordination-free by regime (orthogonal).
  assert.equal(out.section.regimeCoordinationFree, false, "aperiodic merge needs coordination despite agreement");
  assert.equal(out.section.federationDiscipline, "trajectory");
});
