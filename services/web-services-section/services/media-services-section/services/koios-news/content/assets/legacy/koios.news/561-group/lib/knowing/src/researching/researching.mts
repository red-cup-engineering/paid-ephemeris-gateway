/**
 * researching — research : Memory → SettledResearch. The base morphism.
 *
 * A directed-relational-research act is `r : X → C Y` with C the settlement
 * comonad: `research` folds a memory's document relations into one settled topology
 * (the fold itself lives in `memory/settleMemoryFiltration`, the single place the
 * `induceRelation`/`relateRelations` pull-push is written) and reads its closure
 * regime. The codomain `SettledResearch` is the domain of the next morphism,
 * `introducing`. This function is the morphism; nothing wraps it.
 */
import {
  readClassificationOfSettlementFiltration,
  freeSettlementFiltration,
  type SettlementFiltrationGenerators,
} from "@emsenn/relating";
import { settleMemoryFiltration, type MemoryCarrier } from "../memory/index.mjs";

/** The settled codomain of `research`: the C-closed relation (stored as its
 *  GENERATORS; free to the full settlement on read) and its regime. */
export interface SettledResearch {
  readonly kind: "knowing.research.settled";
  readonly settlement: SettlementFiltrationGenerators;
  readonly regime: string;
  readonly onShell: boolean;
}

/** research : Memory → SettledResearch. Null only for an empty memory. */
export function research(memory: MemoryCarrier): SettledResearch | null {
  const folded = settleMemoryFiltration(memory);
  if (folded === null) return null;
  const regime = readClassificationOfSettlementFiltration(freeSettlementFiltration(folded)).regime.kind;
  return Object.freeze({
    kind: "knowing.research.settled" as const,
    settlement: folded,
    regime,
    onShell: regime !== "ordinal.closure.regime.aperiodic",
  });
}

/** A research act is certified when it is on-shell (factors through a C-coalgebra). */
export function certified(research: SettledResearch): boolean {
  return research.onShell;
}
