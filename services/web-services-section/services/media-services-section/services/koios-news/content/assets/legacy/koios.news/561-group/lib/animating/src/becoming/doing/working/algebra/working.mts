import { readFiringsOfSettlementFiltration, type SettlingIncrement } from "@emsenn/relating/articulating/predicating/positing/settling";
import type { AgentSite } from "../../algebra/doing.mjs";

/**
 * The working presheaf: an agent site stabilized into a bearer of work.
 */
export interface AgentPresheaf {
  readonly kind: "animating.agent.presheaf";
  readonly site: AgentSite;
  readonly firings: readonly SettlingIncrement[];
}

/**
 * Stabilize agential capacity into an agent presheaf.
 *
 * Domain: `AgentSite`.
 * Codomain: `AgentPresheaf`.
 */
export function working(site: AgentSite): AgentPresheaf {
  return Object.freeze({
    kind: "animating.agent.presheaf" as const,
    site,
    firings: Object.freeze([...readFiringsOfSettlementFiltration(site.point.settlement)]),
  });
}
