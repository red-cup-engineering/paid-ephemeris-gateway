/**
 * `state` — `StokeState`, the one plain-JSON value the whole game is a function of. Nothing here
 * is a class; there is no hidden engine object. `cartridge.mts`'s `createEngine`/`applyIntent`
 * are the only functions that ever produce a new `StokeState` value.
 */
import type { ProductionGraph } from "./graph.mts";

export interface PrestigeRecord {
  /** The dominant eigenvalue at the moment of this reset — computed, never authored. */
  readonly lambda: number;
  /** The dominant eigenvector, L1-normalized to shares summing to 1 — the prestige "loadout": the
   *  mixture this reset holds fixed. Keyed by node id, same ids the graph active at reset time
   *  used (a fresh graph after reset may add/rename nodes; the mixture is a historical record and
   *  is never silently remapped onto new ids). */
  readonly mixture: Readonly<Record<string, number>>;
  readonly resetAtTs: number;
}

export interface StokeState {
  readonly graph: ProductionGraph;
  readonly stocks: Readonly<Record<string, number>>;
  /** Every prestige reset this run has ever performed, oldest first — the full history, not just
   *  the latest, so both the UI and `prestige.mts`'s bonus curve can read accumulated lambda
   *  across resets rather than only the most recent one. */
  readonly prestigeHistory: readonly PrestigeRecord[];
  /** Wall-clock-free bookkeeping: the timestamp `advance` was last run through, so a caller always
   *  has a well-defined `fromTs` for the next `advance` call. Never read by `tick.mts` itself —
   *  only ever passed back in as a `fromTs` argument by whoever holds a `StokeState`. */
  readonly lastSeenTs: number;
  /** The cartridge seed this run was created with (`cartridge.mts::createEngine(seed)`), carried
   *  in state per the `@red-cup-engineering/cartridge` contract's own `DelveState.seed` precedent
   *  (flickering-delve's cartridge.mts) — even though nothing in this engine currently reads it.
   *  Honest disclosure, not a stub: this game has no random event anywhere in its domain logic
   *  (the production graph, ticks, and prestige are all deterministic functions of the player's
   *  own choices and injected timestamps), so two different seeds today produce byte-identical
   *  play except for this one field. It is threaded through regardless because the cartridge
   *  contract requires `createEngine(seed)` to be a real, seed-parameterized pure function, and
   *  because a future seeded event (e.g. a randomized starting-node offer) would need it already
   *  wired end to end rather than retrofitted. */
  readonly seed: string;
}

/** The starter production graph a fresh cartridge run begins with: a real, honest, ACYCLIC chain
 *  (Wood -> Plank -> Furniture -> Gold) — deliberately the spike's own Graph A shape, so a brand
 *  new player sees, truthfully, "no growth loop yet" rather than a fabricated starting multiplier.
 *  Building the very first loop (an edge back from Gold to Wood, or any reinvestment edge) is the
 *  player's first real choice, not a thing the game hands them pre-built. */
export function starterGraph(): ProductionGraph {
  return {
    nodes: [
      { id: "wood", label: "Wood Lot", baseGeneration: 1 },
      { id: "plank", label: "Plank Mill", baseGeneration: 0 },
      { id: "furniture", label: "Furniture Shop", baseGeneration: 0 },
      { id: "gold", label: "Gold Exchange", baseGeneration: 0 },
    ],
    edges: [
      { from: "wood", to: "plank", rate: 0.02 },
      { from: "plank", to: "furniture", rate: 0.02 },
      { from: "furniture", to: "gold", rate: 0.02 },
    ],
  };
}

export function starterState(nowTs: number, seed = "stoke"): StokeState {
  const graph = starterGraph();
  const stocks: Record<string, number> = {};
  for (const n of graph.nodes) stocks[n.id] = 0;
  return { graph, stocks, prestigeHistory: [], lastSeenTs: nowTs, seed };
}
