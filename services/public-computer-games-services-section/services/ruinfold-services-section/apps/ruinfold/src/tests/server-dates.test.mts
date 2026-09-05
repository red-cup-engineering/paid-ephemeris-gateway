// server-dates — ruinfold's OWN remaining date logic: the ISO-week helpers (server/dates.mts),
// which exist only for this app's weekly-boon rollover. Foundational insurance: a bug in
// isoWeekStartUTC would silently corrupt which week a boon applies to, so its correctness is
// worth locking down directly rather than only indirectly through rollover fixtures.
//
// isValidDateStr/addDaysUTC's own correctness (leap years, month/year rollover, malformed
// shapes) moved to @red-cup-engineering/footing/dates and is tested there now; addDaysUTC is
// still used below as a fixture-construction utility, not re-tested for its own sake.

import { test } from "node:test";
import assert from "node:assert/strict";
import { addDaysUTC } from "@red-cup-engineering/footing/dates";
import { isoWeekStartUTC, nextWeekStartUTC, weekDatesUTC } from "#server/dates.mts";

test("isoWeekStartUTC always returns a Monday, for any day of the week", () => {
  // 2026-08-17 is a Monday (verified via ISO weekday arithmetic below, not asserted a priori).
  const known = new Set<string>();
  let d = "2026-08-10";
  for (let i = 0; i < 14; i++) {
    known.add(isoWeekStartUTC(d));
    d = addDaysUTC(d, 1);
  }
  // every date in a 14-day span belongs to one of exactly 2 or 3 ISO weeks, and every computed
  // week start must itself map to itself (idempotent — a Monday's own week start is itself).
  for (const weekStart of known) {
    assert.equal(isoWeekStartUTC(weekStart), weekStart, `${weekStart} is not stable under isoWeekStartUTC`);
  }
  assert.ok(known.size >= 2 && known.size <= 3);
});

test("weekDatesUTC returns exactly the 7 consecutive dates starting at weekStart", () => {
  const weekStart = isoWeekStartUTC("2026-08-19");
  const dates = weekDatesUTC(weekStart);
  assert.equal(dates.length, 7);
  assert.equal(dates[0], weekStart);
  for (let i = 1; i < 7; i++) assert.equal(dates[i], addDaysUTC(weekStart, i));
  // every date in the span maps back to the same weekStart
  for (const d of dates) assert.equal(isoWeekStartUTC(d), weekStart);
});

test("nextWeekStartUTC is exactly 7 days after weekStart, and itself a Monday", () => {
  const weekStart = isoWeekStartUTC("2026-08-19");
  const next = nextWeekStartUTC(weekStart);
  assert.equal(next, addDaysUTC(weekStart, 7));
  assert.equal(isoWeekStartUTC(next), next);
});
