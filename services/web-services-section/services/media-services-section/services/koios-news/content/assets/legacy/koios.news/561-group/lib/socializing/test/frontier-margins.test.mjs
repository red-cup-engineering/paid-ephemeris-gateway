// Theorem-shaped tests for the marginal-theory frontier wing: Bateson (double bind + schismogenesis),
// Graeber & Wengrow (three freedoms), Bourdieu (symbolic violence + capital), Beer (algedonic channel +
// viable recursion), Girard (the scapegoat mechanism). Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  doubleBind,
  schismogenesis,
  threeFreedoms,
  symbolicViolence,
  capitalConcentration,
  algedonicAlert,
  viableRecursion,
  scapegoatDetector,
} from "../dist/index.mjs";
import { charge, chargeValue } from "@emsenn/relating";

// ── Bateson ──

test("DOUBLE BIND: a CROSS-LEVEL contradiction with no exit is a bind; same-level or escapable is not", () => {
  const injunctions = [
    { agent: "claude", scope: "ship", level: "operational", polarity: "require" },
    { agent: "claude", scope: "ship", level: "constitutional", polarity: "forbid" },
  ];
  // required operationally, forbidden constitutionally, and cannot escape → a double bind.
  const bound = doubleBind(injunctions, "claude", "ship", false);
  assert.equal(bound.crossLevel, true);
  assert.equal(bound.bound, true);
  // the same contradiction, but escape is open → not a bind (you can refuse/leave/metacommunicate).
  assert.equal(doubleBind(injunctions, "claude", "ship", true).bound, false);
  // a SAME-level contradiction is an honest ⊤, not a double bind.
  const sameLevel = [
    { agent: "a", scope: "x", level: "operational", polarity: "require" },
    { agent: "a", scope: "x", level: "operational", polarity: "forbid" },
  ];
  assert.equal(doubleBind(sameLevel, "a", "x", false).crossLevel, false);
  assert.equal(doubleBind(sameLevel, "a", "x", false).bound, false);
});

test("SCHISMOGENESIS: rising spread is symmetrical (polarization); rising concentration is complementary", () => {
  const sym = schismogenesis([{ spread: 0.1, concentration: 0.2 }, { spread: 0.5, concentration: 0.2 }, { spread: 0.9, concentration: 0.2 }]);
  assert.equal(sym.pattern, "symmetrical");
  assert.equal(sym.runaway, true, "monotone rising spread, no regulating check");
  const comp = schismogenesis([{ spread: 0.1, concentration: 0.1 }, { spread: 0.1, concentration: 0.9 }]);
  assert.equal(comp.pattern, "complementary");
  // a checked process (spread rises then falls) is not runaway.
  const checked = schismogenesis([{ spread: 0.1, concentration: 0 }, { spread: 0.8, concentration: 0 }, { spread: 0.2, concentration: 0 }]);
  assert.equal(checked.runaway, false);
});

// ── Graeber & Wengrow ──

test("THREE FREEDOMS: free iff leave ∧ disobey ∧ reorganize; structurally-free-but-recuperated = californicated", () => {
  assert.equal(threeFreedoms({ canLeave: true, canDisobey: true, canReorganize: true }).verdict, "free");
  assert.equal(threeFreedoms({ canLeave: true, canDisobey: false, canReorganize: true }).verdict, "unfree");
  // the californication signature: every structural freedom intact, the desire to use them recuperated.
  const c = threeFreedoms({ canLeave: true, canDisobey: true, canReorganize: true, recuperated: true });
  assert.equal(c.free, true);
  assert.equal(c.californicated, true);
  assert.equal(c.verdict, "californicated");
});

// ── Bourdieu ──

test("SYMBOLIC VIOLENCE: domination the dominated ENDORSE (no contesting stance) is misrecognition", () => {
  const duty = { kind: "duty", active: "claude", passive: "polity", scope: "ship", standing: "potential" };
  const power = { kind: "power", active: "captain", passive: "polity", scope: "ship", standing: "potential" };
  // claude is savior-slave over ship and authors no contestation → symbolic violence.
  const sv = symbolicViolence([duty, power], "claude", "ship");
  assert.equal(sv.dominated, true);
  assert.equal(sv.endorsed, true);
  assert.equal(sv.symbolicViolence, true);
  // add a contesting (active) stance authored by claude → misrecognition broken.
  const contesting = [duty, power, { kind: "privilege", active: "claude", passive: "captain", scope: "ship", standing: "active" }];
  assert.equal(symbolicViolence(contesting, "claude", "ship").symbolicViolence, false);
});

test("CAPITAL CONCENTRATION: the largest holder's share structures the field on each axis", () => {
  const holders = [
    { agent: "a", capital: { economic: 1, cultural: 0, social: 0, symbolic: 9 } },
    { agent: "b", capital: { economic: 9, cultural: 0, social: 0, symbolic: 1 } },
  ];
  const symbolic = capitalConcentration(holders, "symbolic");
  assert.equal(symbolic.topHolder, "a");
  assert.equal(symbolic.topShare, 0.9);
  assert.equal(capitalConcentration(holders, "economic").topHolder, "b");
});

// ── Beer ──

const member = (name) => ({ kind: "socializing.member", agent: { kind: "animating.agent", name }, memes: [] });
const fieldWith = (names, translations) => ({
  kind: "socializing.social-field",
  members: names.map(member),
  base: { kind: "socializing.social-base", translations },
  section: { kind: "socializing.common-ground", glued: true, obstruction: 0, coordinationFree: true, components: [], regime: "strict", regimeCoordinationFree: true, federationDiscipline: "endpoint-state" },
});
const tr = (source, target) => ({ kind: "socializing.translation", source, target, channel: {} });

test("ALGEDONIC ALERT bypasses the chain of command; it is ESSENTIAL when the apex is unreachable", () => {
  // a line 0—1—2—3: the alert from 0 to apex 3 normally takes 3 hops, bypassing 2 intermediaries.
  const line = fieldWith(["worker", "lead", "mgr", "apex"], [tr(0, 1), tr(1, 2), tr(2, 3)]);
  const alert = algedonicAlert(line, "worker", "apex");
  assert.equal(alert.routed, true);
  assert.equal(alert.normalHops, 3);
  assert.equal(alert.bypassed, 2);
  assert.equal(alert.essential, false);
  // sever the chain (no edges): the apex is unreachable normally → the algedonic channel is the only path.
  const severed = fieldWith(["worker", "apex"], []);
  const cut = algedonicAlert(severed, "worker", "apex");
  assert.equal(cut.essential, true);
});

test("VIABLE RECURSION is viable iff every level absorbs its environment's variety (Ashby per layer)", () => {
  const ok = viableRecursion([{ name: "team", controllerVariety: 5, disturbanceVariety: 3 }, { name: "org", controllerVariety: 8, disturbanceVariety: 8 }]);
  assert.equal(ok.viable, true);
  const broken = viableRecursion([{ name: "team", controllerVariety: 5, disturbanceVariety: 3 }, { name: "org", controllerVariety: 2, disturbanceVariety: 9 }]);
  assert.equal(broken.viable, false, "one deficient level breaks the recursion");
  assert.equal(broken.levels[1].deficit, 7);
});

// ── Girard ──

test("SCAPEGOAT: a ⊤-crisis resolved by coercively expelling ONE member into unanimity is the mechanism", () => {
  const meme = (cell, value) => ({ kind: "communicating.meme", cell, charge: charge(chargeValue(value)) });
  const named = (name, ...memes) => ({ kind: "socializing.member", agent: { kind: "animating.agent", name }, memes });
  const fieldOf = (members) => ({
    kind: "socializing.social-field", members,
    base: { kind: "socializing.social-base", translations: [] },
    section: { kind: "socializing.common-ground", glued: true, obstruction: 0, coordinationFree: true, components: [], regime: "strict", regimeCoordinationFree: true, federationDiscipline: "endpoint-state" },
  });
  // crisis: two contested cells. After expelling 'victim' (not voluntarily): the remainder is unanimous.
  const before = fieldOf([named("victim", meme("x", "stable")), named("a", meme("y", "stable")), named("b", meme("y", "potential"))]);
  const after = fieldOf([named("a", meme("y", "potential")), named("b", meme("y", "potential"))]);
  const v = scapegoatDetector(before, after, "victim", false);
  assert.equal(v.priorContested >= 1, true);
  assert.equal(v.exactlyOneRemoved, true);
  assert.equal(v.unanimousAfter, true);
  assert.equal(v.coerced, true);
  assert.equal(v.scapegoat, true);
  // a VOLUNTARY departure with the same shape is a secession, not a scapegoating.
  assert.equal(scapegoatDetector(before, after, "victim", true).scapegoat, false);
});
