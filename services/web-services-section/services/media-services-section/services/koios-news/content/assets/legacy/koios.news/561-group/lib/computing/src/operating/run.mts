/**
 * The strategy leg — `CGS arena → strategy → player move`, the final step of the
 * SPOTCOMP pipeline (`cgs/specification.md` §1, §4).
 *
 * A modeled player IS a CGS morphism: a strategy on $A^\perp \| B$ (Phase 2's
 * `Morphism`, e.g. a character's `morphismOf`). `run` executes one interaction
 * step: given the player, the history of moves so far, and an *admitted* Opponent
 * move (spec §4 receptivity — "receptivity to admitted Opponent extensions"), it
 * returns the Player moves the strategy enables in response. Because the category
 * is *concurrent*, that response is a SET of moves (a partial order), not a single
 * next move — sequential/innocent play is the restriction, not the surface
 * (spec §4, "Player moves may be partial-order concurrent").
 *
 * Moves are read against the strategy's own (compound) arena polarity: Opponent
 * moves are negative, Player moves positive. A move that is not Opponent, or not
 * admitted at the given history, yields an obstruction — the receptivity /
 * legality boundary made executable.
 */
import {
  type Play,
  play,
} from "@emsenn/gaming";
import {
  strategyContainsPlay,
  strategyExtensionsAfter,
  strategyMovePolarity,
} from "@emsenn/gaming/structuring";
import { type Morphism } from "../categorifying/morphism.mjs";

export interface RunWitness {
  readonly kind: "computing.computer.run:witness";
  /** The admitted Opponent move that was played. */
  readonly opponentMove: string;
  /** The history after the Opponent move. */
  readonly history: readonly string[];
  /** The Player moves the strategy enables in response (possibly concurrent, possibly empty). */
  readonly playerMoves: readonly string[];
}

export interface RunObstruction {
  readonly kind: "computing.computer.run-obstruction";
  readonly opponentMove: string;
  readonly history: readonly string[];
  readonly reason: string;
}

export type RunJudgment = RunWitness | RunObstruction;

/**
 * Run one interaction step of a modeled player. `history` is the move sequence
 * already played (a play of the strategy); `opponentMove` is the admitted
 * Opponent extension. Returns the enabled Player responses, or an obstruction if
 * the move is not an Opponent move or not admitted at this history.
 */
export function run(player: Morphism, history: readonly string[], opponentMove: string): RunJudgment {
  const s = player.strategy;
  const pol = strategyMovePolarity(s, opponentMove)?.name ?? null;
  if (pol !== "negative") {
    return Object.freeze({
      kind: "computing.computer.run-obstruction" as const,
      opponentMove,
      history,
      reason: pol === null
        ? `move "${opponentMove}" is not an event of the strategy arena`
        : `move "${opponentMove}" is a Player (positive) move, not an admitted Opponent move`,
    });
  }
  const historyPlay = play(history);
  if (!strategyContainsPlay(s, historyPlay)) {
    return Object.freeze({
      kind: "computing.computer.run-obstruction" as const,
      opponentMove,
      history,
      reason: "history is not a play of the strategy",
    });
  }
  const extended = play([...history, opponentMove]);
  if (!strategyContainsPlay(s, extended)) {
    return Object.freeze({
      kind: "computing.computer.run-obstruction" as const,
      opponentMove,
      history,
      reason: `Opponent move "${opponentMove}" is not admitted after this history (receptivity boundary)`,
    });
  }
  const playerMoves = strategyExtensionsAfter(s, extended)
    .filter((move) => strategyMovePolarity(s, move)?.name === "positive");
  return Object.freeze({
    kind: "computing.computer.run:witness" as const,
    opponentMove,
    history: extended.moves,
    playerMoves: Object.freeze(playerMoves),
  });
}

/** Whether a run step admitted the Opponent move and produced a (possibly empty) Player response. */
export const isAdmittedRun = (judgment: RunJudgment): judgment is RunWitness =>
  judgment.kind === "computing.computer.run:witness";

/** The empty history play — a convenience for starting an interaction. */
export const initialHistory = (): Play => play([]);
