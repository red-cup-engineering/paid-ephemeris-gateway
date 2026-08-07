/**
 * The Hyland-Ong sequential paradigm $\mathbf{CGS}_{\mathrm{HO}}$ — PCF and the
 * sequential typed $\lambda$-calculus as a full sub-$*$-autonomous-category of
 * $\mathbf{CGS}$.
 *
 * `games/logic/embeddings.mts::hylandOng` *names* this sub-category: "innocent
 * (deterministic, positional) strategies on arenas that are alternating,
 * well-bracketed, deterministic, with trivial symmetry groupoid". Here that
 * constraint becomes an *executable* membership predicate on a real `Morphism`.
 * The three carrier-checkable cuts are computed:
 *
 *   - **trivial symmetry** — the arena has no non-identity copy-permutation
 *     (`hasTrivialSymmetry`); sequential games are not nominal;
 *   - **alternation** — every play alternates Opponent/Player (`playsAlternate`);
 *   - **innocence / determinism** — at most one Player move after any history
 *     (`isInnocentMorphism`). This is exactly the cut that Phase 2 deliberately
 *     *excluded* from the ambient category law: innocence is not a property of
 *     every $\mathbf{CGS}$ morphism, it is the Hyland-Ong RESTRICTION — and this
 *     is the module that imposes it.
 *
 * Well-bracketing is *named, not computed*: it is a discipline on the
 * question/answer labelling of moves, and the bare polarized event structure
 * carries no Q/A tags — so, per the same honesty as the bounded-`!` stage, we
 * record it on the constraint and do not fabricate a check the carrier can't
 * support. The reused embedding carrier is exposed via `sequentialEmbedding`.
 */
import { type Embedding, hylandOng } from "@emsenn/gaming";
import { type Morphism, isInnocentMorphism } from "../categorifying/morphism.mjs";
import { hasTrivialSymmetry, playsAlternate } from "./structure.mjs";

export interface SequentialWitness {
  readonly kind: "computing.paradigm.sequential:witness";
  readonly morphism: Morphism;
  readonly trivialSymmetry: true;
  readonly alternating: true;
  readonly innocent: true;
}

export interface SequentialObstruction {
  readonly kind: "computing.paradigm.sequential-obstruction";
  readonly morphism: Morphism;
  readonly trivialSymmetry: boolean;
  readonly alternating: boolean;
  readonly innocent: boolean;
  readonly reason: string;
}

export type SequentialJudgment = SequentialWitness | SequentialObstruction;

/**
 * Membership of a morphism in the Hyland-Ong sequential sub-category: its
 * compound arena has trivial symmetry, every play alternates, and the strategy
 * is innocent (deterministic). All three are checked against the actual
 * strategy carrier; the first failure is named in `reason`.
 */
export function sequentialMembership(m: Morphism): SequentialJudgment {
  const trivialSymmetry = hasTrivialSymmetry(m.strategy.arena);
  const alternating = playsAlternate(m.strategy);
  const innocent = isInnocentMorphism(m);
  if (trivialSymmetry && alternating && innocent) {
    return Object.freeze({
      kind: "computing.paradigm.sequential:witness" as const,
      morphism: m,
      trivialSymmetry: true,
      alternating: true,
      innocent: true,
    });
  }
  const failures: string[] = [];
  if (!trivialSymmetry) failures.push("non-trivial symmetry (nominal, not sequential)");
  if (!alternating) failures.push("non-alternating play (concurrent, not sequential)");
  if (!innocent) failures.push("non-innocent strategy (non-deterministic, not sequential)");
  return Object.freeze({
    kind: "computing.paradigm.sequential-obstruction" as const,
    morphism: m,
    trivialSymmetry,
    alternating,
    innocent,
    reason: failures.join("; "),
  });
}

/** Whether a morphism is a Hyland-Ong sequential strategy. */
export const isSequential = (m: Morphism): boolean =>
  sequentialMembership(m).kind === "computing.paradigm.sequential:witness";

/** The reused `games/logic` embedding carrier naming $\mathbf{CGS}_{\mathrm{HO}} \hookrightarrow \mathbf{CGS}$. */
export const sequentialEmbedding = (): Embedding => hylandOng();
