import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { defineGame } from "./game.mjs";
import { createWorld, settledWorld, tell } from "./world.mjs";

const ACTOR_IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a record`);
  return value;
}

export function snapshotWorld(world) {
  if (world?.kind !== "fizzos.world.v1") fail("snapshotWorld requires a FizzOS world");
  return Object.freeze({
    kind: "fizzos.world-snapshot.v1",
    sequence: world.sequence,
    functionalPredicates: Object.freeze([...world.functionalPredicates]),
    assertions: Object.freeze(world.assertions.map((assertion) => Object.freeze({
      subject: assertion.subject,
      predicate: assertion.predicate,
      object: assertion.object,
      evidence: assertion.evidence,
      sequence: assertion.sequence,
      source: assertion.source,
    }))),
  });
}

/**
 * Project the settled frontier into a fresh trace. The input world remains the
 * immutable audit predecessor; callers persist it before checkpointing when a
 * complete event journal is required.
 */
export function checkpointWorld(world) {
  const frontier = settledWorld(world).map(({ subject, predicate, object, evidence }) => ({ subject, predicate, object, evidence }));
  return tell(createWorld({ functionalPredicates: world.functionalPredicates }), frontier, { source: `fizzos.checkpoint:${world.sequence}` });
}

export function checkpointEngine(engine) {
  if (engine?.kind !== "fizzos.engine.v1") fail("checkpointEngine requires a FizzOS engine");
  return Object.freeze({ ...engine, world: checkpointWorld(engine.world) });
}

export function restoreWorld(source) {
  const snapshot = record(source, "world snapshot");
  if (snapshot.kind !== "fizzos.world-snapshot.v1"
    || !Number.isSafeInteger(snapshot.sequence)
    || !Array.isArray(snapshot.functionalPredicates)
    || !Array.isArray(snapshot.assertions)
    || snapshot.sequence !== snapshot.assertions.length) {
    fail("invalid world snapshot envelope");
  }
  let world = createWorld({ functionalPredicates: snapshot.functionalPredicates });
  for (const [index, assertion] of snapshot.assertions.entries()) {
    record(assertion, `assertion ${index}`);
    if (assertion.sequence !== index + 1) fail(`assertion ${index} has a noncanonical sequence`);
    world = tell(world, {
      subject: assertion.subject,
      predicate: assertion.predicate,
      object: assertion.object,
      evidence: assertion.evidence,
    }, { source: assertion.source });
  }
  return world;
}

export function snapshotEngine(engine) {
  if (engine?.kind !== "fizzos.engine.v1") fail("snapshotEngine requires a FizzOS engine");
  return Object.freeze({
    kind: "fizzos.engine-snapshot.v1",
    game: engine.game,
    world: snapshotWorld(engine.world),
    actors: Object.freeze([...engine.actors]),
    tick: engine.tick,
    nextIntent: engine.nextIntent,
    queue: Object.freeze(engine.queue.map((intent) => Object.freeze({ ...intent }))),
  });
}

export function restoreEngine(source) {
  const snapshot = record(source, "engine snapshot");
  if (snapshot.kind !== "fizzos.engine-snapshot.v1"
    || !Array.isArray(snapshot.actors)
    || !Array.isArray(snapshot.queue)
    || !Number.isSafeInteger(snapshot.tick)
    || snapshot.tick < 0
    || !Number.isSafeInteger(snapshot.nextIntent)
    || snapshot.nextIntent < 1) {
    fail("invalid engine snapshot envelope");
  }
  const game = defineGame(record(snapshot.game, "snapshot game"));
  const actors = [...snapshot.actors];
  if (new Set(actors).size !== actors.length
    || actors.some((actor) => typeof actor !== "string" || !ACTOR_IDENTIFIER.test(actor)
      || actor in game.rooms || actor in game.things)) {
    fail("engine snapshot contains invalid actor identities");
  }
  const queue = snapshot.queue.map((intent, index) => {
    record(intent, `queued intent ${index}`);
    if (intent.kind !== "fizzos.command.v1"
      || !Number.isSafeInteger(intent.ordinal)
      || !actors.includes(intent.actor)
      || typeof intent.command !== "string"
      || intent.command.length === 0) {
      fail(`queued intent ${index} is invalid`);
    }
    return Object.freeze({
      kind: intent.kind,
      ordinal: intent.ordinal,
      actor: intent.actor,
      command: intent.command,
    });
  });
  if (queue.some(({ ordinal }) => ordinal >= snapshot.nextIntent)) fail("queued intent exceeds nextIntent frontier");
  return Object.freeze({
    kind: "fizzos.engine.v1",
    game,
    world: restoreWorld(snapshot.world),
    actors: Object.freeze(actors.sort(compareText)),
    tick: snapshot.tick,
    nextIntent: snapshot.nextIntent,
    queue: Object.freeze(queue.sort((left, right) => left.ordinal - right.ordinal)),
  });
}

export function encodeSnapshot(engine) {
  return `${JSON.stringify(snapshotEngine(engine), null, 2)}\n`;
}

export function decodeSnapshot(text) {
  if (typeof text !== "string") fail("snapshot representation must be text");
  return restoreEngine(JSON.parse(text));
}

function jsonRepresentation(snapshot) {
  const representation = JSON.stringify(snapshot, (_key, value) => {
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === undefined) {
      fail("snapshot must contain only JSON values");
    }
    if (typeof value === "number" && !Number.isFinite(value)) fail("snapshot numbers must be finite");
    return value;
  }, 2);
  if (representation === undefined) fail("snapshot must be a JSON value");
  return `${representation}\n`;
}

/** Atomically persist any JSON snapshot owned by a downstream capability. */
export async function saveJsonSnapshot(path, snapshot) {
  if (typeof path !== "string" || path.length === 0) fail("snapshot path must be non-empty text");
  const representation = jsonRepresentation(snapshot);
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `.${basename(path)}.${process.pid}.tmp`);
  await writeFile(temporary, representation, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return path;
}

/** Load a downstream JSON snapshot, with an explicit fallback for absence/corruption. */
export async function loadJsonSnapshot(path, { fallback } = {}) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) {
    if (fallback === undefined) throw error;
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

/** Write a complete replacement then atomically rename it over the prior save. */
export async function saveEngine(path, engine) {
  if (engine?.kind !== "fizzos.engine.v1") fail("saveEngine requires a FizzOS engine");
  return saveJsonSnapshot(path, snapshotEngine(engine));
}

/** A corrupt or absent save degrades to the caller's explicit fresh engine. */
export async function loadEngine(path, { fallback } = {}) {
  try {
    return decodeSnapshot(await readFile(path, "utf8"));
  } catch (error) {
    if (fallback === undefined) throw error;
    const engine = typeof fallback === "function" ? fallback() : fallback;
    if (engine?.kind !== "fizzos.engine.v1") fail("persistence fallback must produce a FizzOS engine");
    return engine;
  }
}
