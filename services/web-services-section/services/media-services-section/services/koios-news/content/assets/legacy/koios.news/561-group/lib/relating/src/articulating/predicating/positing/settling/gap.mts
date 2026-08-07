import { count } from "../../../../articulating/carriers.mjs";
import { rankIdentity, type RankIdentityJudgment } from "./cohomology.mjs";
import { readFirstCohomologyOfSettlementFiltration } from "./first-cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type { GradedGapCarrier, SettlementFiltration } from "./object.mjs";

/**
 * The graded gap of a settling: one loss per cell added at a non-Scott
 * limit-stage firing, with the loss count as a rank.
 */
export function readGradedGapOfSettlementFiltration(carrier: SettlementFiltration): GradedGapCarrier {
  const lost = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.gradedGapLoss" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({ kind: "predication.settling.gradedGap" as const, lost, rank: count(lost) });
}

/**
 * The rank-identity judgment comparing the first cohomology rank against the
 * graded gap rank for a settling.
 */
export const readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration = (carrier: SettlementFiltration): RankIdentityJudgment =>
  rankIdentity(readFirstCohomologyOfSettlementFiltration(carrier).rank, readGradedGapOfSettlementFiltration(carrier).rank);
