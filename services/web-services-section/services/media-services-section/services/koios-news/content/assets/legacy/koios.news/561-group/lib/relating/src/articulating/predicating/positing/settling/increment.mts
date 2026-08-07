import { cellSet } from "../../../../articulating/carriers.mjs";
import { relativeCellComplement } from "./cell-set.mjs";
import type { SettlementFiltration, SettlingIncrement } from "./object.mjs";

/**
 * The per-stage increments of a settling: for each stage, the cells added
 * relative to the previous stage (all designated cells at stage 0).
 */
export function readIncrementsOfSettlementFiltration(carrier: SettlementFiltration): readonly SettlingIncrement[] {
  return Object.freeze(carrier.stages.map((stage, index) => Object.freeze({
    kind: "predication.settling.increment" as const,
    stage: stage.ordinal,
    source: stage,
    added: cellSet(index === 0 ? stage.designated.cells : relativeCellComplement(stage.designated.cells, carrier.stages[index - 1]!.designated.cells)),
  })));
}

/**
 * The settling increments that actually add cells: the increments whose added
 * CellSet is non-empty.
 */
export const readFiringsOfSettlementFiltration = (carrier: SettlementFiltration): readonly SettlingIncrement[] =>
  Object.freeze(readIncrementsOfSettlementFiltration(carrier).filter((increment) => increment.added.cells.length > 0));
