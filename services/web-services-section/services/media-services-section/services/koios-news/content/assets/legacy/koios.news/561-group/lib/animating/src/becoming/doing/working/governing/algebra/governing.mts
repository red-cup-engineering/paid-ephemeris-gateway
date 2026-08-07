import {
  readClassificationOfSettlementFiltration,
  readDepthFiniteStageJudgmentOfSettlementFiltration,
  type SettlingClassification,
  type SettlingFiniteStageJudgment,
} from "@emsenn/relating/articulating/predicating/positing/settling";
import type { AgentPresheaf } from "../../algebra/working.mjs";

/**
 * The governed filtration: an agent presheaf bounded by the settlement
 * classification that makes it individual rather than merely agential.
 */
export interface AgentFiltration {
  readonly kind: "animating.agent.filtration";
  readonly presheaf: AgentPresheaf;
  readonly classification: SettlingClassification;
  readonly finiteDepth: SettlingFiniteStageJudgment;
}

/**
 * Govern an agent presheaf into an agent filtration.
 *
 * Domain: `AgentPresheaf`.
 * Codomain: `AgentFiltration`.
 */
export function governing(presheaf: AgentPresheaf): AgentFiltration {
  const settlement = presheaf.site.point.settlement;
  return Object.freeze({
    kind: "animating.agent.filtration" as const,
    presheaf,
    classification: readClassificationOfSettlementFiltration(settlement),
    finiteDepth: readDepthFiniteStageJudgmentOfSettlementFiltration(settlement),
  });
}
