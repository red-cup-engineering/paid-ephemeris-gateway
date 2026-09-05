#!/usr/bin/env node
/**
 * look — pipe one room of the real harbor to stdout as JSON.
 *
 * It loads `world/harbor.json` into a `@red-cup-engineering/fizzos` world (so the room, its
 * exits, and what is `located-in` it are the engine's truth, not a hand-written
 * blob) and prints a representation of the requested room. The site transports
 * whatever this prints — the script is the endpoint; the web layer is only the pipe.
 *
 * Usage: `node scripts/look.mjs [roomId]`   (default: the player start room)
 */
import { contentsOf } from "@red-cup-engineering/fizzos/engine";
import { loadHarbor, readHarborBible } from "../src/world-load.mjs";

const bible = readHarborBible();
const { world, content } = loadHarbor(bible);
const roomId = process.argv[2] ?? content.meta.playerStart ?? Object.keys(content.rooms)[0];
const room = content.rooms[roomId];

if (!room) {
  process.stdout.write(JSON.stringify({ error: `no such room: ${roomId}`, rooms: Object.keys(content.rooms) }, null, 2) + "\n");
  process.exit(0);
}

const here = contentsOf(world, roomId).map((id) => ({ id, name: content.nameOf(id), kind: content.things[id]?.kind ?? "thing" }));

process.stdout.write(
  JSON.stringify(
    {
      room: room.id,
      name: room.name,
      description: room.description,
      exits: room.exits,
      here,
    },
    null,
    2,
  ) + "\n",
);
