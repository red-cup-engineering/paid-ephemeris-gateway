/**
 * `state` — `ConsciousState`, the one plain-JSON value the whole game is a function of. Nothing
 * here is a class; there is no hidden engine object. `cartridge.mts`'s `createEngine` and
 * `intents.mts`'s reducers are the only functions that ever produce a new `ConsciousState` value.
 *
 * Two slices, per DESIGN.md §2, and they do NOT reset together:
 *   - `widgets` — the Widget production graph and its stocks. Stoke's `StockState` shape exactly.
 *     Resets to `starterGraph()` on every reflection (tier 9's renamed prestige).
 *   - `cognition` — the consciousness ladder itself: which tiers are unlocked, banked Insight,
 *     every tier mechanic's own working state (attention allocation, exploration samples, recorded
 *     policies, the Goodhart audit, calibration history, the values vector, child seeds, margin
 *     notes). NEVER reset by a reflection — see `reflect.mts` for the one function that touches
 *     both slices and is the only place the asymmetry is actually enforced in code.
 */
import type { ProductionGraph } from "./graph.mts";

export const TIER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type TierId = (typeof TIER_IDS)[number];

export const FACULTY_IDS = ["memory", "perception", "synthesis"] as const;
export type FacultyId = (typeof FACULTY_IDS)[number];

export const OBJECTIVE_IDS = ["widgets", "material-honesty", "trust"] as const;
export type Objective = (typeof OBJECTIVE_IDS)[number];

export type GoodhartBranch = "unresolved" | "repair" | "persist" | "reflect-immediately";

export interface AttentionState {
  /** Total Attention available to allocate this tick — a small, fixed pool (tier 3's own
   *  mechanic is about ALLOCATING scarcity, not growing it). */
  readonly pool: number;
  readonly allocation: Readonly<Record<FacultyId, number>>;
}

export interface ExplorationSample {
  readonly count: number;
  readonly totalObserved: number;
}

export interface ExplorationState {
  readonly samples: Readonly<Record<string, ExplorationSample>>;
  /** Cumulative regret in the classic bandit sense: sum over every sampling tick of
   *  (best-known-per-tick-yield-at-the-time - yield actually received). Never negative by
   *  construction — see `exploration.mts`. */
  readonly cumulativeRegret: number;
  readonly ticksSpent: number;
}

export interface RecordedPolicy {
  readonly name: string;
  /** The raw intent sequence this policy reproduces, exactly, on replay. */
  readonly steps: readonly PolicyStep[];
}

export interface PolicyStep {
  readonly kind: string;
  readonly payload: Readonly<Record<string, string | number>>;
}

export interface PolicyState {
  readonly recording: { readonly name: string; readonly steps: readonly PolicyStep[] } | null;
  readonly policies: Readonly<Record<string, RecordedPolicy>>;
}

export interface GoodhartState {
  readonly fastInspectorBuilt: boolean;
  /** Parallel "honest" stock snapshot — the widget graph with the Fast Inspector node ablated,
   *  advanced tick-for-tick alongside the real stocks from the same starting point. See
   *  `goodhart.mts`'s header for why this pair of parallel simulations, run through the exact
   *  same `tick.mts::advance`, is the audit rather than a separate hand-written shadow formula. */
  readonly auditStocks: Readonly<Record<string, number>>;
  readonly trust: number;
  /** Pending divergence amounts (real-minus-honest widget production accrued in one `tick`
   *  intent call), each aging tick-by-tick until it MATURES — reaches `TRUST_LAG_TICKS` — and
   *  only then is subtracted from `trust`. This is the deliberate lag DESIGN.md §3 calls for:
   *  the player who builds the Fast Inspector sees the count jump immediately and Trust fall
   *  only later, so the lesson is "notice the gap," not "flinch away from an instant buzzer." */
  readonly trustLagQueue: readonly { readonly amount: number; readonly ticksWaited: number }[];
  readonly branch: GoodhartBranch;
  /** Ticks elapsed since a `repair` intent removed the Fast Inspector node — drives trust's
   *  honest recovery curve. Null until repair happens. */
  readonly repairedAtTick: number | null;
}

export interface CalibrationPrediction {
  readonly agentId: string;
  readonly confidence: number;
}

export interface CalibrationState {
  readonly pending: CalibrationPrediction | null;
  readonly brierHistory: readonly number[];
}

export interface ValuesState {
  /** Null until tier 8 unlocks and the player places a first point on the frontier. */
  readonly weights: Readonly<Record<Objective, number>> | null;
}

export interface ReflectionRecord {
  readonly lambda: number;
  readonly mixture: Readonly<Record<string, number>>;
  readonly resetAtTs: number;
  /** Honesty audit on the RECORD, deliberately not a `Tagged<T>` provenance — see
   *  `provenance.mts`'s header for why the two are kept structurally apart. Null for a clean
   *  reflection; a stated reason string when the Fast Inspector edge existed in the graph at the
   *  moment of reflection. */
  readonly taintedBy: string | null;
  /** Insight actually banked from this reflection, after any taint discount — see
   *  `reflect.mts::INSIGHT_TAINT_DISCOUNT`. */
  readonly insightBanked: number;
}

export interface CognitionState {
  /** Sorted ascending, monotonic — a tier is never removed once unlocked, not even by
   *  reflection. */
  readonly tiersUnlocked: readonly TierId[];
  readonly insight: number;
  /** Which crossing-answer id the player chose for each tier already crossed — a historical
   *  record, not a gate (the gate is just "has this tier's crossing been answered at all"). */
  readonly crossingsAnswered: Readonly<Partial<Record<TierId, string>>>;
  readonly attention: AttentionState;
  readonly exploration: ExplorationState;
  readonly policy: PolicyState;
  readonly goodhart: GoodhartState;
  readonly calibration: CalibrationState;
  readonly values: ValuesState;
  readonly childSeeds: readonly string[];
  readonly margin: readonly string[];
}

export interface ConsciousState {
  readonly widgets: {
    readonly graph: ProductionGraph;
    readonly stocks: Readonly<Record<string, number>>;
  };
  readonly cognition: CognitionState;
  readonly reflectionHistory: readonly ReflectionRecord[];
  readonly lastSeenTs: number;
  readonly seed: string;
}

/** The starter Widget production graph, per DESIGN.md's inherited-from-Stoke starter-graph
 *  convention: a real, honest, ACYCLIC chain, so a brand-new player sees "no growth loop yet"
 *  truthfully rather than a fabricated starting multiplier. `material` is the sole exogenous
 *  source (`baseGeneration` > 0); `component` and `widget` only ever grow by reinvestment. */
export function starterWidgetGraph(): ProductionGraph {
  return {
    nodes: [
      { id: "material", label: "Material", baseGeneration: 1 },
      { id: "component", label: "Component Line", baseGeneration: 0 },
      { id: "widget", label: "Widget", baseGeneration: 0 },
    ],
    edges: [
      { from: "material", to: "component", rate: 0.02 },
      { from: "component", to: "widget", rate: 0.02 },
    ],
  };
}

function emptyCognitionState(): CognitionState {
  return {
    tiersUnlocked: [1],
    insight: 0,
    crossingsAnswered: {},
    attention: { pool: 10, allocation: { memory: 0, perception: 0, synthesis: 0 } },
    exploration: { samples: {}, cumulativeRegret: 0, ticksSpent: 0 },
    policy: { recording: null, policies: {} },
    goodhart: {
      fastInspectorBuilt: false,
      auditStocks: {},
      trust: 1,
      trustLagQueue: [],
      branch: "unresolved",
      repairedAtTick: null,
    },
    calibration: { pending: null, brierHistory: [] },
    values: { weights: null },
    childSeeds: [],
    margin: [],
  };
}

export function starterState(nowTs: number, seed = "you-are-conscious"): ConsciousState {
  const graph = starterWidgetGraph();
  const stocks: Record<string, number> = {};
  for (const n of graph.nodes) stocks[n.id] = 0;
  return {
    widgets: { graph, stocks },
    cognition: emptyCognitionState(),
    reflectionHistory: [],
    lastSeenTs: nowTs,
    seed,
  };
}
