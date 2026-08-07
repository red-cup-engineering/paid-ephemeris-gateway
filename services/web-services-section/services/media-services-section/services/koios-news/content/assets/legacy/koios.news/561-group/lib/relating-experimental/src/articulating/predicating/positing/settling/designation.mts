/**
 * settling/designation — the designated cells of a valuation.
 *
 * Every cell whose charge value is potential or stable, across all fibers.
 * Stable is retained so a held contradiction is not collapsed to falsity — the
 * paraconsistent stance: designation keeps both-affirmed-and-denied as present.
 */
import { chargeValue, sameChargeValue, valueOf } from "../bilattice-charge.mjs";
import type { Cell } from "../../predication.mjs";
import type { Valuation } from "../fiber.mjs";

/** The cells designated by a valuation (charge potential or stable). */
export function readDesignatedCellsOfValuation(valuation: Valuation): readonly Cell[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) =>
    fiber.assignments
      .filter((assignment) => {
        const value = valueOf(assignment.charge);
        return sameChargeValue(value, chargeValue("potential")) || sameChargeValue(value, chargeValue("stable"));
      })
      .map((assignment) => assignment.cell)));
}
