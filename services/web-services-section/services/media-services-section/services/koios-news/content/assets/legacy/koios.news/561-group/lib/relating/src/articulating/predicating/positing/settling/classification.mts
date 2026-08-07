import { natIsZero } from "../../../../articulating/carriers.mjs";
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  type ClosureRegime,
} from "./closure.mjs";
import { readFiringsOfSettlementFiltration } from "./increment.mjs";
import { readNonScottFiringsOfSettlementFiltration, readLimitStagesOfSettlementFiltration } from "./limit.mjs";
import { judgeFinitudeOfSettlingStage } from "./ordinal.mjs";
import type {
  SettlementFiltration,
  SettlingClassification,
  SettlingFiniteStageJudgment,
  SettlingStageOrdinalCarrier,
} from "./object.mjs";

/** The sole mint site of the aperiodic regime. Aperiodicity (κ ≥ ω₁) is only
 *  ever declared into the system through the carrier's cofinality witness —
 *  same epistemic standing as an attestation; bounded iteration can witness
 *  only the stabilizing regimes, and its exhaustion is an obstruction. */
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

/**
 * The settling depth: the depth field of the settling's classification, i.e.
 * the ordinal of its last firing.
 */
export const readDepthOfSettlementFiltration = (carrier: SettlementFiltration): SettlingStageOrdinalCarrier => readClassificationOfSettlementFiltration(carrier).depth;

/**
 * The finite-stage judgment applied to a settling's depth: a witness with its
 * natural value when finite, otherwise an obstruction.
 */
export const readDepthFiniteStageJudgmentOfSettlementFiltration = (carrier: SettlementFiltration): SettlingFiniteStageJudgment =>
  judgeFinitudeOfSettlingStage(readDepthOfSettlementFiltration(carrier));
