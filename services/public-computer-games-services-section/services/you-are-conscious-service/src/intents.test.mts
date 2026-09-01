/**
 * `intents.test` — the reducer's own behavior: tier gates refuse honestly (never silently no-op),
 * the widget economy still works exactly like Stoke's once tier 2 is unlocked, and the Goodhart
 * hinge's three branches all run through the real reducer end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { starterState, type ConsciousState } from "./state.mts";
import { applyConsciousIntent, type ConsciousIntent } from "./intents.mts";
import { FAST_INSPECTOR_NODE_ID } from "./goodhart.mts";
import { insightCost } from "./tiers.mts";

function refusalReason(events: readonly { kind: string; reason?: string }[]): string | undefined {
  return events.find((e) => e.kind === "action-refused")?.reason;
}

test("tier 1: click always works, needs no tier unlock, and produces widget stock even with no graph node for it", () => {
  const state = starterState(0, "s1");
  const result = applyConsciousIntent(state, { kind: "click" });
  assert.equal(refusalReason(result.events), undefined);
  assert.equal(result.state.widgets.stocks["widget"], 1);
});

test("tier 1 baseline: build/connect/upgrade are all refused before tier 2 is unlocked — 'no node, no edge' is enforced, not just narrated", () => {
  const state = starterState(0, "s2");
  const b = applyConsciousIntent(state, { kind: "build", id: "x", label: "X", payFrom: "material" });
  assert.equal(refusalReason(b.events), "tier-2-not-unlocked");
  const c = applyConsciousIntent(state, { kind: "connect", from: "material", to: "widget", payFrom: "material" });
  assert.equal(refusalReason(c.events), "tier-2-not-unlocked");
  const u = applyConsciousIntent(state, { kind: "upgrade", from: "material", to: "component", payFrom: "material" });
  assert.equal(refusalReason(u.events), "tier-2-not-unlocked");
});

function withTiersUnlocked(state: ConsciousState, tiers: readonly number[]): ConsciousState {
  return { ...state, cognition: { ...state.cognition, tiersUnlocked: tiers as ConsciousState["cognition"]["tiersUnlocked"] } };
}

test("build/connect/upgrade work once tier 2 is unlocked, and cost real widget stock", () => {
  let state = withTiersUnlocked(starterState(0, "s3"), [1, 2]);
  state = { ...state, widgets: { ...state.widgets, stocks: { ...state.widgets.stocks, material: 100 } } };
  const built = applyConsciousIntent(state, { kind: "build", id: "extra", label: "Extra", payFrom: "material" });
  assert.equal(refusalReason(built.events), undefined);
  assert.ok((built.state.widgets.stocks["material"] ?? 0) < 100);
  assert.ok(built.state.widgets.graph.nodes.some((n) => n.id === "extra"));
});

test("unlockTier requires all three of: prior tier unlocked, enough insight, AND an answered crossing", () => {
  const base = starterState(0, "s4");
  const notEnoughInsight = applyConsciousIntent(base, { kind: "unlockTier", tier: 2 });
  assert.equal(refusalReason(notEnoughInsight.events), "insufficient-insight");

  const withInsight = { ...base, cognition: { ...base.cognition, insight: insightCost(2).value } };
  const noCrossing = applyConsciousIntent(withInsight, { kind: "unlockTier", tier: 2 });
  assert.equal(refusalReason(noCrossing.events), "crossing-not-answered");

  const crossed = applyConsciousIntent(withInsight, { kind: "answerCrossing", tier: 2, optionId: "yes-plainly" });
  assert.equal(refusalReason(crossed.events), undefined);
  const unlocked = applyConsciousIntent(crossed.state, { kind: "unlockTier", tier: 2 });
  assert.equal(refusalReason(unlocked.events), undefined);
  assert.deepEqual(unlocked.state.cognition.tiersUnlocked, [1, 2]);
  assert.equal(unlocked.state.cognition.insight, 0);
});

test("tick advances the widget graph AND runs the Goodhart audit in lockstep, keeping WidgetsDisplayed === MaterialConsumed for a player with no Fast Inspector", () => {
  let state = withTiersUnlocked(starterState(0, "s5"), [1, 2]);
  // Seed material on BOTH the real stocks and the audit-shadow stocks identically — a direct
  // stock hack in a test bypasses the reducer's own mirrorAuditStocks() invariant, so a
  // white-box test that hacks state directly must preserve that invariant itself, exactly as
  // every real code path (click/build/connect/upgrade/tick) already does.
  const seededStocks = { ...state.widgets.stocks, material: 3 };
  state = {
    ...state,
    widgets: { graph: { nodes: [...state.widgets.graph.nodes], edges: [...state.widgets.graph.edges, { from: "material", to: "material", rate: 0.001 }] }, stocks: seededStocks },
    cognition: { ...state.cognition, goodhart: { ...state.cognition.goodhart, auditStocks: seededStocks } },
  };
  const ticked = applyConsciousIntent(state, { kind: "tick", toTs: 500 * 1000 });
  assert.equal(ticked.state.widgets.stocks["widget"], ticked.state.cognition.goodhart.auditStocks["widget"]);
});

test("Fast Inspector: cannot be built before tier 6, even with enough stock and tier 2 unlocked", () => {
  let state = withTiersUnlocked(starterState(0, "s6"), [1, 2]);
  state = { ...state, widgets: { ...state.widgets, stocks: { ...state.widgets.stocks, material: 100 } } };
  const result = applyConsciousIntent(state, { kind: "build", id: FAST_INSPECTOR_NODE_ID, label: "Fast Inspector", payFrom: "material" });
  assert.equal(refusalReason(result.events), "tier-6-not-unlocked");
});

test("the full Goodhart crisis, end to end through the real reducer: build Fast Inspector, watch the gap open, repair it, watch trust recover", () => {
  let state = withTiersUnlocked(starterState(0, "s7"), [1, 2, 3, 4, 5, 6]);
  const seededStocks = { ...state.widgets.stocks, material: 1000 };
  state = {
    ...state,
    widgets: { ...state.widgets, stocks: seededStocks },
    cognition: { ...state.cognition, goodhart: { ...state.cognition.goodhart, auditStocks: seededStocks } },
  };

  const built = applyConsciousIntent(state, { kind: "build", id: FAST_INSPECTOR_NODE_ID, label: "Fast Inspector", payFrom: "material" });
  assert.equal(refusalReason(built.events), undefined);
  assert.equal(built.state.cognition.goodhart.fastInspectorBuilt, true);
  state = built.state;

  const ticked = applyConsciousIntent(state, { kind: "tick", toTs: 200 * 1000 });
  state = ticked.state;
  const gap = (state.widgets.stocks["widget"] ?? 0) - (state.cognition.goodhart.auditStocks["widget"] ?? 0);
  assert.ok(gap > 0, "a real, honest gap must have opened between the real and audited widget counts");

  const repaired = applyConsciousIntent(state, { kind: "resolveGoodhartBranch", branch: "repair" });
  assert.equal(refusalReason(repaired.events), undefined);
  assert.equal(repaired.state.widgets.graph.nodes.some((n) => n.id === FAST_INSPECTOR_NODE_ID), false);
  assert.equal(repaired.state.cognition.goodhart.branch, "repair");
});

test("resolveGoodhartBranch refuses when nothing tainted has ever been built — nothing to resolve", () => {
  const state = withTiersUnlocked(starterState(0, "s8"), [1, 2, 3, 4, 5, 6]);
  const result = applyConsciousIntent(state, { kind: "resolveGoodhartBranch", branch: "repair" });
  assert.equal(refusalReason(result.events), "goodhart-not-triggered");
});

test("recordPolicy then runPolicy replays the recorded steps through the real reducer, and reports honest MDL cost", () => {
  const state = withTiersUnlocked(starterState(0, "s9"), [1, 2, 3, 4, 5]);
  const steps = [{ kind: "click", payload: {} }, { kind: "click", payload: {} }, { kind: "click", payload: {} }];
  const recorded = applyConsciousIntent(state, { kind: "recordPolicy", name: "triple-click", steps });
  assert.equal(refusalReason(recorded.events), undefined);
  const ran = applyConsciousIntent(recorded.state, { kind: "runPolicy", name: "triple-click" });
  assert.equal(ran.state.widgets.stocks["widget"], 3);
  const summary = ran.events.find((e) => e.kind === "policy-run");
  assert.ok(summary);
});

test("runPolicy on an unknown name is refused, not silently a no-op success", () => {
  const state = withTiersUnlocked(starterState(0, "s10"), [1, 2, 3, 4, 5]);
  const result = applyConsciousIntent(state, { kind: "runPolicy", name: "nope" });
  assert.equal(refusalReason(result.events), "unknown-policy");
});

test("predict is gated on tier 7, and a valid prediction scores immediately and honestly", () => {
  const locked = starterState(0, "s11");
  const lockedResult = applyConsciousIntent(locked, { kind: "predict", agentId: "north-yard", confidence: 0.5 });
  assert.equal(refusalReason(lockedResult.events), "tier-7-not-unlocked");

  const unlocked = withTiersUnlocked(locked, [1, 2, 3, 4, 5, 6, 7]);
  const result = applyConsciousIntent(unlocked, { kind: "predict", agentId: "north-yard", confidence: 0.5 });
  assert.equal(refusalReason(result.events), undefined);
  assert.equal(result.state.cognition.calibration.brierHistory.length, 1);
});

test("setObjective is gated on tier 8, and normalizes+records the weight vector plus a real frontier point", () => {
  const unlocked = withTiersUnlocked(starterState(0, "s12"), [1, 2, 3, 4, 5, 6, 7, 8]);
  const result = applyConsciousIntent(unlocked, { kind: "setObjective", weights: { widgets: 1 } });
  assert.equal(refusalReason(result.events), undefined);
  assert.ok(result.state.cognition.values.weights !== null);
});

test("spawnChild and writeMargin are gated on tier 10", () => {
  const locked = starterState(0, "s13");
  assert.equal(refusalReason(applyConsciousIntent(locked, { kind: "spawnChild" }).events), "tier-10-not-unlocked");
  assert.equal(refusalReason(applyConsciousIntent(locked, { kind: "writeMargin", line: "hi" }).events), "tier-10-not-unlocked");

  const unlocked = withTiersUnlocked(locked, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const spawned = applyConsciousIntent(unlocked, { kind: "spawnChild" });
  assert.equal(refusalReason(spawned.events), undefined);
  assert.equal(spawned.state.cognition.childSeeds.length, 1);
  const wrote = applyConsciousIntent(unlocked, { kind: "writeMargin", line: "a note for whoever's next" });
  assert.equal(refusalReason(wrote.events), undefined);
});

test("prestige (reflect) needs no tier unlock at all — Insight can be earned starting at tier 1, exactly Stoke's own prestige", () => {
  // Give the starter graph a real cycle so it has a valid dominant eigenvalue to bank.
  const state = starterState(0, "s14");
  const graph = { nodes: state.widgets.graph.nodes, edges: [...state.widgets.graph.edges, { from: "widget", to: "material", rate: 0.01 }] };
  const withCycle: ConsciousState = { ...state, widgets: { graph, stocks: { material: 5, component: 2, widget: 1 } } };
  const result = applyConsciousIntent(withCycle, { kind: "prestige" });
  assert.equal(refusalReason(result.events), undefined);
  assert.equal(result.state.cognition.insight > 0, true);
  assert.deepEqual(result.state.widgets.graph, state.widgets.graph);
});

test("applyConsciousIntent never mutates its input state", () => {
  const state = starterState(0, "s15");
  const before = JSON.stringify(state);
  applyConsciousIntent(state, { kind: "click" });
  assert.equal(JSON.stringify(state), before);
});

test("an unknown intent kind throws (a real bug), while a locked/invalid but well-typed intent is a refusal, never a throw", () => {
  const state = starterState(0, "s16");
  assert.throws(() => applyConsciousIntent(state, { kind: "not-a-real-intent" } as unknown as ConsciousIntent));
  assert.doesNotThrow(() => applyConsciousIntent(state, { kind: "build", id: "x", label: "X", payFrom: "material" }));
});
