import type { Cell, CellSet, Natural } from "../../../../articulating/carriers.mjs";
import type { ClosureRegime, FiniteOrdinalJudgment, Ordinal } from "./closure.mjs";
import type { RankVanishingJudgment } from "./cohomology.mjs";

/**
 * The ordinal index of a settling stage: wraps an Ordinal as the stage
 * coordinate in the transfinite settling sequence.
 */
export interface SettlingStageOrdinalCarrier {
  readonly kind: "predication.settling.stageOrdinal";
  readonly ordinal: Ordinal;
}

/**
 * The designated cells accumulated at a settling stage: a CellSet of the cells
 * whose truth coordinate is present by that stage.
 */
export interface SettlingStageDesignatedCellsCarrier {
  readonly kind: "predication.settling.stageDesignatedCells";
  readonly cells: CellSet;
}

/**
 * Witness that a stage ordinal is finite: pairs the stage ordinal carrier with
 * its natural-number value.
 */
export interface SettlingFiniteStageWitness {
  readonly kind: "predication.settling.finiteStage:witness";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: Natural;
}

/**
 * Obstruction recording that a stage ordinal is not finite: carries the stage
 * ordinal and the finite-ordinal reading that failed to be a witness.
 */
export interface SettlingFiniteStageObstruction {
  readonly kind: "predication.settling.finiteStage-obstruction";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

/**
 * Judgment on whether a settling stage ordinal is finite: either a
 * SettlingFiniteStageWitness or a SettlingFiniteStageObstruction.
 */
export type SettlingFiniteStageJudgment = SettlingFiniteStageWitness | SettlingFiniteStageObstruction;

/**
 * Shape tag for the initial (zero-ordinal) settling stage: carries the stage
 * ordinal carrier.
 */
export interface SettlingInitialStage {
  readonly kind: "predication.settling.stage.initial";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/**
 * Shape tag for a successor settling stage: carries the stage ordinal carrier.
 */
export interface SettlingSuccessorStage {
  readonly kind: "predication.settling.stage.successor";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/** Shape tag for a limit settling stage: carries the stage ordinal carrier. */
export interface SettlingLimitStage {
  readonly kind: "predication.settling.stage.limit";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

/**
 * The shape of a settling stage by its ordinal kind: initial, successor, or
 * limit.
 */
export type SettlingStageShape = SettlingInitialStage | SettlingSuccessorStage | SettlingLimitStage;

/**
 * Input describing one settling stage before normalization: its ordinal
 * carrier, computed shape, and the designated cells carrier supplied for that
 * stage.
 */
export interface SettlingStageInputCarrier {
  readonly kind: "predication.settling.stageInput";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: SettlingStageDesignatedCellsCarrier;
}

/**
 * A normalized settling stage: its ordinal carrier, shape, and the CellSet of
 * cells designated at that stage.
 */
export interface SettlingStage {
  readonly kind: "predication.settling.stage";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: CellSet;
}

/**
 * A settling stage refined to limit shape: a SettlingStage whose shape is a
 * SettlingLimitStage.
 */
export type SettlingLimitStageCarrier = SettlingStage & { readonly shape: SettlingLimitStage };

/**
 * Cofinality witness marking the settling sequence as having countable
 * cofinality.
 */
export interface CountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.countable";
}

/**
 * Cofinality witness marking the settling sequence as having uncountable
 * cofinality (kappa >= omega-1), the standing required for the aperiodic
 * regime.
 */
export interface UncountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.uncountable";
}

/**
 * The declared cofinality of a settling sequence: either countable or
 * uncountable.
 */
export type SettlingCofinalityCarrier =
  | CountableSettlingCofinalityCarrier
  | UncountableSettlingCofinalityCarrier;

/**
 * A complete settling: the normalized sequence of stages together with its
 * declared cofinality witness.
 */
export interface SettlementFiltration {
  readonly kind: "predication.settlement.filtration";
  readonly stages: readonly SettlingStage[];
  readonly cofinality: SettlingCofinalityCarrier;
}

/**
 * The cells gained at one settling stage: the stage ordinal, the source stage,
 * and the CellSet of cells added relative to the previous stage.
 */
export interface SettlingIncrement {
  readonly kind: "predication.settling.increment";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly source: SettlingStage;
  readonly added: CellSet;
}

/**
 * The limit stages of a settling: the list of limit-shaped stages and their
 * count as a rank.
 */
export interface SettlingLimitStagesCarrier {
  readonly kind: "predication.settling.limitStages";
  readonly stages: readonly SettlingLimitStageCarrier[];
  readonly rank: Natural;
}

/**
 * The firings occurring at limit stages: the increments whose source is a limit
 * stage and added cells, with their count as a rank.
 */
export interface NonScottSettlingFiringsCarrier {
  readonly kind: "predication.settling.nonScottFirings";
  readonly firings: readonly SettlingIncrement[];
  readonly rank: Natural;
}

/**
 * A generator of the first cohomology of a settling: one cell added at a
 * non-Scott limit-stage firing, paired with that source stage.
 */
export interface SettlingFirstCohomologyGenerator {
  readonly kind: "predication.settling.firstCohomologyGenerator";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

/**
 * The degree-1 cohomology of a settling: the generators from non-Scott
 * limit-stage firings, their count as a rank, and the rank-vanishing judgment
 * on that rank.
 */
export interface SettlingFirstCohomology {
  readonly kind: "predication.settling.firstCohomology";
  readonly generators: readonly SettlingFirstCohomologyGenerator[];
  readonly rank: Natural;
  readonly degree: 1;
  readonly vanishing: RankVanishingJudgment;
}

/**
 * One cell lost across the graded gap: a cell added at a non-Scott limit-stage
 * firing, paired with that source stage.
 */
export interface GradedGapLoss {
  readonly kind: "predication.settling.gradedGapLoss";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

/**
 * The graded gap of a settling: the list of cells lost at non-Scott limit-stage
 * firings and their count as a rank.
 */
export interface GradedGapCarrier {
  readonly kind: "predication.settling.gradedGap";
  readonly lost: readonly GradedGapLoss[];
  readonly rank: Natural;
}

/**
 * One step of the closure invariant: a non-Scott limit stage and the CellSet of
 * cells added at it.
 */
export interface SettlingClosureInvariantStep {
  readonly kind: "predication.settling.closureInvariantStep";
  readonly stage: SettlingStage;
  readonly additions: CellSet;
}

/**
 * The closure invariant of a settling: the sequence of non-Scott additions, one
 * step per non-Scott limit-stage firing.
 */
export interface SettlingClosureInvariant {
  readonly kind: "predication.settling.closureInvariant";
  readonly nonScottAdditions: readonly SettlingClosureInvariantStep[];
}

/**
 * Witness that two settlings have equivalent closure invariants: carries both
 * closure invariants compared.
 */
export interface SettlingClosureEquivalenceWitness {
  readonly kind: "predication.settling.closureEquivalence:witness";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

/**
 * Obstruction recording that two settlings have differing closure invariants:
 * carries both closure invariants compared.
 */
export interface SettlingClosureEquivalenceObstruction {
  readonly kind: "predication.settling.closureEquivalence-obstruction";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

/**
 * Judgment on whether two settlings share a closure invariant: either a
 * SettlingClosureEquivalenceWitness or a SettlingClosureEquivalenceObstruction.
 */
export type SettlingClosureEquivalenceJudgment = SettlingClosureEquivalenceWitness | SettlingClosureEquivalenceObstruction;

/**
 * The classification of a settling: its settling depth, closure regime,
 * cofinality witness, limit stages, and non-Scott firings.
 */
export interface SettlingClassification {
  readonly kind: "predication.settling.classification";
  readonly depth: SettlingStageOrdinalCarrier;
  readonly regime: ClosureRegime;
  readonly cofinality: SettlingCofinalityCarrier;
  readonly limitStages: SettlingLimitStagesCarrier;
  readonly nonScottFirings: NonScottSettlingFiringsCarrier;
}
