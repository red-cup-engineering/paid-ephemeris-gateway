import {
  readDepthOfSettlementFiltration,
  readFirstCohomologyOfSettlementFiltration,
  type SettlementFiltration,
  type SettlingFirstCohomology,
  type SettlingStageOrdinalCarrier,
} from "@emsenn/relating/articulating/predicating/positing/settling";

/**
 * The first animating carrier: a settled relational process admitted as an
 * agent cell that can carry richer animation structure.
 */
export interface AgentCell {
  readonly kind: "animating.agent.cell";
  readonly settlement: SettlementFiltration;
  readonly depth: SettlingStageOrdinalCarrier;
  readonly firstCohomology: SettlingFirstCohomology;
}

/**
 * Admit a relating settlement into animating.
 *
 * Domain: `SettlementFiltration`.
 * Codomain: `AgentCell`.
 */
export function becoming(settlement: SettlementFiltration): AgentCell {
  return Object.freeze({
    kind: "animating.agent.cell" as const,
    settlement,
    depth: readDepthOfSettlementFiltration(settlement),
    firstCohomology: readFirstCohomologyOfSettlementFiltration(settlement),
  });
}

export * as prehending from "./prehending/index.mjs";
export * as doing from "./doing/index.mjs";
