import { cellSet, type Cell } from "../../../../articulating/carriers.mjs";
import { isLimitOrdinal, isZeroOrdinal } from "./closure.mjs";
import { cellSetRepresentatives } from "./cell-set.mjs";
import {
  initialSettlingStageOrdinal,
  successorSettlingStageOrdinal,
} from "./ordinal.mjs";
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

/** Constructs the initial stage shape for the given stage ordinal carrier. */
export const settlingInitialStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingInitialStage => Object.freeze({
  kind: "predication.settling.stage.initial" as const,
  ordinal,
});

/** Constructs the successor stage shape for the given stage ordinal carrier. */
export const settlingSuccessorStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingSuccessorStage => Object.freeze({
  kind: "predication.settling.stage.successor" as const,
  ordinal,
});

/** Constructs the limit stage shape for the given stage ordinal carrier. */
export const settlingLimitStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingLimitStage => Object.freeze({
  kind: "predication.settling.stage.limit" as const,
  ordinal,
});

/**
 * Selects the stage shape from the stage ordinal: initial for zero, limit for a
 * limit ordinal, otherwise successor.
 */
export const readShapeOfSettlingStageOrdinal = (ordinal: SettlingStageOrdinalCarrier): SettlingStageShape => {
  if (isZeroOrdinal(ordinal.ordinal)) return settlingInitialStageShape(ordinal);
  if (isLimitOrdinal(ordinal.ordinal)) return settlingLimitStageShape(ordinal);
  return settlingSuccessorStageShape(ordinal);
};

/**
 * Constructs a designated-cells carrier from a cell list, deduplicating
 * coincident cells into a CellSet.
 */
export const settlingStageDesignatedCellSet = (designated: readonly Cell[]): SettlingStageDesignatedCellsCarrier => Object.freeze({
  kind: "predication.settling.stageDesignatedCells" as const,
  cells: cellSet(cellSetRepresentatives(designated)),
});

/**
 * Assembles a stage input from an ordinal carrier, designated-cells carrier,
 * and shape, defaulting the shape to the one derived from the ordinal.
 */
export const settlingStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: SettlingStageDesignatedCellsCarrier,
  shape: SettlingStageShape = readShapeOfSettlingStageOrdinal(ordinal),
): SettlingStageInputCarrier => Object.freeze({
  kind: "predication.settling.stageInput" as const,
  ordinal,
  shape,
  designated,
});

/**
 * Constructs the initial stage input from a list of designated cells, using the
 * zero-ordinal carrier and initial shape.
 */
export const initialSettlingStageInput = (designated: readonly Cell[]): SettlingStageInputCarrier => {
  const ordinal = initialSettlingStageOrdinal;
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingInitialStageShape(ordinal));
};

/**
 * Constructs a successor stage input following the given previous stage, with
 * the successor of its ordinal and the supplied designated cells.
 */
export const successorSettlingStageInput = (
  previous: SettlingStageInputCarrier | SettlingStage,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  const ordinal = successorSettlingStageOrdinal(previous.ordinal);
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingSuccessorStageShape(ordinal));
};

/**
 * Constructs a limit stage input at the given ordinal carrier with the supplied
 * designated cells; throws if the ordinal is not a limit ordinal.
 */
export const limitSettlingStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  if (!isLimitOrdinal(ordinal.ordinal)) throw new TypeError("limitSettlingStageInput: expected limit ordinal");
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingLimitStageShape(ordinal));
};

export const isSettlingLimitStage = (stage: SettlingStage): stage is SettlingStage & { readonly shape: SettlingLimitStage } =>
  stage.shape.kind === "predication.settling.stage.limit";
