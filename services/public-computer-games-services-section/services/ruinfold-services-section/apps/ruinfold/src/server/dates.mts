// dates — ruinfold's OWN remaining date logic: the ISO-week helpers, which exist only for this
// app's weekly-boon rollover (rollover.mts/boons.mts) and stay local, out of
// @red-cup-engineering/footing's scope (see that package's README). Day-arithmetic
// (formatUTCDate/isValidDateStr/addDaysUTC/todayUTC) moved to footing/dates verbatim; these
// functions build on footing's addDaysUTC rather than re-implementing calendar math.

import { addDaysUTC } from "@red-cup-engineering/footing/dates";

// isoWeekStartUTC — the Monday (ISO 8601 week start) of the week containing dateStr.
export function isoWeekStartUTC(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  const isoWeekday = ((dt.getUTCDay() + 6) % 7) + 1; // JS getUTCDay(): Sun=0..Sat=6 -> ISO Mon=1..Sun=7
  return addDaysUTC(dateStr, -(isoWeekday - 1));
}

export function weekDatesUTC(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));
}

export function nextWeekStartUTC(weekStart: string): string {
  return addDaysUTC(weekStart, 7);
}
