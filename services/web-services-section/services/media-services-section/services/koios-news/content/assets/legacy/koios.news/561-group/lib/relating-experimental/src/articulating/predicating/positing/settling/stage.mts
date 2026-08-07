/**
 * settling/stage — settling-stage shapes and inputs.
 *
 * Selects the stage shape from its ordinal (initial for zero, limit for a limit
 * ordinal, else successor), builds designated-cell carriers (deduped to a
 * CellSet), and assembles the initial / successor / limit stage inputs the
 * filtration normalizes.
 */
import { cellSet, type Cell } from "../../predication.mjs";
import { isLimitOrdinal, isZeroOrdinal } from "./closure.mjs";
import { cellSetRepresentatives } from "./cell-set.mjs";
import { initialSettlingStageOrdinal, successorSettlingStageOrdinal } from "./ordinal.mjs";
import type {
  SettlingInitialStage,
  SettlingLimitStage,
  SettlingStage,
  SettlingStageDesignatedCellsCarrier,
  SettlingStageInputCarrier,
  SettlingStageOrdinalCarrier,
  SettlingStageShape,
  SettlingSuccessorStage,
} from "./object.mjs";

/** The initial stage shape. */
export const settlingInitialStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingInitialStage =>
  Object.freeze({ kind: "predication.settling.stage.initial" as const, ordinal });

/** The successor stage shape. */
export const settlingSuccessorStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingSuccessorStage =>
  Object.freeze({ kind: "predication.settling.stage.successor" as const, ordinal });

/** The limit stage shape. */
export const settlingLimitStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingLimitStage =>
  Object.freeze({ kind: "predication.settling.stage.limit" as const, ordinal });

/** The stage shape selected from the stage ordinal. */
export const readShapeOfSettlingStageOrdinal = (ordinal: SettlingStageOrdinalCarrier): SettlingStageShape => {
  if (isZeroOrdinal(ordinal.ordinal)) return settlingInitialStageShape(ordinal);
  if (isLimitOrdinal(ordinal.ordinal)) return settlingLimitStageShape(ordinal);
  return settlingSuccessorStageShape(ordinal);
};

/** A designated-cells carrier from a cell list (deduped into a CellSet). */
export const settlingStageDesignatedCellSet = (designated: readonly Cell[]): SettlingStageDesignatedCellsCarrier =>
  Object.freeze({ kind: "predication.settling.stageDesignatedCells" as const, cells: cellSet(cellSetRepresentatives(designated)) });

/** A stage input from an ordinal carrier, designated cells, and (default) shape. */
export const settlingStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: SettlingStageDesignatedCellsCarrier,
  shape: SettlingStageShape = readShapeOfSettlingStageOrdinal(ordinal),
): SettlingStageInputCarrier => Object.freeze({ kind: "predication.settling.stageInput" as const, ordinal, shape, designated });

/** The initial stage input from designated cells. */
export const initialSettlingStageInput = (designated: readonly Cell[]): SettlingStageInputCarrier => {
  const ordinal = initialSettlingStageOrdinal;
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingInitialStageShape(ordinal));
};

/** A successor stage input following a previous stage. */
export const successorSettlingStageInput = (
  previous: SettlingStageInputCarrier | SettlingStage,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  const ordinal = successorSettlingStageOrdinal(previous.ordinal);
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingSuccessorStageShape(ordinal));
};

/** A limit stage input at a limit ordinal; throws if the ordinal is not a limit. */
export const limitSettlingStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  if (!isLimitOrdinal(ordinal.ordinal)) throw new TypeError("limitSettlingStageInput: expected limit ordinal");
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingLimitStageShape(ordinal));
};

/** Whether a stage is a limit stage. */
export const isSettlingLimitStage = (stage: SettlingStage): stage is SettlingStage & { readonly shape: SettlingLimitStage } =>
  stage.shape.kind === "predication.settling.stage.limit";
