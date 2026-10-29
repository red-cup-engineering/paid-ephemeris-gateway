import { createWorld, tell } from "./world.mjs";
import { validateFour } from "./four.mjs";

const IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

function identifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) fail(`${label} must be a stable lowercase identifier`);
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be non-empty text`);
  return value;
}

function entries(record, label) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) fail(`${label} must be a record`);
  return Object.entries(record).sort(([left], [right]) => compareText(left, right));
}

function jsonValue(value, label) {
  try {
    const representation = JSON.stringify(value, (_key, member) => {
      if (typeof member === "bigint" || typeof member === "function" || typeof member === "symbol" || member === undefined) throw new TypeError();
      if (typeof member === "number" && !Number.isFinite(member)) throw new TypeError();
      return member;
    });
    if (representation === undefined) throw new TypeError();
    return JSON.parse(representation);
  } catch { fail(`${label} must be a finite JSON value`); }
}

/** Validate and freeze a data-defined game. Functions are deliberately excluded. */
export function defineGame(source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) fail("game must be a record");
  const id = identifier(source.id, "game id");
  if (source.capabilities !== undefined && !Array.isArray(source.capabilities)) fail("game capabilities must be a sequence");
  const capabilities = [...new Set((source.capabilities ?? []).map((entry) => identifier(entry, "capability id")))].sort(compareText);
  if (source.functionalPredicates !== undefined && !Array.isArray(source.functionalPredicates)) {
    fail("game functionalPredicates must be a sequence");
  }
  const functionalPredicates = new Set();
  for (const predicate of source.functionalPredicates ?? []) {
    functionalPredicates.add(identifier(predicate, "functional predicate"));
  }
  const roomEntries = entries(source.rooms, "game rooms");
  if (roomEntries.length === 0) fail("game must define at least one room");
  const roomIds = new Set(roomEntries.map(([roomId]) => identifier(roomId, "room id")));
  const rooms = {};
  for (const [roomId, room] of roomEntries) {
    const exits = {};
    for (const [direction, destination] of entries(room.exits ?? {}, `room ${roomId} exits`)) {
      identifier(direction, `room ${roomId} exit`);
      if (!roomIds.has(destination)) fail(`room ${roomId} exit ${direction} targets unknown room ${String(destination)}`);
      exits[direction] = destination;
      functionalPredicates.add(`exit:${direction}`);
    }
    rooms[roomId] = Object.freeze({
      name: text(room.name, `room ${roomId} name`),
      description: text(room.description, `room ${roomId} description`),
      exits: Object.freeze(exits),
    });
  }
  const things = {};
  const thingEntries = entries(source.things ?? {}, "game things");
  const thingIds = new Set(thingEntries.map(([thingId]) => identifier(thingId, "thing id")));
  for (const [thingId, thing] of thingEntries) {
    identifier(thingId, "thing id");
    if (roomIds.has(thingId)) fail(`thing id duplicates room id: ${thingId}`);
    if (!roomIds.has(thing.location) && !thingIds.has(thing.location)) fail(`thing ${thingId} has unknown location ${String(thing.location)}`);
    things[thingId] = Object.freeze({
      name: text(thing.name, `thing ${thingId} name`),
      description: text(thing.description, `thing ${thingId} description`),
      location: thing.location,
    });
  }
  const start = identifier(source.start, "game start room");
  if (!roomIds.has(start)) fail(`game start room does not exist: ${start}`);
  if (source.assertions !== undefined && !Array.isArray(source.assertions)) fail("game assertions must be a sequence");
  const assertions = (source.assertions ?? []).map((claim, index) => {
    if (claim === null || typeof claim !== "object" || Array.isArray(claim)) fail(`game assertion ${index} must be a record`);
    return Object.freeze({
      subject: text(claim.subject, `game assertion ${index} subject`),
      predicate: text(claim.predicate, `game assertion ${index} predicate`),
      object: jsonValue(claim.object, `game assertion ${index} object`),
      ...(claim.evidence === undefined ? {} : { evidence: validateFour(claim.evidence) }),
    });
  });
  return Object.freeze({
    kind: "feltos.game.v1",
    id,
    name: text(source.name, "game name"),
    start,
    capabilities: Object.freeze(capabilities),
    functionalPredicates: Object.freeze([...functionalPredicates].sort(compareText)),
    rooms: Object.freeze(rooms),
    things: Object.freeze(things),
    assertions: Object.freeze(assertions),
  });
}

export function instantiateGame(game) {
  if (game?.kind !== "feltos.game.v1") fail("instantiateGame requires a defined game");
  const claims = [];
  for (const [roomId, room] of Object.entries(game.rooms)) {
    claims.push(
      { subject: roomId, predicate: "kind", object: "room" },
      { subject: roomId, predicate: "name", object: room.name },
      { subject: roomId, predicate: "description", object: room.description },
    );
    for (const [direction, destination] of Object.entries(room.exits)) {
      claims.push({ subject: roomId, predicate: `exit:${direction}`, object: destination });
    }
  }
  for (const [thingId, thing] of Object.entries(game.things)) {
    claims.push(
      { subject: thingId, predicate: "kind", object: "thing" },
      { subject: thingId, predicate: "name", object: thing.name },
      { subject: thingId, predicate: "description", object: thing.description },
      { subject: thingId, predicate: "located-in", object: thing.location },
    );
  }
  claims.push(...game.assertions);
  return tell(createWorld({ functionalPredicates: game.functionalPredicates }), claims, { source: game.id });
}
