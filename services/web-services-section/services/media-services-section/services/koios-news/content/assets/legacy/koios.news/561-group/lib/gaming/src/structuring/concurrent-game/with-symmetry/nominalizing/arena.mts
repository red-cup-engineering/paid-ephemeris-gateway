/** AGMOS nominal arena structure: FSym(A) included in the arena symmetry groupoid. */
import { arena as arenaOf, type Arena } from "../arena.mjs";
import {
  nominalActionJudgment,
  type EventNameLabel,
  type NominalActionObstruction,
  type NominalActionWitness,
} from "./action.mjs";
import { type FinitePermutation } from "./permutation.mjs";

export interface NominalArenaWitness {
  readonly kind: "game.nominal.arena:witness";
  readonly arena: Arena;
  readonly labels: readonly EventNameLabel[];
  readonly actions: readonly NominalActionWitness[];
}

export interface NominalArenaObstruction {
  readonly kind: "game.nominal.arena-obstruction";
  readonly arena: Arena;
  readonly labels: readonly EventNameLabel[];
  readonly obstruction: NominalActionObstruction;
}

export type NominalArenaJudgment = NominalArenaWitness | NominalArenaObstruction;

/**
 * Add the supplied finite FSym(A) generators to an arena when each generator
 * acts by a valid CGS symmetry.
 */
export function nominalArenaJudgment(
  base: Arena,
  labels: readonly EventNameLabel[],
  permutations: readonly FinitePermutation[],
): NominalArenaJudgment {
  const actions: NominalActionWitness[] = [];
  for (const permutation of permutations) {
    const action = nominalActionJudgment(base, labels, permutation);
    if (action.kind !== "game.nominal.action:witness") {
      return Object.freeze({
        kind: "game.nominal.arena-obstruction" as const,
        arena: base,
        labels: Object.freeze([...labels]),
        obstruction: action,
      });
    }
    actions.push(action);
  }
  return Object.freeze({
    kind: "game.nominal.arena:witness" as const,
    arena: arenaOf(base.structure, [...base.symmetry, ...actions.map((action) => action.bijection)]),
    labels: Object.freeze([...labels]),
    actions: Object.freeze(actions),
  });
}

