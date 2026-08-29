// tidepool-room — qwzspace's `world: worldFactory` seam (room.mjs), wired directly to feltos's
// own `createEngine`/`join`/`submit`/`step` (engine.mjs) — never `MudServer` (mud-server.mjs's
// convenience wrapper owns its OWN pending-queue/tick loop, which would just duplicate what
// qwzspace's room already does). qwzspace's tick literally IS feltos's tick — one `step()` call
// per `runTick`, per design §3.
//
// TWO IDENTITY SPACES, deliberately kept distinct (design §2.4):
//   - the qwzspace-level actorId (room.mjs's own `"a" + randomBytes(6).hex()`, one per LIVE
//     connection) — this is qwzspace's entity-cache key AND the id a client's `view.myId()`
//     adopts from `hello`. Tier 1 (resume-token) reconnection is entirely qwzspace's own
//     mechanism, keyed on THIS id.
//   - the feltos actor id (`actorIdFor(name)`, mud-server.mjs — a deterministic
//     `sha256(normalized-name)` slug) — the PERSISTED body: location, inventory, standing. Two
//     different qwzspace connections presenting the same display name resolve to the SAME
//     feltos actor (Tier 2, design §2.4): `join()` (engine.mjs) is a documented no-op when the
//     actor already exists in `engine.actors`, so a restored-from-bucket world's prior actor is
//     picked back up exactly, not recreated.
//
// `bodyOf` (below) is the live map from the first identity space to the second, held in ONE
// worldFactory call's closure — never shared across independent instances (see the header note
// on why `worldFactory` is a FACTORY, not a shared closure, in room.mjs).
//
// PER-ACTOR ENTITIES, not per-room-object ones: Tidepool's qwzspace "entity" IS one actor's own
// perception frame (perception.mts) — `interest(id, subscriberId) = id === subscriberId` means
// every subscriber's cache view holds exactly one entry: their own frame. This is deliberate and
// matches design §5.1's own framing ("Tidepool's 'entity' IS the perception frame").

import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { actorIdFor } from "@red-cup-engineering/feltos/mud-server";
import { createRoom } from "@red-cup-engineering/qwzspace/room";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { TIDEPOOL_RUNTIME } from "./tidepool-capabilities.mts";
import { perceptionSnapEntry, type PerceptionEvent } from "./perception.mts";
import { gameValidate } from "./tidepool-protocol.mts";

const RECENT_EVENTS_PER_ACTOR = 20;

export interface TidepoolWorldInstance {
  runTick: (tick: number, intents: readonly RoomIntent[]) => Promise<{ dirty: string[]; events: unknown[] }>;
  subjectsOf: (tick: number) => string[];
  snapOf: (id: string, tick: number) => unknown;
  /** NOT part of qwzspace's own `{runTick, subjectsOf, snapOf}` contract — room.mjs's
   *  destructuring assignment (`const { runTick, subjectsOf, snapOf } = live;`) simply ignores
   *  extra fields, so this rides alongside for `tidepool-runtime.mts`'s persistence reads. */
  engine: () => unknown;
}

interface RoomIntent {
  actorId: string;
  seq: number;
  kind: string;
  args: Record<string, unknown>;
}

type FeltosEngine = ReturnType<typeof createEngine>;

/** `worldFactory()` — called ONCE for room.mjs's live instance, and again (independently) for
 *  every self-audit/verify replay. `bootEngine` is shared by reference (feltos engines are
 *  immutable/frozen — every instance only ever REASSIGNS its own local `engine` variable to a
 *  fresh frozen object, never mutates the shared boot snapshot) so a replay instance starts from
 *  the SAME restored-from-bucket state the live instance did, not an empty world — the honest
 *  precondition for a meaningful state-hash comparison. */
export function createTidepoolWorldFactory(bootEngine: FeltosEngine): () => TidepoolWorldInstance {
  return function worldFactory(): TidepoolWorldInstance {
    let engine: FeltosEngine = bootEngine;
    const bodyOf = new Map<string, string>(); // qwzspace actorId -> feltos actor id
    const recentByActor = new Map<string, PerceptionEvent[]>();

    function pushEvent(feltosActor: string, tick: number, channel: string, text: string): void {
      const list = recentByActor.get(feltosActor) ?? [];
      list.push({ tick, channel, text });
      while (list.length > RECENT_EVENTS_PER_ACTOR) list.shift();
      recentByActor.set(feltosActor, list);
    }

    async function runTick(tick: number, intents: readonly RoomIntent[]): Promise<{ dirty: string[]; events: unknown[] }> {
      for (const it of intents) {
        if (it.kind === "presence.join") {
          const name = typeof it.args["name"] === "string" ? (it.args["name"] as string) : "wanderer";
          const feltosActor = actorIdFor(name);
          try {
            engine = join(engine, feltosActor);
            bodyOf.set(it.actorId, feltosActor);
          } catch {
            // a malformed/reserved name (collides with a room or thing id) — the connection
            // stays unmapped; its commands are silently dropped below until it reconnects with
            // a usable name. Never throws into the tick.
          }
          continue;
        }
        if (it.kind === "presence.leave") {
          // deliberately NOT an eviction (design §3): the feltos actor's body stays exactly
          // where it was — engine.actors is untouched. Only this session's mapping is dropped.
          bodyOf.delete(it.actorId);
          continue;
        }
        if (it.kind === "command") {
          const feltosActor = bodyOf.get(it.actorId);
          const command = it.args["command"];
          if (feltosActor === undefined || typeof command !== "string") continue;
          try {
            engine = submit(engine, { actor: feltosActor, command });
          } catch {
            // submit() only throws on a shape violation (unjoined actor / empty command) — both
            // already excluded by gameValidate + the join-then-command ordering above; defensive.
          }
        }
      }

      const result = step(engine, { runtime: TIDEPOOL_RUNTIME });
      engine = result.engine;
      const events = result.receipt.events as { to: string; channel: string; text: string }[];
      for (const event of events) pushEvent(event.to, tick, event.channel, event.text);

      // "dirty" is conservatively every currently-connected session (design §3's own disclosure:
      // ecology/tide changes are ambient and can touch anyone's perception).
      return { dirty: [...bodyOf.keys()], events: [] };
    }

    function subjectsOf(_tick: number): string[] {
      return [...bodyOf.keys()];
    }

    function snapOf(id: string, tick: number): unknown {
      const feltosActor = bodyOf.get(id);
      if (feltosActor === undefined) return null; // not yet joined (or left): nothing to render
      const recent = recentByActor.get(feltosActor) ?? [];
      const entry = perceptionSnapEntry(engine.world, feltosActor, tick, recent);
      return { ...entry, id }; // cache key MUST match the qwzspace-level id (interest compares against it)
    }

    return { runTick, subjectsOf, snapOf, engine: () => engine };
  };
}

/** `interest(id, subscriberId)` — a subscriber sees only the cache entry keyed by their own
 *  qwzspace actorId (their own perception frame), never another actor's.
 *
 *  THE CORRELATION PROBLEM, and how this is solved without editing qwzspace's tree: qwzspace's
 *  own `create-server.mjs` calls `snapshot.subscribe(conn)` — the RAW per-connection object —
 *  before `room.mjs`'s own `onJoin`/`wireConnection` ever runs, so the `subscriberId` this
 *  predicate receives at call time is that same `conn` reference, NOT the room-level actorId
 *  string `id` is keyed by (confirmed by reading both modules directly: room.mjs's own
 *  `clientBinding` map — actorId per `client` — is private to that file and never exposed to the
 *  game). What room.mjs DOES expose is `members(): Map<actorId, { conn, client, ... }>` — and,
 *  read directly, `wireConnection`'s own join handler populates `members.set(actorId, { conn,
 *  ... })` BEFORE it ever calls `sub.full(tick)` (the first point `interest` can possibly run for
 *  a fresh connection) — so by the time this predicate is ever invoked, the (actorId -> conn)
 *  correlation `members()` needs is already present. `tidepoolInterestFor` closes over a
 *  getter for the live room (set immediately after `createRoom()` returns, in
 *  `createTidepoolRoom` below) and does the reverse lookup by reference equality on `conn`.
 *
 *  DISCLOSED LIMITATION: before a connection's own `presence.join` round-trip has registered it
 *  in `members()` (a window that, by the ordering just traced, cannot actually occur for real
 *  qwzspace-driven traffic — see above), this predicate fails closed (denies), never open. */
export function tidepoolInterestFor(getRoom: () => { members(): Map<string, { conn: unknown }> } | null) {
  return function tidepoolInterest(id: string, subscriberId: unknown): boolean {
    const room = getRoom();
    if (room === null) return false;
    for (const [actorId, member] of room.members()) {
      if (member.conn === subscriberId) return actorId === id;
    }
    return false; // subscriberId's connection has no registered member yet: nothing visible
  };
}

export interface TidepoolRoomOptions {
  id?: string;
  intervalMs?: number;
}

/** Assemble the qwzspace room. `bootEngine` should already reflect any bucket/disk restore
 *  (see `tidepool-runtime.mts`/`serve.mts`) — this file never touches persistence itself. */
export function createTidepoolRoom(bootEngine: FeltosEngine, opts: TidepoolRoomOptions = {}) {
  let liveHandle: TidepoolWorldInstance | null = null;
  const factory = createTidepoolWorldFactory(bootEngine);
  function worldFactory(): TidepoolWorldInstance {
    const handle = factory();
    if (liveHandle === null) liveHandle = handle; // capture only the FIRST call as "live" (see header)
    return handle;
  }
  // a mutable box for `tidepoolInterestFor` — `createRoom` itself is what NEEDS the `interest`
  // callback (passed below, in its own options object), so the room reference can only be
  // captured AFTER `createRoom` returns; see `tidepoolInterestFor`'s own header for why this is
  // still safe (interest is never evaluated before that point for real qwzspace-driven traffic).
  let roomRef: ReturnType<typeof createRoom> | null = null;
  const room = createRoom({
    id: opts.id ?? "tidepool",
    world: worldFactory,
    validate: gameValidate,
    interest: tidepoolInterestFor(() => roomRef),
    intervalMs: opts.intervalMs ?? 300_000, // 5 real minutes/tick — a tidal world's pace (design §3)
    selfAuditEvery: 0, // off by default (design §3/§7): a correctness dial, not required for v1
  });
  roomRef = room;
  return {
    room,
    /** The live engine, for persistence reads (`tidepool-runtime.mts`). Throws if called before
     *  the room has driven its own live worldFactory() call — createRoom does this synchronously
     *  in its own constructor, so this is always populated by the time createRoom returns. */
    liveEngine: (): unknown => {
      if (liveHandle === null) throw new Error("tidepool-room: live world instance not yet constructed");
      return (liveHandle as TidepoolWorldInstance).engine();
    },
  };
}

export { TIDEPOOL_GAME };
