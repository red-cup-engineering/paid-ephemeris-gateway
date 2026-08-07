/**
 * settling/filtration — assemble a settlement filtration from stage inputs.
 *
 * Normalizes a sequence of stage inputs into a `SettlementFiltration`, enforcing
 * that stage 0 is initial and that the designated cells never shrink stage to
 * stage (monotone settling — a stage may add cells, never drop them).
 */
import { relativeCellComplement } from "./cell-set.mjs";
import { countableSettlingCofinality } from "./ordinal.mjs";
import type {
  SettlementFiltration,
  SettlingCofinalityCarrier,
  SettlingStage,
  SettlingStageInputCarrier,
} from "./object.mjs";

/** Build a settlement filtration from stage inputs and an optional cofinality. */
export function settlementFiltration(
  stages: readonly SettlingStageInputCarrier[],
  cofinality: SettlingCofinalityCarrier = countableSettlingCofinality,
): SettlementFiltration {
  if (stages.length === 0) throw new TypeError("settlementFiltration: need at least one stage");
  if (stages[0]!.shape.kind !== "predication.settling.stage.initial") throw new TypeError("settlementFiltration: stage 0 must be initial");
  const normalized: SettlingStage[] = [];
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const designated = stage.designated.cells;
    if (index > 0) {
      const previous = stages[index - 1]!.designated.cells.cells;
      if (relativeCellComplement(previous, designated.cells).length > 0) throw new TypeError(`settlementFiltration: stage ${index} drops cells`);
    }
    normalized.push(Object.freeze({
      kind: "predication.settling.stage" as const,
      ordinal: stage.ordinal,
      shape: stage.shape,
      designated,
    }));
  }
  return Object.freeze({
    kind: "predication.settlement.filtration" as const,
    stages: Object.freeze(normalized),
    cofinality,
  });
}
