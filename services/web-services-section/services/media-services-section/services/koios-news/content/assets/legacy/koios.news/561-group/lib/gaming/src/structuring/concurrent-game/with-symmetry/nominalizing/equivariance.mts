/** Strategy equivariance under finite name permutations: the AGMOS morphism cut. */
import { strategy, symmetryInvarianceJudgment, type Strategy, type SymmetryInvarianceJudgment } from "../strategizing/index.mjs";
import { nominalArenaJudgment, type NominalArenaObstruction, type NominalArenaWitness } from "./arena.mjs";
import { type EventNameLabel } from "./action.mjs";
import { type FinitePermutation } from "./permutation.mjs";

export interface NominalEquivarianceWitness {
  readonly kind: "game.nominal.equivariance:witness";
  readonly nominalArena: NominalArenaWitness;
  readonly symmetryInvariance: SymmetryInvarianceJudgment;
}

export interface NominalEquivarianceObstruction {
  readonly kind: "game.nominal.equivariance-obstruction";
  readonly nominalArena?: NominalArenaObstruction;
  readonly symmetryInvariance?: SymmetryInvarianceJudgment;
}

export type NominalEquivarianceJudgment = NominalEquivarianceWitness | NominalEquivarianceObstruction;

/**
 * Judge whether a strategy is FSym-equivariant for the supplied finite
 * permutation generators. This reuses the CGS symmetry-invariance law by first
 * installing the generated FSym actions into the arena symmetry groupoid.
 */
export function nominalEquivarianceJudgment(
  s: Strategy,
  labels: readonly EventNameLabel[],
  permutations: readonly FinitePermutation[],
): NominalEquivarianceJudgment {
  const nominalArena = nominalArenaJudgment(s.arena, labels, permutations);
  if (nominalArena.kind !== "game.nominal.arena:witness") {
    return Object.freeze({ kind: "game.nominal.equivariance-obstruction" as const, nominalArena });
  }
  const enriched = strategy(nominalArena.arena, s.plays);
  const symmetryInvariance = symmetryInvarianceJudgment(enriched);
  return symmetryInvariance.kind === "game.strategy.symmetryInvariance:witness"
    ? Object.freeze({ kind: "game.nominal.equivariance:witness" as const, nominalArena, symmetryInvariance })
    : Object.freeze({ kind: "game.nominal.equivariance-obstruction" as const, symmetryInvariance });
}

