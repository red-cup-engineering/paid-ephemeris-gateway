/**
 * `smoke` — face-spec item 7's required smoke test: "simulate 30 days of reviews via the
 * engine (injected timestamps) asserting territory grows then partially fogs on lapse."
 *
 * Drives the REAL engine (`src/srs.mts`, `src/lightcone.mts`), not the browser ports, against
 * the real compiled wing-one world (`data/world-weiqi.json`) — this is a behavioral check of
 * the engine's own light-cone/territory contract as the face relies on it, not a UI test.
 * Every `now` is an injected integer day (never `Date.now()`), matching the engine's own
 * determinism contract.
 *
 * Scenario: an "active" player gates every newly-reachable room, one single pass per day, for
 * the first 10 days (days 0-9), self-grading each gate-pass "Good" (S0 = 2.5 days — a normal
 * grade, not cherry-picked to be fragile). The dense wing-one door graph (~8 average degree
 * over 37 rooms) means this reaches full territory within the first few days — the light cone
 * doesn't drip open one room at a time, it floods, and that's a real property of THIS corpus's
 * graph, not a simulation artifact. The player then goes quiet for the rest of the window
 * (days 10-29): no further reviews at all, only time passing. Because nothing was reviewed a
 * second time, every card's stability stays at its single-review S0 = 2.5 days, so by day 29
 * (24-29 days after last review) essentially everything has decayed out of full/embers —
 * demonstrating fog at scale, not just at the margins. Asserted:
 *
 *   1. Revealed territory is monotonic — it never shrinks on any day, active or lapsed.
 *   2. The active phase actually grows the light cone beyond the wing's two always-open root
 *      rooms (proves the gate→light-cone→new-doors loop is really running, not stalled), and
 *      does so before the final day (a genuine earlier peak, not a coincidence at the end).
 *   3. By day 29, a FRESH light-cone computation finds fewer reachable rooms than that peak —
 *      doors beyond now-dim/fogged rooms drop out of the light cone, even though nothing was
 *      ever deleted from the world.
 *   4. Revealed territory at day 29 still exceeds day 29's reachable set — the fogged rooms
 *      are unreachable, not erased; their card/door data is untouched.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reviewCard } from '../../src/srs.mts';
import { computeLightCone, revealedTerritory } from '../../src/lightcone.mts';
import type { ReviewCard, World } from '../../src/types.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORLD_PATH = join(HERE, '..', '..', 'data', 'world-weiqi.json');

const ACTIVE_PHASE_LAST_DAY = 9;
const SIM_LAST_DAY = 29;
const GOOD_GRADE = 3; // an ordinary self-grade (S0=2.5 days), see header — not cherry-picked

test('30-day simulation: territory grows through active play, then partially fogs on lapse', async () => {
  const world = JSON.parse(await readFile(WORLD_PATH, 'utf8')) as World;
  assert.ok(world.rooms.length > 0, 'fixture sanity: world has rooms');
  assert.ok(world.cards.length > 0, 'fixture sanity: world has cards');

  const rootCount = world.rooms.filter((r) => !world.doors.some((d) => d.to === r.id)).length;
  assert.ok(rootCount >= 1, 'fixture sanity: at least one always-open root room exists');

  // cardId -> live SRS state, mutated in place as the simulated player reviews. Cards not yet
  // present here are "never reviewed" (lastReviewedAt undefined), exactly the compiled
  // baseline's own shape.
  const cardStates = new Map<string, { stability: number; difficulty: number; lastReviewedAt?: number }>();

  function effectiveCards(): ReviewCard[] {
    return world.cards.map((c) => {
      const s = cardStates.get(c.id);
      return s ? { ...c, ...s } : { ...c, lastReviewedAt: undefined };
    });
  }

  function gateRoom(roomId: string, day: number): void {
    for (const c of world.cards.filter((c) => c.roomId === roomId)) {
      const prior = cardStates.get(c.id) ?? { stability: c.stability, difficulty: c.difficulty, lastReviewedAt: undefined };
      cardStates.set(c.id, reviewCard(prior, GOOD_GRADE, day));
    }
  }

  const revealedSizeByDay: number[] = [];
  const reachableSizeByDay: number[] = [];

  for (let day = 0; day <= SIM_LAST_DAY; day++) {
    if (day <= ACTIVE_PHASE_LAST_DAY) {
      // Active phase: one single gate-pass per day over whatever the light cone has opened up
      // as of *this morning's* snapshot — never re-reviewed, never looped to a same-day
      // fixpoint, so growth genuinely plays out day over day rather than being front-loaded.
      const cards = effectiveCards();
      const { reachable } = computeLightCone(world.rooms, world.doors, cards, world.halls, day);
      const revealed = revealedTerritory(cards);
      for (const roomId of reachable) {
        if (!revealed.has(roomId)) gateRoom(roomId, day);
      }
    }
    // Lapse phase (day > ACTIVE_PHASE_LAST_DAY): no reviews at all — only time passes.

    const cardsToday = effectiveCards();
    const snapshotToday = computeLightCone(world.rooms, world.doors, cardsToday, world.halls, day);
    revealedSizeByDay[day] = revealedTerritory(cardsToday).size;
    reachableSizeByDay[day] = snapshotToday.reachable.size;
  }

  // 1. Monotonic territory: never shrinks, any day, active or lapsed.
  for (let day = 1; day <= SIM_LAST_DAY; day++) {
    assert.ok(
      revealedSizeByDay[day]! >= revealedSizeByDay[day - 1]!,
      `revealed territory shrank from day ${day - 1} (${revealedSizeByDay[day - 1]}) to day ${day} (${revealedSizeByDay[day]})`,
    );
  }

  // 2. The light cone genuinely grew past the bare root rooms at some point before the very
  // last day (a real earlier peak, not a coincidence of where the simulation happens to stop).
  let peakReachable = 0;
  let peakDay = -1;
  for (let day = 0; day < SIM_LAST_DAY; day++) {
    if (reachableSizeByDay[day]! > peakReachable) {
      peakReachable = reachableSizeByDay[day]!;
      peakDay = day;
    }
  }
  assert.ok(
    peakReachable > rootCount,
    `light cone never grew past the ${rootCount} root room(s) before the final day (peak reachable = ${peakReachable})`,
  );
  assert.ok(peakDay < SIM_LAST_DAY, 'expected the peak to occur strictly before the final simulated day');

  // 3. Lapse causes fog: a FRESH light-cone computation at day 29 finds fewer reachable rooms
  // than that peak, because upstream bridge rooms have decayed out of full/embers — even
  // though nothing in the world's rooms/doors/cards was ever deleted or mutated.
  const finalReachable = reachableSizeByDay[SIM_LAST_DAY]!;
  assert.ok(
    finalReachable < peakReachable,
    `light cone did not shrink on lapse: peak=${peakReachable} (day ${peakDay}), day ${SIM_LAST_DAY}=${finalReachable}`,
  );
  assert.ok(finalReachable >= rootCount, 'light cone should never drop below the always-open root rooms');

  // 4. Revealed territory at day 29 still exceeds day 29's fogged-back reachable set — proof
  // the fogged rooms are hidden, not erased; their own data is exactly as revealed left it.
  const finalRevealed = revealedSizeByDay[SIM_LAST_DAY]!;
  assert.ok(
    finalRevealed > finalReachable,
    `expected revealed territory (${finalRevealed}) to exceed the fogged-back reachable set (${finalReachable})`,
  );
});
