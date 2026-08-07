// Theorem-shaped tests for the character-agent capstone — the substrate character (personas + skills +
// disciplines + plays) against the governed-state-machine model: self = the performed union of plays;
// maturity = quiescence (mastered fraction). Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  designFromActs,
  designChronicles,
  discipline,
  skill,
  characterAgent,
  practiced,
  repertoire,
  performedSelf,
  identity,
} from "../dist/index.mjs";

const D = (entries) => designFromActs(new Map(entries));
const M = D([["", "proponent"], ["0", "proponent"]]);                     // a honed play (material vs the practice)
const A = D([["", "proponent"], ["0", "proponent"], ["1", "proponent"]]); // a play carrying ballast
const C1 = D([["", "opponent"], ["0", "opponent"]]);                      // the practice's counter-play
const Mperf = D([["", "proponent"], ["0", "opponent"]]);                  // a coherent 2-step play

const performing = discipline("performing", [M], [M, C1]);
const agent = characterAgent("rom-keldar", {
  personas: [M],
  disciplines: [performing],
  skills: [skill("phrasing", M, "procedure"), skill("rough", A, "process")],
  plays: designChronicles(Mperf),
});

test("a character-agent is a BUNDLE, not a policy stack (no state machine field)", () => {
  assert.equal(agent.kind, "playing.character-agent");
  assert.equal(agent.name, "rom-keldar");
  assert.equal(agent.personas.length, 1);
  assert.equal(agent.skills.length, 2);
});

test("PRACTICED: the disciplines that admit one of its personas are the ones it inhabits", () => {
  const ds = practiced(agent);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].name, "performing");
});

test("QUIESCENCE (wičozaní): maturity is the mastered fraction — honing, NOT a maturity ladder", () => {
  const r = repertoire(agent);
  assert.equal(r.total, 2);
  assert.equal(r.mastered.length, 1, "only the honed skill has gone material in the practice");
  assert.equal(r.mastered[0].name, "phrasing");
  assert.equal(r.quiescence, 0.5);
});

test("PERFORMED SELF: the agent IS the union of its plays — no doer behind the deed, no state machine", () => {
  const s = performedSelf(agent);
  assert.equal(s.performed, true);
  assert.equal(s.stateMachine, false);
  assert.ok(s.plays >= 1);
  assert.ok(s.self.entries.length >= 1, "a self reconstructed from the performances");
});

test("IDENTITY = the gluing of masks: disjoint faces cohere; contradicting faces DRIFT (no essence beneath)", () => {
  // two masks on disjoint loci (M at root/0, a delocated copy at 9/9.0) glue with no contradiction.
  const coherent = characterAgent("steady", {
    personas: [M, designFromActs(new Map([["9", "proponent"], ["9.0", "proponent"]]))],
    disciplines: [], skills: [], plays: [],
  });
  const i = identity(coherent);
  assert.equal(i.coherent, true);
  assert.equal(i.drift, 0);
  assert.equal(i.cohomology.kind, "playing.identity.drift-cohomology");
  assert.equal(i.cohomology.first.rank.members.length, 0);
  assert.equal(i.cohomology.vanishing.kind, "predication.cohomology.rankVanishing:witness");

  // two masks that commit OPPOSITE charges at the same locus x → ⊤ collision = identity drift.
  const drifting = characterAgent("split", {
    personas: [designFromActs(new Map([["x", "proponent"]])), designFromActs(new Map([["x", "opponent"]]))],
    disciplines: [], skills: [], plays: [],
  });
  const d = identity(drifting);
  assert.equal(d.coherent, false);
  assert.equal(d.drift, 1, "the agent shows at x what another of its faces denies — drift");
  assert.deepEqual(d.driftLoci, ["x"]);
  assert.equal(d.cohomology.kind, "playing.identity.drift-cohomology");
  assert.equal(d.cohomology.drift, d.drift);
  assert.equal(d.cohomology.first.kind, "predication.settling.firstCohomology");
  assert.equal(d.cohomology.first.rank.members.length, d.drift);
  assert.equal(d.cohomology.first.generators.length, d.drift);
  assert.equal(d.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
});

test("an UNPLAYED agent has only a latent self — it becomes someone by performing", () => {
  const fresh = characterAgent("newcomer", { personas: [M], disciplines: [performing], skills: [], plays: [] });
  const s = performedSelf(fresh);
  assert.equal(s.performed, false);
  assert.equal(s.self.entries.length, 0, "no performances yet ⇒ empty self");
  // and with no skills, quiescence is vacuously 0 (nothing honed yet).
  assert.equal(repertoire(fresh).quiescence, 0);
});
