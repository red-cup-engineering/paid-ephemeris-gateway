// rollover — day/week finalization, computed LAZILY on first read of a new day, no cron (design
// §5.2, build-report item 3). `ensureRollover` takes `today` as a PARAMETER — it never calls
// dates.mts's `todayUTC()` itself — so every code path here is a pure function of (store contents,
// injected today), independently testable with a fixture store and a fixture date string, exactly
// what "day-rollover boon computation with injected clock" asks for. server.mts is the only caller,
// and it's the only place that computes `today` from the real clock and passes it in.
//
// Async against `Store` (server/store-factory.mts's composed surface: @red-cup-engineering/
// footing's run/score/scored-lock store plus this app's own ledger/boon extension) so this runs
// identically against either backend; every store call below is awaited, sequentially, which also
// keeps concurrent JSONL appends against the same object serialized within a single request.
//
// Two independent finalizations, both idempotent (safe to call on every request):
//   1. finalizeCompletedDays  — any past date with no reward-ledger entry yet gets one written
//      (design §5.3's daily #1 accrual, or the explicit "nobody eligible" marker).
//   2. finalizeCompletedWeeks — any fully-elapsed ISO week with no boons.jsonl entry yet gets its
//      top-3 computed and written, applying to the week that follows it (design §5.2).

import type { Store } from "#server/store-factory.mts";
import { isoWeekStartUTC, nextWeekStartUTC, weekDatesUTC } from "#server/dates.mts";
import { weeklyTotals } from "#server/leaderboard.mts";
import { rankLeaderboard } from "@red-cup-engineering/footing/leaderboard";
import type { ScoreLike } from "@red-cup-engineering/footing/leaderboard";
import { computeWeekBoons } from "#server/boons.mts";
import { buildDailyAccrual } from "#server/reward-hook.mts";

export async function ensureRollover(store: Store, today: string): Promise<void> {
  await finalizeCompletedDays(store, today);
  await finalizeCompletedWeeks(store, today);
}

async function knownDates(store: Store): Promise<string[]> {
  const [runDates, scoreDates] = await Promise.all([store.listRunDates(), store.listScoreDates()]);
  return [...new Set([...runDates, ...scoreDates])].sort();
}

async function scoresAsLike(store: Store, date: string): Promise<ScoreLike[]> {
  return (await store.readScoresForDate(date)).map((s) => ({
    runId: s.runId,
    actor: s.actor,
    score: s.score,
    endedAtTick: s.endedAtTick,
    submittedAt: s.submittedAt,
  }));
}

async function finalizeCompletedDays(store: Store, today: string): Promise<void> {
  for (const date of await knownDates(store)) {
    if (!(date < today)) continue; // only a day that has fully passed gets finalized
    const ref = `accrue-ruinfold-${date.replaceAll("-", "")}`;
    if (await store.hasLedgerRef(ref)) continue; // idempotent — already finalized

    const ranked = rankLeaderboard(await scoresAsLike(store, date));
    const winner = ranked[0]?.actor ?? null;

    await store.appendLedger({ ...buildDailyAccrual(date, winner), recordedAt: today });
  }
}

async function finalizeCompletedWeeks(store: Store, today: string): Promise<void> {
  const dates = await knownDates(store);
  if (dates.length === 0) return;

  const currentWeekStart = isoWeekStartUTC(today);
  let weekStart = isoWeekStartUTC(dates[0] as string);

  while (weekStart < currentWeekStart) {
    const appliesWeekStart = nextWeekStartUTC(weekStart);
    if (!(await store.hasBoonsForWeek(appliesWeekStart))) {
      const weekDates = weekDatesUTC(weekStart);
      const byDate = new Map<string, ScoreLike[]>();
      for (const d of weekDates) byDate.set(d, await scoresAsLike(store, d));
      const totals = weeklyTotals(byDate, weekDates);
      const awards = computeWeekBoons(totals);

      if (awards.length === 0) {
        // A marker, so hasBoonsForWeek() is true next pass and we never rescan this week forever.
        await store.appendBoon({
          actor: null,
          weeklyScore: 0,
          rank: 0,
          boonName: null,
          edge: {},
          sourceWeekStart: weekStart,
          appliesWeekStart,
          computedAt: today,
          empty: true,
        });
      } else {
        for (const award of awards) {
          await store.appendBoon({ ...award, sourceWeekStart: weekStart, appliesWeekStart, computedAt: today });
        }
      }
    }
    weekStart = nextWeekStartUTC(weekStart);
  }
}
