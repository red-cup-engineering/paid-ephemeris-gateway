import { predicationCellCoincidenceHolds, type Cell } from "../../../../articulating/carriers.mjs";

export const cellSetRepresentatives = (values: readonly Cell[]): readonly Cell[] => {
  const out: Cell[] = [];
  for (const cell of values) if (!out.some((item) => predicationCellCoincidenceHolds(item, cell))) out.push(cell);
  return Object.freeze(out);
};

export const relativeCellComplement = (left: readonly Cell[], right: readonly Cell[]): readonly Cell[] =>
  Object.freeze(left.filter((item) => !right.some((other) => predicationCellCoincidenceHolds(item, other))));
