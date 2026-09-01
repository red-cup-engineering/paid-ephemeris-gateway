/**
 * `cartridge` — onestone's `@red-cup-engineering/cartridge` adoption: a pure, replayable engine over a
 * plain JSON `OnestoneRunState`, wrapping (never rewriting) `engine.mts`, `levels.mts`, and
 * `tiling.mts`.
 *
 * `cartridge-and-energy-bank-spec.md` §1.2/§4 already named this the *easy* case: onestone's
 * `applyMove`/`applyBooster` were already pure functions of `(geometry, state, move)`, and no
 * standalone `replay()` existed only because nobody had yet written the thin wrapper —
 * `defaultReplay` was "exactly the missing piece, buildable purely from the already-pure
 * functions." This module is that wrapper, and it changes not one line of `engine.mts`,
 * `tiling*.mts`, or `validate.mts`.
 *
 * **Scope, stated plainly.** This cartridge covers one playable *run* of one level — board
 * state, moves remaining, goal progress, and the finished `LevelResult` once the run ends. It
 * does not cover `PlayerMeta` (wallet, lives, unlock frontier, streak): those are account-level
 * bookkeeping `scene.mts` and `economy.mts`/`progression.mts` own, orthogonal to "is this one
 * seeded board, replayed from this one intent log, the board this log claims it is" — exactly
 * the question a replay verifier exists to answer. `configId` selects which of the 60 shipped
 * `LevelSpec`s this run plays, per the cartridge spec's own words for this exact case:
 * "onestone's `LEVELS`... show a single service can expose multiple playable configurations."
 */
import type { Cartridge, ApplyResult, ReplayResult } from "@red-cup-engineering/cartridge/replay";
import { defaultReplay } from "@red-cup-engineering/cartridge/replay";
import type { GameEvent, Intent } from "@red-cup-engineering/cartridge/intent-log";
import type { BoardState, BoosterKind, CellId, LevelResult, LevelSpec, SettleResult } from "./types.mts";
import { buildGeometry } from "./tiling.mts";
import { applyBlockers, applyBooster, applyMove, spawnBoard } from "./engine.mts";
import { goalProgressFrom, levelById, rateLevel } from "./levels.mts";

/** Scene's own balancing constant, ported unchanged (`scene.mts::EXTRA_MOVES_GRANT`) — engine
 * and levels deliberately don't own extraMoves' effect, only its legality (see engine.mts's own
 * header comment on `applyBooster`'s `extraMoves`/`prismStart` cases). */
const EXTRA_MOVES_GRANT = 5;

const BOOSTER_KINDS: ReadonlySet<string> = new Set(["hammer", "shuffle", "extraMoves", "prismStart"]);

/** Plain, JSON-safe state — one level attempt, everything `scene.mts`'s private `Run` interface
 * carries, minus nothing (this IS that shape, made replayable). */
export interface OnestoneRunState {
  readonly levelId: number;
  readonly board: BoardState;
  readonly movesLeft: number;
  readonly goalProgress: readonly number[];
  readonly score: number;
  readonly chaosSixEver: boolean;
  readonly finished: LevelResult | null;
}

export type OnestoneIntent =
  | { readonly kind: "swap"; readonly a: CellId; readonly b: CellId }
  | { readonly kind: "booster"; readonly booster: BoosterKind; readonly cell?: CellId }
  | { readonly kind: "abandon" };

function specFor(state: OnestoneRunState): LevelSpec {
  const spec = levelById(state.levelId);
  if (spec === undefined) throw new RangeError(`unknown level id ${state.levelId}`);
  return spec;
}

function geomFor(spec: LevelSpec) {
  return buildGeometry(spec.tiling, spec.size, spec.paletteSize);
}

function refused(state: OnestoneRunState, action: string, reason: string): { state: OnestoneRunState; events: GameEvent[] } {
  return { state, events: [{ kind: "action-refused", action, reason }] };
}

/** Fold one settle's `CascadeStep[]` into score/goal-progress/chaosSixEver — the pure half of
 * `scene.mts::applySettleToRun`, unchanged in logic (same `levels.mts::goalProgressFrom` call,
 * same per-goal-kind switch), just returning a new state instead of mutating a `Run` in place. */
function mergeSettle(state: OnestoneRunState, settle: SettleResult, spec: LevelSpec): OnestoneRunState {
  const deltas = goalProgressFrom(settle.steps, state.board.tiles);
  const goalProgress = spec.goals.map((g, i) => {
    const cur = state.goalProgress[i] ?? 0;
    switch (g.kind) {
      case "score":
        return cur + deltas.score;
      case "clearMoss":
        return cur + deltas.clearMoss;
      case "breakGeodes":
        return cur + deltas.breakGeodes;
      case "collectColor":
        return cur + (deltas.collectColor[g.color ?? -1] ?? 0);
    }
  });
  return {
    ...state,
    board: settle.state,
    score: state.score + settle.score,
    chaosSixEver: state.chaosSixEver || settle.chaosSix,
    goalProgress,
  };
}

/** The pure half of `scene.mts::finishOrContinue`: decide whether the run just ended (every
 * goal met, or moves exhausted) and, if so, run the one trusted finalize path (`rateLevel`). */
function checkFinish(state: OnestoneRunState, spec: LevelSpec): { state: OnestoneRunState; events: GameEvent[] } {
  if (state.finished !== null) return { state, events: [] };
  const metGoals = spec.goals.every((g, i) => (state.goalProgress[i] ?? 0) >= g.target);
  if (!metGoals && state.movesLeft > 0) return { state, events: [] };
  const result = rateLevel(spec, state.score, state.movesLeft, metGoals, state.chaosSixEver);
  return {
    state: { ...state, finished: result },
    events: [{ kind: "level-finished", won: result.won, stars: result.stars, score: result.score }],
  };
}

/** Mutate the swapped-with cell's tile into a prism, no settle — same reinterpretation
 * `scene.mts::applyPrismStart` documents (`ClientInput` has no separate start-with-booster
 * shape); refuses silently (a no-op, not an error) on a cage/geode target. */
function applyPrismStart(state: OnestoneRunState, cell: CellId): OnestoneRunState {
  const tile = state.board.tiles[cell];
  if (tile === undefined || tile.cage || tile.geode > 0) return state;
  const tiles = state.board.tiles.slice();
  tiles[cell] = { ...tile, special: "prism" };
  return { ...state, board: { ...state.board, tiles } };
}

function parseLevelId(configId: string | undefined): number {
  if (configId === undefined) return 1;
  const n = Number.parseInt(configId, 10);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`createEngine: invalid configId "${configId}"`);
  return n;
}

// ── the Cartridge contract ──────────────────────────────────────────────────────────────────

/** Pure. `configId` selects the `LevelSpec` (defaults to level 1); `seed` is passed straight
 * into `spawnBoard`, exactly as `scene.mts::handleStart` does today — the level's own `spec.seed`
 * is deliberately NOT consulted here, so a cartridge-level replay can exercise arbitrary seeds
 * against a level's fixed geometry/blockers/goals, the same "seed in the URL" posture
 * `solitaire-service` already uses for its `client-supplied` seed policy. */
export function createEngine(seed: string, configId?: string): OnestoneRunState {
  const levelId = parseLevelId(configId);
  const spec = levelById(levelId);
  if (spec === undefined) throw new RangeError(`createEngine: unknown level id ${levelId}`);
  const geom = geomFor(spec);
  const spawned = spawnBoard(geom, seed);
  const board = spec.blockers.length === 0 ? spawned : applyBlockers(spawned, spec.blockers);
  return {
    levelId, board, movesLeft: spec.moves,
    goalProgress: spec.goals.map(() => 0), score: 0, chaosSixEver: false, finished: null,
  };
}

export function applyIntent(state: OnestoneRunState, intent: OnestoneIntent): ApplyResult<OnestoneRunState> {
  switch (intent.kind) {
    case "swap": {
      if (state.finished !== null) throw new RangeError("swap: level already finished — no moves may follow a terminal state");
      if (typeof intent.a !== "number" || typeof intent.b !== "number") throw new TypeError("swap: a/b must be cell ids");
      const spec = specFor(state);
      const geom = geomFor(spec);
      const settle = applyMove(geom, state.board, { a: intent.a, b: intent.b });
      if (!settle.legal) return refused(state, "swap", "illegal-swap"); // an impossible move, per house doctrine: a no-op, not an error
      const merged = mergeSettle({ ...state, movesLeft: Math.max(0, state.movesLeft - 1) }, settle, spec);
      const finish = checkFinish(merged, spec);
      return {
        state: finish.state,
        events: [{ kind: "settled", steps: settle.steps.length, score: settle.score }, ...finish.events],
      };
    }
    case "booster": {
      if (state.finished !== null) throw new RangeError("booster: level already finished — no moves may follow a terminal state");
      const booster = intent.booster;
      if (typeof booster !== "string" || !BOOSTER_KINDS.has(booster)) {
        throw new TypeError(`booster: unknown booster kind "${String(booster)}"`);
      }
      const spec = specFor(state);
      const geom = geomFor(spec);
      const settle = applyBooster(geom, state.board, booster as BoosterKind, intent.cell);
      if (!settle.legal) return refused(state, "booster", "illegal-booster-use");
      let merged = mergeSettle(state, settle, spec);
      if (booster === "extraMoves") merged = { ...merged, movesLeft: merged.movesLeft + EXTRA_MOVES_GRANT };
      else if (booster === "prismStart" && intent.cell !== undefined) merged = applyPrismStart(merged, intent.cell);
      const finish = checkFinish(merged, spec);
      return {
        state: finish.state,
        events: [{ kind: "booster-used", booster, steps: settle.steps.length }, ...finish.events],
      };
    }
    case "abandon": {
      if (state.finished !== null) return { state, events: [] };
      const spec = specFor(state);
      const result = rateLevel(spec, state.score, state.movesLeft, false, state.chaosSixEver);
      return {
        state: { ...state, finished: result },
        events: [{ kind: "level-finished", won: false, stars: 0, score: result.score }],
      };
    }
    default: {
      const never: { kind: string } = intent;
      throw new TypeError(`applyIntent: unknown intent kind "${never.kind}"`);
    }
  }
}

/** Delegates to the package's own reference implementation — no hand-rolled replay loop lives
 * in this codebase, per the same discipline `flickering-delve-service/src/cartridge.mts` uses. */
export function replay(
  seed: string,
  intents: readonly OnestoneIntent[],
  configId?: string,
): ReplayResult<OnestoneRunState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

/** `OnestoneRunState` is already plain JSON data (`BoardState.tiles` is an array of plain `Tile`
 * objects). serialize/deserialize round-trip it structurally with a cheap shape check. */
export function serialize(state: OnestoneRunState): unknown {
  return { ...state, board: { ...state.board, tiles: state.board.tiles.map((t) => ({ ...t })) }, goalProgress: [...state.goalProgress] };
}

export function deserialize(data: unknown): OnestoneRunState {
  if (typeof data !== "object" || data === null) throw new TypeError("deserialize: malformed OnestoneRunState");
  const d = data as Record<string, unknown>;
  if (typeof d["levelId"] !== "number" || typeof d["board"] !== "object" || d["board"] === null) {
    throw new TypeError("deserialize: malformed OnestoneRunState");
  }
  return d as unknown as OnestoneRunState;
}

export const onestoneCartridge: Cartridge<OnestoneRunState, OnestoneIntent & Intent> = {
  createEngine,
  applyIntent: applyIntent as (state: OnestoneRunState, intent: OnestoneIntent & Intent) => ApplyResult<OnestoneRunState>,
  replay: replay as (seed: string, intents: readonly (OnestoneIntent & Intent)[], configId?: string) => ReplayResult<OnestoneRunState>,
  serialize,
  deserialize,
};
