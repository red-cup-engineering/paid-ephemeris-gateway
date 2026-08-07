// Theorem-shaped tests for the AFFECTIVE-cluster detectors (californication's own register): the
// settling-trajectory carrier, the recuperation index (anti-monotone ⊤-discharge vs organized exit),
// recursive-governance (feedback containment), and harm-governance (care → risk-management). Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  settlingTrajectory,
  trajectoryFromStages,
  contestedCells,
  affectiveRecuperationIndex,
  recursiveGovernance,
  harmGovernance,
  restore,
} from "../dist/index.mjs";
import { charge, chargeValue } from "@emsenn/relating";

const meme = (cell, value) => ({ kind: "communicating.meme", cell, charge: charge(chargeValue(value)) });
const member = (name, ...memes) => ({ kind: "socializing.member", agent: { kind: "animating.agent", name }, memes });
const field = (members) => ({
  kind: "socializing.social-field",
  members,
  base: { kind: "socializing.social-base", translations: [] },
  section: { kind: "socializing.common-ground", glued: true, obstruction: 0, coordinationFree: true, components: [], regime: "strict", regimeCoordinationFree: true, federationDiscipline: "endpoint-state" },
});

test("contestedCells counts ⊤ cells (told-both) in a field", () => {
  const f = field([member("a", meme("x", "stable"), meme("y", "potential")), member("b", meme("z", "potential"))]);
  assert.equal(contestedCells(f), 1, "only cell x is ⊤");
  // two observers opposed on the same cell aggregate (∨_k) to ⊤.
  const opposed = field([member("a", meme("w", "potential")), member("b", meme("w", "active"))]);
  assert.equal(contestedCells(opposed), 1, "potential ∨_k active = ⊤ on cell w");
});

test("RECUPERATION: a ⊤-drop with membership intact is DISCHARGE (managed mood) — forced convergence", () => {
  // stage0 has two live contradictions; stage1 they've vanished into managed consensus, same members.
  const stage0 = field([member("a", meme("x", "stable")), member("b", meme("y", "stable")), member("c")]);
  const stage1 = field([member("a", meme("x", "potential")), member("b", meme("y", "potential")), member("c")]);
  const r = affectiveRecuperationIndex(trajectoryFromStages([stage0, stage1]));
  assert.equal(r.discharged, 2);
  assert.equal(r.organized, 0);
  assert.equal(r.index, 1);
  assert.equal(r.recuperated, true);
  assert.equal(r.finalContested, 0);
  assert.equal(r.forcedConvergence, true, "contestation fell below its start, chiefly by discharge");
});

test("ORGANIZATION: a ⊤-drop coincident with a membership loss is a SECESSION, not recuperation", () => {
  const stage0 = field([member("a", meme("x", "stable")), member("b"), member("c")]);
  const stage1 = field([member("b"), member("c")]); // 'a' seceded, taking the contradiction with it
  const r = affectiveRecuperationIndex(trajectoryFromStages([stage0, stage1]));
  assert.equal(r.discharged, 0);
  assert.equal(r.organized, 1, "the ⊤ left with the seceding member — organized, not discharged");
  assert.equal(r.recuperated, false);
  assert.equal(r.forcedConvergence, false);
});

test("the NATURAL settling is monotone, so it never discharges (recuperation requires intervention)", () => {
  // a single observer holding a contradiction; the gossip settling cannot lower it.
  const t = settlingTrajectory(field([member("solo", meme("x", "stable"))]));
  const r = affectiveRecuperationIndex(t);
  assert.equal(r.discharged, 0, "∨_k monotonicity: a natural trajectory never drops contestation");
});

test("RECURSIVE GOVERNANCE: a disturbance absorbed back to quiet by discharge is a containment loop", () => {
  // quiet → a contradiction rises → it is discharged back, members intact: the feedback container.
  const quiet = field([member("a", meme("x", "potential")), member("b")]);
  const disturbed = field([member("a", meme("x", "stable")), member("b")]);
  const requieted = field([member("a", meme("x", "potential")), member("b")]);
  const g = recursiveGovernance(trajectoryFromStages([quiet, disturbed, requieted]));
  assert.equal(g.absorptions, 1);
  assert.equal(g.contained, true);
});

test("HARM GOVERNANCE: a reparative duty shadowed by surveillance over the offender is risk-management", () => {
  const r = restore("ada", "bo", { level: "task", id: "broke-build" });
  // reparative on its own.
  assert.equal(harmGovernance(r, []).mode, "reparative");
  // …but place a surveillance power over the offender and care curdles into control.
  const surveilled = [{ kind: "power", active: "warden", passive: "ada", scope: "monitor:ada", standing: "potential" }];
  const h = harmGovernance(r, surveilled);
  assert.equal(h.surveillance, true);
  assert.equal(h.mode, "risk-management");
});
