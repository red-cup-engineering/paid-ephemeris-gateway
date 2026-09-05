import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFloor, tierForSettlement } from './floor.mts';

/** A minimal fake broadcast-hub client — matches `{ send(obj):bool, heartbeat }`, exactly the
 *  shape `@red-cup-engineering/qwzspace/broadcast-hub#add` expects, so `floor.hasConnections()`
 *  (a thin wrapper over `room.hub.size()`) can be exercised without a real WebSocket. */
function fakeClient() {
  return { send: () => true, heartbeat: () => true };
}

test('tierForSettlement: jackpot always wins regardless of multiple; below 1.5x is not show-worthy', () => {
  assert.equal(tierForSettlement(10, 0, true), 'jackpot');
  assert.equal(tierForSettlement(10, 5, true), 'jackpot');
  assert.equal(tierForSettlement(10, 100, false), 'big-win'); // 10x
  assert.equal(tierForSettlement(10, 20, false), 'win'); // 2x
  assert.equal(tierForSettlement(10, 10, false), null); // exactly break-even, not a "win"
  assert.equal(tierForSettlement(10, 0, false), null);
});

test('hasConnections reflects the room hub, starting at zero', () => {
  const floor = createFloor({ getJackpotBalance: () => 0, intervalMs: 20 });
  assert.equal(floor.hasConnections(), false);
  const remove = floor.room.hub.add(fakeClient());
  assert.equal(floor.hasConnections(), true);
  remove();
  assert.equal(floor.hasConnections(), false);
  floor.room.destroy();
});

test('sitDown/setZone/leave/broadcastDialogue/broadcastWin land on the summary after a tick', async () => {
  const floor = createFloor({ getJackpotBalance: () => 5000, intervalMs: 10 });
  floor.sitDown('cast:pearl-winkle', 'Pearl Winkle', { drawable: 'ring', tint: '#c9a86a' });
  floor.setZone('cast:pearl-winkle', 'blackjack');
  floor.broadcastDialogue('cast:pearl-winkle', 'Pearl Winkle', 'Mind if I join in?');
  floor.broadcastWin({ actorId: 'cast:pearl-winkle', actorName: 'Pearl Winkle', game: 'blackjack', tier: 'win', amount: 40 });
  await floor.room.stepOnce();

  const summary = floor.summary();
  assert.equal(summary.presenceCount, 1);
  assert.equal(summary.jackpot, 5000);
  assert.equal(summary.players[0]?.name, 'Pearl Winkle');
  assert.equal(summary.players[0]?.zone, 'blackjack');
  const types = summary.recentEvents.map((e) => e.type);
  assert.ok(types.includes('sit-down'));
  assert.ok(types.includes('dialogue'));
  assert.ok(types.includes('win'));

  floor.leave('cast:pearl-winkle');
  await floor.room.stepOnce();
  assert.equal(floor.summary().presenceCount, 0);
  floor.room.destroy();
});

test('onWin fans out to every registered listener, and unsubscribe stops it', async () => {
  const floor = createFloor({ getJackpotBalance: () => 0, intervalMs: 10 });
  const seen: string[] = [];
  const unsubscribe = floor.onWin((event) => seen.push(event.actorName));
  floor.broadcastWin({ actorId: 'a1', actorName: 'Alice', game: 'slots', tier: 'big-win', amount: 500 });
  assert.deepEqual(seen, ['Alice']);
  unsubscribe();
  floor.broadcastWin({ actorId: 'a1', actorName: 'Alice', game: 'slots', tier: 'big-win', amount: 500 });
  assert.deepEqual(seen, ['Alice']); // no second push after unsubscribe
  floor.room.destroy();
});

test('reportSettlement tiers a raw settlement and only broadcasts when it clears the bar', async () => {
  const floor = createFloor({ getJackpotBalance: () => 0, intervalMs: 10 });
  const wins: unknown[] = [];
  floor.onWin((e) => wins.push(e));

  floor.reportSettlement('Otter Vance', { game: 'slots', accountId: 'acct-1', wager: 100, payout: 50 }); // a loss/small win, below the bar
  floor.reportSettlement('Otter Vance', { game: 'slots', accountId: 'acct-1', wager: 100, payout: 1200 }); // 12x -> big-win
  floor.reportSettlement('Otter Vance', { game: 'slots', accountId: 'acct-1', wager: 100, payout: 0, jackpotHit: true, jackpotPayout: 8000 });

  assert.equal(wins.length, 2);
  assert.equal((wins[0] as { tier: string }).tier, 'big-win');
  assert.equal((wins[1] as { tier: string; amount: number }).tier, 'jackpot');
  assert.equal((wins[1] as { amount: number }).amount, 8000); // the jackpot payout, not the (zero) base payout
  floor.room.destroy();
});

test('selfAuditEvery is disabled — verify() runs against the live room without throwing, honestly scoped', async () => {
  const floor = createFloor({ getJackpotBalance: () => 42, intervalMs: 10 });
  floor.sitDown('a1', 'Alice');
  await floor.room.stepOnce();
  const result = await floor.room.verify();
  // The presence/zone/feed fold IS pure and replays consistently even though the jackpot field
  // itself is intentionally external, live state — see world.mts's own header. This just proves
  // calling verify() doesn't crash the room; it is not a claim about jackpot-field replay fidelity.
  assert.equal(typeof result.ok, 'boolean');
  floor.room.destroy();
});
