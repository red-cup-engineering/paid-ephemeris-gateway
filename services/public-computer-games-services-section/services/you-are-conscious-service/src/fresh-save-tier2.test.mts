/**
 * `fresh-save-tier2` — the regression lock for the tier-2 softlock, driven through nothing but
 * PUBLIC intents (`cartridge.mts::createEngine` + `applyIntent`, exactly the surface the real UI
 * and the real cartridge contract use) and no direct construction of `cognition`/`widgets` fields
 * — the exact hole the rest of the suite left open, since every other reflect/tier test
 * (`reflect.test.mts`, `goodhart.test.mts`, `values.test.mts`, ...) builds its cyclic widget graph
 * by hand rather than reaching it through play.
 *
 * Before the fix: `starterWidgetGraph()` (`state.mts`) is a real, honest, ACYCLIC chain — "no
 * growth loop yet" is true at a fresh save, by design. `reflect.mts::reflect` refuses to bank any
 * Insight without a cycle (`eigen.mts::assessGraphMatrix`), Insight is the only thing (together
 * with the crossing) `unlockTier` accepts to open tier 2, and tier 2 is what gates the general
 * `build`/`connect` verbs that could otherwise create a cycle. No sequence of public intents from
 * a fresh save could ever reach tier 2 — a real, unescapable deadlock a first-time player runs
 * into immediately, not an edge case.
 *
 * After the fix: tier 1 has exactly one new scripted intent, `feedback` (`intents.mts::doFeedback`)
 * — the machine noticing it can feed its own output back, closing the graph's first cycle. This
 * test plays the entire escape route end to end and locks it as a regression.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, applyIntent } from "./cartridge.mts";
import type { ConsciousState } from "./state.mts";
import type { ConsciousIntent } from "./intents.mts";
import type { GameEvent } from "@red-cup-engineering/cartridge/intent-log";

function play(state: ConsciousState, intent: ConsciousIntent): { state: ConsciousState; events: GameEvent[] } {
  const result = applyIntent(state, intent);
  return { state: result.state, events: result.events };
}

function refusalOf(events: readonly GameEvent[]): GameEvent | undefined {
  return events.find((e) => e.kind === "action-refused");
}

test("regression baseline: reflecting on an untouched fresh save's starter graph is refused — the deadlock's root cause is real, not assumed", () => {
  const state = createEngine("fresh-save-tier2-baseline");
  const { events } = play(state, { kind: "prestige" });
  const refusal = refusalOf(events);
  assert.ok(refusal !== undefined, "reflecting on the raw, untouched starter graph must be refused (it is genuinely acyclic)");
});

test("fresh save escapes the tier-2 deadlock through public intents only: click -> feedback -> reflect -> answer the crossing -> unlock tier 2 -> build for real", () => {
  let state: ConsciousState = createEngine("fresh-save-tier2-regression");

  // tier 1: click a few times — the only verb a fresh save has at all.
  for (let i = 0; i < 3; i++) {
    const { state: next, events } = play(state, { kind: "click" });
    state = next;
    assert.equal(refusalOf(events), undefined, "click must never be refused at tier 1");
  }
  assert.ok((state.widgets.stocks["widget"] ?? 0) > 0, "clicking must have produced real widget stock");

  // the fiction's first moment of self-reference: notice the output can feed back into itself.
  // Available at tier 1, no Insight cost, no crossing — a scripted one-time intent, never the
  // general `connect` verb (which stays locked behind tier 2 exactly as designed).
  {
    const { state: next, events } = play(state, { kind: "feedback" });
    const refusal = refusalOf(events);
    assert.equal(refusal, undefined, `feedback must succeed at tier 1 once something has been made, got refusal: ${JSON.stringify(refusal)}`);
    state = next;
  }
  assert.ok(
    state.widgets.graph.edges.some((e) => e.from === "widget" && e.to === "widget"),
    "feedback must add exactly the widget -> widget self-loop, closing the first cycle",
  );

  // a second feedback is refused, not silently duplicated — this is a one-time notice, not a
  // repeatable action, checked BEFORE it gets consumed by the reflect below.
  {
    const { events } = play(state, { kind: "feedback" });
    assert.ok(refusalOf(events) !== undefined, "a second feedback intent must be refused once the edge already exists");
  }

  // the first reflect ever to succeed: the graph has its first real cycle, and the deadlock is
  // broken for good, right here.
  {
    const { state: next, events } = play(state, { kind: "prestige" });
    const refusal = refusalOf(events);
    assert.equal(refusal, undefined, `the first reflect must succeed once the graph has a cycle, got refusal: ${JSON.stringify(refusal)}`);
    state = next;
  }
  assert.ok(state.cognition.insight > 0, "the first successful reflection must bank real, positive Insight");
  assert.deepEqual(state.widgets.graph.edges.some((e) => e.from === "widget" && e.to === "widget"), false, "reflecting resets the widget graph — the feedback edge does not survive its own reflection");

  // tier 2's own (small, but nonzero) Insight cost may still take a few more click -> feedback ->
  // reflect cycles to actually afford in full — exactly the same repeatable-currency shape every
  // later tier's doubling cost curve already uses. This loops until there is enough banked,
  // rather than assuming the single first reflect above must already be enough.
  for (let cycle = 0; cycle < 10 && state.cognition.insight < 2; cycle++) {
    for (let i = 0; i < 2; i++) {
      const { state: next, events } = play(state, { kind: "click" });
      state = next;
      assert.equal(refusalOf(events), undefined);
    }
    const feedbackResult = play(state, { kind: "feedback" });
    assert.equal(refusalOf(feedbackResult.events), undefined, `feedback must succeed on cycle ${cycle}`);
    state = feedbackResult.state;

    const reflectResult = play(state, { kind: "prestige" });
    const refusal = refusalOf(reflectResult.events);
    assert.equal(refusal, undefined, `reflect must succeed once the graph has a cycle (cycle ${cycle}), got refusal: ${JSON.stringify(refusal)}`);
    state = reflectResult.state;
  }
  assert.ok(state.cognition.insight >= 2, "enough Insight must be banked to afford tier 2's own cost");

  // tier 2's own crossing, answered honestly — any offered option opens the door.
  {
    const { state: next, events } = play(state, { kind: "answerCrossing", tier: 2, optionId: "yes-plainly" });
    assert.equal(refusalOf(events), undefined);
    state = next;
  }

  // tier 2 itself: real Insight, real crossing answered, nothing seeded.
  {
    const { state: next, events } = play(state, { kind: "unlockTier", tier: 2 });
    const refusal = refusalOf(events);
    assert.equal(refusal, undefined, `tier 2 must unlock once Insight and the crossing are both real, got refusal: ${JSON.stringify(refusal)}`);
    state = next;
  }
  assert.ok(state.cognition.tiersUnlocked.includes(2), "tier 2 must be present in tiersUnlocked");

  // and tier 2's own verbs — build/connect — must now actually work, proving the unlock is real,
  // not just a flag flipped in isolation. Accumulate real widget stock first (reflecting reset
  // it to zero) via the one verb tier 1 always has.
  for (let i = 0; i < 12; i++) {
    const { state: next, events } = play(state, { kind: "click" });
    state = next;
    assert.equal(refusalOf(events), undefined);
  }
  {
    const { state: next, events } = play(state, { kind: "build", id: "second-line", label: "Second Line", payFrom: "widget" });
    const refusal = refusalOf(events);
    assert.equal(refusal, undefined, `build must succeed once tier 2 is unlocked and stock is real, got refusal: ${JSON.stringify(refusal)}`);
    state = next;
  }
  assert.ok(state.widgets.graph.nodes.some((n) => n.id === "second-line"), "the built node must really be in the graph");
});
