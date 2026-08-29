// cartridge — durante's Cartridge<State,Intent> binding over @red-cup-engineering/cartridge (the house
// manifest/intent-log/replay contract), matching parlor-kernel's own pattern (buildCartridge) and
// gambling-trainer-service's src/cartridge.mts precedent: wrap the game's own pure functions into the
// contract; never reimplement replay or intent-log machinery cartridge already has, tested, and
// publishes.
//
// ONE DEVIATION FROM THE GENERIC CONTRACT, documented rather than hidden: game.mjs's `State.world` is a
// `Map<subject, Row[]>` (abrash's federation.mjs shape — see that module's header). `@561-group/
// cartridge/intent-log`'s `canonicalStringify` (which `replay.mjs#hashState` and `defaultReplay` both
// use to hash/compare state) is a pure JSON serializer: `Object.keys()` on a bare `Map` returns no own
// enumerable properties, so hashing a Map-bearing state directly would silently hash `{}` for the world
// every time — a false-positive "identical" hash regardless of what the world actually holds. So
// `serialize`/`deserialize` below convert `world` to/from a plain, JSON-safe, canonically-orderable
// array of `[subject, rows]` pairs, and this module's own `hashState`/`replay`/`verify` call cartridge's
// `hashState` ON THE SERIALIZED FORM, never on the raw Map-bearing state. `game.test.mts`'s determinism
// test proves this actually distinguishes two different worlds (not a false "equal" from an
// empty-object collapse) — the exact failure mode this module exists to avoid.

import { defaultReplay, hashState as cartridgeHashState } from "@red-cup-engineering/cartridge/replay";
import { appendEntry, validateIntentLog } from "@red-cup-engineering/cartridge/intent-log";
import { worldFromRows } from "@red-cup-engineering/abrash/world";
import { game as createGameState, tick as gameTick } from "./game.mjs";
import { BLOOD_MERGE_ROWS } from "./seed-rows.mjs";
import { dailySeed } from "./daily.mjs";
import { dailyArena } from "./daily-arena.mjs";

// seedToUint32/mulberry32 — the same small, dependency-free construction @red-cup-engineering/cartridge's own
// `fixtures/toy-engine.mjs` uses, so a game-declared seed becomes a deterministic PRNG stream without a
// new randomness primitive entering the house's vocabulary. No Date.now, no Math.random, anywhere.
function seedToUint32(seed) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return hash >>> 0;
}
function mulberry32(state) {
  let a = state;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// createEngine(seed, configId) — a fresh durante game over the shipped blood-merge arena. The arena
// geometry and the two demons' spawn facts are the authored merge (BLOOD_MERGE_ROWS, byte-identical to
// world/blood-merge.jsonl — see DESIGN.md's "why the seed doesn't regenerate the arena" note); `seed`
// drives the one thing this game varies per run: the player's starting facing, jittered deterministically
// so two different seeds visibly start you looking in different directions, and the SAME seed always
// starts you looking exactly the same way (proven in game.test.mts's determinism test).
export function createEngine(seed, configId) {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new TypeError("createEngine: seed must be a non-empty string");
  }
  const rng = mulberry32(seedToUint32(`${seed}:${configId ?? "default"}`));
  const angleJitter = (rng() - 0.5) * 0.6;
  const world = worldFromRows(BLOOD_MERGE_ROWS);
  return createGameState({
    world,
    player: { x: 7.5, z: 2.5, angle: Math.PI / 2 + angleJitter },
    demons: [{ id: 0 }, { id: 1 }],
    cam: { fov: Math.PI / 3, maxDist: 24, width: 64, height: 48 },
  });
}

// createDailyEngine(date) — durante's OTHER engine entry point, alongside createEngine above: a fresh
// game over the DAILY-GENERATED arena (daily-arena.mjs's dailyArena, seeded via daily.mjs's
// dailySeed(date)) rather than the shipped fixed BLOOD_MERGE_ROWS. This is the open item the port
// digest flagged ("src/cartridge.mjs exists but unwired... src/cartridge.mjs to a real manifest") —
// createEngine/BLOOD_MERGE_ROWS are UNTOUCHED (every existing determinism test above keeps passing
// against the exact same fixed arena); this is purely additive. `date` is a "YYYY-MM-DD" UTC string —
// the daily's seed policy (see MANIFEST below, seedPolicy.kind: "daily-utc") is "the date IS the seed
// source", not a client-supplied string, matching daily.mjs's own header framing.
export function createDailyEngine(date) {
  if (typeof date !== "string" || date.length === 0) {
    throw new TypeError("createDailyEngine: date must be a non-empty YYYY-MM-DD string");
  }
  const seed = dailySeed(date);
  const arena = dailyArena(seed);
  return createGameState({
    world: arena.world,
    player: {
      x: arena.playerSpawn.x,
      z: arena.playerSpawn.z,
      angle: Math.PI / 2 + arena.playerSpawn.angle,
    },
    demons: arena.demonSpawns.map((d) => ({ id: d.id })),
    cam: { fov: Math.PI / 3, maxDist: 24, width: 64, height: 48 },
  });
}

// applyIntent(state, intent) — the one required Cartridge method. durante has one intent kind: "move",
// wrapping exactly the { forward, strafe, turn, fire } payload game.mjs#tick already accepts.
export function applyIntent(state, intent) {
  if (!intent || intent.kind !== "move") {
    throw new TypeError(`applyIntent: unknown intent kind ${intent?.kind}`);
  }
  const next = gameTick(state, intent.move ?? {});
  return { state: next, events: [{ kind: "tick-report", report: next.report }] };
}

// serialize/deserialize — see this module's header: converts the Map-shaped world to/from a plain,
// canonically-orderable array so hashing and storage never silently drop it.
export function serialize(state) {
  return {
    player: state.player,
    demons: state.demons,
    phase: state.phase,
    cam: state.cam,
    passContested: state.passContested,
    world: [...state.world.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  };
}

export function deserialize(data) {
  return { ...data, world: new Map(data.world), log: [] };
}

// hashState(state) — hash the SERIALIZED form (never the raw Map-bearing state — see header).
export function hashState(state) {
  return cartridgeHashState(serialize(state));
}

// replay(seed, intents, configId) — cartridge's generic replay harness (replay.mjs's own doc comment:
// "Any implementer of Cartridge.replay may delegate to this verbatim"), with `stateHash` corrected to
// the serialized-form hash afterward (defaultReplay's own internal hashState call would otherwise hash
// the raw Map and silently collapse every world to the same "{}" hash — see header).
export function replay(seed, intents, configId) {
  const result = defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
  return { ...result, stateHash: hashState(result.finalState) };
}

// verify(seed, configId, intentLog) — mirrors @red-cup-engineering/cartridge/replay's own createVerifier shape
// (unwrap each entry's `.intent`, delegate to replay), built on the corrected `replay` above rather than
// cartridge's `createVerifier` directly, for the same Map-hashing reason.
export function verify(seed, configId, intentLog) {
  const bareIntents = intentLog.map((entry) => entry.intent);
  const result = replay(seed, bareIntents, configId);
  return {
    valid: result.valid, finalState: result.finalState, events: result.events, stateHash: result.stateHash,
  };
}

// buildIntentLog(moves) — moves is an array of { forward, strafe, turn, fire } tick intents; wraps each
// in the house envelope via cartridge's own appendEntry (monotonic seq — THE append-only intent-log
// shape every 561 Group game uses, per intent-log.mjs's own header). Returns a validated IntentLog.
export function buildIntentLog(moves) {
  let log = [];
  for (const move of moves) log = appendEntry(log, { kind: "move", move });
  const result = validateIntentLog(log);
  if (!result.valid) throw new TypeError(`buildIntentLog: ${result.errors.join("; ")}`);
  return log;
}

export const durante = { createEngine, applyIntent, replay, serialize, deserialize };
