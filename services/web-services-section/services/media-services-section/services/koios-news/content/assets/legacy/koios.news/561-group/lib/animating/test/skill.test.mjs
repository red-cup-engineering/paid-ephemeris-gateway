/**
 * skill — the single agent's skillful-work execution kernel.
 *
 * The quartet's LOGIC (gsu-ccs skills / skill-result) made into a real capability: a typed
 * Skill you can invoke, an invocation that ALWAYS returns a SkillResult under the type's
 * contract, error as first-class bilattice-grounded state, and the quartet algebra as an
 * executable law (the two paths to Process commute).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { cohereLog } from "@emsenn/relating/ledger";

import {
  skill,
  invokeSkill,
  skillSuccess,
  skillError,
  advanceMeaning,
  advanceExecution,
  jointProjection,
  classifySkillfulWork,
  skillPlayWitness,
  witnessSkillPlay,
  readSkillPlayWitnesses,
  closeWitnessedSkillLoop,
  skillPracticeFromWitnessLog,
  skillObstructionsFromWitnessLog,
  skillEcologyTraceFromWitnessLog,
  skillEcologyLogReading,
  publishSkillEcology,
} from "../dist/index.mjs";

test("a Skill is typed by its declared closureKind; the two nuclei follow", () => {
  const proc = skill("route-prompt", "procedure", "NamedOutput");
  assert.deepEqual(
    [proc.meaningClosed, proc.executionClosed, proc.determination],
    [true, false, "potential"],
  );
  const deriv = skill("critique-unit", "derivation", "Judgment");
  assert.deepEqual([deriv.meaningClosed, deriv.executionClosed, deriv.determination], [false, true, "active"]);
});

test("invokeSkill always returns a SkillResult — success carries a classical charge", () => {
  const s = skill("name-unit", "process", "Name");
  const ok = invokeSkill(s, "the-input", (i) => `${i}!`);
  assert.equal(ok.ok, true);
  assert.equal(ok.output, "the-input!");
  assert.ok(ok.charge === "potential" || ok.charge === "active"); // a CLASSICAL (settled) corner
  assert.equal(ok.error, undefined);
});

test("error is first-class state on the NON-CLASSICAL corners — absence ⊥, contradiction ⊤", () => {
  const s = skill("name-unit", "process", "Name");

  // missing input → MissingInput, ⊥ absurd (told-nothing)
  const missing = invokeSkill(s, null, () => "x");
  assert.equal(missing.ok, false);
  assert.equal(missing.error.errorClass, "MissingInput");
  assert.equal(missing.charge, "absurd");

  // perform throws → UnexpectedState, ⊤ stable (the world contradicts the assumption)
  const threw = invokeSkill(s, "in", () => { throw new Error("file gone"); });
  assert.equal(threw.error.errorClass, "UnexpectedState");
  assert.equal(threw.charge, "stable");
  assert.match(threw.error.message, /file gone/);
});

test("the empty-outcome rule is per-type: Derivation/Inquiry → Unresolvable, Process → UnexpectedState", () => {
  const deriv = skill("classify", "derivation", "Judgment");
  const inq = skill("explore", "inquiry", "Output");
  const proc = skill("emit", "process", "Output");

  assert.equal(invokeSkill(deriv, "in", () => null).error.errorClass, "Unresolvable");
  assert.equal(invokeSkill(inq, "in", () => undefined).error.errorClass, "Unresolvable");
  assert.equal(invokeSkill(proc, "in", () => null).error.errorClass, "UnexpectedState");
});

test("a Procedure propagates a sub-skill's SkillError instead of swallowing it", () => {
  const subFailure = skillError("SkillNotFound", "no such skill", "sub(x)");
  const procedure = skill("dispatch", "procedure", "NamedOutput");
  // the procedure's perform dispatches to a sub-skill that returns an error result
  const result = invokeSkill(procedure, "in", () => subFailure);
  assert.equal(result.ok, false);
  assert.equal(result.error.errorClass, "SkillNotFound"); // propagated verbatim, not re-wrapped
});

test("the quartet algebra is executable: both nucleus-paths commute to Process", () => {
  const inquiry = classifySkillfulWork({ meaningClosed: false, executionClosed: false });

  // Inquiry → Procedure → Process  vs  Inquiry → Derivation → Process
  const viaMeaning = advanceExecution(advanceMeaning(inquiry)); // close σ then Δ
  const viaExecution = advanceMeaning(advanceExecution(inquiry)); // close Δ then σ
  assert.equal(viaMeaning.closureKind, "process");
  assert.equal(viaExecution.closureKind, "process");
  assert.deepEqual(viaMeaning, viaExecution); // σ∘Δ = Δ∘σ — commutativity, the quartet's hinge
  assert.deepEqual(viaMeaning, jointProjection(inquiry)); // and both equal π

  // one nucleus is a real one-step climb, not a jump to the top
  assert.equal(advanceMeaning(inquiry).closureKind, "procedure");
  assert.equal(advanceExecution(inquiry).closureKind, "derivation");
});

test("the perceive-act-witness loop induces only invocable skills from its own RWIL history", () => {
  const root = mkdtempSync(path.join(tmpdir(), "animating-skill-loop-"));
  const store = {
    logDir: path.join(root, "log"),
    stateDir: path.join(root, "state"),
    recordDir: path.join(root, "record"),
  };
  try {
    const initial = [skill("already-known", "procedure", "TreatyDraft")];
    const learnedPlay = {
      kind: "animating.skill.play",
      agent: "sol",
      name: "draft-treaty",
      locus: "sol|treaty",
      input: "terms",
      result: skillSuccess({ draft: "terms-v1" }),
      closureKind: "procedure",
      codomain: "TreatyDraft",
    };
    const unheldPlay = {
      kind: "animating.skill.play",
      agent: "sol",
      name: "drain-vault",
      locus: "vault|drain",
      input: "open",
      result: skillSuccess({ opened: true }),
      closureKind: "procedure",
      codomain: "VaultDrain",
    };

    witnessSkillPlay(store, learnedPlay, "2026-06-26T10:00:00.000Z");
    witnessSkillPlay(store, learnedPlay, "2026-06-26T10:01:00.000Z");
    witnessSkillPlay(store, unheldPlay, "2026-06-26T10:02:00.000Z");
    witnessSkillPlay(store, unheldPlay, "2026-06-26T10:03:00.000Z");

    const witnessLog = readSkillPlayWitnesses(store);
    const loop = closeWitnessedSkillLoop({
      input: "sol|treaty\nsol|not treaty",
      witnessLog,
      agent: { identity: "sol" },
      existingSkills: initial,
      affordances: [],
      minEvidence: 2,
    });

    assert.equal(loop.kind, "animating.skill.loop");
    assert.equal(loop.perceived.loop, "perceive->act");
    assert.ok(loop.acted.commitments.includes("sol|treaty"), "the learned locus is an actual act affordance");
    assert.ok(!initial.some((entry) => entry.name === "draft-treaty"), "the agent did not start with the induced skill");
    assert.ok(loop.induction.candidates.some((candidate) => candidate.skill.name === "draft-treaty"));
    assert.ok(loop.induction.admitted.some((candidate) => candidate.skill.name === "draft-treaty"));
    assert.ok(loop.induction.rejected.some((candidate) => candidate.skill.name === "drain-vault"));
    assert.ok(loop.induction.acquired.some((entry) => entry.name === "draft-treaty"));
    assert.ok(!loop.induction.acquired.some((entry) => entry.name === "drain-vault"));
    assert.ok(loop.induction.capabilities.some((entry) => entry.skill.name === "draft-treaty" && entry.invocable));
    assert.ok(loop.induction.capabilities.some((entry) => entry.skill.name === "drain-vault" && !entry.invocable));

    const trace = skillEcologyTraceFromWitnessLog(witnessLog, { affordances: loop.acted.commitments, minEvidence: 2 });
    assert.equal(trace.kind, "animating.skill.ecology-trace");
    assert.equal(cohereLog(skillEcologyLogReading, skillEcologyLogReading, witnessLog).ok, true);

    const surface = publishSkillEcology(loop.induction, { agent: "sol" });
    assert.ok(surface.a2aSkills.some((entry) => entry.name === "draft-treaty"));
    assert.ok(surface.openAiTools.some((entry) => entry.function.name === "draft_treaty"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skill ecology reads practice regimes and obstruction repair skills from the RWIL light cone", () => {
  const success = {
    kind: "animating.skill.play",
    agent: "sol",
    name: "map-room",
    locus: "sol|room-map",
    input: "north",
    result: skillSuccess({ route: "north-hall" }),
    closureKind: "procedure",
    codomain: "Route",
  };
  const varied = { ...success, input: "south" };
  const failure = {
    kind: "animating.skill.play",
    agent: "sol",
    name: "open-archive",
    locus: "archive|open",
    input: "vault",
    result: skillError("UnexpectedState", "locked", "open-archive(vault)", "obtain key capability"),
    closureKind: "procedure",
    codomain: "Archive",
  };
  const witnessLog = [
    skillPlayWitness(success, "2026-06-26T11:00:00.000Z"),
    skillPlayWitness(varied, "2026-06-26T11:01:00.000Z"),
    skillPlayWitness(failure, "2026-06-26T11:02:00.000Z"),
    skillPlayWitness(failure, "2026-06-26T11:03:00.000Z"),
  ];

  const practice = skillPracticeFromWitnessLog(witnessLog);
  const map = practice.find((entry) => entry.name === "map-room");
  assert.equal(map.inputDiversity, 2, "Tolman-style map variation is visible as diverse inputs");
  assert.equal(map.regime, "exploring");
  assert.equal(map.option.initiation, "sol|room-map");
  assert.equal(map.option.termination, "success");
  assert.ok(map.meadAct.includes("impulse"));
  assert.ok(map.meadAct.includes("consummation"));
  assert.deepEqual(map.semioticAxes, ["syntactic", "semantic", "pragmatic"]);
  assert.ok(map.habitStrength > 0);
  assert.ok(map.theories.includes("diayn.diversity"));
  assert.ok(map.theories.includes("klyubin.empowerment"));
  assert.ok(map.empowerment > 0);

  const blocked = practice.find((entry) => entry.name === "open-archive");
  assert.equal(blocked.regime, "obstructed");
  assert.equal(blocked.option.termination, "obstruction");
  assert.ok(blocked.freeEnergyPressure > 0);
  assert.ok(blocked.theories.includes("friston.active-inference"));
  assert.ok(blocked.theories.includes("cannon.homeostasis"));

  const obstructions = skillObstructionsFromWitnessLog(witnessLog, { minEvidence: 2 });
  assert.equal(obstructions.length, 1);
  assert.equal(obstructions[0].repairSkill.name, "repair:open-archive:UnexpectedState");
  assert.equal(obstructions[0].repairSkill.closureKind, "derivation");
});
