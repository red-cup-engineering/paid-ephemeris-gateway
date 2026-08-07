// Theorem-shaped tests for socializing's OPERATIONAL governance layer — the office as a double
// settlement (recognition × induction → the munus/honor/dignitas trinity), the devolution of an
// office's deontic profile onto its incumbent, the work-carrier scope, and the operational
// Hohfeldian positions (assignment, waiver, revocation, ratification). The apparatus for
// organizing agentic labor. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  office,
  invest,
  relieve,
  incumbencyState,
  assign,
  grant,
  immunize,
  borneBy,
  waive,
  revoke,
  ratify,
  workScope,
  rotate,
  accountability,
  answerableParty,
  delegate,
  reciprocate,
  restore,
  separationOfDuty,
  declare,
  refuse,
} from "../dist/index.mjs";

const reviewer = office("reviewer", [
  { kind: "power", over: { level: "project", id: "alpha" } },
  { kind: "duty", over: { level: "task", id: "review-pr" } },
]);

test("an OFFICE is bearer-independent: its profile holds in the OFFICE's name, not any incumbent", () => {
  assert.equal(reviewer.kind, "socializing.office");
  assert.equal(reviewer.profile.length, 2);
  assert.ok(reviewer.profile.every((r) => r.active === "reviewer"), "the office, not an incumbent, is the active holder");
  assert.deepEqual(reviewer.profile.map((r) => r.scope), ["project:alpha", "task:review-pr"]);
});

test("INCUMBENCY is a DOUBLE SETTLEMENT: the munus/honor/dignitas trinity", () => {
  // recognition (honor) × induction (munus).
  assert.equal(incumbencyState("absurd", "absurd"), "vacant");
  assert.equal(incumbencyState("absurd", "potential"), "munus", "forward obligation, no recognition yet");
  assert.equal(incumbencyState("potential", "absurd"), "recognition", "recognized, not yet inducted");
  assert.equal(incumbencyState("potential", "potential"), "dignitas", "full incumbency, doubly settled");
  assert.equal(incumbencyState("active", "potential"), "failed", "recognition explicitly denied");
  assert.equal(incumbencyState("stable", "potential"), "repair", "⊤ on a required predicate is a repair condition");
});

test("at DIGNITAS the office's powers DEVOLVE onto the incumbent; below it, nothing devolves", () => {
  const full = invest(reviewer, "claude", "potential", "potential");
  assert.equal(full.state, "dignitas");
  assert.equal(full.devolved.length, 2);
  assert.ok(full.devolved.every((r) => r.active === "claude"), "the profile's active-holder is rewritten to the incumbent");
  assert.deepEqual(full.devolved.map((r) => r.scope), ["project:alpha", "task:review-pr"]);

  // recognition-only or munus-only does NOT transfer the office's capabilities.
  assert.deepEqual(invest(reviewer, "claude", "potential", "absurd").devolved, []);
  assert.deepEqual(invest(reviewer, "claude", "absurd", "potential").devolved, []);

  // dignitas non moritur: the office's own profile is untouched by investiture.
  assert.ok(reviewer.profile.every((r) => r.active === "reviewer"));
  // relief returns the incumbency to vacant.
  assert.equal(relieve(reviewer, "claude").state, "vacant");
});

test("ASSIGNMENT binds a work-item to an agent as a DUTY it owes; the correlative is the claim on it", () => {
  const duty = assign("claude", { level: "task", id: "ship-feature" }, "captain");
  assert.deepEqual(duty, { kind: "duty", active: "claude", passive: "captain", scope: "task:ship-feature", standing: "potential" });
  // the captain correlatively HOLDS A CLAIM that the work be done (the owned-by ↔ owns pairing).
  assert.deepEqual(borneBy(duty), { kind: "claim", active: "captain", passive: "claude", scope: "task:ship-feature", standing: "potential" });
});

test("GRANT binds a power; IMMUNIZE binds an immunity — the work-carrier spine types the scope", () => {
  const power = grant("claude", { level: "campaign", id: "q3-push" });
  assert.equal(power.kind, "power");
  assert.equal(power.scope, "campaign:q3-push");
  const shield = immunize("claude", { level: "endeavor", id: "research" });
  assert.equal(shield.kind, "immunity");
  assert.equal(shield.scope, "endeavor:research");
  assert.equal(workScope({ level: "work-item", id: "wi-42" }), "work-item:wi-42");
});

test("the operational positions MOVE a relation's standing over time (relinquish / retract / validate)", () => {
  const duty = assign("claude", { level: "task", id: "t1" });
  assert.equal(waive(duty).standing, "active", "waiver: the holder relinquishes — standing denied (f)");
  assert.equal(revoke(grant("claude", { level: "task", id: "t1" })).standing, "active", "revocation: the grantor retracts (f)");
  const unauthorized = { kind: "power", active: "claude", passive: "x", scope: "task:t1", standing: "absurd" };
  assert.equal(ratify(unauthorized).standing, "potential", "ratification: retroactive validation (⊥ → t)");
});

test("ROTATIONAL authority CYCLES through the roster — no agent accumulates the office", () => {
  let rot = { office: "facilitator", roster: ["ada", "bo", "cy"], current: 0 };
  const step1 = rotate(rot);
  assert.equal(step1.relieved, "ada");
  assert.equal(step1.installed, "bo");
  const step2 = rotate(step1.rotation);
  assert.equal(step2.installed, "cy");
  // cycles back to the start — authority returns, distributed across the roster.
  assert.equal(rotate(step2.rotation).installed, "ada");
});

test("ACCOUNTABILITY is total and delegation-INVARIANT: the bearer answers regardless of delegation", () => {
  const acc = accountability("captain", { level: "project", id: "voyage" });
  assert.equal(answerableParty(acc), "captain");
  // delegating authority (a power) to a subordinate moves the AUTHORITY, not the accountability.
  const power = grant("captain", { level: "project", id: "voyage" });
  const delegated = delegate(power, "mate");
  assert.equal(delegated.active, "mate", "authority is distributed to the delegate");
  assert.equal(answerableParty(acc), "captain", "accountability is UNCHANGED — the bearer still answers");
});

test("RECIPROCITY (ayni): provided labor creates a correlative reciprocal-DEBT", () => {
  const debt = reciprocate("ada", "bo", { level: "task", id: "harvest" });
  // bo received ada's labor → bo now owes reciprocal labor back to ada.
  assert.deepEqual(debt, { kind: "duty", active: "bo", passive: "ada", scope: "task:harvest", standing: "potential" });
});

test("RESTORATIVE accountability: harm produces REPARATION + reintegration, not punishment", () => {
  const r = restore("ada", "bo", { level: "task", id: "broke-build" });
  assert.equal(r.reintegrative, true);
  assert.equal(r.reparation.kind, "duty", "the offender owes a reparation duty");
  assert.equal(r.reparation.active, "ada");
  assert.equal(r.reparation.passive, "bo");
  assert.equal(r.reparation.scope, "repair:task:broke-build");
});

test("SEPARATION OF DUTY: forbidden role pairs cannot be co-assigned to one agent", () => {
  const assignments = [
    { agent: "ada", role: "author" },
    { agent: "ada", role: "approver" },
    { agent: "bo", role: "author" },
  ];
  const conflicts = separationOfDuty(assignments, [["author", "approver"]]);
  assert.equal(conflicts.length, 1, "ada holds a forbidden pair");
  assert.equal(conflicts[0].agent, "ada");
  // bo holds only one of the pair → no conflict.
  assert.equal(separationOfDuty([{ agent: "bo", role: "author" }], [["author", "approver"]]).length, 0);
});

test("STATUS-FUNCTION DECLARATION is constitutive and STANDING-gated; refusal blocks binding", () => {
  // with standing, the declaration CONSTITUTES the institutional fact (X counts as Y in C).
  const felicitous = declare("claude", "reviewer", "project:alpha", "captain", true);
  assert.equal(felicitous.felicitous, true);
  assert.equal(felicitous.constituted.kind, "privilege");
  assert.equal(felicitous.constituted.scope, "counts-as:reviewer");

  // without standing it MISFIRES — the target does not acquire the status.
  const misfire = declare("claude", "reviewer", "project:alpha", "rando", false);
  assert.equal(misfire.felicitous, false);
  assert.equal(misfire.constituted, null);

  // REFUSAL: a community blocks the declaration from binding its members (non-applicability).
  const refusal = refuse(felicitous, "collective");
  assert.equal(refusal.standing, "active", "the status does not bind the refuser (denied, f)");
  assert.equal(refusal.scope, "refuses:reviewer");
});
