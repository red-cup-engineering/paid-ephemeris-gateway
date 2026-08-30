import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFloorWorld, FEED_TTL_TICKS, MAX_FEED_EVENTS } from './world.mts';

test('presence.join adds a player entity and a sit-down feed event, both dirty', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  const result = await world.runTick(1, [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }]);
  assert.deepEqual(new Set(result.dirty), new Set(['a1', 'event-1']));
  const subjects = world.subjectsOf();
  assert.ok(subjects.includes('a1'));
  assert.ok(subjects.includes('jackpot'));
  assert.ok(subjects.includes('event-1'));
  const player = world.snapOf('a1');
  assert.equal(player?.kind, 'player');
  assert.equal(player?.role, 'human');
  assert.equal(player?.name, 'Alice');
  assert.equal(player?.zone, 'lobby');
  const feedEvent = world.snapOf('event-1');
  assert.equal(feedEvent?.kind, 'feed-event');
  assert.equal(feedEvent?.type, 'sit-down');
});

test('actorId prefixed "cast:" is folded as role "cast", not "human"', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [{ actorId: 'cast:pearl-winkle', kind: 'presence.join', args: { name: 'Pearl Winkle', avatar: { drawable: 'ring', tint: '#c9a86a' } } }]);
  const player = world.snapOf('cast:pearl-winkle');
  assert.equal(player?.role, 'cast');
  assert.equal(player?.sprite, 'ring');
  assert.equal(player?.tint, '#c9a86a');
});

test('presence.leave removes the player entity and reports it dirty', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }]);
  const result = await world.runTick(2, [{ actorId: 'a1', kind: 'presence.leave', args: {} }]);
  assert.ok(result.dirty.includes('a1'));
  assert.equal(world.snapOf('a1'), null);
  assert.ok(!world.subjectsOf().includes('a1'));
});

test('floor.zone moves a player between zones deterministically (same actorId+zone -> same position every time)', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }]);
  await world.runTick(2, [{ actorId: 'a1', kind: 'floor.zone', args: { zone: 'blackjack' } }]);
  const pos1 = world.snapOf('a1');
  assert.equal(pos1?.zone, 'blackjack');

  const other = createFloorWorld({ getJackpotBalance: () => 0 });
  await other.runTick(1, [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }]);
  await other.runTick(2, [{ actorId: 'a1', kind: 'floor.zone', args: { zone: 'blackjack' } }]);
  const pos2 = other.snapOf('a1');
  assert.equal(pos1?.x, pos2?.x);
  assert.equal(pos1?.y, pos2?.y);
});

test('floor.chat folds into a capped, attributed feed event', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }]);
  const longText = 'x'.repeat(500);
  await world.runTick(2, [{ actorId: 'a1', kind: 'floor.chat', args: { text: longText } }]);
  const feed = world.recentFeed();
  const chat = feed.find((e) => e.type === 'chat');
  assert.ok(chat !== undefined);
  assert.equal(chat?.text.length, 200);
  assert.equal(chat?.actorName, 'Alice');
});

test('floor.broadcast folds win/big-win/jackpot/dialogue into the feed with game+amount', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [
    { actorId: 'house', kind: 'floor.broadcast', args: { type: 'jackpot', text: 'JACKPOT!', actorName: 'Reef Halyard', game: 'slots', amount: 12345 } },
  ]);
  const feed = world.recentFeed();
  assert.equal(feed.length, 1);
  assert.equal(feed[0]?.type, 'jackpot');
  assert.equal(feed[0]?.actorId, null); // 'house' is never attributed to a real player id
  assert.equal(feed[0]?.game, 'slots');
  assert.equal(feed[0]?.amount, 12345);
});

test('an unrecognized intent kind is ignored, never thrown', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  const result = await world.runTick(1, [{ actorId: 'a1', kind: 'nonsense', args: {} }]);
  assert.deepEqual(result.dirty, []);
});

test('the jackpot entity tracks a live balance function and is only dirty when it actually changes', async () => {
  let balance = 100; // read once, eagerly, at world construction — see createFloorWorld's own `lastJackpot` init
  const world = createFloorWorld({ getJackpotBalance: () => balance });
  assert.equal(world.snapOf('jackpot')?.balance, 100);
  const r1 = await world.runTick(1, []);
  assert.ok(!r1.dirty.includes('jackpot')); // unchanged since construction -> not dirty
  balance = 250;
  const r2 = await world.runTick(2, []);
  assert.ok(r2.dirty.includes('jackpot'));
  assert.equal(world.snapOf('jackpot')?.balance, 250);
  const r3 = await world.runTick(3, []);
  assert.ok(!r3.dirty.includes('jackpot')); // settled again -> not dirty
});

test('feed events expire after FEED_TTL_TICKS and are reported as dirty on removal (a delta "gone" id)', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  await world.runTick(1, [{ actorId: 'a1', kind: 'floor.chat', args: { text: 'hello' } }]);
  assert.equal(world.recentFeed().length, 1);
  const result = await world.runTick(1 + FEED_TTL_TICKS + 1, []);
  assert.ok(result.dirty.includes('event-1'));
  assert.equal(world.recentFeed().length, 0);
});

test('the feed is capped at MAX_FEED_EVENTS, oldest first evicted', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  for (let i = 0; i < MAX_FEED_EVENTS + 10; i++) {
    await world.runTick(i, [{ actorId: 'a1', kind: 'floor.chat', args: { text: `line ${i}` } }]);
  }
  const feed = world.recentFeed(MAX_FEED_EVENTS + 10);
  assert.equal(feed.length, MAX_FEED_EVENTS);
  assert.equal(feed[0]?.text, `line 10`); // the oldest 10 were evicted to stay at the cap
});

test('runTick never mutates the intents array it is given', async () => {
  const world = createFloorWorld({ getJackpotBalance: () => 0 });
  const intents = Object.freeze([{ actorId: 'a1', kind: 'presence.join', args: Object.freeze({ name: 'Alice' }) }]);
  await assert.doesNotReject(world.runTick(1, intents));
});

test('two independently-created worlds folding the identical intent sequence agree on every entity', async () => {
  const sequence = [
    [{ actorId: 'a1', kind: 'presence.join', args: { name: 'Alice' } }],
    [{ actorId: 'cast:pearl-winkle', kind: 'presence.join', args: { name: 'Pearl Winkle', avatar: { drawable: 'ring', tint: '#c9a86a' } } }],
    [{ actorId: 'cast:pearl-winkle', kind: 'floor.zone', args: { zone: 'blackjack' } }],
    [{ actorId: 'a1', kind: 'floor.chat', args: { text: 'hi' } }],
  ];
  const worldA = createFloorWorld({ getJackpotBalance: () => 500 });
  const worldB = createFloorWorld({ getJackpotBalance: () => 500 });
  for (let tick = 0; tick < sequence.length; tick++) {
    await worldA.runTick(tick + 1, sequence[tick] as never);
    await worldB.runTick(tick + 1, sequence[tick] as never);
  }
  assert.deepEqual(worldA.subjectsOf().sort(), worldB.subjectsOf().sort());
  for (const id of worldA.subjectsOf()) {
    assert.deepEqual(worldA.snapOf(id), worldB.snapOf(id));
  }
});
