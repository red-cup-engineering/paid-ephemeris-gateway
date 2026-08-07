import { readIncrementsOfSettlementFiltration, type SettlingIncrement } from "@emsenn/relating/articulating/predicating/positing/settling";
import type { AgentCell } from "../../index.mjs";

/**
 * The site produced by doing: an agent point opened through its settling trace.
 */
export interface AgentSite {
  readonly kind: "animating.agent.site";
  readonly point: AgentCell;
  readonly trace: readonly SettlingIncrement[];
}

/**
 * Predicate-like animation of an agent cell into an agent site.
 *
 * Domain: `AgentCell`.
 * Codomain: `AgentSite`.
 */
export function doing(cell: AgentCell): AgentSite {
  return Object.freeze({
    kind: "animating.agent.site" as const,
    point: cell,
    trace: Object.freeze([...readIncrementsOfSettlementFiltration(cell.settlement)]),
  });
}
