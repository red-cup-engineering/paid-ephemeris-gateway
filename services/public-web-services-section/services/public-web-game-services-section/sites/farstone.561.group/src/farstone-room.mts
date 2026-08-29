// farstone-room — qwzspace's `world: worldFactory` seam (room.mjs), Farstone's counterpart to
// Tidepool's own `tidepool-room.mts` (tidepool-services-section sibling) — but wired to Farstone's
// EXISTING `MudServer` (mud-server.mjs), not a parallel join/submit/step chain of this file's own.
//
// WHY THIS DIVERGES FROM TIDEPOOL'S OWN WIRING, DELIBERATELY: Tidepool has no pre-existing HTTP API,
// so its room wires qwzspace straight to feltos's `createEngine`/`join`/`submit`/`step` (its own
// header explains why: never `MudServer`, "which would just duplicate what qwzspace's room already
// does"). Farstone is the opposite situation — it ALREADY ships a JSON request/response API
// (http-wiring.mts / serve.mts) built on ONE raw, synchronous `MudServer` instance that headless
// clients and wheatstone depend on, unchanged, per this feature's own requirement. Introducing a
// SECOND, independently-stepped feltos engine for the WS transport would fork the world in two —
// exactly the single-source-of-truth failure this design avoids. So: `worldFactory()` here
// constructs a fresh `MudServer` (from the SAME immutable `bootEngine` every call — feltos engines
// are immutable/frozen, so replaying the same intent sequence against independently-constructed
// MudServer instances seeded from the same snapshot is exactly as safe as Tidepool's own
// join/submit/step replay; see that file's header for the identical reasoning), and the FIRST
// (live) instance's MudServer becomes the ONE object BOTH transports drive: this file's own
// `runTick` routes WS intents into `mud.connect()`/`mud.enqueue()`/`mud.tick()` — the exact same
// methods the JSON `/connect`, `/command`, and `/tick` routes already call — and `serve.mts` hands
// that SAME live instance to `createFarstoneHttpServer`, completely unchanged.
//
// "runTick calls the feltos engine's step": `mud.tick()` (mud-server.mjs) calls engine.mjs's own
// `step()` internally — one `MudServer.tick()` per `runTick`, "qwzspace's tick literally IS feltos's
// tick" one level of indirection through the object Farstone's HTTP API already trusts.
//
// TWO IDENTITY SPACES, deliberately kept distinct — exactly as tidepool-room.mts documents (same
// reasoning applies verbatim here):
//   - the qwzspace-level actorId (room.mjs's own `"a" + randomBytes(6).hex()`, one per LIVE
//     connection) — qwzspace's entity-cache key AND the id a client's `view.myId()` adopts from
//     `hello`. Tier-1 (resume-token) reconnection is entirely qwzspace's own mechanism, keyed on
//     THIS id.
//   - the feltos actor id (`actorIdFor(name)`, mud-server.mjs — a deterministic
//     `sha256(normalized-name)` slug) — the PERSISTED body: location, inventory, standing, coin.
//     `mud.connect(name)` resolves to this id; two different qwzspace connections presenting the
//     same display name resolve to the SAME feltos actor (Tier-2 identity), because `join()`
//     (engine.mjs, called internally by `MudServer.connect`) is a documented no-op when the actor
//     already exists.
//
// `bodyOf` (below) is the live map from the first identity space to the second, held in ONE
// worldFactory() call's closure — never shared across independent instances.
//
// HONEST, DISCLOSED LIMITATION (a genuine cost of the divergence above, named plainly rather than
// hidden): because the explicit `POST /tick` HTTP route continues to call `mud.tick()` directly
// (unchanged, per the "HTTP API MUST keep working unchanged" requirement) — a mutation this room's
// own qwzspace intent log never records — qwzspace's own `room.verify()`/self-audit (replay-from-log
// vs. live state hash) is only meaningful for a room instance that has NEVER been driven by an
// explicit `/tick` call outside its own `stepOnce()`/`runTick()`. This is true of every test in
// farstone-room.test.mts (which never exercises the HTTP layer in the same process) and NOT
// guaranteed true of a live, mixed-transport deployment where both `/tick` and WS traffic hit the
// same instance — `selfAuditEvery` stays 0 here for exactly this reason (never wired to run
// automatically in `createFarstoneRoom`), matching Tidepool's own default and its own stated
// rationale ("a correctness dial, not required for v1 durability, which rests entirely on FeltOS's
// own bucket-persisted trace" — true here too: Farstone's durability rests on world-store.mts's
// engine snapshot, not on qwzspace's log-replay).

import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { createRoom } from "@red-cup-engineering/qwzspace/room";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { perceptionSnapEntry, type PerceptionEvent } from "./farstone-perception.mts";
import { gameValidate } from "./farstone-protocol.mts";

const RECENT_EVENTS_PER_ACTOR = 20;

type FeltosMud = ReturnType<typeof createMudServer>;

export interface FarstoneWorldInstance {
  runTick: (tick: number, intents: readonly RoomIntent[]) => Promise<{ dirty: string[]; events: unknown[] }>;
  subjectsOf: (tick: number) => string[];
  snapOf: (id: string, tick: number) => unknown;
  /** NOT part of qwzspace's own `{runTick, subjectsOf, snapOf}` contract — room.mjs's own
   *  destructuring assignment simply ignores extra fields, so this rides alongside for
   *  `serve.mts`/`http-wiring.mts`'s own use of the live MudServer instance. */
  mud: () => FeltosMud;
}

interface RoomIntent {
  actorId: string;
  seq: number;
  kind: string;
  args: Record<string, unknown>;
}

export interface FarstoneWorldFactoryOptions {
  maxAssertions?: number;
}

/** `worldFactory()` — called ONCE for room.mjs's live instance, and again (independently) for
 *  every self-audit/verify replay (see this file's header for the honest scope of when that replay
 *  is actually meaningful for Farstone). `bootEngine` is shared by reference (feltos engines are
 *  immutable) so every instance starts from the SAME restored-from-bucket state the live instance
 *  did. */
export function createFarstoneWorldFactory(bootEngine: unknown, opts: FarstoneWorldFactoryOptions = {}): () => FarstoneWorldInstance {
  return function worldFactory(): FarstoneWorldInstance {
    const mud = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine: bootEngine as never, maxAssertions: opts.maxAssertions ?? 20_000 });
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
          try {
            const feltosActor = mud.connect(name);
            bodyOf.set(it.actorId, feltosActor);
          } catch {
            // a malformed/empty name: the connection stays unmapped; its commands are silently
            // dropped below until it reconnects with a usable one. Never throws into the tick.
          }
          continue;
        }
        if (it.kind === "presence.leave") {
          // deliberately NOT an eviction: the persisted actor's body stays exactly where it was —
          // mud never sees a disconnect(). Only this session's own mapping is dropped ("gone AFK,
          // not vanished", mirroring tidepool-room.mts's identical presence.leave handling).
          bodyOf.delete(it.actorId);
          continue;
        }
        if (it.kind === "command") {
          const feltosActor = bodyOf.get(it.actorId);
          const command = it.args["command"];
          if (feltosActor === undefined || typeof command !== "string") continue;
          try {
            mud.enqueue(feltosActor, command);
          } catch {
            // enqueue() only throws for an unconnected actor / empty command — both already
            // excluded by gameValidate + the join-then-command ordering above; defensive.
          }
        }
      }

      const receipt = mud.tick() as { events: { to: string; channel: string; text: string }[] };
      for (const event of receipt.events) pushEvent(event.to, tick, event.channel, event.text);

      // "dirty" is conservatively every currently-connected WS session — climate/director/depths
      // onTick effects are ambient and can touch anyone's perception, same disclosure as
      // tidepool-room.mts's own runTick.
      return { dirty: [...bodyOf.keys()], events: [] };
    }

    function subjectsOf(_tick: number): string[] {
      return [...bodyOf.keys()];
    }

    function snapOf(id: string, tick: number): unknown {
      const feltosActor = bodyOf.get(id);
      if (feltosActor === undefined) return null; // not yet joined (or left): nothing to render
      const recent = recentByActor.get(feltosActor) ?? [];
      const world = (mud.engine() as { world: unknown }).world;
      const entry = perceptionSnapEntry(world, feltosActor, tick, recent);
      return { ...entry, id }; // cache key MUST match the qwzspace-level id (interest compares against it)
    }

    return { runTick, subjectsOf, snapOf, mud: () => mud };
  };
}

/** `interest(id, subscriberId)` — a subscriber sees only the cache entry keyed by their own
 *  qwzspace actorId. Identical correlation trick to tidepool-room.mts's own `tidepoolInterestFor`
 *  (same qwzspace version, same underlying quirk in create-server.mjs binding a subscriber's
 *  interest-filtering identity to the raw connection object before room.mjs assigns the room-level
 *  actorId) — see that function's own header for the full trace of why this is safe without
 *  editing qwzspace's tree. */
export function farstoneInterestFor(getRoom: () => { members(): Map<string, { conn: unknown }> } | null) {
  return function farstoneInterest(id: string, subscriberId: unknown): boolean {
    const room = getRoom();
    if (room === null) return false;
    for (const [actorId, member] of room.members()) {
      if (member.conn === subscriberId) return actorId === id;
    }
    return false;
  };
}

export interface FarstoneRoomOptions {
  id?: string;
  intervalMs?: number;
  maxAssertions?: number;
}

/** Assemble the qwzspace room. `bootEngine` should already reflect any bucket/disk restore (see
 *  `serve.mts`) — this file never touches persistence itself. */
export function createFarstoneRoom(bootEngine: unknown, opts: FarstoneRoomOptions = {}) {
  let liveHandle: FarstoneWorldInstance | null = null;
  const factory = createFarstoneWorldFactory(bootEngine, { maxAssertions: opts.maxAssertions });
  function worldFactory(): FarstoneWorldInstance {
    const handle = factory();
    if (liveHandle === null) liveHandle = handle; // capture only the FIRST call as "live"
    return handle;
  }
  let roomRef: ReturnType<typeof createRoom> | null = null;
  const room = createRoom({
    id: opts.id ?? "farstone",
    world: worldFactory,
    validate: gameValidate,
    interest: farstoneInterestFor(() => roomRef),
    intervalMs: opts.intervalMs ?? 1000, // matches Farstone's own default FELTOS_TICK_MS (serve.mts)
    selfAuditEvery: 0, // off by default — see this file's header "HONEST, DISCLOSED LIMITATION"
  });
  roomRef = room;
  return {
    room,
    /** The live MudServer instance — the SAME object `serve.mts` hands to
     *  `createFarstoneHttpServer`, unchanged. Throws if called before the room has driven its own
     *  live worldFactory() call — createRoom does this synchronously in its own constructor, so
     *  this is always populated by the time createRoom returns. */
    liveMud: (): FeltosMud => {
      if (liveHandle === null) throw new Error("farstone-room: live world instance not yet constructed");
      return (liveHandle as FarstoneWorldInstance).mud();
    },
  };
}

export { FARSTONE_GAME, FARSTONE_RUNTIME };
