/**
 * Plays — positions with history.
 *
 * A play is a sequence of moves (event ids) every prefix of which is a
 * configuration of the arena: a secured linearization of the causal order.
 * The underlying set of a play is the position reached; the order records how
 * the running game got there.  `extend` is the one legal-move transition —
 * adding an event is legal exactly when the extended prefix stays down-closed
 * and conflict-free, i.e. remains a configuration.
 */
import { type Arena } from "../arena.mjs";
import {
  type ConfigurationJudgment,
  configurationJudgment,
  isConfiguration,
} from "../../../event/structure.mjs";

export interface Play {
  readonly kind: "game.play";
  readonly moves: readonly string[];
}

export function play(moves: readonly string[] = []): Play {
  return Object.freeze({ kind: "game.play" as const, moves: Object.freeze([...moves]) });
}

export const emptyPlay = (): Play => play([]);

/** The position (underlying set) reached by the play. */
export const positionOf = (p: Play): readonly string[] => Object.freeze([...new Set(p.moves)]);

export const playLength = (p: Play): number => p.moves.length;

/**
 * Whether a play is valid in an arena: every prefix is a configuration and no
 * move repeats.  Validity at every prefix is the secured-linearization
 * condition — each move's causes already appear, and no two moves conflict.
 */
export function isValidPlay(a: Arena, p: Play): boolean {
  const seen = new Set<string>();
  for (let i = 0; i < p.moves.length; i++) {
    const move = p.moves[i];
    if (move === undefined || seen.has(move)) return false;
    seen.add(move);
    if (!isConfiguration(a.structure, p.moves.slice(0, i + 1))) return false;
  }
  return true;
}

export interface ExtendWitness {
  readonly kind: "game.play.extend:witness";
  readonly play: Play;
  readonly move: string;
}

export interface ExtendObstruction {
  readonly kind: "game.play.extend-obstruction";
  readonly play: Play;
  readonly move: string;
  readonly judgment: ConfigurationJudgment;
}

export type ExtendJudgment = ExtendWitness | ExtendObstruction;

/** Judge whether `move` legally extends the play in the arena. */
export function extendJudgment(a: Arena, p: Play, move: string): ExtendJudgment {
  const judgment = configurationJudgment(a.structure, [...p.moves, move]);
  return judgment.kind === "game.configuration:witness"
    ? Object.freeze({ kind: "game.play.extend:witness" as const, play: p, move })
    : Object.freeze({ kind: "game.play.extend-obstruction" as const, play: p, move, judgment });
}

/** Extend the play by a move, or return null if the move is not legal here. */
export function extend(a: Arena, p: Play, move: string): Play | null {
  if (extendJudgment(a, p, move).kind !== "game.play.extend:witness") return null;
  return play([...p.moves, move]);
}

export function isPlay(value: unknown): value is Play {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Play>;
  return candidate.kind === "game.play" && Array.isArray(candidate.moves) && candidate.moves.every((m) => typeof m === "string");
}
