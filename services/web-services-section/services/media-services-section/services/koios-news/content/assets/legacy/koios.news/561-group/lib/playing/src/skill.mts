/**
 * skill — a capability as a typed reusable DESIGN (frontier register: skills-disciplines-and-the-
 * character-agent). In the 561 corpus a skill is a typed 𝒞-morphism (originating → terminating) with a
 * closure-position from the skillful-work quartet. On the ludic substrate a skill is a reusable design
 * (a strategy) that COMPOSES via the cut, and is MASTERED in a discipline when it goes material there —
 * incarnated with no ballast (no wasted commitment), and admitted (its play counts in the practice).
 *
 * The skillful-work QUARTET — inquiry / procedure / derivation / process — is the σ(meaning)/Δ(execution)
 * nuclei × phase (opening / settled): inquiry = σ·open (ask), derivation = σ·settled (prove), procedure =
 * Δ·open (the method), process = Δ·settled (the run). Another face of the recurring FOUR.
 *
 * Consumes `materialJudgment`/`orthogonal` and the `Discipline` reading; re-derives no ludics.
 */
import { materialJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/incarnation.mjs";
import { orthogonal } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality.mjs";
import type { Design } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";
import { admits, type Discipline } from "./discipline.mjs";

/** The skillful-work quartet — the four closure-positions a skill's work can hold. */
export const SKILLFUL_WORK = Object.freeze(["inquiry", "procedure", "derivation", "process"] as const);
export type ClosurePosition = typeof SKILLFUL_WORK[number];

/** The nucleus a closure-position belongs to: σ (MEANING — inquiry/derivation) or Δ (EXECUTION —
 *  procedure/process). */
export function nucleus(position: ClosurePosition): "meaning" | "execution" {
  return position === "inquiry" || position === "derivation" ? "meaning" : "execution";
}

/** The phase a closure-position holds: `opening` (inquiry/procedure — the question/the method) or
 *  `settled` (derivation/process — the proof/the run). */
export function phase(position: ClosurePosition): "opening" | "settled" {
  return position === "inquiry" || position === "procedure" ? "opening" : "settled";
}

/** A skill — a named, typed, reusable design with a closure-position in the skillful-work quartet. */
export interface Skill {
  readonly kind: "playing.skill";
  readonly name: string;
  /** the reusable strategy the skill deploys. */
  readonly design: Design;
  /** the skillful-work quartet position (σ/Δ nucleus × phase). */
  readonly closurePosition: ClosurePosition;
}

/** Constitute a skill from a name, its reusable design, and its closure-position. */
export function skill(name: string, design: Design, closurePosition: ClosurePosition): Skill {
  return Object.freeze({
    kind: "playing.skill" as const,
    name,
    design,
    closurePosition,
  });
}

/** The mastery of a skill within a discipline. */
export interface Mastery {
  readonly kind: "playing.mastery";
  /** the skill's design is MATERIAL in the discipline — incarnated, no ballast (no wasted commitment). */
  readonly material: boolean;
  /** the skill's design is ADMITTED — its play counts within the discipline's behaviour. */
  readonly admitted: boolean;
  /** MASTERED — material AND admitted: the skill is honed and counts in the practice. */
  readonly mastered: boolean;
}

/**
 * mastery — read whether a skill is mastered within a discipline: its design must be MATERIAL there
 * (equal to its own incarnation against the discipline's plays — no ballast, the hallmark of a honed
 * skill) and ADMITTED (lie in the discipline's behaviour — count as a play of the practice). This is the
 * substrate form of "becoming better = quiescence": a skill matures by going material, not by accreting.
 */
export function mastery(s: Skill, within: Discipline): Mastery {
  const material = materialJudgment(s.design, within.generators, within.universe).kind === "game.incarnation.material:witness";
  const admitted = admits(within, s.design);
  return Object.freeze({
    kind: "playing.mastery" as const,
    material,
    admitted,
    mastered: material && admitted,
  });
}

/**
 * composes — whether two skills CHAIN: the output of one meets the input of the other at the cut (their
 * designs are orthogonal — the interaction converges to the Daimon). A skill repertoire is the graph of
 * which skills compose into which.
 */
export function composes(left: Skill, right: Skill): boolean {
  return orthogonal(left.design, right.design);
}
