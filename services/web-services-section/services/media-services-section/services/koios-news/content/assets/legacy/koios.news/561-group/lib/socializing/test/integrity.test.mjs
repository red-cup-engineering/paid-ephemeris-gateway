// Theorem-shaped tests for the STRUCTURAL-cluster detectors of the californication note (§9): the
// coagulation guard, structural foreclosure watch, racket index, vitality reading, secession, and the
// savior-slave census. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  coagulationGuard,
  foreclosureWatch,
  racketIndex,
  vitalityReading,
  secede,
  saviorSlaveCensus,
} from "../dist/index.mjs";

const power = (active, passive, scope = "x") => ({ kind: "power", active, passive, scope, standing: "potential" });
const duty = (active, scope = "x", passive = "polity") => ({ kind: "duty", active, passive, scope, standing: "potential" });

test("COAGULATION GUARD flags an emerging dominator and names the Clastrean antidotes", () => {
  // king holds power over a, b, c — a strict majority of the other three.
  const g = coagulationGuard([power("king", "a"), power("king", "b"), power("king", "c")]);
  assert.equal(g.coagulating, true);
  assert.equal(g.dominator, "king");
  assert.equal(g.dominion, 3);
  assert.equal(g.concentration, 1);
  assert.deepEqual(g.antidotes, ["rotate", "clastrean-conversion", "secede", "refuse"]);
  // distributed power (a↔b only) does not coagulate.
  const flat = coagulationGuard([power("a", "b"), power("b", "a")]);
  assert.equal(flat.coagulating, false);
  assert.deepEqual(flat.antidotes, []);
});

test("FORECLOSURE WATCH: the lattice keeps its bottom until one agent holds EVERY capability", () => {
  // two agents, capabilities split → the belong-to-nothing standpoint survives.
  const open = foreclosureWatch([
    { agent: "a", capability: "power:x" },
    { agent: "b", capability: "duty:y" },
  ]);
  assert.equal(open.foreclosed, false);
  assert.equal(open.exitBottomPresent, true);
  assert.equal(open.monopolist, null);

  // one agent holds all capabilities → the bottom collapses into them; no standpoint of refusal.
  const closed = foreclosureWatch([
    { agent: "boss", capability: "power:x" },
    { agent: "boss", capability: "power:y" },
    { agent: "b", capability: "power:x" },
  ]);
  assert.equal(closed.monopolist, "boss");
  assert.equal(closed.exitBottomPresent, false);
  assert.equal(closed.foreclosed, true);
});

test("RACKET INDEX: an org amending its own apparatus more than doing its mission is a racket", () => {
  // 1 operational act vs 3 self-referential (collective-choice + constitutional).
  const r = racketIndex(["operational", "collective-choice", "constitutional", "constitutional"]);
  assert.equal(r.operational, 1);
  assert.equal(r.selfReferential, 3);
  assert.equal(r.racket, true);
  assert.ok(Math.abs(r.ratio - 0.75) < 1e-9);
  // a mission-dominant org is not a racket.
  const healthy = racketIndex(["operational", "operational", "operational", "collective-choice"]);
  assert.equal(healthy.racket, false);
});

test("VITALITY: live (open + non-convergent/decentralized) vs calcified (converged + concentrated + closed)", () => {
  // perpetual deliberation with an open exit → alive.
  assert.equal(vitalityReading("aperiodic", 0.9, true).verdict, "alive");
  // converged, concentrated, exit closed → calcified.
  assert.equal(vitalityReading("strict", 0.9, false).verdict, "calcified");
  // converged but decentralized and open → alive.
  assert.equal(vitalityReading("strict", 0.2, true).verdict, "alive");
  // in between.
  assert.equal(vitalityReading("strict", 0.9, true).verdict, "settling");
});

test("SECEDE: a bloc withdraws into its own field carrying its meme stalk; the remainder re-forms", () => {
  const member = (name, cell) => ({
    kind: "socializing.member",
    agent: { kind: "animating.agent", name },
    memes: [{ kind: "communicating.meme", cell, charge: {} }],
  });
  const field = {
    kind: "socializing.social-field",
    members: [member("ada", "p"), member("bo", "q"), member("cy", "r")],
    base: { kind: "socializing.social-base", translations: [] },
    section: { kind: "socializing.common-ground", glued: true, obstruction: 0, coordinationFree: true, components: [], regime: "strict", regimeCoordinationFree: true, federationDiscipline: "endpoint-state" },
  };
  const { remained, seceded } = secede(field, ["bo", "cy"]);
  assert.deepEqual(remained.members.map((m) => m.agent.name), ["ada"]);
  assert.deepEqual(seceded.members.map((m) => m.agent.name), ["bo", "cy"]);
  // stalks are carried, not dropped.
  assert.equal(seceded.members[0].memes.length, 1);
  // each side gets a fresh maximally-connected observer category (2 members → 2 directed translations).
  assert.equal(seceded.base.translations.length, 2);
  assert.equal(remained.base.translations.length, 0);
});

test("SAVIOR-SLAVE CENSUS sweeps the field: traps vs Clastrean duties vs empowered", () => {
  const field = [
    duty("claude", "ship"), power("captain", "polity", "ship"), // claude: savior-slave over ship
    duty("ada", "convene"),                                      // ada: clastrean (no power over convene)
    duty("bo", "deploy"), power("bo", "polity", "deploy"),       // bo: empowered over deploy
  ];
  const c = saviorSlaveCensus(field);
  assert.equal(c.duties, 3);
  assert.equal(c.saviorSlave, 1);
  assert.equal(c.clastrean, 1);
  assert.equal(c.empowered, 1);
  assert.deepEqual(c.traps, [{ agent: "claude", scope: "ship" }]);
});
