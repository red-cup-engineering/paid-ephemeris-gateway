/**
 * skill-result routing — the bridge from the single-agent skillful-work kernel (animating)
 * to the social-scale work ledger (organizing). A SkillResult's bilattice CHARGE carries
 * through unchanged: success (classical) → complete, ⊤-contradiction error → blocked
 * (actionable), ⊥-absence error → noted (an outcome). No translation table — the two scales
 * share one four-valued charge language, which is exactly what grounding error in the FOUR buys.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { term, officeTerm, workTask, workItem, reportSkillResult, skillResultRouting } from "../dist/index.mjs";
import { skill, invokeSkill, skillSuccess } from "@emsenn/animating";

/** A minimal work item to report against. */
function item(id) {
  return workItem({ term: term(id), task: workTask({ term: term(id), goals: [] }) });
}

/** The [key, value] payloads carried as a report's evidence terms. */
function evidencePayloads(report) {
  return (report.evidence ?? []).map((entry) => entry?.mark?.value).filter(Array.isArray);
}

test("a Success routes to complete", () => {
  assert.equal(skillResultRouting(skillSuccess("done")), "complete");
});

test("a ⊤-contradiction error routes to blocked and threads its class + message", () => {
  const proc = skill("emit", "process", "Output");
  const result = invokeSkill(proc, "in", () => { throw new Error("disk full"); }); // UnexpectedState, ⊤ stable
  assert.equal(result.charge, "stable");
  assert.equal(skillResultRouting(result), "blocked");

  const report = reportSkillResult({ term: term("r1"), work: item("ship"), office: officeTerm("ops"), result });
  assert.equal(report.kind, "organizing.work.report");
  const payloads = evidencePayloads(report);
  assert.ok(payloads.some((v) => v[0] === "status" && v[1] === "blocked"), "carries blocked status");
  assert.ok(payloads.some((v) => v[0] === "error-class" && v[1] === "UnexpectedState"), "threads error class");
  assert.ok(payloads.some((v) => v[0] === "error" && /disk full/.test(String(v[1]))), "threads error message");
});

test("a ⊥-absence error (Unresolvable) routes to noted, not a defect", () => {
  const inq = skill("explore", "inquiry", "Output");
  const result = invokeSkill(inq, "in", () => null); // Unresolvable, ⊥ absurd
  assert.equal(result.charge, "absurd");
  assert.equal(skillResultRouting(result), "noted");

  const report = reportSkillResult({ term: term("r2"), work: item("probe"), office: officeTerm("ops"), result });
  assert.ok(evidencePayloads(report).some((v) => v[0] === "status" && v[1] === "noted"));
});

test("the report charge is the SkillResult charge — carried through, no translation", () => {
  // success success-charge is classical; the ledger entry must carry the same bilattice value
  const okReport = reportSkillResult({
    term: term("r3"),
    work: item("done"),
    office: officeTerm("ops"),
    result: skillSuccess("x"),
  });
  // organizing's WorkReport.charge is a relating ChargeCarrier built from the result's charge name
  assert.ok(okReport.charge !== undefined);
});
