import { count, type Natural } from "../../../../articulating/carriers.mjs";

export interface RankedReadingsCarrier<Kind extends string, Reading> {
  readonly kind: Kind;
  readonly readings: readonly Reading[];
  readonly rank: Natural;
}

export const rankedReadings = <Kind extends string, Reading>(
  kind: Kind,
  readings: readonly Reading[],
): RankedReadingsCarrier<Kind, Reading> => Object.freeze({
  kind,
  readings: Object.freeze([...readings]),
  rank: count(readings),
});

export const selectRankedReadings = <Kind extends string, Reading, Selected extends Reading>(
  kind: Kind,
  readings: readonly Reading[],
  select: (reading: Reading) => reading is Selected,
): RankedReadingsCarrier<Kind, Selected> => rankedReadings(kind, readings.filter(select));
