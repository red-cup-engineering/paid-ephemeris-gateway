/**
 * `scene` — the one stateful piece of onestone: accounts, the active board a player is
 * mid-level on, and the wire projection (`ClientFrame`) everything else in the service reads.
 *
 * Every other module in this repo is a pure function of its arguments (boards are pure
 * functions of seed strings, `economy`/`progression` are pure transforms of `PlayerMeta`).
 * This module is where that purity earns its keep: `input()` is a thin dispatcher that reads
 * `PlayerMeta` + an in-progress `Run` out of a map, calls exactly the same trusted verbs a
 * test calls (`engine.applyMove`, `economy.spendLife`, `progression.applyResult`, ...), and
 * writes the result back. There is exactly one path a swap can take, whether it arrives over
 * HTTP or from a unit test constructing a `Scene` directly.
 *
 * Two things are deliberately *not* here, on purpose:
 *  - **No background clock.** Lives regenerate lazily: every read (`frame`, `input`) ticks
 *    `economy.tickLives` against the caller's injected `now`, the same way a battery-idle-game
 *    computes offline accrual on return rather than running a wall-clock timer. That keeps the
 *    whole scene a pure function of "what account, what input, what time" — the server can
 *    replay a saved snapshot and a sequence of inputs and reach bit-identical `PlayerMeta`.
 *  - **No `order`/`payments` bookkeeping.** `server.mts` (already built) defines the exact
 *    boundary it needs as `SceneLike`: a single `grantSku(account, sku)` hook it calls once
 *    `payments.mts` has independently verified a cleared order and resolved which account gets
 *    which `Sku`. Idempotency-on-double-webhook is `Payments`' job (it only calls this once per
 *    cleared order); this module just has to apply the grant, which is one call into
 *    `economy.grantSku`.
 *
 * `ClientFrame.lastSteps`/`chaosSix` are deliberately treated as *transient, response-local*
 * fields, not run state: they describe the settle that just happened, per `types.mts`'s own
 * comment ("empty on plain state pushes"). A reconnecting SSE stream or an unrelated poll must
 * never replay a stale cascade animation, so only the `ClientFrame` returned directly from the
 * `input()` call that caused a settle carries its `steps`/`chaosSix` — `frame()` always reports
 * empty. Whether chaos-six *ever* fired this run (which feeds `levels.rateLevel`'s bonus) is
 * tracked separately as `Run.chaosSixEver`, sticky across the whole level attempt.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type {
  BoardGeometry,
  BoardState,
  BoosterKind,
  CascadeStep,
  CellId,
  ClientFrame,
  ClientInput,
  LevelResult,
  LevelSpec,
  PlayerMeta,
  Sku,
} from './types.mts';
import { buildGeometry } from './tiling.mts';
import { applyBlockers, applyBooster, applyMove, spawnBoard } from './engine.mts';
import { type GoalDeltas, goalProgressFrom, levelById, rateLevel } from './levels.mts';
import { buyBooster, buyBoosterWithPrisms, freshMeta, grantSku as applySkuGrant, spendLife, tickLives } from './economy.mts';
import { applyResult, isUnlocked } from './progression.mts';

// ── run state ──────────────────────────────────────────────────────────────────────

/** An in-progress level attempt: the pure engine state plus the bookkeeping goals need. */
interface Run {
  readonly spec: LevelSpec;
  readonly geom: BoardGeometry;
  state: BoardState;
  movesLeft: number;
  /** Parallel to `spec.goals`; index i is goal i's accumulated progress. */
  goalProgress: number[];
  score: number;
  /** Sticky for the whole attempt (unlike the per-response `ClientFrame.chaosSix`) — the input to `rateLevel`'s Ramsey bonus. */
  chaosSixEver: boolean;
}

interface AccountState {
  meta: PlayerMeta;
  run: Run | null;
}

/** A geometry with nothing on it — the board a client sees before `start` / after a level ends. */
const EMPTY_GEOMETRY: BoardGeometry = { tiling: 'square', cells: [], rails: [], railsAt: [], width: 0, height: 0, paletteSize: 0 };

/** No settle happened this response: empty steps, no chaos-six flourish, nothing finished. */
const NO_SETTLE: { finished: LevelResult | null; lastSteps: readonly CascadeStep[]; chaosSix: boolean } = {
  finished: null,
  lastSteps: [],
  chaosSix: false,
};

/** Scene's own balancing constant: how many extra moves the `extraMoves` booster grants. Engine/levels don't own this — the contract explicitly assigns extraMoves/prismStart's *effect* to scene, only their legality check to `engine.applyBooster`. */
const EXTRA_MOVES_GRANT = 5;

function emptyFrame(meta: PlayerMeta): ClientFrame {
  return {
    kind: 'state',
    levelId: 0,
    geometry: EMPTY_GEOMETRY,
    tiles: [],
    movesLeft: 0,
    goals: [],
    score: 0,
    lastSteps: [],
    chaosSix: false,
    finished: null,
    meta,
  };
}

function frameFromRun(
  run: Run,
  meta: PlayerMeta,
  extra: { finished: LevelResult | null; lastSteps: readonly CascadeStep[]; chaosSix: boolean },
): ClientFrame {
  return {
    kind: 'state',
    levelId: run.spec.id,
    geometry: run.geom,
    tiles: run.state.tiles,
    movesLeft: run.movesLeft,
    goals: run.spec.goals.map((g, i) => ({ ...g, progress: run.goalProgress[i] ?? 0 })),
    score: run.score,
    lastSteps: extra.lastSteps,
    chaosSix: extra.chaosSix,
    finished: extra.finished,
    meta,
  };
}

/** Slugify a login name into a stable account id — onestone's "token identity" doctrine: the token is a fresh opaque session key minted every `login()`, but the account it names is derived deterministically from the name so the same handle always reaches the same `PlayerMeta`. */
function slugAccount(name: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s === '' ? 'anon' : s).slice(0, 48);
}

// ── settle application (shared by swap and booster paths) ───────────────────────────

function applySettleToRun(run: Run, settle: { state: BoardState; score: number; chaosSix: boolean; steps: readonly CascadeStep[] }): void {
  const tilesBefore = run.state.tiles;
  run.state = settle.state;
  run.score += settle.score;
  if (settle.chaosSix) run.chaosSixEver = true;
  const deltas: GoalDeltas = goalProgressFrom(settle.steps, tilesBefore);
  run.goalProgress = run.spec.goals.map((g, i) => {
    const cur = run.goalProgress[i] ?? 0;
    switch (g.kind) {
      case 'score':
        return cur + deltas.score;
      case 'clearMoss':
        return cur + deltas.clearMoss;
      case 'breakGeodes':
        return cur + deltas.breakGeodes;
      case 'collectColor':
        return cur + (deltas.collectColor[g.color ?? -1] ?? 0);
    }
  });
}

/** After a settle, decide whether the level just ended (all goals met, or moves exhausted) and, if so, run the one trusted finalize path (`levels.rateLevel` → `progression.applyResult`) and clear the run. */
function finishOrContinue(
  acc: AccountState,
  run: Run,
  settle: { steps: readonly CascadeStep[]; chaosSix: boolean },
  now: number,
): ClientFrame {
  const display = { lastSteps: settle.steps, chaosSix: settle.chaosSix };
  const metGoals = run.spec.goals.every((g, i) => (run.goalProgress[i] ?? 0) >= g.target);
  if (metGoals || run.movesLeft <= 0) {
    const result = rateLevel(run.spec, run.score, run.movesLeft, metGoals, run.chaosSixEver);
    acc.meta = applyResult(acc.meta, result, now);
    const finalFrame = frameFromRun(run, acc.meta, { finished: result, ...display });
    acc.run = null;
    return finalFrame;
  }
  return frameFromRun(run, acc.meta, { finished: null, ...display });
}

// ── one input each ───────────────────────────────────────────────────────────────

function handleStart(acc: AccountState, levelId: number, now: number): ClientFrame {
  // A start while a run is already active is a no-op (abandon first) — never two boards at once.
  if (acc.run !== null) return frameFromRun(acc.run, acc.meta, NO_SETTLE);
  const spec = levelById(levelId);
  if (spec === undefined) return emptyFrame(acc.meta); // unknown level id: ignore rather than throw
  // The chapter-gated unlock ladder is enforced here, not just presented client-side: a
  // crafted `{kind:'start', levelId:N}` for a not-yet-unlocked level must be refused exactly
  // like an unknown level id, per progression.mts's isUnlocked being the one source of truth.
  if (!isUnlocked(acc.meta, levelId)) return emptyFrame(acc.meta);
  const ticked = tickLives(acc.meta, now);
  // The life gate: refuse (and persist the tick) rather than spend, exactly the check
  // `economy.spendLife`'s own doc comment calls out as the caller's job.
  if (ticked.lives <= 0) {
    acc.meta = ticked;
    return emptyFrame(acc.meta);
  }
  acc.meta = spendLife(ticked, now);
  const geom = buildGeometry(spec.tiling, spec.size, spec.paletteSize);
  const spawned = spawnBoard(geom, spec.seed);
  const state = spec.blockers.length === 0 ? spawned : applyBlockers(spawned, spec.blockers);
  const run: Run = {
    spec,
    geom,
    state,
    movesLeft: spec.moves,
    goalProgress: spec.goals.map(() => 0),
    score: 0,
    chaosSixEver: false,
  };
  acc.run = run;
  return frameFromRun(run, acc.meta, NO_SETTLE);
}

function handleSwap(acc: AccountState, input: { a: CellId; b: CellId }, now: number): ClientFrame {
  const run = acc.run;
  if (run === null) return emptyFrame(acc.meta);
  const settle = applyMove(run.geom, run.state, { a: input.a, b: input.b });
  if (!settle.legal) return frameFromRun(run, acc.meta, NO_SETTLE);
  applySettleToRun(run, settle);
  run.movesLeft = Math.max(0, run.movesLeft - 1);
  return finishOrContinue(acc, run, settle, now);
}

/** Mutate the swapped-with cell's tile into a prism in place, no settle — the "start with a prism" analog reinterpreted as a mid-run booster since `ClientInput` has no separate start-with-booster shape. Refuses silently on a cage/geode target (nothing to mint a special onto). */
function applyPrismStart(run: Run, cell: CellId): void {
  const tile = run.state.tiles[cell];
  if (tile === undefined || tile.cage || tile.geode > 0) return;
  const tiles = run.state.tiles.slice();
  tiles[cell] = { ...tile, special: 'prism' };
  run.state = { ...run.state, tiles };
}

function handleBooster(acc: AccountState, input: { booster: BoosterKind; cell?: CellId | undefined }, now: number): ClientFrame {
  const run = acc.run;
  if (run === null) return emptyFrame(acc.meta);
  const needsCell = input.booster === 'hammer' || input.booster === 'prismStart';
  if (needsCell && input.cell === undefined) return frameFromRun(run, acc.meta, NO_SETTLE);
  const owned = acc.meta.boosters[input.booster] ?? 0;
  if (owned <= 0) return frameFromRun(run, acc.meta, NO_SETTLE);
  // engine.applyBooster validates every booster kind (including extraMoves/prismStart, whose
  // actual effect it does NOT apply — that's scene's job per DESIGN.md's engine contract).
  const settle = applyBooster(run.geom, run.state, input.booster, input.cell);
  if (!settle.legal) return frameFromRun(run, acc.meta, NO_SETTLE);
  acc.meta = { ...acc.meta, boosters: { ...acc.meta.boosters, [input.booster]: owned - 1 } };
  applySettleToRun(run, settle);
  if (input.booster === 'extraMoves') run.movesLeft += EXTRA_MOVES_GRANT;
  else if (input.booster === 'prismStart' && input.cell !== undefined) applyPrismStart(run, input.cell);
  return finishOrContinue(acc, run, settle, now);
}

/** Spend shards or prisms on boosters — the economy's only spend path for either currency
 * (winReward/grantSku are the only earn paths; without this, `economy.buyBooster`/
 * `buyBoosterWithPrisms` were dead code end to end). A no-op frame, same style as
 * `spendLife`/`buyBooster` themselves, when the wallet can't cover the price; the client can
 * compare `meta.wallet` before/after to detect a refusal. */
function handleBuy(
  acc: AccountState,
  input: { booster: BoosterKind; count?: number | undefined; currency?: 'shards' | 'prisms' | undefined },
  now: number,
): ClientFrame {
  acc.meta = tickLives(acc.meta, now);
  acc.meta =
    input.currency === 'prisms'
      ? buyBoosterWithPrisms(acc.meta, input.booster, input.count ?? 1)
      : buyBooster(acc.meta, input.booster, input.count ?? 1);
  return acc.run === null ? emptyFrame(acc.meta) : frameFromRun(acc.run, acc.meta, NO_SETTLE);
}

function handleAbandon(acc: AccountState, now: number): ClientFrame {
  const run = acc.run;
  if (run === null) return emptyFrame(acc.meta);
  const result = rateLevel(run.spec, run.score, run.movesLeft, false, run.chaosSixEver);
  acc.meta = applyResult(acc.meta, result, now);
  const finalFrame = frameFromRun(run, acc.meta, { finished: result, lastSteps: [], chaosSix: false });
  acc.run = null;
  return finalFrame;
}

function dispatchInput(acc: AccountState, input: ClientInput, now: number): ClientFrame {
  switch (input.kind) {
    case 'start':
      return handleStart(acc, input.levelId, now);
    case 'swap':
      return handleSwap(acc, input, now);
    case 'booster':
      return handleBooster(acc, input, now);
    case 'buy':
      return handleBuy(acc, input, now);
    case 'abandon':
      return handleAbandon(acc, now);
  }
}

// ── persistence ───────────────────────────────────────────────────────────────────

const SNAPSHOT_KIND = 'onestone.scene.snapshot.v1';

/** Everything `persist()` writes / constructor-time restore reads. Plain JSON: every field of `AccountState` (`PlayerMeta`, `Run`'s `LevelSpec`/`BoardGeometry`/`BoardState`) is already serializable data, so no custom (de)serializer is needed. */
export interface SceneSnapshot {
  readonly kind: typeof SNAPSHOT_KIND;
  readonly accounts: Readonly<Record<string, AccountState>>;
}

export interface SceneOpts {
  /** Where `persist()` writes and the constructor restores from. Omit for an in-memory-only scene (tests). */
  readonly savePath?: string;
  /** Injected clock — every life-regen tick and level-finish timestamp goes through this, never `Date.now()` directly, so replays and tests are exact. */
  readonly now?: () => number;
}

/** The wire surface `server.mts` already depends on (its own `SceneLike`), plus `snapshot()`'s concrete return type. */
export interface Scene {
  login(name: string): { token: string; account: string };
  frame(account: string): ClientFrame;
  input(account: string, input: ClientInput): ClientFrame;
  subscribe(account: string, fn: (frame: ClientFrame) => void) : () => void;
  /** Applies a payments-verified SKU grant to `account`'s wallet/boosters/lives/pass. `payments.mts` is the idempotency boundary — this is called at most once per cleared order. */
  grantSku(account: string, sku: Sku): void;
  snapshot(): SceneSnapshot;
  persist(): Promise<void>;
}

class SceneImpl implements Scene {
  private readonly accounts = new Map<string, AccountState>();
  private readonly listeners = new Map<string, Set<(frame: ClientFrame) => void>>();
  private readonly now: () => number;
  private readonly savePath: string | undefined;

  constructor(opts: SceneOpts) {
    this.now = opts.now ?? Date.now;
    this.savePath = opts.savePath;
    if (this.savePath !== undefined) this.restoreSync(this.savePath);
  }

  private restoreSync(path: string): void {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      return; // no save yet (fresh deploy, or first run) — start empty rather than fail boot.
    }
    try {
      const parsed = JSON.parse(raw) as SceneSnapshot;
      if (parsed.kind !== SNAPSHOT_KIND) return;
      for (const [account, state] of Object.entries(parsed.accounts)) this.accounts.set(account, state);
    } catch {
      // Corrupt/foreign snapshot file: boot fresh rather than crash the process on startup.
    }
  }

  private ensureAccount(account: string): AccountState {
    let acc = this.accounts.get(account);
    if (acc === undefined) {
      acc = { meta: freshMeta(), run: null };
      this.accounts.set(account, acc);
    }
    return acc;
  }

  private emit(account: string, frame: ClientFrame): void {
    const set = this.listeners.get(account);
    if (set === undefined) return;
    for (const fn of set) fn(frame);
  }

  login(name: string): { token: string; account: string } {
    const account = slugAccount(name);
    this.ensureAccount(account);
    return { token: randomUUID(), account };
  }

  frame(account: string): ClientFrame {
    const acc = this.ensureAccount(account);
    acc.meta = tickLives(acc.meta, this.now());
    return acc.run === null ? emptyFrame(acc.meta) : frameFromRun(acc.run, acc.meta, NO_SETTLE);
  }

  input(account: string, input: ClientInput): ClientFrame {
    const acc = this.ensureAccount(account);
    const now = this.now();
    acc.meta = tickLives(acc.meta, now);
    const out = dispatchInput(acc, input, now);
    this.emit(account, out);
    return out;
  }

  grantSku(account: string, sku: Sku): void {
    const acc = this.ensureAccount(account);
    acc.meta = applySkuGrant(acc.meta, sku, this.now());
    this.emit(account, this.frame(account));
  }

  subscribe(account: string, fn: (frame: ClientFrame) => void): () => void {
    const set = this.listeners.get(account) ?? new Set<(frame: ClientFrame) => void>();
    set.add(fn);
    this.listeners.set(account, set);
    return () => {
      set.delete(fn);
      if (set.size === 0) this.listeners.delete(account);
    };
  }

  snapshot(): SceneSnapshot {
    const accounts: Record<string, AccountState> = {};
    for (const [k, v] of this.accounts) accounts[k] = v;
    return { kind: SNAPSHOT_KIND, accounts };
  }

  /** Atomic write: a uniquely-named tmp file in the same directory, then `rename` (POSIX-atomic on the same filesystem) — a crash mid-write never leaves a torn/partial save on `savePath`. */
  async persist(): Promise<void> {
    if (this.savePath === undefined) return;
    const dir = dirname(this.savePath);
    if (dir !== '' && dir !== '.') await mkdir(dir, { recursive: true });
    const tmp = `${this.savePath}.tmp-${randomUUID()}`;
    await writeFile(tmp, JSON.stringify(this.snapshot()), 'utf8');
    await rename(tmp, this.savePath);
  }
}

export function createScene(opts: SceneOpts = {}): Scene {
  return new SceneImpl(opts);
}
