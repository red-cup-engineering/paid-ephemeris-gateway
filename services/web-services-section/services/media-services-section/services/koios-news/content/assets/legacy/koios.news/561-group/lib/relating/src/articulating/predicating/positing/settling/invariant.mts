import { cellSet, predicationCellCoincidenceHolds } from "../../../../articulating/carriers.mjs";
import { cellSetRepresentatives } from "./cell-set.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type {
  SettlementFiltration,
  SettlingClosureEquivalenceJudgment,
  SettlingClosureInvariant,
} from "./object.mjs";

/**
 * The closure invariant of a settling: one step per non-Scott limit-stage
 * firing recording the source stage and its deduplicated added cells.
 */
export function readClosureInvariantOfSettlementFiltration(carrier: SettlementFiltration): SettlingClosureInvariant {
  const nonScottAdditions = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.map((increment) => Object.freeze({
    kind: "predication.settling.closureInvariantStep" as const,
    stage: increment.source,
    additions: cellSet(cellSetRepresentatives(increment.added.cells)),
  })));
  return Object.freeze({
    kind: "predication.settling.closureInvariant" as const,
    nonScottAdditions,
  });
}

/**
 * Compares two settlings by closure invariant, returning a witness when their
 * non-Scott additions match stage-for-stage and cell-for-cell up to cell
 * coincidence, otherwise an obstruction.
 */
export function readClosureEquivalenceOfSettlementFiltration(left: SettlementFiltration, right: SettlementFiltration): SettlingClosureEquivalenceJudgment {
  const leftInvariant = readClosureInvariantOfSettlementFiltration(left);
  const rightInvariant = readClosureInvariantOfSettlementFiltration(right);
  const leftAdditions = leftInvariant.nonScottAdditions;
  const rightAdditions = rightInvariant.nonScottAdditions;
  const equivalent = leftAdditions.length === rightAdditions.length
    && leftAdditions.every((leftStage, index) => {
      const rightStage = rightAdditions[index]!;
      return leftStage.additions.cells.length === rightStage.additions.cells.length
        && leftStage.additions.cells.every((leftCell) => rightStage.additions.cells.some((rightCell) => predicationCellCoincidenceHolds(leftCell, rightCell)));
    });
  return equivalent
    ? Object.freeze({
      kind: "predication.settling.closureEquivalence:witness" as const,
      left: leftInvariant,
      right: rightInvariant,
    })
    : Object.freeze({
      kind: "predication.settling.closureEquivalence-obstruction" as const,
      left: leftInvariant,
      right: rightInvariant,
    });
}
