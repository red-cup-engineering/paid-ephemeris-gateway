// farstone-world.test — content integrity for docs/world/harbor.json, the authored world bible.
// The engine trusts the bible completely (gameFromBible does no validation), so this file is the
// gate that keeps authored world content loadable: unique ids, every exit landing on a real room,
// every item/npc seated in a real room or on a real entity, every walkable room reachable from the
// player's start, and prose on everything a player can look at.

import { test } from "node:test";
import assert from "node:assert/strict";
import { FARSTONE_GAME, HARBOR_BIBLE } from "./farstone-game.mts";

const rooms = HARBOR_BIBLE.rooms;
const entities = [...(HARBOR_BIBLE.items ?? []), ...(HARBOR_BIBLE.npcs ?? []), ...(HARBOR_BIBLE.ships ?? [])];
const roomIds = new Set(rooms.map((room) => room.id));
const entityIds = new Set(entities.map((entity) => entity.id));

test("every id in the bible is unique across rooms, items, npcs, and ships", () => {
  const all = [...rooms, ...entities].map((entry) => entry.id);
  const seen = new Set<string>();
  for (const id of all) {
    assert.ok(!seen.has(id), `duplicate id: ${id}`);
    seen.add(id);
  }
});

test("every room exit leads to a room that exists", () => {
  for (const room of rooms) {
    for (const [direction, target] of Object.entries(room.exits ?? {})) {
      assert.ok(roomIds.has(target), `${room.id} exits ${direction} to missing room ${target}`);
    }
  }
});

test("every item, npc, and ship is located in a real room or on a real entity", () => {
  for (const entity of entities) {
    const location = entity.location;
    assert.ok(typeof location === "string" && location.length > 0, `${entity.id} has no location`);
    assert.ok(
      roomIds.has(location!) || entityIds.has(location!),
      `${entity.id} is located in ${location}, which is neither a room nor an entity`,
    );
  }
});

test("every room is reachable from the player start by walking exits", () => {
  const start = HARBOR_BIBLE.meta.playerStart;
  assert.ok(roomIds.has(start), `playerStart ${start} is not a room`);
  const reached = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const here = queue.shift()!;
    const room = rooms.find((candidate) => candidate.id === here)!;
    for (const target of Object.values(room.exits ?? {})) {
      if (!reached.has(target)) {
        reached.add(target);
        queue.push(target);
      }
    }
  }
  for (const room of rooms) assert.ok(reached.has(room.id), `${room.id} is unreachable from ${start}`);
});

test("everything a player can look at carries a name and a described voice", () => {
  for (const entry of [...rooms, ...entities]) {
    assert.ok(entry.name.length > 0, `${entry.id} has no name`);
    assert.ok(entry.description.length >= 40, `${entry.id}'s description is too thin to read aloud`);
  }
});

test("the bible builds into the game the engine boots: every room and thing survives the load", () => {
  assert.equal(Object.keys(FARSTONE_GAME.rooms).length, rooms.length);
  for (const entity of entities) assert.ok(entity.id in FARSTONE_GAME.things, `${entity.id} missing from game things`);
  assert.equal(FARSTONE_GAME.start, HARBOR_BIBLE.meta.playerStart);
});
