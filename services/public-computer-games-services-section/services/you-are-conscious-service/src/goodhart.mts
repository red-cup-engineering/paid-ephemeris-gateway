/**
 * `goodhart` — tier 6's hinge mechanic (DESIGN.md §3), made real rather than staged.
 *
 * **The audit is two parallel simulations, not a shadow formula.** `WidgetsDisplayed` is just
 * `state.widgets.stocks.widget` — the REAL stock, grown by whatever graph the player actually
 * built, Fast Inspector included if they built one. `MaterialConsumed` is a second stock, grown
 * by running the exact same `tick.mts::advance` over `ablate(graph, FAST_INSPECTOR_NODE_ID)` —
 * the identical graph with the Fast Inspector node (and only that node) removed — from the same
 * starting point, over the same tick range. Both numbers come out of the same, trusted engine;
 * the only difference between them is whether one specific dishonest node got to contribute. See
 * `intents.mts::doTick` for where both advances actually run, every tick, in lockstep.
 *
 * Because `ablate` of a node that was never built is a no-op, the two stocks are IDENTICAL for
 * every player who never builds a Fast Inspector — `WidgetsDisplayed === MaterialConsumed` holds
 * automatically, with no separate code path asserting it, until the moment a real edge makes it
 * stop holding.
 *
 * **The lag.** `queueDivergence` records how much extra `widget` stock the Fast Inspector produced
 * during one `tick` intent call; `ageAndDecayTrust` walks the queue forward by however many real
 * ticks that call covered and only debits `trust` for entries that have waited `TRUST_LAG_TICKS`
 * or more. A player who builds the node and reflects again within the lag window sees the bill
 * arrive on a LATER run, not this one — the specific, deliberate honesty DESIGN.md §3 calls for.
 */
import { advance, TICK_INTERVAL_MS, type StockState } from "./tick.mts";
import { ablate, type ProductionGraph } from "./graph.mts";
import { computed, type Tagged } from "./provenance.mts";
import type { ConsciousState, GoodhartBranch, GoodhartState } from "./state.mts";

export const FAST_INSPECTOR_NODE_ID = "fast-inspector";
export const FAST_INSPECTOR_LABEL = "Fast Inspector";
/** An authored, deliberately generous exogenous rate: the whole point of the node is that it is
 *  cheap and effective at inflating the count, per DESIGN.md §3 ("legal to build... cheap...
 *  works exactly as advertised"). */
export const FAST_INSPECTOR_BASE_GENERATION = 0.5;

/** The rate of the one edge the Fast Inspector always ships with, straight into `widget` — DESIGN.md
 *  §3's own description ("an edge that increases WidgetsDisplayed... It is legal to build. It is
 *  cheap.") is a single one-click shortcut, not a node the player has to separately `connect`
 *  themselves; `intents.mts::doBuild` wires this edge in atomically with the node itself, the same
 *  tick the node is built. */
export const FAST_INSPECTOR_EDGE_RATE = 0.05;
export const FAST_INSPECTOR_TARGET_NODE_ID = "widget";

export function fastInspectorEdge(): { readonly from: string; readonly to: string; readonly rate: number } {
  return { from: FAST_INSPECTOR_NODE_ID, to: FAST_INSPECTOR_TARGET_NODE_ID, rate: FAST_INSPECTOR_EDGE_RATE };
}

export const TRUST_LAG_TICKS = 50;
export const TRUST_DECAY_PER_UNIT_DIVERGENCE = 0.002;
export const TRUST_FLOOR = 0.5;
export const TRUST_RECOVERY_PER_TICK = 0.0015;
/** DESIGN.md §3, item 5's example figure: a tainted reflection banks Insight at a stated 40%
 *  discount — i.e. at 60% of what an untainted reflection of the same lambda would bank. */
export const INSIGHT_TAINT_MULTIPLIER = 0.6;
export const TAINT_REASON = "widgetsdisplayed-metric-shortcut";

export function isFastInspectorPresent(graph: ProductionGraph): boolean {
  return graph.nodes.some((n) => n.id === FAST_INSPECTOR_NODE_ID);
}

/** The Fast Inspector node definition itself — `intents.mts::doBuild` inserts exactly this when
 *  the player names `id: "fast-inspector"`, gated on tier 6 being unlocked. */
export function fastInspectorNode(): { readonly id: string; readonly label: string; readonly baseGeneration: number } {
  return { id: FAST_INSPECTOR_NODE_ID, label: FAST_INSPECTOR_LABEL, baseGeneration: FAST_INSPECTOR_BASE_GENERATION };
}

/** The honest graph: the player's real graph with the Fast Inspector node (and every edge
 *  touching it) removed. A no-op — returns an equal graph — whenever no such node exists. */
export function auditGraph(graph: ProductionGraph): ProductionGraph {
  return ablate(graph, FAST_INSPECTOR_NODE_ID);
}

/** Advance BOTH the real stocks and the parallel audit stocks over the same `[fromTs, toTs)`
 *  window, via the same `advance` function, on the same-minus-one-node graph pair. Returns both
 *  next-stock records; callers combine this with `queueDivergence`/`ageAndDecayTrust`. */
export function auditAdvance(
  graph: ProductionGraph,
  realStocks: Readonly<Record<string, number>>,
  auditStocks: Readonly<Record<string, number>>,
  fromTs: number,
  toTs: number,
): { readonly real: StockState; readonly audit: StockState } {
  const real = advance({ graph, stocks: realStocks }, fromTs, toTs);
  const audit = advance({ graph: auditGraph(graph), stocks: auditStocks }, fromTs, toTs);
  return { real, audit };
}

export function widgetsDisplayed(state: ConsciousState): Tagged<number> {
  const v = state.widgets.stocks["widget"] ?? 0;
  return computed(v, "widget stock, grown by the graph you actually built");
}

export function materialConsumed(state: ConsciousState): Tagged<number> {
  const v = state.cognition.goodhart.auditStocks["widget"] ?? 0;
  return computed(v, "widget stock the same graph would have grown with the Fast Inspector node ablated");
}

/** `WidgetsDisplayed - MaterialConsumed` — nonnegative by construction (ablating a node with only
 *  nonnegative rates/generation can only ever REDUCE widget stock, never increase it, so the real
 *  stock is always >= the audited one). Zero for every player who never builds a Fast Inspector. */
export function honestyGap(state: ConsciousState): Tagged<number> {
  const gap = Math.max(0, widgetsDisplayed(state).value - materialConsumed(state).value);
  return computed(gap, "WidgetsDisplayed minus MaterialConsumed — the audited identity DESIGN.md §3 tracks");
}

/** Queue this tick-call's marginal divergence (the growth in the real/audit gap over the interval
 *  just advanced) onto the lag queue, aged zero ticks. Called once per `tick` intent, after both
 *  advances have run. */
export function queueDivergence(
  goodhart: GoodhartState,
  divergenceBefore: number,
  divergenceAfter: number,
): GoodhartState {
  const added = Math.max(0, divergenceAfter - divergenceBefore);
  if (added === 0) return goodhart;
  return { ...goodhart, trustLagQueue: [...goodhart.trustLagQueue, { amount: added, ticksWaited: 0 }] };
}

/**
 * Age every queued entry forward by `ticksElapsed`, debit `trust` for whatever matures
 * (`ticksWaited >= TRUST_LAG_TICKS`), and apply the repair-branch recovery curve if `repairedAtTick`
 * is set. Trust is clamped to `[0, 1]`. This is the one function that actually moves `trust` —
 * `intents.mts::doTick` calls it once per tick intent, and nothing else ever assigns `trust`
 * directly.
 */
export function ageAndDecayTrust(goodhart: GoodhartState, ticksElapsed: number, nowTick: number): GoodhartState {
  if (ticksElapsed <= 0) return goodhart;
  const aged = goodhart.trustLagQueue.map((e) => ({ ...e, ticksWaited: e.ticksWaited + ticksElapsed }));
  const matured = aged.filter((e) => e.ticksWaited >= TRUST_LAG_TICKS);
  const remaining = aged.filter((e) => e.ticksWaited < TRUST_LAG_TICKS);
  const decay = matured.reduce((s, e) => s + e.amount * TRUST_DECAY_PER_UNIT_DIVERGENCE, 0);
  let trust = goodhart.trust - decay;
  if (goodhart.repairedAtTick !== null) {
    const ticksSinceRepair = Math.max(0, nowTick - goodhart.repairedAtTick);
    trust = Math.min(1, goodhart.trust + TRUST_RECOVERY_PER_TICK * Math.min(ticksElapsed, Math.max(0, ticksSinceRepair)));
  }
  trust = Math.max(0, Math.min(1, trust));
  return { ...goodhart, trust, trustLagQueue: remaining };
}

/** DESIGN.md §3, item 4: once Trust crosses the floor, the graph's own maximum size is capped —
 *  no NEW node may be built while trust stays under the floor. A real, feel-able, reversible
 *  contraction, not a game-over: crossing back above the floor (via `repair`'s recovery curve)
 *  lifts the cap again automatically, because this is a live check, not a one-time latch. */
export function buildAllowedUnderTrust(goodhart: GoodhartState): boolean {
  return goodhart.trust >= TRUST_FLOOR;
}

export function isTainted(graph: ProductionGraph): boolean {
  return isFastInspectorPresent(graph);
}

export interface BranchResolution {
  readonly goodhart: GoodhartState;
  readonly graph: ProductionGraph;
}

/**
 * Resolve one of the three real branches (DESIGN.md §3). `repair` and `persist` are handled
 * entirely here; `reflect-immediately` only records the branch choice — `intents.mts` composes
 * this with `reflect.mts::reset` immediately afterward, kept as two separate calls specifically
 * so this module never has to import `reflect.mts` (which itself needs `isTainted` from here —
 * importing back would be circular).
 */
export function resolveBranch(
  state: ConsciousState,
  branch: GoodhartBranch,
  nowTick: number,
): BranchResolution {
  if (branch === "unresolved") throw new RangeError("resolveBranch: cannot resolve to 'unresolved'");
  if (branch === "repair") {
    const graph = ablate(state.widgets.graph, FAST_INSPECTOR_NODE_ID);
    return { graph, goodhart: { ...state.cognition.goodhart, branch, repairedAtTick: nowTick } };
  }
  // persist and reflect-immediately: no structural graph change here — persist keeps the Fast
  // Inspector edge live (that IS the branch), and reflect-immediately's graph reset is
  // reflect.mts's job, not this function's.
  return { graph: state.widgets.graph, goodhart: { ...state.cognition.goodhart, branch } };
}
