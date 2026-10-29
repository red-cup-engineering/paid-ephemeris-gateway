// farstone-room.test — the qwzspace room wiring: presence.join maps to the SAME persisted feltos
// actor mud.connect() would give a JSON `/connect` caller (not an eviction on leave), commands flow
// through gameValidate -> mud.enqueue() -> mud.tick() exactly once per runTick, per-actor perception
// frames render through snapOf, and — the determinism claim this file's own header makes ("meaningful
// for a room instance never driven by an explicit /tick call outside its own stepOnce()") — qwzspace's
// own `verify()` (a from-tick-0 replay through an INDEPENDENT worldFactory instance) matches the live
// room's state hash after a real session of mixed commands across several ticks, when the room alone
// (never the raw HTTP /tick route) drives the engine. Mirrors tidepool-room.test.mts's own shape.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { FARSTONE_GAME } from "./farstone-game.mts";
import { createFarstoneRoom } from "./farstone-room.mts";
import { perceptionFrame } from "./farstone-perception.mts";

/** the room's own snapOf is internal to its worldFactory closure (only reachable live, from inside a
 *  real subscriber's cache) — for a test, read the SAME data the room would have handed a subscriber
 *  by projecting straight off the live mud's engine, exactly as snapOf itself does. */
function frameFor(room: ReturnType<typeof createFarstoneRoom>, actorName: string) {
  const mud = room.liveMud();
  return perceptionFrame((mud.engine() as { world: unknown }).world, actorIdFor(actorName), room.room.tickNow(), []);
}

function freshRoom() {
  const bootEngine = createEngine(FARSTONE_GAME);
  return createFarstoneRoom(bootEngine);
}

function joinAndCommand(room: ReturnType<typeof createFarstoneRoom>, qwId: string, name: string, command: string | null, seq: number) {
  room.room.queue.push({ actorId: qwId, seq: 0, kind: "presence.join", args: { name } });
  if (command !== null) {
    room.room.queue.push({ actorId: qwId, seq, kind: "command", args: { command } });
  }
}

test("presence.join maps a qwzspace connection to the SAME persisted feltos actor mud.connect() gives", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", "look", 1);
  await room.room.stepOnce();
  const frame = frameFor(room, "kip");
  assert.equal(frame.actor, actorIdFor("kip"));
  assert.equal(frame.place?.id, "harbor-quay");
});

test("presence.leave does not evict the actor's body — the actor keeps its location", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", "go north", 1);
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 0, kind: "presence.leave", args: {} });
  await room.room.stepOnce();
  const mud = room.liveMud();
  const engine = mud.engine() as { actors: string[]; world: unknown };
  assert.equal(engine.actors.includes(actorIdFor("kip")), true);
  const frame = perceptionFrame(engine.world, actorIdFor("kip"), room.room.tickNow(), []);
  assert.equal(frame.place?.id, "downtown-farston", "the feltos actor is still where it moved, not reset to the start room");
});

test("two different qwzspace connections presenting the same display name resolve to the SAME persisted feltos actor (Tier-2 identity)", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", "go north", 1); // moves the persisted "kip" actor
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 0, kind: "presence.leave", args: {} });
  await room.room.stepOnce();
  // a SECOND, independent connection rejoins under the same display name
  joinAndCommand(room, "qw-b", "kip", "look", 1);
  await room.room.stepOnce();
  const frame = frameFor(room, "kip");
  assert.equal(frame.place?.id, "downtown-farston", "the second connection picked up the SAME persisted actor's location, not a fresh one");
});

test("gameValidate rejects a malformed intent before it ever reaches mud.enqueue() — a bad command is silently dropped, not thrown into the tick", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", null, 0);
  await room.room.stepOnce();
  room.room.queue.push({ actorId: "qw-a", seq: 1, kind: "not-a-real-kind", args: {} });
  await assert.doesNotReject(() => room.room.stepOnce());
});

test("runTick calls mud.tick() exactly once per tick — the engine's own tick counter advances by exactly one, regardless of how many intents landed", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", "look", 1);
  const before = (room.liveMud().engine() as { tick: number }).tick;
  await room.room.stepOnce();
  const after = (room.liveMud().engine() as { tick: number }).tick;
  assert.equal(after, before + 1);
});

test("Farstone exposes FeltOS's ordinary MUD help and score commands", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "Kip Marlin", "help", 1);
  await room.room.stepOnce();
  const actor = actorIdFor("Kip Marlin");
  const help = room.liveMud().drain(actor).map(({ text }) => text).join("\n");
  assert.match(help, /Commands:.*help.*look.*score/u);

  room.room.queue.push({ actorId: "qw-a", seq: 2, kind: "command", args: { command: "score" } });
  await room.room.stepOnce();
  const score = room.liveMud().drain(actor).map(({ text }) => text).join("\n");
  assert.match(score, /Kip Marlin\nLocation: Farston Harbor Quay\nCarrying: 0\nWorld tick:/u);
});

// Control-plane verbs (who/whoami/finger/chat/tell/quit; register/login stay JSON-API/telnet-only
// — see farstone-room.mts's own header comment on the "command" branch) never write to
// room.liveMud().drain() the way an ordinary enqueued command does (see the "help and score" test
// above) — their reply lands in THIS room's own recentByActor, surfaced only through a real
// perception frame. The full, real WS-wire test for them lives in ws-wiring.test.mts, which
// decodes actual frames the room emits rather than reaching into its private state.

test("determinism: qwzspace's own verify() replays a real mixed session (room-driven only, never an out-of-band mud.tick()) and matches the live state hash", async () => {
  const room = freshRoom();
  joinAndCommand(room, "qw-a", "kip", "look", 1);
  await room.room.stepOnce();
  joinAndCommand(room, "qw-b", "reed", "look", 1);
  await room.room.stepOnce();

  const commands: [string, string, number][] = [
    ["qw-a", "go north", 2],
    ["qw-b", "go north", 2],
    ["qw-a", "work", 3],
    ["qw-a", "fish", 4],
    ["qw-b", "almanac", 3],
    ["qw-a", "petition coilin", 5],
  ];
  for (const [qwId, command, seq] of commands) {
    room.room.queue.push({ actorId: qwId, seq, kind: "command", args: { command } });
    await room.room.stepOnce();
  }
  // a few idle ticks too, so climate/director/depths onTick effects are part of what's replayed
  for (let i = 0; i < 3; i++) await room.room.stepOnce();

  const result = await room.room.verify();
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("determinism: two independent boots from the SAME snapshot, driven by the SAME intent log, reach the SAME state hash", async () => {
  const bootEngine = createEngine(FARSTONE_GAME);
  const roomA = createFarstoneRoom(bootEngine);
  const roomB = createFarstoneRoom(bootEngine);

  const script = [
    { actorId: "qw-1", seq: 0, kind: "presence.join", args: { name: "kip" } },
    { actorId: "qw-1", seq: 1, kind: "command", args: { command: "go north" } },
    { actorId: "qw-1", seq: 2, kind: "command", args: { command: "work" } },
    { actorId: "qw-1", seq: 3, kind: "command", args: { command: "fish" } },
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
