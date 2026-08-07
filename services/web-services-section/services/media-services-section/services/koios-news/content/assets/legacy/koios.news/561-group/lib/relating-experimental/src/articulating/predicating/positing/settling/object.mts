/**
 * settling/object — the settlement type carriers.
 *
 * The `SettlementFiltration` is the settled object: an ordinal-indexed sequence
 * of stages (each with its designated CellSet) plus a declared cofinality. The
 * read carriers — increments, limit stages, non-Scott firings, first cohomology,
 * graded gap, closure invariant, classification — are the shapes the settlement
 * reads project. Pure types; no runtime.
 */
import type { Cell, CellSet } from "../../predication.mjs";
import type { Natural } from "./analysis/exact-number.mjs";
import type { ClosureRegime, FiniteOrdinalJudgment, Ordinal } from "./closure.mjs";
import type { RankVanishingJudgment } from "./cohomology.mjs";

/** The ordinal index of a settling stage. */
export interface SettlingStageOrdinalCarrier {
  readonly kind: "predication.settling.stageOrdinal";
  readonly ordinal: Ordinal;
}

/** The designated cells accumulated at a settling stage. */
export interface SettlingStageDesignatedCellsCarrier {
  readonly kind: "predication.settling.stageDesignatedCells";
  readonly cells: CellSet;
}

/** Witness that a stage ordinal is finite, with its natural value. */
export interface SettlingFiniteStageWitness {
  readonly kind: "predication.settling.finiteStage:witness";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: Natural;
}

/** Obstruction recording that a stage ordinal is not finite. */
export interface SettlingFiniteStageObstruction {
  readonly kind: "predication.settling.finiteStage-obstruction";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

/** Judgment on whether a settling stage ordinal is finite. */
export type SettlingFiniteStageJudgment = SettlingFiniteStageWitness | SettlingFiniteStageObstruction;

/** Shape tag for the initial (zero-ordinal) settling stage. */
export interface SettlingInitialStage {
  readonly kind: "predication.settling.stage.initial";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/** Shape tag for a successor settling stage. */
export interface SettlingSuccessorStage {
  readonly kind: "predication.settling.stage.successor";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/** Shape tag for a limit settling stage. */
export interface SettlingLimitStage {
  readonly kind: "predication.settling.stage.limit";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/** The shape of a settling stage by its ordinal kind. */
export type SettlingStageShape = SettlingInitialStage | SettlingSuccessorStage | SettlingLimitStage;

/** Input describing one settling stage before normalization. */
export interface SettlingStageInputCarrier {
  readonly kind: "predication.settling.stageInput";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: SettlingStageDesignatedCellsCarrier;
}

/** A normalized settling stage. */
export interface SettlingStage {
  readonly kind: "predication.settling.stage";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: CellSet;
}

/** A settling stage refined to limit shape. */
export type SettlingLimitStageCarrier = SettlingStage & { readonly shape: SettlingLimitStage };

/** Countable-cofinality witness. */
export interface CountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.countable";
}

/** Uncountable-cofinality witness (the standing for the aperiodic regime). */
export interface UncountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.uncountable";
}

/** The declared cofinality of a settling sequence. */
export type SettlingCofinalityCarrier = CountableSettlingCofinalityCarrier | UncountableSettlingCofinalityCarrier;

/** A complete settling: its stages and its declared cofinality. */
export interface SettlementFiltration {
  readonly kind: "predication.settlement.filtration";
  readonly stages: readonly SettlingStage[];
  readonly cofinality: SettlingCofinalityCarrier;
}

/** The cells gained at one settling stage. */
export interface SettlingIncrement {
  readonly kind: "predication.settling.increment";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly source: SettlingStage;
  readonly added: CellSet;
}

/** The limit stages of a settling, with their count. */
export interface SettlingLimitStagesCarrier {
  readonly kind: "predication.settling.limitStages";
  readonly stages: readonly SettlingLimitStageCarrier[];
  readonly rank: Natural;
}

/** The firings occurring at limit stages, with their count. */
export interface NonScottSettlingFiringsCarrier {
  readonly kind: "predication.settling.nonScottFirings";
  readonly firings: readonly SettlingIncrement[];
  readonly rank: Natural;
}

/** A generator of the first cohomology of a settling. */
export interface SettlingFirstCohomologyGenerator {
  readonly kind: "predication.settling.firstCohomologyGenerator";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

/** The degree-1 cohomology of a settling. */
export interface SettlingFirstCohomology {
  readonly kind: "predication.settling.firstCohomology";
  readonly generators: readonly SettlingFirstCohomologyGenerator[];
  readonly rank: Natural;
  readonly degree: 1;
  readonly vanishing: RankVanishingJudgment;
}

/** One cell lost across the graded gap. */
export interface GradedGapLoss {
  readonly kind: "predication.settling.gradedGapLoss";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

/** The graded gap of a settling, with its count. */
export interface GradedGapCarrier {
  readonly kind: "predication.settling.gradedGap";
  readonly lost: readonly GradedGapLoss[];
  readonly rank: Natural;
}

/** One step of the closure invariant. */
export interface SettlingClosureInvariantStep {
  readonly kind: "predication.settling.closureInvariantStep";
  readonly stage: SettlingStage;
  readonly additions: CellSet;
}

/** The closure invariant of a settling (the non-Scott additions). */
export interface SettlingClosureInvariant {
  readonly kind: "predication.settling.closureInvariant";
  readonly nonScottAdditions: readonly SettlingClosureInvariantStep[];
}

/** Witness that two settlings have equivalent closure invariants. */
export interface SettlingClosureEquivalenceWitness {
  readonly kind: "predication.settling.closureEquivalence:witness";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

/** Obstruction recording that two settlings have differing closure invariants. */
export interface SettlingClosureEquivalenceObstruction {
  readonly kind: "predication.settling.closureEquivalence-obstruction";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

/** Judgment on whether two settlings share a closure invariant. */
export type SettlingClosureEquivalenceJudgment = SettlingClosureEquivalenceWitness | SettlingClosureEquivalenceObstruction;

/** The classification of a settling. */
export interface SettlingClassification {
  readonly kind: "predication.settling.classification";
  readonly depth: SettlingStageOrdinalCarrier;
  readonly regime: ClosureRegime;
  readonly cofinality: SettlingCofinalityCarrier;
  readonly limitStages: SettlingLimitStagesCarrier;
  readonly nonScottFirings: NonScottSettlingFiringsCarrier;
}
