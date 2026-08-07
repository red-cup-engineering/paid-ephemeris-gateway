/**
 * The flow criterion — Csikszentmihalyi's challenge↔skill matching.
 *
 * Flow (Csikszentmihalyi 1975, 1990) is "the state of complete absorption that
 * occurs when the challenge of an activity matches the actor's skill" (corpus,
 * flow journal 2026-05-24).  The diagnostic 2×2: challenge above skill produces
 * anxiety/frustration; skill above challenge produces boredom; a calibrated
 * match produces flow.  The corpus gives flow precise algebraic content as
 * correspondence (10) of the cultural-ludic embedding: "*Challenge* = the
 * situation-fiber's complexity ... *Skill* = the player-fiber's complexity",
 * and the match "IS the challenge-skill match in Csikszentmihalyi's sense".
 *
 * We realize challenge and skill as *commensurable counts* so the band check is
 * apples-to-apples:
 *
 *   - **challenge** = the structural complexity of the arena = its number of
 *     legal one-move extensions reachable from the empty play — the breadth of
 *     the situation the player must engage (the "number of predicates / bypass
 *     adjacencies" of the situation-fiber, read structurally).
 *   - **skill** = the repertoire of a strategy = the breadth of its own
 *     move-vocabulary, the distinct moves it commits to across *all* the
 *     positions it admits — the size of the player's fiber.
 *
 * Challenge and skill are *independent* magnitudes (corpus: situation-fiber
 * complexity versus player-fiber complexity), so either may exceed the other.
 * Flow is the regime where they come *within a band* of each other; outside it,
 * skill short of challenge is *anxiety* (the situation overwhelms — the
 * corpus's "challenge too high" frustration), and skill in excess of challenge
 * is *boredom* (the player's repertoire outruns what the board demands).  Both
 * obstruction outcomes are reachable.
 */

import {
  type Arena,
  type Strategy,
  arenaEvents,
  emptyPlay,
  extend,
  positionOf,
} from "../index.mjs";
import {
  ratCompare,
  ratSubtract,
  type Rational,
} from "@emsenn/relating";
import { fromRatio } from "@emsenn/relating/codecs";

export interface ChallengeMeasure {
  readonly kind: "game-analysis.flow.challenge";
  readonly arena: Arena;
  /** Number of distinct events that legally extend the empty play. */
  readonly value: number;
  /** The events offering those extensions. */
  readonly openings: readonly string[];
}

/**
 * The challenge of an arena: the breadth of its opening situation — every event
 * that legally extends the empty play.  This is the structural complexity the
 * player must meet on the first move; a board offering one forced opening is
 * trivial, a board offering many is demanding.
 */
export function challengeOf(arena: Arena): ChallengeMeasure {
  const start = emptyPlay();
  const openings = arenaEvents(arena)
    .filter((e) => extend(arena, start, e.id) !== null)
    .map((e) => e.id);
  return Object.freeze({
    kind: "game-analysis.flow.challenge" as const,
    arena,
    value: openings.length,
    openings: Object.freeze(openings),
  });
}

export interface SkillMeasure {
  readonly kind: "game-analysis.flow.skill";
  readonly strategy: Strategy;
  /** Number of distinct moves in the strategy's whole repertoire. */
  readonly value: number;
  /** The distinct moves the strategy commits across all its plays. */
  readonly repertoire: readonly string[];
}

/**
 * The skill of a strategy: the breadth of its own repertoire — every distinct
 * move it commits across *all* the positions it admits, not just openings.  An
 * intrinsic magnitude of the player's fiber: it may fall short of the arena's
 * challenge (under-skilled, anxiety) or run beyond it (over-skilled, boredom),
 * so the two are genuinely independent (corpus, flow journal).
 */
export function skillOf(strategy: Strategy): SkillMeasure {
  const repertoire: string[] = [];
  for (const p of strategy.plays) {
    for (const move of p.moves) {
      if (!repertoire.includes(move)) repertoire.push(move);
    }
  }
  return Object.freeze({
    kind: "game-analysis.flow.skill" as const,
    strategy,
    value: repertoire.length,
    repertoire: Object.freeze(repertoire),
  });
}

export type FlowImbalance = "anxiety" | "boredom";

export interface FlowWitness {
  readonly kind: "game-analysis.flow:witness";
  readonly challenge: ChallengeMeasure;
  readonly skill: SkillMeasure;
  /** challenge − skill, the (non-negative) gap closed within the band. */
  readonly gap: number;
  /** The matching band, as a fraction of the challenge. */
  readonly band: Rational;
}

export interface FlowObstruction {
  readonly kind: "game-analysis.flow-obstruction";
  readonly challenge: ChallengeMeasure;
  readonly skill: SkillMeasure;
  /** `anxiety` — skill falls short of challenge by more than the band;
   *  `boredom` — skill exceeds challenge by more than the band. */
  readonly reason: FlowImbalance;
  /** |challenge − skill|, the band-exceeding mismatch. */
  readonly mismatch: number;
  readonly band: Rational;
}

export type FlowJudgment = FlowWitness | FlowObstruction;

const DEFAULT_BAND = fromRatio(1, 4);

/**
 * Judge flow from a challenge and a skill measure.  Flow holds when the
 * mismatch $|challenge - skill|$ is within `band·challenge` — challenge and
 * skill are commensurable counts, so the comparison is exact.  Outside the
 * band: skill below challenge is *anxiety* (the corpus's frustration regime,
 * challenge too high), skill above challenge is *boredom* (capacity exceeds
 * demand).  The default band is a quarter of the challenge; degenerate
 * (zero-challenge) boards admit flow only with zero skill.
 */
export function flowJudgment(
  challenge: ChallengeMeasure,
  skill: SkillMeasure,
  band: Rational = DEFAULT_BAND,
): FlowJudgment {
  const signedGap = challenge.value - skill.value;
  const mismatch = Math.abs(signedGap);
  // mismatch ≤ band · challenge  ⇔  mismatch (as /challenge) within band.
  const mismatchFraction =
    challenge.value === 0 ? fromRatio(mismatch, 1) : fromRatio(mismatch, challenge.value);
  if (ratCompare(mismatchFraction, band) <= 0) {
    return Object.freeze({
      kind: "game-analysis.flow:witness" as const,
      challenge,
      skill,
      gap: signedGap,
      band,
    });
  }
  return Object.freeze({
    kind: "game-analysis.flow-obstruction" as const,
    challenge,
    skill,
    reason: signedGap > 0 ? ("anxiety" as const) : ("boredom" as const),
    mismatch,
    band,
  });
}

/** Convenience: judge flow directly from an arena and a strategy on it. */
export function flow(arena: Arena, strategy: Strategy, band: Rational = DEFAULT_BAND): FlowJudgment {
  return flowJudgment(challengeOf(arena), skillOf(strategy), band);
}

/** Whether an arena and strategy are in flow at the given (or default) band. */
export const inFlow = (arena: Arena, strategy: Strategy, band: Rational = DEFAULT_BAND): boolean =>
  flow(arena, strategy, band).kind === "game-analysis.flow:witness";

/** The signed challenge − skill difference as an exact `Rational` fraction of
 *  challenge — the position on Csikszentmihalyi's flow diagonal. */
export function flowBalance(challenge: ChallengeMeasure, skill: SkillMeasure): Rational {
  if (challenge.value === 0) return fromRatio(0, 1);
  return ratSubtract(
    fromRatio(challenge.value, challenge.value),
    fromRatio(skill.value, challenge.value),
  );
}
