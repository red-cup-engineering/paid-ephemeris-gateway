/**
 * skillful-work — the nuclear quartet of an agent's work, read off its faces.
 *
 * The quartet's LOGIC comes from the gsu-ccs relational-machine spec (skillful-work /
 * inquiry / procedure / derivation / process); its IMPLEMENTATION is current-paradigm:
 * a bulk CONSOLIDATION on the agent, not a stored declaration. The two commuting nuclei
 * are read off the agent's two non-communicating faces — σ (meaning) = inside/knowing
 * settled (`cognition.reflects`), Δ (execution) = outside/playing settled
 * (`action.affordances === 0`). Pins: exactly four types in ≤_k order; the determination
 * IS relating's bilattice ≤_k; π = σ∘Δ reflects every unit into Process idempotently; and
 * the agent's `work` reading agrees with its own `cognition`/`action` fields.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifySkillfulWork,
  jointProjection,
  SKILLFUL_WORK_KINDS,
  agent,
} from "../dist/index.mjs";

test("two commuting nuclei → exactly four types, in ≤_k determination order", () => {
  const inquiry = classifySkillfulWork({ meaningClosed: false, executionClosed: false });
  const procedure = classifySkillfulWork({ meaningClosed: true, executionClosed: false });
  const derivation = classifySkillfulWork({ meaningClosed: false, executionClosed: true });
  const process = classifySkillfulWork({ meaningClosed: true, executionClosed: true });

  assert.deepEqual(
    [inquiry.closureKind, procedure.closureKind, derivation.closureKind, process.closureKind],
    ["inquiry", "procedure", "derivation", "process"],
  );
  // the four kinds are exhaustive (no fifth) and ordered ⊥ → ⊤
  assert.deepEqual(SKILLFUL_WORK_KINDS, ["inquiry", "procedure", "derivation", "process"]);

  // determination IS the relating ≤_k charge: inquiry ⊥ absurd, process ⊤ stable,
  // the two single-closure types on the incomparable middles
  assert.deepEqual(
    [inquiry.determination, procedure.determination, derivation.determination, process.determination],
    ["absurd", "potential", "active", "stable"],
  );
  // every reading is the native agent-work kind, not a separate carrier
  assert.equal(process.kind, "animating.agent.work");
});

test("π = σ∘Δ reflects every unit into Process and is idempotent", () => {
  for (const m of [false, true]) {
    for (const e of [false, true]) {
      const work = classifySkillfulWork({ meaningClosed: m, executionClosed: e });
      const projected = jointProjection(work);
      assert.equal(projected.closureKind, "process");
      assert.equal(projected.determination, "stable"); // lands on ⊤, the joint fixed point H*
      // idempotent: π(π(a)) = π(a) — commutativity is the hinge
      assert.deepEqual(jointProjection(projected), projected);
    }
  }
});

test("the agent's work type is CONSOLIDATED from its inside/outside faces", () => {
  const a = agent("the-sky|is-blue", { goal: { predicate: "is-blue", charge: "potential" } });

  assert.equal(a.work.kind, "animating.agent.work");
  assert.ok(SKILLFUL_WORK_KINDS.includes(a.work.closureKind));
  // σ is the inside/knowing face settling, read off cognition.reflects — NOT a declared bool
  assert.equal(a.work.meaningClosed, a.cognition.reflects);
  // Δ is the outside/playing face settling, read off action.affordances === 0
  assert.equal(a.work.executionClosed, a.action.affordances === 0);
  // and the consolidated reading equals an independent classification of those two signals
  const expected = classifySkillfulWork({
    meaningClosed: a.cognition.reflects,
    executionClosed: a.action.affordances === 0,
  });
  assert.deepEqual(a.work, expected);
});
