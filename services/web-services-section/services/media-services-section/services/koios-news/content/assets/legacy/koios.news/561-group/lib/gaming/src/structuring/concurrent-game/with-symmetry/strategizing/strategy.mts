/**
 * Concurrent strategies — the morphisms of $\mathbf{CGS}$.
 *
 * A morphism $A \to B$ is an equivalence class of concurrent strategies
 * $\sigma : S \to A^\perp \| B$ satisfying, per Castellan-Clairambault-Winskel,
 * three conditions: *receptivity*, *innocence*, and *symmetry-invariance*.  We
 * present a strategy on a single arena as a non-empty, prefix-closed set of
 * valid plays and supply a witness/obstruction judge for each condition:
 *
 *   - **receptivity** — Player may not refuse Opponent: any negative move the
 *     arena legally enables after an admitted play is itself admitted.
 *   - **innocence** — the deterministic (Hyland-Ong) reading the corpus gives:
 *     "sequential innocent strategies are the deterministic concurrent
 *     strategies — at most one P-move enabled after any history."
 *   - **symmetry-invariance** — the admitted set is closed under relabeling
 *     each play by a symmetry of the arena.
 */
import { type Arena } from "../arena.mjs";
import { type Event, eventById } from "../../../event/structure.mjs";
import { type Play, isValidPlay, play } from "./play.mjs";
import { type Bijection } from "../arena.mjs";

export interface Strategy {
  readonly kind: "game.strategy";
  readonly arena: Arena;
  readonly plays: readonly Play[];
}

export function strategy(a: Arena, plays: readonly Play[]): Strategy {
  return Object.freeze({
    kind: "game.strategy" as const,
    arena: a,
    plays: Object.freeze(plays.map((p) => play(p.moves))),
  });
}

const movePolarity = (a: Arena, id: string): Event["polarity"] | null => eventById(a.structure, id)?.polarity ?? null;

const isNegativeMove = (a: Arena, id: string): boolean => movePolarity(a, id)?.name === "negative";
const isPositiveMove = (a: Arena, id: string): boolean => movePolarity(a, id)?.name === "positive";

const playKey = (p: Play): string => p.moves.join("\u0000");
const hasPlay = (plays: readonly Play[], p: Play): boolean => {
  const key = playKey(p);
  return plays.some((other) => playKey(other) === key);
};

/** Whether a strategy admits a play. */
export const strategyContainsPlay = (s: Strategy, p: Play): boolean =>
  hasPlay(s.plays, p);

/** Read the polarity of a move in the strategy arena. */
export const strategyMovePolarity = (s: Strategy, id: string): Event["polarity"] | null =>
  movePolarity(s.arena, id);

/** The arena events legally enabled after a play (configuration-extending, unused). */
function enabledAfter(a: Arena, p: Play): readonly string[] {
  const used = new Set(p.moves);
  const out: string[] = [];
  for (const e of a.structure.events) {
    if (used.has(e.id)) continue;
    if (isValidPlay(a, play([...p.moves, e.id]))) out.push(e.id);
  }
  return Object.freeze(out);
}

/** Arena-legal moves after a play, before restricting to the strategy's admitted plays. */
export const arenaEnabledMovesAfter = (s: Strategy, p: Play): readonly string[] =>
  enabledAfter(s.arena, p);

/** Strategy-admitted one-move extensions after a play. */
export function strategyExtensionsAfter(s: Strategy, p: Play): readonly string[] {
  return Object.freeze(enabledAfter(s.arena, p).filter((move) => hasPlay(s.plays, play([...p.moves, move]))));
}

export interface PrefixClosedWitness { readonly kind: "game.strategy.prefixClosed:witness"; }
export interface PrefixClosedObstruction { readonly kind: "game.strategy.prefixClosed-obstruction"; readonly play: Play; readonly missingPrefix: Play; }
export type PrefixClosedJudgment = PrefixClosedWitness | PrefixClosedObstruction;

export function prefixClosedJudgment(s: Strategy): PrefixClosedJudgment {
  for (const p of s.plays) {
    for (let i = 0; i < p.moves.length; i++) {
      const prefix = play(p.moves.slice(0, i));
      if (!hasPlay(s.plays, prefix)) {
        return Object.freeze({ kind: "game.strategy.prefixClosed-obstruction" as const, play: p, missingPrefix: prefix });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.prefixClosed:witness" as const });
}

export interface ReceptivityWitness { readonly kind: "game.strategy.receptivity:witness"; }
export interface ReceptivityObstruction { readonly kind: "game.strategy.receptivity-obstruction"; readonly play: Play; readonly refusedOpponentMove: string; }
export type ReceptivityJudgment = ReceptivityWitness | ReceptivityObstruction;

export function receptivityJudgment(s: Strategy): ReceptivityJudgment {
  for (const p of s.plays) {
    for (const move of enabledAfter(s.arena, p)) {
      if (isNegativeMove(s.arena, move) && !hasPlay(s.plays, play([...p.moves, move]))) {
        return Object.freeze({ kind: "game.strategy.receptivity-obstruction" as const, play: p, refusedOpponentMove: move });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.receptivity:witness" as const });
}

export interface InnocenceWitness { readonly kind: "game.strategy.innocence:witness"; }
export interface InnocenceObstruction { readonly kind: "game.strategy.innocence-obstruction"; readonly play: Play; readonly competingPlayerMoves: readonly string[]; }
export type InnocenceJudgment = InnocenceWitness | InnocenceObstruction;

/** Innocence in the deterministic (sequential, Hyland-Ong) reading: at most one P-move admitted after any play. */
export function innocenceJudgment(s: Strategy): InnocenceJudgment {
  for (const p of s.plays) {
    const positiveContinuations = enabledAfter(s.arena, p)
      .filter((move) => isPositiveMove(s.arena, move) && hasPlay(s.plays, play([...p.moves, move])));
    if (positiveContinuations.length > 1) {
      return Object.freeze({ kind: "game.strategy.innocence-obstruction" as const, play: p, competingPlayerMoves: Object.freeze(positiveContinuations) });
    }
  }
  return Object.freeze({ kind: "game.strategy.innocence:witness" as const });
}

const relabelPlay = (bij: Bijection, p: Play): Play =>
  play(p.moves.map((id) => bij.find((pair) => pair[0] === id)?.[1] ?? id));

export interface SymmetryInvarianceWitness { readonly kind: "game.strategy.symmetryInvariance:witness"; }
export interface SymmetryInvarianceObstruction { readonly kind: "game.strategy.symmetryInvariance-obstruction"; readonly play: Play; readonly bijection: Bijection; readonly missingImage: Play; }
export type SymmetryInvarianceJudgment = SymmetryInvarianceWitness | SymmetryInvarianceObstruction;

/** Symmetry-invariance: the admitted set is closed under relabeling by each arena symmetry. */
export function symmetryInvarianceJudgment(s: Strategy): SymmetryInvarianceJudgment {
  for (const p of s.plays) {
    for (const bij of s.arena.symmetry) {
      const image = relabelPlay(bij, p);
      if (!hasPlay(s.plays, image)) {
        return Object.freeze({ kind: "game.strategy.symmetryInvariance-obstruction" as const, play: p, bijection: bij, missingImage: image });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.symmetryInvariance:witness" as const });
}

export interface StrategyWellFormednessReport {
  readonly kind: "game.strategy.report";
  readonly validPlays: boolean;
  readonly prefixClosed: PrefixClosedJudgment;
  readonly receptivity: ReceptivityJudgment;
  readonly innocence: InnocenceJudgment;
  readonly symmetryInvariance: SymmetryInvarianceJudgment;
  readonly wellFormed: boolean;
}

/** Run all four conditions; `wellFormed` holds when each is a witness. */
export function strategyReport(s: Strategy): StrategyWellFormednessReport {
  const validPlays = s.plays.every((p) => isValidPlay(s.arena, p));
  const prefixClosed = prefixClosedJudgment(s);
  const receptivity = receptivityJudgment(s);
  const innocence = innocenceJudgment(s);
  const symmetryInvariance = symmetryInvarianceJudgment(s);
  const wellFormed = validPlays
    && prefixClosed.kind === "game.strategy.prefixClosed:witness"
    && receptivity.kind === "game.strategy.receptivity:witness"
    && innocence.kind === "game.strategy.innocence:witness"
    && symmetryInvariance.kind === "game.strategy.symmetryInvariance:witness";
  return Object.freeze({ kind: "game.strategy.report" as const, validPlays, prefixClosed, receptivity, innocence, symmetryInvariance, wellFormed });
}

export const isWellFormedStrategy = (s: Strategy): boolean => strategyReport(s).wellFormed;

export function isStrategy(value: unknown): value is Strategy {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Strategy>;
  return candidate.kind === "game.strategy" && Array.isArray(candidate.plays);
}
