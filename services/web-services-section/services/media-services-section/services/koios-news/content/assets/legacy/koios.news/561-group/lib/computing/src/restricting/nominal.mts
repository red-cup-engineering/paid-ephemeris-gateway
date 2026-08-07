/**
 * The AGMOS nominal paradigm $\mathbf{CGS}_{\mathrm{AGMOS}}$ — nominal computation
 * (the $\nu$-calculus, fresh-name allocation) as a full sub-$*$-autonomous-
 * category of $\mathbf{CGS}$.
 *
 * `games/logic/embeddings.mts::nominal` names the defining feature: a NON-TRIVIAL
 * symmetry groupoid containing $\mathrm{FSym}(\mathbb{A})$ (finite name-
 * permutations), with strategies *equivariant* under that action — exactly the
 * finite-support condition of nominal sets, carried directly by game-algebra's
 * `Arena.symmetry`. Where Hyland-Ong forbids non-identity symmetry, AGMOS
 * *requires* it: the embedding mints no nominal machinery — the symmetry groupoid
 * already on the `Arena` IS the embedding's content.
 *
 * Membership is checked on the real carriers by `@emsenn/gaming/structuring`:
 *   - finite name permutations induce event bijections;
 *   - each induced bijection must be a valid arena symmetry;
 *   - a supplied strategy must be equivariant under those generated symmetries.
 *
 * The arena predicate is the object-level cut; the optional strategy check is the
 * morphism-level equivariance. The reused embedding carrier is `nominalEmbedding`.
 */
import { type Arena, type Strategy } from "@emsenn/gaming";
import {
  type EventNameLabel,
  type FinitePermutation,
  type NominalArenaJudgment,
  type NominalEquivarianceJudgment,
  nominalArenaJudgment,
  nominalEquivarianceJudgment,
} from "@emsenn/gaming/structuring";
import { type Embedding, nominal } from "@emsenn/gaming";

export interface NominalMembershipInput {
  readonly labels: readonly EventNameLabel[];
  readonly permutations: readonly FinitePermutation[];
}

export interface NominalWitness {
  readonly kind: "computing.paradigm.nominal:witness";
  readonly arena: Arena;
  readonly nominal: NominalArenaJudgment;
  /** Whether the supplied strategy (if any) is equivariant under the groupoid. */
  readonly equivariant: boolean;
  readonly equivariance?: NominalEquivarianceJudgment;
}

export interface NominalObstruction {
  readonly kind: "computing.paradigm.nominal-obstruction";
  readonly arena: Arena;
  readonly nominal?: NominalArenaJudgment;
  readonly equivariant: boolean;
  readonly equivariance?: NominalEquivarianceJudgment;
  readonly reason: string;
}

export type NominalJudgment = NominalWitness | NominalObstruction;

/**
 * Membership of an arena (with an optional equivariant strategy) in the AGMOS
 * nominal sub-category: supplied finite name permutations must act as CGS
 * symmetries, and any supplied strategy must be equivariant under the generated
 * finite FSym(A) action.
 */
export function nominalMembership(a: Arena, input: NominalMembershipInput, s?: Strategy): NominalJudgment {
  if (input.permutations.length === 0) {
    return Object.freeze({
      kind: "computing.paradigm.nominal-obstruction" as const,
      arena: a,
      equivariant: false,
      reason: "missing finite FSym(A) generators",
    });
  }

  const nominal = nominalArenaJudgment(a, input.labels, input.permutations);
  if (nominal.kind !== "game.nominal.arena:witness") {
    return Object.freeze({
      kind: "computing.paradigm.nominal-obstruction" as const,
      arena: a,
      nominal,
      equivariant: false,
      reason: `finite name action is not an arena symmetry: ${nominal.obstruction.reason}`,
    });
  }

  if (s === undefined) {
    return Object.freeze({
      kind: "computing.paradigm.nominal:witness" as const,
      arena: nominal.arena,
      nominal,
      equivariant: true,
    });
  }

  const equivariance = nominalEquivarianceJudgment(s, input.labels, input.permutations);
  const equivariant = equivariance.kind === "game.nominal.equivariance:witness";
  return equivariant
    ? Object.freeze({
        kind: "computing.paradigm.nominal:witness" as const,
        arena: nominal.arena,
        nominal,
        equivariant,
        equivariance,
      })
    : Object.freeze({
        kind: "computing.paradigm.nominal-obstruction" as const,
        arena: nominal.arena,
        nominal,
        equivariant,
        equivariance,
        reason: "strategy not equivariant under finite FSym(A) action",
      });
}

/** Whether an arena (optionally with an equivariant strategy) is a nominal/AGMOS game. */
export const isNominal = (a: Arena, input: NominalMembershipInput, s?: Strategy): boolean =>
  nominalMembership(a, input, s).kind === "computing.paradigm.nominal:witness";

/** The reused `games/logic` embedding carrier naming $\mathbf{CGS}_{\mathrm{AGMOS}} \hookrightarrow \mathbf{CGS}$. */
export const nominalEmbedding = (): Embedding => nominal();
