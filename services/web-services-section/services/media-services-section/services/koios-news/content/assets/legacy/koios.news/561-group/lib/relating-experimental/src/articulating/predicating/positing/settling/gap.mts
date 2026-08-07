/**
 * settling/gap — the graded gap of a settling and its H¹-rank identity.
 *
 * The cells lost at non-Scott firings; the graded-gap rank equals the first
 * cohomology rank (each lost cell is a cohomology generator).
 */
import { rankIdentity, type RankIdentityJudgment } from "./cohomology.mjs";
import { count } from "./analysis/exact-number.mjs";
import { readFirstCohomologyOfSettlementFiltration } from "./first-cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type { GradedGapCarrier, SettlementFiltration } from "./object.mjs";

/** The graded gap: one loss per cell added at a non-Scott firing, with its count. */
export function readGradedGapOfSettlementFiltration(carrier: SettlementFiltration): GradedGapCarrier {
  const lost = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.gradedGapLoss" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({ kind: "predication.settling.gradedGap" as const, lost, rank: count(lost) });
}

/** The rank identity: first-cohomology rank equals graded-gap rank. */
export const readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration = (carrier: SettlementFiltration): RankIdentityJudgment =>
  rankIdentity(readFirstCohomologyOfSettlementFiltration(carrier).rank, readGradedGapOfSettlementFiltration(carrier).rank);
