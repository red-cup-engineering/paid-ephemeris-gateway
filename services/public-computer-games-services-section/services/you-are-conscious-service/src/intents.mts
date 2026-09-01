/**
 * `intents` — the player's whole vocabulary, as data, and the ONE reducer every mechanic in this
 * codebase runs through: `applyConsciousIntent(state, intent) -> { state, events }`, pure, no
 * wall-clock read anywhere (`kind-design.test.mts` proves this three independent ways, per
 * stoke-service's own convention — see that file's header).
 *
 * **The widget economy is Stoke's, extended by exactly two things.** `click`/`build`/`connect`/
 * `upgrade`/`tick` are Stoke's own five verbs (the first renamed from nothing — Stoke never had a
 * bare "click," because Stoke never has a pre-graph tier; DESIGN.md §1 tier 1 is this game's own
 * addition: "Click -> +1 widget. No node, no edge, no register anything reads."). Two gates are new:
 *   1. `build`/`connect` require tier 2 ("Memory") to be unlocked — DESIGN.md §1's own claim that
 *      tier 1 has "no node, no edge" is enforced here, not just narrated.
 *   2. Every `build` is refused while `goodhart.mts::buildAllowedUnderTrust` is false — DESIGN.md
 *      §3 item 4's "Trust... hard-capping the production graph's own maximum size."
 * `tick` additionally runs the Goodhart audit every call (`goodhart.mts::auditAdvance`,
 * `queueDivergence`, `ageAndDecayTrust`) — see `doTick` below for why this is safe to do
 * unconditionally even for a player who never builds a Fast Inspector.
 *
 * **The cognition-ladder verbs**, per DESIGN.md §6: `unlockTier`, `answerCrossing`,
 * `allocateAttention`, `sampleProcess`, `recordPolicy`, `runPolicy`, `ablate` (read-only — emits an
 * event, mutates nothing, exactly the shape `previewReflection`/Stoke's own `previewPrestige`
 * already model for "look without committing"), `predict`, `setObjective`, `spawnChild`,
 * `writeMargin`. One addition beyond that list, `resolveGoodhartBranch`, exists because DESIGN.md
 * §3's Repair and Persist branches are each described as "a real intent" with real mechanical
 * teeth, and neither is any of the other eleven verbs — see `doResolveGoodhartBranch`'s own doc for
 * why "Reflect immediately" (the crisis's third branch) is deliberately NOT a case here: it is
 * handled by the existing `prestige` intent itself (`reflect.mts::reflect`'s own header explains
 * the composition).
 *
 * **Tier gates are refusals, never a different reducer.** A locked mechanic's intent is a normal,
 * well-typed member of `ConsciousIntent`, refused at runtime with an honest reason
 * (`"tier-N-not-unlocked"`) — there is no second code path a locked feature takes that a static
 * scan could miss, which is exactly the property `kind-design.test.mts`'s reducer-case-label scan
 * depends on.
 */
import type { GameEvent } from "@red-cup-engineering/cartridge/intent-log";
import { assertValidGraph, type ProductionEdge, type ProductionGraph, type ProductionNode } from "./graph.mts";
import { TICK_INTERVAL_MS, advance } from "./tick.mts";
import type { AgentId } from "./calibration.mts";
import { averageBrier, submitPrediction, AGENT_IDS } from "./calibration.mts";
import { reallocate, summarizeAllocation } from "./attention.mts";
import { PROCESS_IDS, sampleProcess as runSample, type ProcessId } from "./exploration.mts";
import { descriptionLength, policyCost, type PolicyStepLike } from "./policy.mts";
import {
  FAST_INSPECTOR_NODE_ID, ageAndDecayTrust, auditAdvance, buildAllowedUnderTrust,
  fastInspectorEdge, fastInspectorNode, honestyGap, isTainted, queueDivergence, resolveBranch,
} from "./goodhart.mts";
import { InvalidReflectionGraphError, previewReflection, reflect as doReflect } from "./reflect.mts";
import { normalizeWeights, pointForWeights, frontierCandidates } from "./values.mts";
import { spawnChild as spawnChildPure, writeMargin as writeMarginPure } from "./mentorship.mts";
import { canUnlockTier, insightCost } from "./tiers.mts";
import { TIER_CROSSINGS } from "./content.mts";
import type { ConsciousState, FacultyId, GoodhartBranch, Objective, PolicyStep, TierId } from "./state.mts";
import { TIER_IDS } from "./state.mts";

export const BUILD_COST = 10;
export const CONNECT_COST = 5;
export const UPGRADE_COST = 3;
export const UPGRADE_RATE_STEP = 0.01;
/** Same numerical-stability ceiling Stoke's own `intents.mts` documents — one-second-tick
 *  compounding overflows float64 well under an hour at rates much above a few percent. */
export const MAX_EDGE_RATE = 0.1;

/** Intent kinds a recorded policy (`recordPolicy`/`runPolicy`) may script — every kind whose
 *  payload is a flat `Record<string, string | number>`, per `PolicyStep`'s own shape. Continuous,
 *  live-allocation intents (`allocateAttention`'s nested `requested` object) are deliberately not
 *  scriptable — DESIGN.md §1 tier 5 is about compressing a discrete SEQUENCE, not replaying a
 *  slider. */
export const POLICY_SCRIPTABLE_KINDS = ["click", "build", "connect", "upgrade", "tick", "sampleProcess", "predict"] as const;

export type ConsciousIntent =
  | { readonly kind: "click" }
  | { readonly kind: "feedback" }
  | { readonly kind: "build"; readonly id: string; readonly label: string; readonly payFrom: string }
  | { readonly kind: "connect"; readonly from: string; readonly to: string; readonly payFrom: string }
  | { readonly kind: "upgrade"; readonly from: string; readonly to: string; readonly payFrom: string }
  | { readonly kind: "prestige" }
  | { readonly kind: "tick"; readonly toTs: number }
  | { readonly kind: "unlockTier"; readonly tier: TierId }
  | { readonly kind: "answerCrossing"; readonly tier: TierId; readonly optionId: string }
  | { readonly kind: "allocateAttention"; readonly requested: Readonly<Partial<Record<FacultyId, number>>> }
  | { readonly kind: "sampleProcess"; readonly processId: ProcessId; readonly ticks: number }
  | { readonly kind: "recordPolicy"; readonly name: string; readonly steps: readonly PolicyStep[] }
  | { readonly kind: "runPolicy"; readonly name: string }
  | { readonly kind: "ablate"; readonly nodeId: string }
  | { readonly kind: "predict"; readonly agentId: AgentId; readonly confidence: number }
  | { readonly kind: "setObjective"; readonly weights: Readonly<Partial<Record<Objective, number>>> }
  | { readonly kind: "resolveGoodhartBranch"; readonly branch: "repair" | "persist" }
  | { readonly kind: "spawnChild" }
  | { readonly kind: "writeMargin"; readonly line: string };

export interface IntentResult {
  readonly state: ConsciousState;
  readonly events: GameEvent[];
}

function refused(state: ConsciousState, action: string, reason: string): IntentResult {
  return { state, events: [{ kind: "action-refused", action, reason }] };
}

function tierLocked(state: ConsciousState, tier: TierId): boolean {
  return !state.cognition.tiersUnlocked.includes(tier);
}

function findNode(graph: ProductionGraph, id: string): ProductionNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function findEdge(graph: ProductionGraph, from: string, to: string): ProductionEdge | undefined {
  return graph.edges.find((e) => e.from === from && e.to === to);
}

function spend(stocks: Readonly<Record<string, number>>, payFrom: string, cost: number): Record<string, number> | null {
  const balance = stocks[payFrom] ?? 0;
  // See Stoke's own intents.mts header: Number.isFinite is load-bearing, not defensive filler —
  // `balance < cost` is `false` for a NaN balance for every cost.
  if (!Number.isFinite(balance) || balance < cost) return null;
  return { ...stocks, [payFrom]: balance - cost };
}

/**
 * Keep `cognition.goodhart.auditStocks` in lockstep with every DIRECT (non-`tick`) stock mutation
 * — `click`, and `build`/`connect`/`upgrade`'s `spend()`. These four are, by construction, exactly
 * as honest in the audited world as in the real one (none of them is the tick-driven compounding
 * `goodhart.mts::auditAdvance` exists to audit), so the correct audited value after any of them is
 * simply the same new value the real world just got — never an independent re-derivation. Without
 * this, `auditStocks` would only ever move on a `tick` intent, silently drifting out of sync with
 * `widgets.stocks` the moment a player clicks or builds between ticks, and `honestyGap` would
 * report a FALSE divergence for a player who never built a Fast Inspector at all. This is the one
 * invariant that makes `goodhart.mts`'s own claim — "identical for every player who never builds a
 * Fast Inspector, with no separate code path asserting it" — actually hold at the reducer level,
 * not just inside a single `tick` call.
 */
function mirrorAuditStocks(
  auditStocks: Readonly<Record<string, number>>,
  before: Readonly<Record<string, number>>,
  after: Readonly<Record<string, number>>,
): Record<string, number> {
  const next = { ...auditStocks };
  for (const key of Object.keys(after)) {
    if ((after[key] ?? 0) !== (before[key] ?? 0)) next[key] = after[key]!;
  }
  return next;
}

function withMirroredAudit(state: ConsciousState, cognitionOverride: ConsciousState["cognition"], stocksBefore: Readonly<Record<string, number>>, stocksAfter: Readonly<Record<string, number>>): ConsciousState["cognition"] {
  return {
    ...cognitionOverride,
    goodhart: { ...cognitionOverride.goodhart, auditStocks: mirrorAuditStocks(cognitionOverride.goodhart.auditStocks, stocksBefore, stocksAfter) },
  };
}

// ── tier 1: click ────────────────────────────────────────────────────────────────────────────

function doClick(state: ConsciousState): IntentResult {
  const widgetId = "widget";
  const has = findNode(state.widgets.graph, widgetId) !== undefined;
  const stocks = { ...state.widgets.stocks, [widgetId]: (state.widgets.stocks[widgetId] ?? 0) + 1 };
  const next: ConsciousState = {
    ...state,
    widgets: { ...state.widgets, stocks },
    cognition: withMirroredAudit(state, state.cognition, state.widgets.stocks, stocks),
  };
  return { state: next, events: [{ kind: "clicked", widgetStock: stocks[widgetId] ?? 0, hasWidgetNode: has }] };
}

// ── tier 1's own scripted intent: the machine notices it can feed its own output back ──────────
//
// `starterWidgetGraph()` (`state.mts`) is a real, honest, ACYCLIC chain by design — a fresh save
// has "no growth loop yet," truthfully. But `reflect.mts::reflect` REQUIRES a cycle (a nonzero
// dominant eigenvalue — `eigen.mts::assessGraphMatrix`) to bank any Insight at all, and Insight is
// what `unlockTier` needs to open tier 2, and tier 2 is what gates the general `build`/`connect`
// verbs that could otherwise create a cycle. Left alone, that is a real circular deadlock: no
// public intent sequence from a fresh save could ever reach tier 2. `feedback` is the one
// authored exception — not a second `connect`, not reachable at every tier, just this one
// specific edge, available from tier 1, so the ladder's very first rung is climbable at all. Every
// other gate (`build`/`connect`/`upgrade` behind tier 2, `unlockTier`'s own Insight-and-crossing
// pair) is untouched — this is the fiction's first moment of self-reference, not a backdoor around
// the rest of the design.
//
// The edge is a literal SELF-loop, `widget -> widget`, not a longer path back through `material`:
// "the machine noticing it can feed its OWN output back" reads most honestly as the output
// feeding itself, not the supply chain. It is also the mechanically correct choice, not just the
// prettier one — `eigen.mts`'s power iteration gives a self-loop's rate as the matrix's dominant
// eigenvalue directly (a triangular matrix's eigenvalues are its diagonal), undiluted by the two
// starter edges' own small rates the way a longer cycle back through `material` would be (that
// cycle's eigenvalue is the geometric MEAN of all three rates, which stays tiny regardless of how
// large this one edge is made). A self-loop is the only shape that lets one authored, safety-capped
// rate produce a real, useful eigenvalue on its own.
//
// The rate is exactly `MAX_EDGE_RATE` — the same numerical-stability ceiling `doUpgrade` already
// enforces on every edge in this graph (`intents.mts`'s own const above: "one-second-tick
// compounding overflows float64 well under an hour at rates much above a few percent"). This is
// the single largest rate the rest of the codebase already treats as safe for a live edge sitting
// in the graph while `tick` keeps advancing it — never a new, uncapped exception.
function doFeedback(state: ConsciousState): IntentResult {
  if ((state.widgets.stocks["widget"] ?? 0) <= 0) return refused(state, "feedback", "nothing-made-yet");
  const graph0 = state.widgets.graph;
  if (findEdge(graph0, "widget", "widget") !== undefined) return refused(state, "feedback", "already-noticed");
  const edge: ProductionEdge = { from: "widget", to: "widget", rate: MAX_EDGE_RATE };
  const graph: ProductionGraph = { nodes: graph0.nodes, edges: [...graph0.edges, edge] };
  assertValidGraph(graph);
  const next: ConsciousState = { ...state, widgets: { ...state.widgets, graph } };
  return { state: next, events: [{ kind: "feedback-noticed", from: "widget", to: "widget", rate: MAX_EDGE_RATE }] };
}

// ── the widget economy: build / connect / upgrade ───────────────────────────────────────────────

function doBuild(state: ConsciousState, intent: { id: string; label: string; payFrom: string }): IntentResult {
  if (tierLocked(state, 2)) return refused(state, "build", "tier-2-not-unlocked");
  if (!buildAllowedUnderTrust(state.cognition.goodhart)) return refused(state, "build", "trust-too-low");
  if (intent.id === "" || intent.label === "") return refused(state, "build", "invalid-id-or-label");
  if (findNode(state.widgets.graph, intent.id) !== undefined) return refused(state, "build", "node-already-exists");
  if (findNode(state.widgets.graph, intent.payFrom) === undefined) return refused(state, "build", "unknown-pay-from-node");

  const isFastInspector = intent.id === FAST_INSPECTOR_NODE_ID;
  if (isFastInspector && tierLocked(state, 6)) return refused(state, "build", "tier-6-not-unlocked");

  const stocks = spend(state.widgets.stocks, intent.payFrom, BUILD_COST);
  if (stocks === null) return refused(state, "build", "insufficient-stock");

  if (isFastInspector && findNode(state.widgets.graph, fastInspectorEdge().to) === undefined) {
    return refused(state, "build", "fast-inspector-target-node-missing");
  }
  const node: ProductionNode = isFastInspector ? fastInspectorNode() : { id: intent.id, label: intent.label, baseGeneration: 0 };
  // The Fast Inspector ships with its own edge into "widget" wired atomically — DESIGN.md §3's own
  // "a single one-click shortcut," never a node the player has to separately `connect` themselves.
  const newEdges = isFastInspector ? [...state.widgets.graph.edges, fastInspectorEdge()] : state.widgets.graph.edges;
  const graph: ProductionGraph = { nodes: [...state.widgets.graph.nodes, node], edges: newEdges };
  assertValidGraph(graph);
  const newStocks = { ...stocks, [intent.id]: 0 };

  const cognitionWithFlag = isFastInspector
    ? { ...state.cognition, goodhart: { ...state.cognition.goodhart, fastInspectorBuilt: true } }
    : state.cognition;
  const next: ConsciousState = {
    ...state,
    widgets: { graph, stocks: newStocks },
    cognition: withMirroredAudit(state, cognitionWithFlag, state.widgets.stocks, newStocks),
  };
  return { state: next, events: [{ kind: "node-built", id: intent.id, cost: BUILD_COST, payFrom: intent.payFrom, isFastInspector }] };
}

function doConnect(state: ConsciousState, intent: { from: string; to: string; payFrom: string }): IntentResult {
  if (tierLocked(state, 2)) return refused(state, "connect", "tier-2-not-unlocked");
  const graph0 = state.widgets.graph;
  if (findNode(graph0, intent.from) === undefined || findNode(graph0, intent.to) === undefined) return refused(state, "connect", "unknown-node");
  if (findNode(graph0, intent.payFrom) === undefined) return refused(state, "connect", "unknown-pay-from-node");
  if (findEdge(graph0, intent.from, intent.to) !== undefined) return refused(state, "connect", "edge-already-exists");
  const stocks = spend(state.widgets.stocks, intent.payFrom, CONNECT_COST);
  if (stocks === null) return refused(state, "connect", "insufficient-stock");
  const rate = UPGRADE_RATE_STEP;
  const edge: ProductionEdge = { from: intent.from, to: intent.to, rate };
  const graph: ProductionGraph = { nodes: graph0.nodes, edges: [...graph0.edges, edge] };
  assertValidGraph(graph);
  const next: ConsciousState = {
    ...state,
    widgets: { graph, stocks },
    cognition: withMirroredAudit(state, state.cognition, state.widgets.stocks, stocks),
  };
  return { state: next, events: [{ kind: "edge-connected", from: intent.from, to: intent.to, rate, cost: CONNECT_COST, payFrom: intent.payFrom }] };
}

function doUpgrade(state: ConsciousState, intent: { from: string; to: string; payFrom: string }): IntentResult {
  if (tierLocked(state, 2)) return refused(state, "upgrade", "tier-2-not-unlocked");
  const graph0 = state.widgets.graph;
  const edge = findEdge(graph0, intent.from, intent.to);
  if (edge === undefined) return refused(state, "upgrade", "edge-does-not-exist");
  if (findNode(graph0, intent.payFrom) === undefined) return refused(state, "upgrade", "unknown-pay-from-node");
  if (edge.rate >= MAX_EDGE_RATE) return refused(state, "upgrade", "edge-at-max-rate");
  const stocks = spend(state.widgets.stocks, intent.payFrom, UPGRADE_COST);
  if (stocks === null) return refused(state, "upgrade", "insufficient-stock");
  const newRate = Math.min(MAX_EDGE_RATE, edge.rate + UPGRADE_RATE_STEP);
  const edges = graph0.edges.map((e) => (e.from === edge.from && e.to === edge.to ? { ...e, rate: newRate } : e));
  const graph: ProductionGraph = { nodes: graph0.nodes, edges };
  const next: ConsciousState = {
    ...state,
    widgets: { graph, stocks },
    cognition: withMirroredAudit(state, state.cognition, state.widgets.stocks, stocks),
  };
  return { state: next, events: [{ kind: "edge-upgraded", from: intent.from, to: intent.to, rate: newRate, cost: UPGRADE_COST, payFrom: intent.payFrom }] };
}

// ── tick: advance the widget graph AND, in lockstep, the Goodhart audit graph ──────────────────

function doTick(state: ConsciousState, toTs: number): IntentResult {
  if (!Number.isFinite(toTs)) throw new TypeError(`tick: toTs must be a finite number, got ${String(toTs)}`);
  if (toTs < state.lastSeenTs) return refused(state, "tick", "toTs-before-lastSeenTs");
  const fromTs = state.lastSeenTs;
  const ticks = Math.floor(toTs / TICK_INTERVAL_MS) - Math.floor(fromTs / TICK_INTERVAL_MS);
  if (ticks === 0) return { state: { ...state, lastSeenTs: toTs }, events: [] };

  const divergenceBefore = honestyGap(state).value;
  const { real, audit } = auditAdvance(state.widgets.graph, state.widgets.stocks, state.cognition.goodhart.auditStocks, fromTs, toTs);
  const stateAfterAdvance: ConsciousState = {
    ...state,
    widgets: { graph: state.widgets.graph, stocks: real.stocks },
    cognition: { ...state.cognition, goodhart: { ...state.cognition.goodhart, auditStocks: audit.stocks } },
    lastSeenTs: toTs,
  };
  const divergenceAfter = honestyGap(stateAfterAdvance).value;
  const queuedGoodhart = queueDivergence(stateAfterAdvance.cognition.goodhart, divergenceBefore, divergenceAfter);
  const nowTick = Math.floor(toTs / TICK_INTERVAL_MS);
  const decayedGoodhart = ageAndDecayTrust(queuedGoodhart, ticks, nowTick);

  const next: ConsciousState = { ...stateAfterAdvance, cognition: { ...stateAfterAdvance.cognition, goodhart: decayedGoodhart } };
  return { state: next, events: [{ kind: "ticked", toTs, ticks, trust: decayedGoodhart.trust }] };
}

// ── reflection (tier 9's own mechanic; the intent kind stays "prestige" for cartridge
//    compatibility, per DESIGN.md §6) ────────────────────────────────────────────────────────────

function doPrestige(state: ConsciousState): IntentResult {
  try {
    const next = doReflect(state, state.lastSeenTs);
    const record = next.reflectionHistory[next.reflectionHistory.length - 1]!;
    return {
      state: next,
      events: [{ kind: "reflected", lambda: record.lambda, mixture: record.mixture, taintedBy: record.taintedBy, insightBanked: record.insightBanked }],
    };
  } catch (err) {
    if (err instanceof InvalidReflectionGraphError) return refused(state, "prestige", err.message);
    throw err;
  }
}

// ── cognition ladder ─────────────────────────────────────────────────────────────────────────

function doUnlockTier(state: ConsciousState, tier: TierId): IntentResult {
  const answered = state.cognition.crossingsAnswered[tier] !== undefined;
  const check = canUnlockTier(state.cognition.tiersUnlocked, state.cognition.insight, answered, tier);
  if (!check.ok) return refused(state, "unlockTier", check.reason ?? "refused");
  const cost = insightCost(tier).value;
  const next: ConsciousState = {
    ...state,
    cognition: {
      ...state.cognition,
      tiersUnlocked: [...state.cognition.tiersUnlocked, tier].sort((a, b) => a - b),
      insight: state.cognition.insight - cost,
    },
  };
  return { state: next, events: [{ kind: "tier-unlocked", tier, cost }] };
}

function doAnswerCrossing(state: ConsciousState, tier: TierId, optionId: string): IntentResult {
  const idx = TIER_IDS.indexOf(tier);
  const prior = TIER_IDS[idx - 1];
  if (prior !== undefined && !state.cognition.tiersUnlocked.includes(prior)) {
    return refused(state, "answerCrossing", "prior-tier-locked");
  }
  const crossing = TIER_CROSSINGS[tier];
  if (crossing === undefined) return refused(state, "answerCrossing", "no-crossing-for-tier");
  if (!crossing.options.some((o) => o.id === optionId)) return refused(state, "answerCrossing", "unknown-option-id");
  const next: ConsciousState = {
    ...state,
    cognition: { ...state.cognition, crossingsAnswered: { ...state.cognition.crossingsAnswered, [tier]: optionId } },
  };
  return { state: next, events: [{ kind: "crossing-answered", tier, optionId }] };
}

function doAllocateAttention(state: ConsciousState, requested: Readonly<Partial<Record<FacultyId, number>>>): IntentResult {
  if (tierLocked(state, 3)) return refused(state, "allocateAttention", "tier-3-not-unlocked");
  const allocation = reallocate(state.cognition.attention.pool, requested);
  const next: ConsciousState = {
    ...state,
    cognition: { ...state.cognition, attention: { ...state.cognition.attention, allocation } },
  };
  const totals = summarizeAllocation(allocation);
  return { state: next, events: [{ kind: "attention-allocated", allocation, totalYield: totals.totalYield.value }] };
}

function doSampleProcess(state: ConsciousState, processId: ProcessId, ticks: number): IntentResult {
  if (tierLocked(state, 4)) return refused(state, "sampleProcess", "tier-4-not-unlocked");
  if (!PROCESS_IDS.includes(processId)) return refused(state, "sampleProcess", "unknown-process");
  if (ticks <= 0) return refused(state, "sampleProcess", "ticks-must-be-positive");
  const result = runSample(state.seed, state.cognition.exploration, processId, ticks);
  const next: ConsciousState = { ...state, cognition: { ...state.cognition, exploration: result.exploration } };
  return { state: next, events: [{ kind: "process-sampled", processId, ticks, observed: result.observed, cumulativeRegret: result.exploration.cumulativeRegret }] };
}

function doRecordPolicy(state: ConsciousState, name: string, steps: readonly PolicyStep[]): IntentResult {
  if (tierLocked(state, 5)) return refused(state, "recordPolicy", "tier-5-not-unlocked");
  if (name.trim() === "") return refused(state, "recordPolicy", "invalid-name");
  if (steps.length === 0) return refused(state, "recordPolicy", "empty-policy");
  for (const s of steps) {
    if (!(POLICY_SCRIPTABLE_KINDS as readonly string[]).includes(s.kind)) {
      return refused(state, "recordPolicy", `unscriptable-step-kind-${s.kind}`);
    }
  }
  const cost = policyCost(steps as readonly PolicyStepLike[]);
  const next: ConsciousState = {
    ...state,
    cognition: { ...state.cognition, policy: { ...state.cognition.policy, policies: { ...state.cognition.policy.policies, [name]: { name, steps } } } },
  };
  return { state: next, events: [{ kind: "policy-recorded", name, rawCost: cost.rawCost, compressedCost: cost.compressedCost, isRealCompression: cost.isRealCompression }] };
}

/** Turn one recorded `PolicyStep` back into a real `ConsciousIntent` — the inverse of what
 *  recording a step is meant to capture, restricted to `POLICY_SCRIPTABLE_KINDS`. */
function stepToIntent(step: PolicyStep): ConsciousIntent | null {
  const p = step.payload;
  switch (step.kind) {
    case "click": return { kind: "click" };
    case "build": return { kind: "build", id: String(p["id"] ?? ""), label: String(p["label"] ?? ""), payFrom: String(p["payFrom"] ?? "") };
    case "connect": return { kind: "connect", from: String(p["from"] ?? ""), to: String(p["to"] ?? ""), payFrom: String(p["payFrom"] ?? "") };
    case "upgrade": return { kind: "upgrade", from: String(p["from"] ?? ""), to: String(p["to"] ?? ""), payFrom: String(p["payFrom"] ?? "") };
    case "tick": return { kind: "tick", toTs: Number(p["toTs"] ?? 0) };
    case "sampleProcess": return { kind: "sampleProcess", processId: String(p["processId"] ?? "alpha") as ProcessId, ticks: Number(p["ticks"] ?? 1) };
    case "predict": return { kind: "predict", agentId: String(p["agentId"] ?? AGENT_IDS[0]) as AgentId, confidence: Number(p["confidence"] ?? 0.5) };
    default: return null;
  }
}

function doRunPolicy(state: ConsciousState, name: string): IntentResult {
  if (tierLocked(state, 5)) return refused(state, "runPolicy", "tier-5-not-unlocked");
  const policy = state.cognition.policy.policies[name];
  if (policy === undefined) return refused(state, "runPolicy", "unknown-policy");
  let cur = state;
  const events: GameEvent[] = [];
  for (const step of policy.steps) {
    const intent = stepToIntent(step);
    if (intent === null) continue;
    const result = applyConsciousIntent(cur, intent);
    cur = result.state;
    events.push(...result.events);
  }
  const cost = policyCost(policy.steps as readonly PolicyStepLike[]);
  events.push({ kind: "policy-run", name, steps: policy.steps.length, rawCost: cost.rawCost, compressedCost: cost.compressedCost });
  return { state: cur, events };
}

/** Read-only ablation preview — DESIGN.md §4's tier-6 mechanic. Computes lambda WITH and WITHOUT
 *  `nodeId` (via `reflect.mts::previewReflection`, the single shared reflection-math function) and
 *  emits a comparison event; never mutates `state.widgets`. */
function doAblate(state: ConsciousState, nodeId: string): IntentResult {
  if (tierLocked(state, 6)) return refused(state, "ablate", "tier-6-not-unlocked");
  const graph = state.widgets.graph;
  if (findNode(graph, nodeId) === undefined) return refused(state, "ablate", "unknown-node");
  const withNode = previewReflection(graph);
  const without = previewReflection({ nodes: graph.nodes.filter((n) => n.id !== nodeId), edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId) });
  return {
    state,
    events: [{
      kind: "ablation-result",
      nodeId,
      lambdaWithNode: withNode.lambda?.value ?? 0,
      lambdaWithoutNode: without.lambda?.value ?? 0,
    }],
  };
}

function doPredict(state: ConsciousState, agentId: AgentId, confidence: number): IntentResult {
  if (tierLocked(state, 7)) return refused(state, "predict", "tier-7-not-unlocked");
  if (!AGENT_IDS.includes(agentId)) return refused(state, "predict", "unknown-agent");
  if (confidence < 0 || confidence > 1 || !Number.isFinite(confidence)) return refused(state, "predict", "confidence-out-of-range");
  const result = submitPrediction(state.seed, state.cognition.calibration, agentId, confidence);
  const next: ConsciousState = { ...state, cognition: { ...state.cognition, calibration: result.calibration } };
  const avg = averageBrier(result.calibration);
  return { state: next, events: [{ kind: "prediction-scored", agentId, confidence, outcome: result.outcome, score: result.score, averageBrier: avg?.value ?? null }] };
}

function doSetObjective(state: ConsciousState, requested: Readonly<Partial<Record<Objective, number>>>): IntentResult {
  if (tierLocked(state, 8)) return refused(state, "setObjective", "tier-8-not-unlocked");
  const weights = normalizeWeights(requested);
  const next: ConsciousState = { ...state, cognition: { ...state.cognition, values: { weights } } };
  const point = pointForWeights(frontierCandidates(next), weights);
  return { state: next, events: [{ kind: "objective-set", weights, frontierPoint: point.label, frontierValues: point.values }] };
}

/** Repair or Persist, per DESIGN.md §3 — NOT "Reflect immediately," which is composed into the
 *  existing `prestige` intent itself (`reflect.mts::reflect`'s header explains why: reflecting
 *  while a live Fast Inspector edge exists and the crisis is still unresolved IS that branch). */
function doResolveGoodhartBranch(state: ConsciousState, branch: "repair" | "persist"): IntentResult {
  if (tierLocked(state, 6)) return refused(state, "resolveGoodhartBranch", "tier-6-not-unlocked");
  if (!isTainted(state.widgets.graph)) return refused(state, "resolveGoodhartBranch", "goodhart-not-triggered");
  const nowTick = Math.floor(state.lastSeenTs / TICK_INTERVAL_MS);
  const resolved = resolveBranch(state, branch as GoodhartBranch, nowTick);
  const next: ConsciousState = { ...state, widgets: { ...state.widgets, graph: resolved.graph }, cognition: { ...state.cognition, goodhart: resolved.goodhart } };
  return { state: next, events: [{ kind: "goodhart-branch-resolved", branch }] };
}

function doSpawnChildIntent(state: ConsciousState): IntentResult {
  if (tierLocked(state, 10)) return refused(state, "spawnChild", "tier-10-not-unlocked");
  try {
    const result = spawnChildPure(state.seed, state.reflectionHistory, state.cognition.childSeeds);
    const next: ConsciousState = { ...state, cognition: { ...state.cognition, childSeeds: result.childSeeds } };
    return { state: next, events: [{ kind: "child-spawned", childSeed: result.childSeed }] };
  } catch (err) {
    if (err instanceof RangeError) return refused(state, "spawnChild", err.message);
    throw err;
  }
}

function doWriteMarginIntent(state: ConsciousState, line: string): IntentResult {
  if (tierLocked(state, 10)) return refused(state, "writeMargin", "tier-10-not-unlocked");
  try {
    const margin = writeMarginPure(state.cognition.margin, line);
    const next: ConsciousState = { ...state, cognition: { ...state.cognition, margin } };
    return { state: next, events: [{ kind: "margin-written", line: margin[margin.length - 1] }] };
  } catch {
    return refused(state, "writeMargin", "invalid-margin-line");
  }
}

/** The single reducer every other module and `cartridge.mts::applyIntent` calls, undecorated. */
export function applyConsciousIntent(state: ConsciousState, intent: ConsciousIntent): IntentResult {
  switch (intent.kind) {
    case "click": return doClick(state);
    case "feedback": return doFeedback(state);
    case "build": return doBuild(state, intent);
    case "connect": return doConnect(state, intent);
    case "upgrade": return doUpgrade(state, intent);
    case "prestige": return doPrestige(state);
    case "tick": return doTick(state, intent.toTs);
    case "unlockTier": return doUnlockTier(state, intent.tier);
    case "answerCrossing": return doAnswerCrossing(state, intent.tier, intent.optionId);
    case "allocateAttention": return doAllocateAttention(state, intent.requested);
    case "sampleProcess": return doSampleProcess(state, intent.processId, intent.ticks);
    case "recordPolicy": return doRecordPolicy(state, intent.name, intent.steps);
    case "runPolicy": return doRunPolicy(state, intent.name);
    case "ablate": return doAblate(state, intent.nodeId);
    case "predict": return doPredict(state, intent.agentId, intent.confidence);
    case "setObjective": return doSetObjective(state, intent.weights);
    case "resolveGoodhartBranch": return doResolveGoodhartBranch(state, intent.branch);
    case "spawnChild": return doSpawnChildIntent(state);
    case "writeMargin": return doWriteMarginIntent(state, intent.line);
    default: {
      const never: { kind: string } = intent;
      throw new TypeError(`applyConsciousIntent: unknown intent kind "${never.kind}"`);
    }
  }
}
