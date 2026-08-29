/**
 * `intents` — the player's whole vocabulary, as data: `build` (a new node), `connect` (a new
 * edge), `upgrade` (strengthen an existing edge), `prestige` (reset, banking `(lambda, mixture)`
 * per `prestige.mts`), and `tick` (advance the clock to an injected timestamp). Every reducer
 * here is pure — `(StokeState, StokeIntent) -> { state, events }` — and `cartridge.mts`'s
 * `applyIntent` is a direct, undecorated call into `applyStokeIntent`, so this module and the
 * cartridge contract can never drift apart the way a second, parallel implementation could.
 *
 * **Cost model, disclosed as what it is.** Building/connecting/upgrading spend stock drawn from
 * one node the player names (`payFrom`) — an ordinary idle-game currency sink, not an energy
 * mechanic: nothing here regenerates on a timer, nothing is sold for real money, and every cost
 * is paid out of stock the player already produced by playing. The flat cost constants below
 * (`BUILD_COST` etc.) are DESIGNER-CHOSEN numbers, exactly like `prestige.mts`'s
 * `STARTING_STOCK_PER_BANKED_LAMBDA` — real UI copy must tag them `designed-flavor`
 * (`provenance.mts`), never `computed-from-your-graph`. `MAX_EDGE_RATE` is a genuine safety cap,
 * not a balance choice: `tick.mts`'s own header notes that one-second-tick compounding overflows
 * float64 in well under an hour at rates much above a few percent, so an uncapped rate is a real
 * numerical-stability bug waiting to happen, not just an aesthetic one.
 *
 * **No wall-clock reads, anywhere in this file.** `tick`'s `toTs` is supplied by the caller (the
 * intent log, ultimately the client), never read from `Date.now()` here. `prestige`'s
 * `resetAtTs` reuses `state.lastSeenTs` — the last injected timestamp this run has already seen —
 * rather than asking for a fresh one, so a prestige reset never needs its own wall-clock read
 * either. See `kind-design.test.mts` for the executable proof this discipline holds, and for why
 * it is the specific thing that makes an energy-wall-and-pay-to-skip mechanic structurally
 * impossible here, not just a house style preference.
 */
import type { GameEvent } from "@red-cup-engineering/cartridge/intent-log";
import { assertValidGraph, type ProductionEdge, type ProductionGraph, type ProductionNode } from "./graph.mts";
import { TICK_INTERVAL_MS, advance } from "./tick.mts";
import { InvalidPrestigeGraphError, reset as prestigeReset } from "./prestige.mts";
import type { StokeState } from "./state.mts";

export const BUILD_COST = 10;
export const CONNECT_COST = 5;
export const UPGRADE_COST = 3;
export const UPGRADE_RATE_STEP = 0.01;
/** Per `tick.mts`'s own compounding-overflow note: an edge rate above this, ticked once a second,
 *  reaches float64 overflow within a plausible offline gap. Not a PF-hypothesis requirement —
 *  PF only needs nonnegative entries — a pure numerical-stability ceiling on top of it. */
export const MAX_EDGE_RATE = 0.1;

export type StokeIntent =
  | { readonly kind: "build"; readonly id: string; readonly label: string; readonly payFrom: string }
  | { readonly kind: "connect"; readonly from: string; readonly to: string; readonly payFrom: string }
  | { readonly kind: "upgrade"; readonly from: string; readonly to: string; readonly payFrom: string }
  | { readonly kind: "prestige" }
  | { readonly kind: "tick"; readonly toTs: number };

export interface IntentResult {
  readonly state: StokeState;
  readonly events: GameEvent[];
}

function refused(state: StokeState, action: string, reason: string): IntentResult {
  return { state, events: [{ kind: "action-refused", action, reason }] };
}

function findNode(graph: ProductionGraph, id: string): ProductionNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function findEdge(graph: ProductionGraph, from: string, to: string): ProductionEdge | undefined {
  return graph.edges.find((e) => e.from === from && e.to === to);
}

function spend(state: StokeState, payFrom: string, cost: number): StokeState | null {
  const balance = state.stocks[payFrom] ?? 0;
  // Number.isFinite(balance) is load-bearing, not defensive filler: `balance < cost` is `false`
  // for a NaN balance for EVERY cost (IEEE-754 — every comparison against NaN is false), so a
  // plain `<` check alone would silently treat a corrupted NaN stock as always-affordable,
  // letting every future build/connect/upgrade paid from it go through for free forever. See
  // `tick.mts`'s module header ("Numerical-safety ceiling") for how a stock could reach NaN in
  // the first place; this check is the second, independent layer that keeps that failure mode
  // from also breaking the economy even if a NaN/Infinity ever slipped past `tick.mts`'s own
  // clamp.
  if (!Number.isFinite(balance) || balance < cost) return null;
  return { ...state, stocks: { ...state.stocks, [payFrom]: balance - cost } };
}

function doBuild(state: StokeState, intent: { id: string; label: string; payFrom: string }): IntentResult {
  if (intent.id === "" || intent.label === "") return refused(state, "build", "invalid-id-or-label");
  if (findNode(state.graph, intent.id) !== undefined) return refused(state, "build", "node-already-exists");
  if (findNode(state.graph, intent.payFrom) === undefined) return refused(state, "build", "unknown-pay-from-node");
  const paid = spend(state, intent.payFrom, BUILD_COST);
  if (paid === null) return refused(state, "build", "insufficient-stock");
  const node: ProductionNode = { id: intent.id, label: intent.label, baseGeneration: 0 };
  const graph: ProductionGraph = { nodes: [...paid.graph.nodes, node], edges: paid.graph.edges };
  assertValidGraph(graph);
  const next: StokeState = { ...paid, graph, stocks: { ...paid.stocks, [intent.id]: 0 } };
  return { state: next, events: [{ kind: "node-built", id: intent.id, cost: BUILD_COST, payFrom: intent.payFrom }] };
}

function doConnect(state: StokeState, intent: { from: string; to: string; payFrom: string }): IntentResult {
  if (findNode(state.graph, intent.from) === undefined || findNode(state.graph, intent.to) === undefined) {
    return refused(state, "connect", "unknown-node");
  }
  if (findNode(state.graph, intent.payFrom) === undefined) return refused(state, "connect", "unknown-pay-from-node");
  if (findEdge(state.graph, intent.from, intent.to) !== undefined) return refused(state, "connect", "edge-already-exists");
  const paid = spend(state, intent.payFrom, CONNECT_COST);
  if (paid === null) return refused(state, "connect", "insufficient-stock");
  const rate = UPGRADE_RATE_STEP;
  const edge: ProductionEdge = { from: intent.from, to: intent.to, rate };
  const graph: ProductionGraph = { nodes: paid.graph.nodes, edges: [...paid.graph.edges, edge] };
  assertValidGraph(graph);
  const next: StokeState = { ...paid, graph };
  return { state: next, events: [{ kind: "edge-connected", from: intent.from, to: intent.to, rate, cost: CONNECT_COST, payFrom: intent.payFrom }] };
}

function doUpgrade(state: StokeState, intent: { from: string; to: string; payFrom: string }): IntentResult {
  const edge = findEdge(state.graph, intent.from, intent.to);
  if (edge === undefined) return refused(state, "upgrade", "edge-does-not-exist");
  if (findNode(state.graph, intent.payFrom) === undefined) return refused(state, "upgrade", "unknown-pay-from-node");
  if (edge.rate >= MAX_EDGE_RATE) return refused(state, "upgrade", "edge-at-max-rate");
  const paid = spend(state, intent.payFrom, UPGRADE_COST);
  if (paid === null) return refused(state, "upgrade", "insufficient-stock");
  const newRate = Math.min(MAX_EDGE_RATE, edge.rate + UPGRADE_RATE_STEP);
  const edges = paid.graph.edges.map((e) => (e.from === edge.from && e.to === edge.to ? { ...e, rate: newRate } : e));
  const graph: ProductionGraph = { nodes: paid.graph.nodes, edges };
  const next: StokeState = { ...paid, graph };
  return { state: next, events: [{ kind: "edge-upgraded", from: intent.from, to: intent.to, rate: newRate, cost: UPGRADE_COST, payFrom: intent.payFrom }] };
}

function doPrestige(state: StokeState): IntentResult {
  try {
    const next = prestigeReset(state, state.lastSeenTs);
    const record = next.prestigeHistory[next.prestigeHistory.length - 1]!;
    return { state: next, events: [{ kind: "prestiged", lambda: record.lambda, mixture: record.mixture }] };
  } catch (err) {
    if (err instanceof InvalidPrestigeGraphError) return refused(state, "prestige", err.message);
    throw err;
  }
}

function doTick(state: StokeState, toTs: number): IntentResult {
  if (!Number.isFinite(toTs)) throw new TypeError(`tick: toTs must be a finite number, got ${String(toTs)}`);
  if (toTs < state.lastSeenTs) return refused(state, "tick", "toTs-before-lastSeenTs");
  const advanced = advance({ graph: state.graph, stocks: state.stocks }, state.lastSeenTs, toTs);
  const next: StokeState = { ...state, stocks: advanced.stocks, lastSeenTs: toTs };
  const ticks = Math.floor(toTs / TICK_INTERVAL_MS) - Math.floor(state.lastSeenTs / TICK_INTERVAL_MS);
  return { state: next, events: [{ kind: "ticked", toTs, ticks }] };
}

/** The single reducer `cartridge.mts::applyIntent` calls, undecorated. */
export function applyStokeIntent(state: StokeState, intent: StokeIntent): IntentResult {
  switch (intent.kind) {
    case "build": return doBuild(state, intent);
    case "connect": return doConnect(state, intent);
    case "upgrade": return doUpgrade(state, intent);
    case "prestige": return doPrestige(state);
    case "tick": return doTick(state, intent.toTs);
    default: {
      const never: { kind: string } = intent;
      throw new TypeError(`applyStokeIntent: unknown intent kind "${never.kind}"`);
    }
  }
}
