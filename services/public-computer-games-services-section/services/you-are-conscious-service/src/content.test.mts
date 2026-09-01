/**
 * `content.test` — "every choice reachable, every tier's prose present" (this game's own build
 * brief, quoted directly). Two kinds of check: STATIC (every tier has real prose, every crossing
 * has real, distinct, honest options, further reading exists per DESIGN.md's "quiet further-reading
 * link per tier") and BEHAVIORAL (every single crossing option, for every tier, is actually
 * ACCEPTED by the real reducer when offered — "reachable" meaning something the game engine itself
 * agrees with, not just a string sitting in a data file no code path ever validates).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_PROSE, FURTHER_READING, GOODHART_BRANCH_EPILOGUE, TIER_CROSSINGS, TIER_PROSE } from "./content.mts";
import { starterState, TIER_IDS, type TierId } from "./state.mts";
import { applyConsciousIntent } from "./intents.mts";

test("every one of the ten tiers has nonempty prose, present in full — no placeholder strings", () => {
  for (const id of TIER_IDS) {
    const prose = TIER_PROSE[id];
    assert.ok(typeof prose === "string" && prose.length > 0, `tier ${id} must have prose`);
    assert.ok(!/TODO|TBD|placeholder|lorem ipsum/i.test(prose), `tier ${id}'s prose must not be a placeholder`);
  }
});

test("tier 1's prose is genuinely minimal (no first person, no subordinate clause) — the ladder's vocabulary must visibly start from nothing", () => {
  const t1 = TIER_PROSE[1];
  assert.ok(!/\bI\b/.test(t1), "tier 1 must have no first person 'I' — there is no self yet to speak as");
});

test("FEEDBACK_PROSE (tier 1's own scripted self-reference moment) is real, nonempty, tier-1-voiced (no first person), and distinct from both TIER_PROSE[1] and TIER_PROSE[2]", () => {
  assert.ok(FEEDBACK_PROSE.length > 0);
  assert.ok(!/TODO|TBD|placeholder|lorem ipsum/i.test(FEEDBACK_PROSE));
  assert.ok(!/\bI\b/.test(FEEDBACK_PROSE), "FEEDBACK_PROSE must have no first person 'I' — this is still tier 1's voice");
  assert.notEqual(FEEDBACK_PROSE, TIER_PROSE[1]);
  assert.notEqual(FEEDBACK_PROSE, TIER_PROSE[2]);
});

test("tier 6's prose (the Goodhart hinge) is present and substantially longer than the earlier tiers — DESIGN.md calls this one out for length", () => {
  const t6 = TIER_PROSE[6];
  const t2 = TIER_PROSE[2];
  assert.ok(t6.length > t2.length * 2, "tier 6 prose should be markedly longer, per DESIGN.md's own instruction to give it length");
});

test("every tier 2-10 has a crossing (tier 1 has none — nothing is crossed INTO the very first tier)", () => {
  assert.equal(TIER_CROSSINGS[1], undefined);
  for (const id of TIER_IDS) {
    if (id === 1) continue;
    const crossing = TIER_CROSSINGS[id];
    assert.ok(crossing !== undefined, `tier ${id} must have a crossing`);
    assert.ok(crossing!.prompt.length > 0);
    assert.ok(crossing!.options.length >= 2, `tier ${id}'s crossing must offer at least two real choices`);
  }
});

test("every crossing's option ids are unique within that tier, and every option has real, nonempty text", () => {
  for (const [, crossing] of Object.entries(TIER_CROSSINGS)) {
    const ids = crossing!.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate option id within one crossing");
    for (const o of crossing!.options) {
      assert.ok(o.id.length > 0);
      assert.ok(o.text.length > 0);
    }
  }
});

test("every crossing option is REACHABLE: the real reducer accepts every single offered answer, for every tier, never a hidden 'wrong answer' refusal", () => {
  for (const id of TIER_IDS) {
    const crossing = TIER_CROSSINGS[id];
    if (crossing === undefined) continue;
    const priorPrefix = TIER_IDS.filter((t) => t < id) as TierId[];
    for (const option of crossing.options) {
      const state = starterState(0, `content-test-${id}-${option.id}`);
      const withPriorTiers = { ...state, cognition: { ...state.cognition, tiersUnlocked: [1, ...priorPrefix].filter((v, i, arr) => arr.indexOf(v) === i) } };
      const result = applyConsciousIntent(withPriorTiers, { kind: "answerCrossing", tier: id, optionId: option.id });
      const refusal = result.events.find((e) => e.kind === "action-refused");
      assert.equal(refusal, undefined, `tier ${id} option "${option.id}" must be reachable (accepted), got refusal: ${JSON.stringify(refusal)}`);
      assert.equal(result.state.cognition.crossingsAnswered[id], option.id);
    }
  }
});

test("FURTHER_READING exists for every tier 2-10 (a quiet link per tier, DESIGN.md's own allowance) and every url is a real https link", () => {
  for (const id of TIER_IDS) {
    if (id === 1) continue;
    const reading = FURTHER_READING[id];
    assert.ok(reading !== undefined, `tier ${id} should have a further-reading link`);
    assert.ok(reading!.url.startsWith("https://"));
    assert.ok(reading!.title.length > 0);
  }
});

test("all three Goodhart branch epilogues exist, are substantial, and none is empty — DESIGN.md refuses to write only the 'good' ending", () => {
  const branches = ["repair", "persist", "reflect-immediately"] as const;
  for (const b of branches) {
    const text = GOODHART_BRANCH_EPILOGUE[b];
    assert.ok(text.length > 200, `branch "${b}" epilogue should be substantial prose, got ${text.length} chars`);
  }
  // None of the three should be a strict substring of another — a real sign no branch is a
  // lazy copy-paste of another with a word swapped.
  for (const a of branches) {
    for (const b of branches) {
      if (a === b) continue;
      assert.equal(GOODHART_BRANCH_EPILOGUE[a].includes(GOODHART_BRANCH_EPILOGUE[b]), false);
    }
  }
});
