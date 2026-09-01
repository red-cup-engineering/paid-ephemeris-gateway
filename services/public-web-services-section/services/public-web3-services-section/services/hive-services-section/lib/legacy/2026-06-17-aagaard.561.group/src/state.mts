// state — the operational record and the in-memory control plane.
//
// Two things persist across the fleet's life: the *tick log* (one append-only
// JSONL line per cycle per account, the canonical per-cycle metrics recorded
// through the upstream `appendTickSnapshot`) and the *last fleet readout* (the
// full structured plan+execution of the most recent tick, for the ops surface
// to serve). The *control plane* (running / live / enabled lanes) lives in
// memory and is the single mutable authority the ops endpoints turn; locked
// lanes can never be added to it.

import path from "node:path";
import { mkdirSync } from "node:fs";

import { appendJsonl, readJsonl, readJsonFile, writeFileAtomic } from "@emsenn/relating/ledger";
import { type TickSnapshot } from "@emsenn/computing-with-hive/scripts";

import { type Capability, isLocked, type AagaardConfig } from "./config.mts";

export interface AccountTickReadout {
  readonly account: string;
  readonly voting?: {
    readonly currentMana: string;
    readonly maxMana: string;
    readonly votesPlanned: number;
    readonly votesBroadcast: number;
    readonly votesDryRun: number;
    readonly errors: number;
    /** The wallet's voting character: archetype, assembled feeds, and the
     *  idle-game decision it made this tick (voted on conviction, or waited). */
    readonly strategy: {
      readonly archetype: string;
      readonly disposition: string;
      readonly feeds: readonly string[];
      readonly fieldSize: number;
      readonly emphasisHits: number;
      readonly votingPowerBps: number;
      readonly eligibleCount: number;
      readonly acted: boolean;
      readonly decision: string;
    };
    readonly radar: { readonly posts: number; readonly mispricingEnergy: number; readonly components: number; readonly durable: boolean; readonly topSinks: readonly string[] };
    readonly intelligence?: {
      readonly fiedler: number;
      readonly decayHalfLife: number;
      readonly cartelCycles: number;
      readonly bridges: number;
      readonly topByExpectedAlpha: readonly string[];
      readonly cartelTrailsFlagged: number;
    };
  };
  readonly trading?: {
    readonly mode: "live" | "dry-run" | "propose-only";
    readonly hive: string;
    readonly hbd: string;
    readonly tradesPlanned: number;
    readonly tradesExecuted: number;
    readonly lpPlanned: number;
    readonly lpExecuted: number;
    readonly savingsPlanned: boolean;
    readonly savingsExecuted: boolean;
  };
  readonly posting?: { readonly draftsPrepared: number; readonly locked: true };
  readonly gaming?: { readonly gamesDetected: number; readonly games: readonly string[]; readonly locked: true };
  readonly incentive?: {
    readonly offersFound: number;
    readonly nominated: number;
    readonly autoExecuted: number;
    readonly topOffers: readonly string[];
  };
  readonly error?: string;
}

export interface FleetTickReadout {
  readonly kind: "aagaard.fleet-tick";
  readonly ts: string;
  readonly running: boolean;
  readonly live: boolean;
  readonly enabled: readonly Capability[];
  readonly accounts: readonly AccountTickReadout[];
}

/** The single mutable control authority the ops surface turns. Locked lanes can
 *  never enter `enabled`, whatever a caller asks. */
export class ControlPlane {
  running: boolean;
  live: boolean;
  private readonly enabled: Set<Capability>;

  constructor(config: AagaardConfig) {
    this.running = true;
    this.live = config.live;
    this.enabled = new Set(config.enabled.filter((c) => !isLocked(c)));
  }

  isEnabled(capability: Capability): boolean {
    return !isLocked(capability) && this.enabled.has(capability);
  }

  /** Enable an UNLOCKED lane. Returns false (no-op) for a locked lane. */
  enable(capability: Capability): boolean {
    if (isLocked(capability)) return false;
    this.enabled.add(capability);
    return true;
  }

  disable(capability: Capability): void {
    this.enabled.delete(capability);
  }

  enabledList(): readonly Capability[] {
    return Object.freeze([...this.enabled]);
  }
}

export interface StateStore {
  /** Append-only tier: per-tick metric logs and the EAVT witness feeds. */
  readonly logDir: string;
  /** Projected-current tier: control state, OAuth, and the feed state views. */
  readonly stateDir: string;
  /** Invariant tier: the settled records the witnessing ledger compacts into. */
  readonly recordDir: string;
  /** Locked analysis-post drafts (analysis-posts.mts), pending human review. */
  readonly draftsDir: string;
}

export function ensureDirs(store: StateStore): void {
  mkdirSync(store.logDir, { recursive: true });
  mkdirSync(store.stateDir, { recursive: true });
  mkdirSync(store.recordDir, { recursive: true });
  mkdirSync(store.draftsDir, { recursive: true });
}

/** Record one account's canonical per-cycle metrics through the upstream tick
 *  recorder, into a per-account JSONL in the log dir. */
export function recordAccountTick(store: StateStore, account: string, snapshot: TickSnapshot): void {
  appendJsonl(path.join(store.logDir, `${account}.ticks.jsonl`), [snapshot]);
}

/** Append the full fleet readout to the fleet tick log (canonical JSONL) and
 *  write it as the current last-readout for the ops surface (atomically). */
export function recordFleetTick(store: StateStore, readout: FleetTickReadout): void {
  appendJsonl(path.join(store.logDir, "fleet.ticks.jsonl"), [readout]);
  writeFileAtomic(path.join(store.stateDir, "last.json"), `${JSON.stringify(readout, null, 2)}\n`);
}

export function readLastReadout(store: StateStore): FleetTickReadout | null {
  return readJsonFile<FleetTickReadout>(path.join(store.stateDir, "last.json"));
}

/** Read the most recent fleet tick records (newest last). */
export function readFleetTicks(store: StateStore, limit: number): readonly FleetTickReadout[] {
  const all = readJsonl<FleetTickReadout>(path.join(store.logDir, "fleet.ticks.jsonl"));
  return all.slice(-limit);
}
