// Theorem-shaped tests for Result 1 of the californication note: the savior-slave subject is the
// Hohfeldian dual of the Clastrean office — duty-without-power, told apart only by whether the
// correlative power is held elsewhere in the field. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { dutyPowerValence, clastreanOffice } from "../dist/index.mjs";

const duty = (active, scope) => ({ kind: "duty", active, passive: "polity", scope, standing: "potential" });
const power = (active, scope) => ({ kind: "power", active, passive: "polity", scope, standing: "potential" });

test("SAVIOR–SLAVE: duty over a scope whose power is held by ANOTHER agent", () => {
  // claude is made answerable for shipping; the captain holds the actual power over it.
  const field = [duty("claude", "ship"), power("captain", "ship")];
  const v = dutyPowerValence(field, "claude", "ship");
  assert.equal(v.valence, "savior-slave");
  assert.equal(v.bearsDuty, true);
  assert.equal(v.holdsPower, false);
  assert.equal(v.powerElsewhere, true);
});

test("CLASTREAN: the SAME duty-without-power, but NO ONE holds the power — liberation, not domination", () => {
  // identical local position for the bearer; the only change is the power does not exist in the field.
  const field = [duty("claude", "ship")];
  const v = dutyPowerValence(field, "claude", "ship");
  assert.equal(v.valence, "clastrean");
  assert.equal(v.bearsDuty, true);
  assert.equal(v.holdsPower, false);
  assert.equal(v.powerElsewhere, false);
});

test("the bearer's LOCAL position is identical across the two verdicts (the quantifier does the work)", () => {
  const savior = dutyPowerValence([duty("a", "x"), power("b", "x")], "a", "x");
  const clastrean = dutyPowerValence([duty("a", "x")], "a", "x");
  assert.equal(savior.bearsDuty, clastrean.bearsDuty);
  assert.equal(savior.holdsPower, clastrean.holdsPower);
  assert.notEqual(savior.valence, clastrean.valence, "only the field-wide power search separates them");
});

test("EMPOWERED: holding the power over the scope is neither trap nor Clastrean", () => {
  const v = dutyPowerValence([duty("a", "x"), power("a", "x")], "a", "x");
  assert.equal(v.valence, "empowered");
  // a denied power elsewhere does not count as the power being held.
  const denied = dutyPowerValence([duty("a", "x"), { kind: "power", active: "b", passive: "p", scope: "x", standing: "active" }], "a", "x");
  assert.equal(denied.valence, "clastrean", "a denied (f) power is not a held power — no rehoming");
});

test("a CLASTREAN office holds no coercive power; constructing one with a power is rejected", () => {
  const o = clastreanOffice("speaker", [
    { kind: "duty", over: { level: "task", id: "convene" } },
    { kind: "privilege", over: { level: "task", id: "address-council" } },
  ]);
  assert.equal(o.kind, "socializing.office");
  assert.ok(o.profile.every((r) => r.kind !== "power"), "no power in the profile");
  assert.throws(
    () => clastreanOffice("chief", [{ kind: "power", over: { level: "project", id: "command" } }]),
    /holds no power/,
  );
});
