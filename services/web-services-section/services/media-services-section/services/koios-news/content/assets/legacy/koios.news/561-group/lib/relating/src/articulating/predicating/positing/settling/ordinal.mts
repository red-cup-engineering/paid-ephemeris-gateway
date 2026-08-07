import { natEqual } from "../../../../articulating/carriers.mjs";
import {
  finiteOrdinalJudgment,
  limitOrdinal,
  successorOrdinal,
  zeroOrdinal,
  type Ordinal,
  type OrdinalLabel,
} from "./closure.mjs";
import type {
  CountableSettlingCofinalityCarrier,
  SettlingFiniteStageJudgment,
  SettlingStage,
  SettlingStageOrdinalCarrier,
  UncountableSettlingCofinalityCarrier,
} from "./object.mjs";
import type { Natural } from "../../../../articulating/carriers.mjs";

/**
 * Stage ordinal carrier for the initial stage, wrapping the zero ordinal.
 */
export const initialSettlingStageOrdinal: SettlingStageOrdinalCarrier = Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: zeroOrdinal,
});

/** Wraps an arbitrary ordinal as a settling stage ordinal carrier. */
export const settlingStageOrdinal = (ordinal: Ordinal): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal,
});

/**
 * Constructs the stage ordinal carrier for the successor of the given stage's
 * ordinal.
 */
export const successorSettlingStageOrdinal = (stage: SettlingStageOrdinalCarrier): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: successorOrdinal(stage.ordinal),
});

/**
 * Constructs the stage ordinal carrier for a limit ordinal built from the given
 * label and fundamental sequence.
 */
export const limitSettlingStageOrdinal = (
  label: OrdinalLabel,
  fundamentalSequence: (n: Natural) => Ordinal,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(limitOrdinal(label, fundamentalSequence));

/** Countable cofinality witness for a settling. */
export const countableSettlingCofinality: CountableSettlingCofinalityCarrier = Object.freeze({
  kind: "predication.settling.cofinality.countable" as const,
});

/** Uncountable cofinality witness for a settling. */
export const uncountableSettlingCofinality: UncountableSettlingCofinalityCarrier = Object.freeze({
  kind: "predication.settling.cofinality.uncountable" as const,
});

/**
 * Judges whether the given stage ordinal (or stage) is finite, returning a
 * witness with its natural value or an obstruction carrying the finite-ordinal
 * reading.
 */
export function judgeFinitudeOfSettlingStage(stage: SettlingStageOrdinalCarrier | SettlingStage): SettlingFiniteStageJudgment {
  const stageOrdinal = stage.kind === "predication.settling.stage" ? stage.ordinal : stage;
  const reading = finiteOrdinalJudgment(stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({
      kind: "predication.settling.finiteStage:witness" as const,
      stage: stageOrdinal,
      value: reading.value,
    })
    : Object.freeze({
      kind: "predication.settling.finiteStage-obstruction" as const,
      stage: stageOrdinal,
      reading,
    });
}

/**
 * Returns whether two stage ordinal carriers are both finite and equal in
 * natural value.
 */
export function settlingStageOrdinalCoincidenceHolds(left: SettlingStageOrdinalCarrier, right: SettlingStageOrdinalCarrier): boolean {
  const leftFinite = judgeFinitudeOfSettlingStage(left);
  const rightFinite = judgeFinitudeOfSettlingStage(right);
  return leftFinite.kind === "predication.settling.finiteStage:witness"
    && rightFinite.kind === "predication.settling.finiteStage:witness"
    && natEqual(leftFinite.value, rightFinite.value);
}
