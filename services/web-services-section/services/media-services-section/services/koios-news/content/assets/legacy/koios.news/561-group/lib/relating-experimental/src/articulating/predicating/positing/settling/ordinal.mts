/**
 * settling/ordinal — settling-stage ordinal carriers and cofinality.
 *
 * Wraps the closure ordinals as settling-stage coordinates (initial, successor,
 * limit), the countable/uncountable cofinality witnesses, and the finitude
 * judgment on a stage ordinal.
 */
import { natEqual, type Natural } from "./analysis/exact-number.mjs";
import { finiteOrdinalJudgment, limitOrdinal, successorOrdinal, zeroOrdinal, type Ordinal, type OrdinalLabel } from "./closure.mjs";
import type {
  CountableSettlingCofinalityCarrier,
  SettlingFiniteStageJudgment,
  SettlingStage,
  SettlingStageOrdinalCarrier,
  UncountableSettlingCofinalityCarrier,
} from "./object.mjs";

/** The stage ordinal carrier for the initial stage (zero ordinal). */
export const initialSettlingStageOrdinal: SettlingStageOrdinalCarrier = Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: zeroOrdinal,
});

/** Wrap an ordinal as a settling stage ordinal carrier. */
export const settlingStageOrdinal = (ordinal: Ordinal): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal,
});

/** The stage ordinal carrier for the successor of a stage's ordinal. */
export const successorSettlingStageOrdinal = (stage: SettlingStageOrdinalCarrier): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: successorOrdinal(stage.ordinal),
});

/** The stage ordinal carrier for a limit ordinal from a label and fundamental sequence. */
export const limitSettlingStageOrdinal = (
  label: OrdinalLabel,
  fundamentalSequence: (n: Natural) => Ordinal,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(limitOrdinal(label, fundamentalSequence));

/** Countable cofinality witness. */
export const countableSettlingCofinality: CountableSettlingCofinalityCarrier = Object.freeze({
  kind: "predication.settling.cofinality.countable" as const,
});

/** Uncountable cofinality witness. */
export const uncountableSettlingCofinality: UncountableSettlingCofinalityCarrier = Object.freeze({
  kind: "predication.settling.cofinality.uncountable" as const,
});

/** Judge whether a stage ordinal (or stage) is finite. */
export function judgeFinitudeOfSettlingStage(stage: SettlingStageOrdinalCarrier | SettlingStage): SettlingFiniteStageJudgment {
  const stageOrdinal = stage.kind === "predication.settling.stage" ? stage.ordinal : stage;
  const reading = finiteOrdinalJudgment(stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({ kind: "predication.settling.finiteStage:witness" as const, stage: stageOrdinal, value: reading.value })
    : Object.freeze({ kind: "predication.settling.finiteStage-obstruction" as const, stage: stageOrdinal, reading });
}

/** Whether two stage ordinals are both finite and equal in value. */
export function settlingStageOrdinalCoincidenceHolds(left: SettlingStageOrdinalCarrier, right: SettlingStageOrdinalCarrier): boolean {
  const leftFinite = judgeFinitudeOfSettlingStage(left);
  const rightFinite = judgeFinitudeOfSettlingStage(right);
  return leftFinite.kind === "predication.settling.finiteStage:witness"
    && rightFinite.kind === "predication.settling.finiteStage:witness"
    && natEqual(leftFinite.value, rightFinite.value);
}
