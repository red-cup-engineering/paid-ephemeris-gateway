/**
 * settling/first-cohomology — the degree-1 cohomology of a settling.
 *
 * One generator per cell added at a non-Scott limit-stage firing — the obstruction
 * to Scott-continuity of the closure.
 */
import { count } from "./analysis/exact-number.mjs";
import { rankVanishing } from "./cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type { SettlementFiltration, SettlingFirstCohomology } from "./object.mjs";

/** The degree-1 cohomology of a settlement filtration. */
export function readFirstCohomologyOfSettlementFiltration(carrier: SettlementFiltration): SettlingFirstCohomology {
  const generators = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({
    kind: "predication.settling.firstCohomology" as const,
    generators,
    rank: count(generators),
    degree: 1 as const,
    vanishing: rankVanishing(count(generators)),
  });
}
