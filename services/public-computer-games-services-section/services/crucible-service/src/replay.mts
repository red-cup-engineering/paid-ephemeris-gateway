/**
 * `replay` — THE trust anchor (ANATOMY digest, solitaire-service's `replay`/`replayTo` shape).
 *
 * `replay(seed, moveLog)` is built by folding `engine.mts#applyMove` over a fresh
 * `spawnCertifiedTangle(seed)`. That is the entire mechanism behind "same seed + move log =>
 * identical final state and identical total cost, always": nothing in the fold reads a clock or
 * `Math.random()`, so the same two inputs always produce the same `RunState`, in this process or
 * any other.
 *
 * This is also the shape a future server-side leaderboard verifier calls once at submission time
 * (README.md): given a claimed `{ seed, moveLog, totalCost }`, the verifier recomputes
 * `replay(seed, moveLog).totalCost` and compares — replay IS the anti-cheat mechanism, not a
 * separate one. `replayTo` (a prefix of the log) is what `undo`/`redo` reduce to: different
 * cursors into the same fold, never separate code paths.
 */
import { spawnCertifiedTangle } from './validate.mts';
import { applyMove, isSettled } from './engine.mts';
import type { RunState, MoveLogEntry } from './types.mts';

/**
 * Replay the first `cursor` entries of `log` from a fresh `spawnCertifiedTangle(seed)`. Throws
 * if any logged move was illegal at the point it was applied — a corrupted or tampered log
 * fails loudly here rather than silently producing a wrong state.
 */
export function replayTo(seed: string, log: readonly MoveLogEntry[], cursor: number): RunState {
  if (cursor < 0 || cursor > log.length) throw new RangeError(`replayTo: cursor ${cursor} out of range [0, ${log.length}]`);
  let tangle = spawnCertifiedTangle(seed);
  let totalCost = 0;
  const applied: MoveLogEntry[] = [];
  for (let i = 0; i < cursor; i++) {
    const entry = log[i] as MoveLogEntry;
    const { tangle: next, moveCost } = applyMove(tangle, entry.move);
    tangle = next;
    totalCost += moveCost.cost;
    applied.push(entry);
  }
  return { seed, log: applied, tangle, totalCost, settled: isSettled(tangle) };
}

/** Replay the full move log — the common case, and what a future leaderboard verifier calls. */
export function replay(seed: string, log: readonly MoveLogEntry[]): RunState {
  return replayTo(seed, log, log.length);
}

/** `undo`: one entry earlier — literally `replayTo` at `cursor - 1`, never a separate mechanism. */
export function undo(seed: string, log: readonly MoveLogEntry[], cursor: number): RunState {
  return replayTo(seed, log, Math.max(0, cursor - 1));
}

/** `redo`: one entry later (bounded by the log's own length) — again just `replayTo`. */
export function redo(seed: string, log: readonly MoveLogEntry[], cursor: number): RunState {
  return replayTo(seed, log, Math.min(log.length, cursor + 1));
}
