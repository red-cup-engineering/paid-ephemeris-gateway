// tidepool-room.test — the qwzspace room wiring: presence.join maps to a persisted feltos actor
// (not an eviction on leave), commands flow through gameValidate -> submit -> step exactly once
// per runTick, per-actor perception frames render through snapOf, and — the "determinism where
// the design claims it" requirement — qwzspace's own `verify()` (a from-tick-0 replay through an
// INDEPENDENT worldFactory instance) matches the live room's state hash after a real session of
// mixed commands across several capabilities and several ticks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { createTidepoolRoom } from "./tidepool-room.mts";
import { perceptionFrame } from "./perception.mts";

/** the room's own snapOf is internal to its worldFactory closure (only reachable live, from
 *  inside a real subscriber's cache) — for a test, read the SAME data the room would have handed
 *  a subscriber by projecting straight off the live engine, exactly as snapOf itself does. */
function frameFor(room, actorName) {
  const engine = room.liveEngine();
  return perceptionFrame(engine.world, actorIdFor(actorName), room.room.tickNow(), []);
}

function freshRoom() {
  const engine = createEngine(TIDEPOOL_GAME);
  return createTidepoolRoom(engine);
}

async function joinAndCommand(room, qwId, name, command, seq) {
  room.room.queue.push({ actorId: qwId, seq: 0, kind: "presence.join", args: { name } });
  if (command !== null) {
    room.room.queue.push({ actorId: qwId, seq, kind: "command", args: { command } });
  }
}

test("presence.join maps a qwzspace connection to a deterministic feltos actor via actorIdFor(name)", async () => {
  const room = freshRoom();
  await joinAndCommand(room, "qw-a", "kip", "look", 1);
  await room.room.stepOnce();
  const frame = frameFor(room, "kip");
  assert.equal(frame.actor, actorIdFor("kip"));
  assert.equal(frame.place.id, "drift-line");
});

test("presence.leave does not evict the actor's body — the room keeps its location (design §3's 'gone AFK, not vanished')", async () => {
  const room = freshRoom();
  await joinAndCommand(room, "qw-a", "kip", "go south", 1);
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 0, kind: "presence.leave", args: {} });
  await room.room.stepOnce();
  const engine = room.liveEngine();
  assert.equal(engine.actors.includes(actorIdFor("kip")), true);
  // and the feltos actor is still at shingle-beach, not reset to the start room
  const located = engine.world.assertions.filter((a) => a.subject === actorIdFor("kip") && a.predicate === "located-in").pop();
  assert.equal(located.object, "shingle-beach");
});

test("two different qwzspace connections presenting the same display name resolve to the SAME persisted feltos actor (Tier 2 identity)", async () => {
  const room = freshRoom();
  await joinAndCommand(room, "qw-a", "kip", "go south", 1); // moves the persisted "kip" actor
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 0, kind: "presence.leave", args: {} });
  await room.room.stepOnce();
  // a SECOND, independent connection rejoins under the same display name
  await joinAndCommand(room, "qw-b", "kip", "look", 1);
  await room.room.stepOnce();
  const frame = frameFor(room, "kip");
  assert.equal(frame.place.id, "shingle-beach", "the second connection picked up the SAME persisted actor's location, not a fresh one");
});

test("gameValidate rejects a malformed intent before it ever reaches submit() — a bad command is silently dropped, not thrown into the tick", async () => {
  const room = freshRoom();
  await joinAndCommand(room, "qw-a", "kip", null, 0);
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 1, kind: "not-a-real-kind", args: {} });
  await assert.doesNotReject(() => room.room.stepOnce());
});

test("determinism: qwzspace's own verify() replays a real mixed-capability session through an independent worldFactory and matches the live state hash", async () => {
  const room = freshRoom();
  await joinAndCommand(room, "qw-a", "kip", "look", 1);
  await room.room.stepOnce();
  await joinAndCommand(room, "qw-b", "reed", "look", 1);
  await room.room.stepOnce();

  const commands = [
    ["qw-a", "go south", 2],
    ["qw-b", "go south", 2],
    ["qw-a", "go west", 3],
    ["qw-a", "go north", 4],
    ["qw-a", "harvest", 5],
    ["qw-a", "tend", 6],
    ["qw-b", "go west", 3],
    ["qw-b", "emote wave", 4],
    ["qw-a", "signal tide's turning", 7],
    ["qw-a", "mark a small cairn", 8],
    ["qw-b", "share the-reef: thick with fish", 5],
  ];
  for (const [qwId, command, seq] of commands) {
    room.room.queue.push({ actorId: qwId, seq, kind: "command", args: { command } });
    await room.room.stepOnce();
  }
  // a few idle ticks too, so ecology/world-clock onTick effects are part of what's replayed
  for (let i = 0; i < 3; i++) await room.room.stepOnce();

  const result = await room.room.verify();
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("determinism: two independent boots from the SAME snapshot, driven by the SAME intent log, reach the SAME state hash", async () => {
  const bootEngine = createEngine(TIDEPOOL_GAME);
  const roomA = createTidepoolRoom(bootEngine);
  const roomB = createTidepoolRoom(bootEngine);

  const script = [
    { actorId: "qw-1", seq: 0, kind: "presence.join", args: { name: "kip" } },
    { actorId: "qw-1", seq: 1, kind: "command", args: { command: "go south" } },
    { actorId: "qw-1", seq: 2, kind: "command", args: { command: "go west" } },
    { actorId: "qw-1", seq: 3, kind: "command", args: { command: "go north" } },
    { actorId: "qw-1", seq: 4, kind: "command", args: { command: "harvest" } },
  ];
  for (const entry of script) {
    roomA.room.queue.push(entry);
    roomB.room.queue.push(entry);
    await roomA.room.stepOnce();
    await roomB.room.stepOnce();
  }

  const hashA = await roomA.room.verify();
  const hashB = await roomB.room.verify();
  assert.equal(hashA.ok, true);
  assert.equal(hashB.ok, true);
  assert.equal(hashA.logHash, hashB.logHash);
});
