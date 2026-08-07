/**
 * Computational ludics — cut as an explicit reduction step on designs.
 *
 * Corpus (ludics/library/design/cut journal, Girard 2001 "Locus Solum" §11;
 * Terui 2011 "Computational Ludics"; Gentzen 1935 for the cut-rule): the *cut*
 * morphism $\star$ composes two dual designs by running their interaction and
 * taking the converged trace. On the predication-fiber substrate the cut realizes
 * as
 *
 *   $v_{\mathfrak{D} \star \mathfrak{E}} = \mathrm{cl}(v_\mathfrak{D} \sqcup_k
 *    v_\mathfrak{E})$   when the play converges, else the empty design.
 *
 * The knowledge-join $\sqcup_k$ of the two dual valuations is EXACTLY game-algebra
 * `interact` (the interaction normal form). Convergence — the play reaching the
 * Daimon $\dagger$ ($\top$ = `stable`, designated, paraconsistent: the model
 * closes AGAINST $\top$, never aborting on it) — is game-topology
 * `convergenceJudgment`. So we do NOT reinvent the join or the closure: cut is
 * `interact` gated by `convergenceJudgment`. The interaction normal form IS
 * cut-elimination (Faggian-Hyland 2002: cut on focused designs is Hyland-Ong
 * strategy composition), and Girard 2001's cut-elimination theorem is the
 * strong-normalization of this reduction.
 *
 * Terui 2011's contribution is to read cut as an explicit REDUCTION RELATION
 * (rather than a static composite): `cutStep` is one reduction step
 * $\mathfrak{D} \star \mathfrak{E} \rightsquigarrow \mathrm{nf}$, and `normalize`
 * is the (already-normal, by `interact`'s totality) normal form, witnessed to
 * reach a Daimon by `normalizationWitness`.
 */
import { type Design, type Locus, interact } from "../../index.mjs";
import { type ConvergenceJudgment, convergenceJudgment } from "../settling/index.mjs";

/**
 * One cut-reduction step on a pair of dual designs: the interaction normal form
 * $\mathfrak{D} \star \mathfrak{E}$, together with the convergence verdict. The
 * `normalForm` is the knowledge-join `interact(d1, d2)` (the cut trace); the
 * `convergence` records whether the play reaches a Daimon (converges, $\Downarrow$)
 * or is stuck ($\Uparrow$). Pure and total — `interact` always yields a design.
 */
export interface CutStep {
  readonly kind: "game.logic.cut.step";
  readonly normalForm: Design;
  readonly convergence: ConvergenceJudgment;
}

/**
 * Perform one cut-reduction step $\mathfrak{D} \star \mathfrak{E} \rightsquigarrow
 * \mathrm{nf}$. The normal form is the interaction join (reused verbatim); the
 * convergence judgment is game-topology's (reused verbatim). This is Terui 2011's
 * explicit reduction step — cut as a relation, not a static operation.
 */
export function cutStep(d1: Design, d2: Design): CutStep {
  return Object.freeze({
    kind: "game.logic.cut.step" as const,
    normalForm: interact(d1, d2),
    convergence: convergenceJudgment(d1, d2),
  });
}

/**
 * The cut $\mathfrak{D} \star \mathfrak{E}$ as a partial composite (Girard 2001
 * §11): the converged trace when the play converges, else the empty design (the
 * divergence convention $\bot$ in the design lattice). When defined, the result
 * is the interaction normal form; when the play diverges (no Daimon collision),
 * the cut is undefined and we return `null`.
 *
 * This is the **closure-operator shadow** of the cut (the symmetric knowledge-join
 * over the union of supports, keeping the interface). It stays the orthogonality /
 * normal-form engine. The CATEGORICAL composition — interaction THEN hide the
 * shared interface, with directed copycat transport — is `ludicizing/composition.cut`.
 */
export function cutShadow(d1: Design, d2: Design): Design | null {
  const judgment = convergenceJudgment(d1, d2);
  if (judgment.kind === "game.convergence:witness") {
    return interact(d1, d2);
  }
  return null;
}

/**
 * The normal form of the cut: the interaction normal form $\mathfrak{D} \star
 * \mathfrak{E}$. Always a design (`interact` is total) — this is the cut-traversed
 * tree of actions. The interaction normal form IS cut-elimination: there is no
 * further reduction to perform, so `normalize` is idempotent in content. Use
 * `cut` for the partial (convergence-gated) composite.
 */
export function normalize(d1: Design, d2: Design): Design {
  return interact(d1, d2);
}

export interface NormalizationWitness {
  readonly kind: "game.logic.normalization:witness";
  /** The cut normal form (interaction join). */
  readonly normalForm: Design;
  /** The loci at which the play collides into the Daimon $\top$ — the convergence points. */
  readonly daimonLoci: readonly Locus[];
}

export interface NormalizationObstruction {
  readonly kind: "game.logic.normalization-obstruction";
  /** The cut normal form computed even though it does not converge. */
  readonly normalForm: Design;
  /** Why normalization did not reach a Daimon. */
  readonly reason: "no-meeting" | "no-daimon";
}

export type NormalizationJudgment = NormalizationWitness | NormalizationObstruction;

/**
 * Witness that cut-normalization CONVERGES — reaches a Daimon $\dagger$ ($\top$,
 * the designated paraconsistent value). Convergence is the ludics correctness
 * criterion (Girard 2001): the play of two dual designs closes against a
 * $\top$-collision. Reuses game-topology `convergenceJudgment`; on a witness we
 * surface the normal form and the Daimon loci, on an obstruction we surface the
 * reason ($\Uparrow$: no meeting, or a meeting that never collides into $\top$).
 */
export function normalizationWitness(d1: Design, d2: Design): NormalizationJudgment {
  const judgment = convergenceJudgment(d1, d2);
  if (judgment.kind === "game.convergence:witness") {
    return Object.freeze({
      kind: "game.logic.normalization:witness" as const,
      normalForm: judgment.normalForm,
      daimonLoci: judgment.daimonLoci,
    });
  }
  return Object.freeze({
    kind: "game.logic.normalization-obstruction" as const,
    normalForm: judgment.normalForm,
    reason: judgment.reason,
  });
}

/**
 * Whether the cut of two dual designs converges (normalizes to a Daimon). The
 * ludics-native name of "the cut is defined": `cutShadow(d1, d2)` is non-null
 * exactly when `converges(d1, d2)` holds.
 */
export function converges(d1: Design, d2: Design): boolean {
  return convergenceJudgment(d1, d2).kind === "game.convergence:witness";
}

export interface CutEliminationStatement {
  readonly kind: "game.logic.cutElimination.statement";
  readonly theorem: string;
}

/**
 * The Girard 2001 / Terui 2011 cut-elimination (strong-normalization) statement
 * for focused designs, carried as data with a JSDoc theorem: cut-reduction is
 * strongly normalizing, the normal form is unique (Church-Rosser), and cut is
 * associative on convergent plays — the design-level Hauptsatz that makes the
 * category of behaviours well-defined. We name the theorem; the engine (the join,
 * the closure) lives in game-algebra / game-topology.
 */
export function cutElimination(): CutEliminationStatement {
  return Object.freeze({
    kind: "game.logic.cutElimination.statement" as const,
    theorem:
      "Girard 2001 / Terui 2011: cut on focused designs is strongly normalizing — every cut-reduction sequence terminates and the normal form is unique (Church-Rosser) — and cut is associative on convergent plays. The interaction normal form (game-algebra interact, the knowledge-join closure) IS the cut-eliminated trace; convergence to the Daimon (game-topology convergenceJudgment) is the correctness criterion. This is the design-level Hauptsatz.",
  });
}

export function isCutStep(value: unknown): value is CutStep {
  if (typeof value !== "object" || value === null) return false;
  return (value as { readonly kind?: unknown }).kind === "game.logic.cut.step";
}

export function isNormalizationWitness(value: unknown): value is NormalizationWitness {
  if (typeof value !== "object" || value === null) return false;
  return (value as { readonly kind?: unknown }).kind === "game.logic.normalization:witness";
}
