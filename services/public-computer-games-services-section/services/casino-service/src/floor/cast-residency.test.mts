import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CasinoEconomy } from '../economy/casino-economy.mts';
import { createFloor } from './floor.mts';
import { startCastResidency, castOnDutyToday, castGameAssignment } from './cast-residency.mts';
import { listAuthoredPersonaIds } from '@red-cup-engineering/cast/persona';

const FIXED_DATE = new Date('2026-08-29T00:00:00.000Z');

/** Every sleep call — dormancy polls, the runner's own think/act/chat pacing, session cooldowns —
 *  resolves on the next real macrotask (`setImmediate`) rather than waiting out its real
 *  millisecond argument. This is deliberately NOT a purely synchronous no-op: an always-instantly-
 *  resolved promise never yields to Node's timer phase, and a residency whose only exit condition
 *  is real elapsed time (ticket accrual, a new UTC day) will otherwise busy-loop retrying a
 *  can't-afford-it session forever without ever giving the test's own timeout a chance to run —
 *  discovered the hard way (see cast-residency.mts's own `makeSlotsPolicy` comment for the
 *  affordability bug this same busy-loop first exposed during development). `setImmediate` keeps
 *  the whole suite fast while staying a genuine, well-behaved async boundary. */
const fastSleep = () => new Promise<void>((resolve) => setImmediate(resolve));

function fakeClient() {
  return { send: () => true, heartbeat: () => true };
}

test('castOnDutyToday is deterministic, a real subset of the authored roster, and varies by date', () => {
  const rosterA = castOnDutyToday(FIXED_DATE, 5);
  const rosterB = castOnDutyToday(FIXED_DATE, 5);
  assert.deepEqual(rosterA, rosterB);
  assert.equal(rosterA.length, 5);
  const authored = new Set(listAuthoredPersonaIds());
  for (const id of rosterA) assert.ok(authored.has(id));
  assert.equal(new Set(rosterA).size, 5); // no duplicates

  const otherDay = castOnDutyToday(new Date('2026-08-30T00:00:00.000Z'), 5);
  assert.notDeepEqual(rosterA, otherDay); // a different day is allowed (and, for this pair, happens) to reshuffle
});

test('castGameAssignment is deterministic per (date, personaId)', () => {
  for (const id of listAuthoredPersonaIds()) {
    const a = castGameAssignment(FIXED_DATE, id);
    const b = castGameAssignment(FIXED_DATE, id);
    assert.equal(a, b);
    assert.ok(a === 'blackjack' || a === 'slots');
  }
});

test('dormancy: with zero floor connections, no persona ever sits down or spends any chips', async () => {
  const economy = new CasinoEconomy();
  const floor = createFloor({ getJackpotBalance: () => economy.jackpotPoolBalance(), intervalMs: 20 });
  floor.room.start();

  const handle = startCastResidency({ economy, floor, rosterSize: 2, now: () => FIXED_DATE, sleep: fastSleep });
  // Give the supervisors several real event-loop turns to prove they're actually parked, not just
  // not-yet-scheduled.
  for (let i = 0; i < 20; i++) await fastSleep();

  const summary = floor.summary();
  assert.equal(summary.presenceCount, 0);
  assert.equal(summary.recentEvents.length, 0);
  assert.deepEqual(economy.checkInvariants(), []);

  await handle.stop();
  floor.room.stop();
  floor.room.destroy();
});

test('once a viewer connects, on-duty personas sit down, play through the real economy, keep the books balanced, and go quiet again once the viewer leaves', async () => {
  const economy = new CasinoEconomy();
  const floor = createFloor({ getJackpotBalance: () => economy.jackpotPoolBalance(), intervalMs: 20 });
  floor.room.start();

  const handle = startCastResidency({ economy, floor, rosterSize: 2, now: () => FIXED_DATE, sleep: fastSleep });
  assert.equal(handle.onDutyPersonaIds.length, 2);

  const removeClient = floor.room.hub.add(fakeClient());

  // Poll for real presence to show up — bounded, so a genuine regression fails the test instead of
  // hanging it.
  let sawPresence = false;
  for (let i = 0; i < 150 && !sawPresence; i++) {
    await fastSleep();
    if (floor.summary().presenceCount > 0) sawPresence = true;
  }
  assert.ok(sawPresence, 'expected at least one on-duty persona to sit down once a viewer connected');

  // Let some real play happen (bets, hits/spins, wins/losses, dialogue) before checking the books.
  for (let i = 0; i < 150; i++) await fastSleep();

  assert.deepEqual(economy.checkInvariants(), []); // real chip movement, still balanced end to end

  const summary = floor.summary();
  const seatedNames = summary.players.map((p) => p.role);
  assert.ok(seatedNames.every((role) => role === 'cast'));
  // Every seated persona is actually in a game zone, not stuck in the lobby.
  for (const p of summary.players) assert.ok(p.zone === 'blackjack' || p.zone === 'slots');

  removeClient();
  // Once the last viewer leaves, in-flight sessions wind down and no NEW session should start.
  for (let i = 0; i < 50; i++) await fastSleep();
  assert.equal(floor.hasConnections(), false);

  await handle.stop();
  floor.room.stop();
  floor.room.destroy();
});

test('dialogue: at least one utterance reaches the floor feed during a real session', async () => {
  const economy = new CasinoEconomy();
  const floor = createFloor({ getJackpotBalance: () => economy.jackpotPoolBalance(), intervalMs: 20 });
  floor.room.start();
  const handle = startCastResidency({ economy, floor, rosterSize: 3, now: () => FIXED_DATE, sleep: fastSleep });
  floor.room.hub.add(fakeClient());

  let sawDialogue = false;
  for (let i = 0; i < 250 && !sawDialogue; i++) {
    await fastSleep();
    if (floor.summary().recentEvents.some((e) => e.type === 'dialogue')) sawDialogue = true;
  }
  assert.ok(sawDialogue, 'expected at least one persona reaction/utterance to reach the floor feed');

  await handle.stop();
  floor.room.stop();
  floor.room.destroy();
});
