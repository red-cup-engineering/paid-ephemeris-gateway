/**
 * studying — KnowingEntry → KnowingTrace: the trace reading, nested under introducing.
 *
 * Second derivative. Studying opens the entry `introducing` read through its settling
 * trace — relating's `readIncrementsOfSettlementFiltration` over the settlement the
 * entry holds. The trace is the whole derivation that built the settlement (the
 * ≤_k-monotone closure orbit's increments). Reads only @emsenn/relating.
 * Its codomain (KnowingTrace) is the domain of the next steps, `explaining` and
 * `learning`.
 */
import { readIncrementsOfSettlementFiltration, freeSettlementFiltration, type SettlingIncrement } from "@emsenn/relating";
import type { KnowingEntry } from "../introducing.mjs";

/** Knowing's trace carrier: the entry opened through its settling-orbit increments. */
export interface KnowingTrace {
  readonly kind: "knowing.trace";
  readonly entry: KnowingEntry;
  readonly trace: readonly SettlingIncrement[];
}

/** study : KnowingEntry → KnowingTrace. */
export function studying(entry: KnowingEntry): KnowingTrace {
  return Object.freeze({
    kind: "knowing.trace" as const,
    entry,
    trace: Object.freeze([...readIncrementsOfSettlementFiltration(freeSettlementFiltration(entry.settlement))]),
  });
}
