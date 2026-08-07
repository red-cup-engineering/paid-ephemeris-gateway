/**
 * settling/cell-set — cell-set representatives and relative complement.
 *
 * Small set operations on cells under structural cell coincidence: dedupe to
 * representatives, and the cells of one list not coincident with any in another.
 */
import { cellCoincides, type Cell } from "../../predication.mjs";

/** The coincidence-deduped representatives of a cell list. */
export const cellSetRepresentatives = (values: readonly Cell[]): readonly Cell[] => {
  const out: Cell[] = [];
  for (const cell of values) if (!out.some((item) => cellCoincides(item, cell))) out.push(cell);
  return Object.freeze(out);
};

/** The cells of `left` not coincident with any cell of `right`. */
export const relativeCellComplement = (left: readonly Cell[], right: readonly Cell[]): readonly Cell[] =>
  Object.freeze(left.filter((item) => !right.some((other) => cellCoincides(item, other))));
