// app — the composition root, shared by the bin entry and the net test. Builds the world, the
// http+ws server, and the session hub, and exposes a single `step()` that advances one tick and
// syncs every player. Keeping the loop OUT of here lets the bin drive it on a timer and the test
// drive it by hand (deterministic), with identical wiring.
//
// MIGRATED onto @red-cup-engineering/qwzspace (the shared realtime webapp-game engine; scope/version
// repoint 2026-08-20 from @red-cup-engineering/qwzspace@0.0.2 to @red-cup-engineering/qwzspace@0.4.1 -- the
// ws-server/tick-driver surface this file actually uses is unchanged across that gap: `attach`/
// `staticHandler(root, index)` and `startTickDriver({hub, snapshot, queue, runTick, intervalMs,
// heartbeatMs, perSubscriber})` kept identical signatures, confirmed by reading both packages' real
// source before repointing, not assumed from the version bump alone; only the rooms/intent-log
// v-next surface this file never touched changed). The hand-rolled realtime pieces aletheon used to
// keep here — the RFC 6455 WebSocket carrier (was server/net/ws.mjs), the static client server (was
// server/http.mjs), and the fixed-tick loop (was the bin's setInterval) — are qwzspace's: `attach`/
// `wsClient`/`staticHandler` from http-ws-server, and `startTickDriver`. We pass aletheon's WORLD and
// per-connection Session IN; qwzspace owns the wire and the cadence. The game DOMAIN stays
// aletheon's: the Session is the interest-filtered projection (it sends bilattice-glyphed domain
// frames itself), so qwzspace's snapshot-manager/broadcast delta path is bypassed by a pass-through
// snapshot — the Session IS aletheon's reactive view over the trace. `step()` stays the hand-driven
// tick (deterministic tests); `start()` runs qwzspace's driver.

import { createServer as createHttpServer } from "node:http";
import { attach, staticHandler } from "@red-cup-engineering/qwzspace/http-ws-server";
import { startTickDriver } from "@red-cup-engineering/qwzspace/tick-driver";
import { Session } from "./net/session.mjs";
import { createWorld, replay } from "./world/store.mjs";
import { seedWorld } from "./world/seed.mjs";
import { tick } from "./world/ticking.mjs";
import { makeClaim } from "./world/claims.mjs";
import { KIND } from "../shared/constants.mjs";

// `rows` (optional) — a previously-saved EAVT trace (from a local WORLD_LOG file or a GCS bucket
// log-store, both read by scripts/aletheon-server.mjs before calling here) to REPLAY instead of
// seeding a fresh world. Absent/empty means "no saved state" — exactly the same fresh-seed boot
// this always did. `onAppend` (optional) rides straight through to createWorld/replay — see its
// own doc in world/store.mjs.
export function createGameServer({ root, logPath = null, onAppend = null, rows = null, seed = true } = {}) {
  const restoring = Array.isArray(rows) && rows.length > 0;
  const world = restoring ? replay(rows, { logPath, onAppend }) : createWorld({ logPath, onAppend });
  if (restoring) {
    // Claim-altar state (server/world/claims.mjs's `.claim` cell) is never filed onto the EAVT
    // trace as its own restorable shape — only the derived "claimed"/"erupted"/"claim-decayed"
    // events are, and folding those back into a live claim cell would be real new work (a second
    // fold, parallel to this one), not a minimal fix. So a restored altar exists (its "spawned"
    // row round-trips like any entity) but starts with a FRESH, blank claim rather than its old
    // one — safe (every claims.mjs call site already null-checks `.claim`) but a real, honest gap:
    // player-staked evidence at altars does not currently survive a restart. See README.
    for (const e of world.entities.values()) if (e.kind === KIND.altar && !e.claim) e.claim = makeClaim();
  } else if (seed) {
    seedWorld(world);
  }

  const hub = {
    world,
    sessions: new Set(),
    drop(s) { this.sessions.delete(s); },
    broadcastChat(from, line) { for (const s of this.sessions) s.sendChat(from, line); },
    // [economy] sessionOf — the live Session driving a player entity id, or null.
    sessionOf(id) { for (const s of this.sessions) if (s.id === id) return s; return null; },
    // [economy] relayTo — deliver a trade-side message to a specific player's session. `what` is
    // "chat" (payload {from, line}) or "inventory" (payload is the player ENTITY, whose inventory
    // the session re-sends). Used by trade handling to notify the partner of a propose/accept/seal.
    relayTo(id, what, payload) {
      const s = this.sessionOf(id);
      if (!s) return false;
      if (what === "chat") s.sendChat(payload.from, payload.line);
      else if (what === "inventory") s.sendInventory(payload);
      return true;
    },
    // [qwzspace] heartbeat — the tick-driver pings idle clients on its heartbeat cadence; each WS
    // Conn answers RFC 6455 ping/pong itself, so there is nothing for the session hub to do here.
    heartbeat() {},
  };

  // The realtime carrier is qwzspace's hand-rolled WebSocket (transport "ws"): `attach` upgrades a
  // socket and hands us a Conn (the same shape aletheon's Session has always taken — onMessage /
  // onClose / send). We wire one Session per connection; the Session reads frames, spawns the player,
  // and streams the interest-filtered domain projection. Static client assets ride qwzspace's
  // staticHandler ("/" -> /client/index.html), folded into the same node:http server.
  const onHttp = root ? staticHandler(root, "/client/index.html") : (req, res) => res.writeHead(404).end();
  const server = createHttpServer(onHttp);
  attach(server, (conn) => hub.sessions.add(new Session(conn, hub)));

  // runTick — the single-writer transaction body qwzspace's tick-driver (and our own step) invoke:
  // advance the sim ONE tick, drain the world's transient events to the sessions that should see
  // them, then sync every player their interest-filtered delta. The Session owns the projection, so
  // we return no qwzspace-level dirty/events — aletheon's reactive view is the Session's `sync()`.
  function runTick() {
    tick(world);
    const events = world.events;
    world.events = [];
    for (const ev of events) {
      if (ev.kind === "combat") for (const s of hub.sessions) s.notifyCombat(ev);
      // [tide] a Bragg resonance bloomed for a player — announce it to the realm via chat.
      else if (ev.kind === "resonance") hub.broadcastChat("Aletheon", `a Bragg resonance blooms — ${ev.reward} marks settle into ${ev.name}.`);
      // [claims] a SANCTUARY altar paid its coherence dividend to its claimants — announce it.
      else if (ev.kind === "dividend") hub.broadcastChat("Aletheon", `${ev.name} (t) pays a dividend — ${ev.paid.length} claimant(s) rewarded for coherence.`);
    }
    for (const s of hub.sessions) s.sync();
    return { dirty: [], events: [] };
  }

  // step — advance EXACTLY one tick by hand. The deterministic sibling of start(): the net test
  // drives this to assert per-tick behavior without timers; identical wiring, no clock.
  function step() { runTick(); }

  // start — run the live loop on qwzspace's tick-driver: every TICK_MS it drains (a no-op queue —
  // aletheon's Session stages intents directly onto entities), runs one tick, and (via our pass-
  // through snapshot) lets the Session push. Returns the driver's stop handle. The bin calls this.
  async function start({ intervalMs, heartbeatMs = 15000 } = {}) {
    return startTickDriver({
      hub,
      snapshot: passThroughSnapshot,
      queue: noopQueue,
      runTick,
      intervalMs,
      heartbeatMs,
      perSubscriber: false,
    });
  }

  return { world, hub, server, step, start };
}

// passThroughSnapshot — aletheon's Session IS its reactive view over the trace (it diffs and sends
// the interest-filtered domain frames itself), so qwzspace's snapshot-manager delta path is unused.
// The tick-driver still calls bootstrap/resettle, so we satisfy that shape with empty frames.
const passThroughSnapshot = {
  async bootstrap(t) { return { type: "full", tick: t, entities: [] }; },
  async resettle(_dirty, t) { return { type: "delta", tick: t, entities: [], removed: [] }; },
};

// noopQueue — aletheon stages player intents directly onto the entity (e.input) when the Session
// reads a frame, not through a central queue, so the tick-driver drains nothing here.
const noopQueue = { drain() { return []; }, depth() { return 0; } };
