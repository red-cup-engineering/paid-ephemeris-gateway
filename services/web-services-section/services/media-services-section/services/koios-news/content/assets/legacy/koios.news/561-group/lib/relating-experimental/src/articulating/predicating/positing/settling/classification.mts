/**
 * settling/classification — the regime, depth, and finitude of a settling.
 *
 * Aperiodicity (κ ≥ ω₁) is only ever declared through the carrier's cofinality
 * witness — bounded iteration witnesses only the stabilizing regimes (finite,
 * Scott, transfinite); its exhaustion is an obstruction, not an aperiodicity claim.
 */
import { natIsZero } from "./analysis/exact-number.mjs";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, type ClosureRegime } from "./closure.mjs";
import { readFiringsOfSettlementFiltration } from "./increment.mjs";
import { readNonScottFiringsOfSettlementFiltration, readLimitStagesOfSettlementFiltration } from "./limit.mjs";
import { judgeFinitudeOfSettlingStage } from "./ordinal.mjs";
import type { SettlementFiltration, SettlingClassification, SettlingFiniteStageJudgment, SettlingStageOrdinalCarrier } from "./object.mjs";

/** The classification of a settling: depth, regime, cofinality, limit stages, non-Scott firings. */
export function readClassificationOfSettlementFiltration(carrier: SettlementFiltration): SettlingClassification {
  const firingStages = readFiringsOfSettlementFiltration(carrier);
  const depth = firingStages.length ? firingStages[firingStages.length - 1]!.stage : carrier.stages[0]!.ordinal;
  const limitStages = readLimitStagesOfSettlementFiltration(carrier);
  const nonScottFirings = readNonScottFiringsOfSettlementFiltration(carrier);
  const regime: ClosureRegime = natIsZero(nonScottFirings.rank)
    ? (natIsZero(limitStages.rank) ? finiteClosureRegime : scottClosureRegime)
    : (carrier.cofinality.kind === "predication.settling.cofinality.uncountable" ? aperiodicClosureRegime : transfiniteClosureRegime);
  return Object.freeze({
    kind: "predication.settling.classification" as const,
    depth,
    regime,
    cofinality: carrier.cofinality,
    limitStages,
    nonScottFirings,
  });
}

/** The settling depth: the ordinal of its last firing. */
export const readDepthOfSettlementFiltration = (carrier: SettlementFiltration): SettlingStageOrdinalCarrier => readClassificationOfSettlementFiltration(carrier).depth;

/** The finite-stage judgment on a settling's depth. */
export const readDepthFiniteStageJudgmentOfSettlementFiltration = (carrier: SettlementFiltration): SettlingFiniteStageJudgment =>
  judgeFinitudeOfSettlingStage(readDepthOfSettlementFiltration(carrier));
