/**
 * Trajectories — plays read as sequences of positions.
 *
 * The corpus reads a play as a *secured linearization* of the causal order:
 * "the underlying set of a play is the position reached; the order records how
 * the running game got there" (game-algebra `play`).  A *trajectory* makes the
 * intermediate positions explicit — the trajectory of a play is the chain of
 * configurations its prefixes reach, so the play is recovered as a path through
 * the configuration lattice of the arena.  This is the dynamical reading of a
 * play that the cultural-ludic embedding needs: a play is a *motion* through
 * positions, not just an endpoint.
 *
 * We reuse `positionOf` (the underlying set of a prefix) and `extend` (the one
 * legal-move transition) from `@emsenn/game-algebra` verbatim — a play is
 * maximal exactly when no legal `extend` remains, the standard "stuck position"
 * of game semantics.
 */

import {
  type Arena,
  type Play,
  arenaEvents,
  extend,
  isValidPlay,
  play as makePlay,
  playLength,
  positionOf,
} from "../index.mjs";

/** One position along a trajectory: a prefix's move count and reached set. */
export interface TrajectoryStep {
  readonly kind: "game-analysis.trajectory.step";
  /** Number of moves played to reach this position (0 at the empty prefix). */
  readonly depth: number;
  /** The underlying set (position) reached by this prefix. */
  readonly position: readonly string[];
}

export interface Trajectory {
  readonly kind: "game-analysis.trajectory";
  readonly arena: Arena;
  readonly play: Play;
  /** Whether every prefix is a configuration (the play is valid in the arena). */
  readonly valid: boolean;
  /** Positions reached, from the empty prefix through the full play. */
  readonly steps: readonly TrajectoryStep[];
}

/**
 * Read a play as a trajectory: the chain of positions its prefixes reach,
 * starting from the empty position.  A trajectory over an invalid play is still
 * returned (with `valid: false`) — the positions are the underlying sets of the
 * prefixes regardless, but the dynamical reading is only secured when valid.
 */
export function trajectory(arena: Arena, p: Play): Trajectory {
  const steps: TrajectoryStep[] = [];
  for (let depth = 0; depth <= p.moves.length; depth += 1) {
    const prefix = makePlay(p.moves.slice(0, depth));
    steps.push(
      Object.freeze({
        kind: "game-analysis.trajectory.step" as const,
        depth,
        position: positionOf(prefix),
      }),
    );
  }
  return Object.freeze({
    kind: "game-analysis.trajectory" as const,
    arena,
    play: p,
    valid: isValidPlay(arena, p),
    steps: Object.freeze(steps),
  });
}

/** The number of positions a trajectory passes through (move count + 1). */
export const trajectoryLength = (t: Trajectory): number => t.steps.length;

export interface MaximalPlayWitness {
  readonly kind: "game-analysis.maximalPlay:witness";
  readonly play: Play;
  /** The final position — no legal move extends it. */
  readonly position: readonly string[];
}

export interface MaximalPlayObstruction {
  readonly kind: "game-analysis.maximalPlay-obstruction";
  readonly play: Play;
  readonly reason: "invalid-play" | "extendable";
  /** A move that legally extends the play, when `reason` is `extendable`. */
  readonly extension: string | null;
}

export type MaximalPlayJudgment = MaximalPlayWitness | MaximalPlayObstruction;

/**
 * Judge whether a play is maximal: valid, and no event of the arena legally
 * extends it.  Maximality is the "stuck position" of game semantics — Player
 * and Opponent have run out of moves, which (in ludics) is where settling
 * either reaches the Daimon or diverges.
 */
export function maximalPlayJudgment(arena: Arena, p: Play): MaximalPlayJudgment {
  if (!isValidPlay(arena, p)) {
    return Object.freeze({
      kind: "game-analysis.maximalPlay-obstruction" as const,
      play: p,
      reason: "invalid-play" as const,
      extension: null,
    });
  }
  for (const e of arenaEvents(arena)) {
    if (extend(arena, p, e.id) !== null) {
      return Object.freeze({
        kind: "game-analysis.maximalPlay-obstruction" as const,
        play: p,
        reason: "extendable" as const,
        extension: e.id,
      });
    }
  }
  return Object.freeze({
    kind: "game-analysis.maximalPlay:witness" as const,
    play: p,
    position: positionOf(p),
  });
}

/** Whether a play is maximal (valid and inextensible) in the arena. */
export const isMaximalPlay = (arena: Arena, p: Play): boolean =>
  maximalPlayJudgment(arena, p).kind === "game-analysis.maximalPlay:witness";

/** The move count of a play — re-exported convenience over `playLength`. */
export const trajectoryMoves = (p: Play): number => playLength(p);
