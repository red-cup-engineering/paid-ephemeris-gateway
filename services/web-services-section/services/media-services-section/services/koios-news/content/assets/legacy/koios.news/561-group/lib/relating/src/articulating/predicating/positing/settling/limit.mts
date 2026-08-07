import { count } from "../../../../articulating/carriers.mjs";
import { readFiringsOfSettlementFiltration } from "./increment.mjs";
import { isSettlingLimitStage } from "./stage.mjs";
import type {
  NonScottSettlingFiringsCarrier,
  SettlementFiltration,
  SettlingLimitStagesCarrier,
} from "./object.mjs";

/**
 * The limit stages of a settlement filtration: the limit-shaped stages and their
 * count as a rank.
 */
export const readLimitStagesOfSettlementFiltration = (carrier: SettlementFiltration): SettlingLimitStagesCarrier => {
  const stages = Object.freeze(carrier.stages.filter(isSettlingLimitStage));
  return Object.freeze({
    kind: "predication.settling.limitStages" as const,
    stages,
    rank: count(stages),
  });
};

/**
 * The non-Scott firings of a settling: cell-adding increments whose source is a
 * limit stage, with their count as a rank.
 */
export const readNonScottFiringsOfSettlementFiltration = (carrier: SettlementFiltration): NonScottSettlingFiringsCarrier => {
  const firings = Object.freeze(readFiringsOfSettlementFiltration(carrier).filter((increment) => isSettlingLimitStage(increment.source)));
  return Object.freeze({
    kind: "predication.settling.nonScottFirings" as const,
    firings,
    rank: count(firings),
  });
};
