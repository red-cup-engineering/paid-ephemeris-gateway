// create-server — the composition root. LIFTED from apps/games/aletheon/server/app.mjs (the build-
// the-world, build-the-http+ws-server, build-the-session-hub, expose-one-step() shape) and merged
// with apps/games/ruinfold/server/bin wiring, then generalized: the game injects its world, its
// runTick, its snapOf, and its intent validator; qwzspace assembles the queue, the snapshot-manager,
// the broadcast-hub, the chosen transport (SSE or WS), and the tick-driver around them.
//
// Keeping the loop OUT of the wiring (aletheon's discipline) lets a bin DRIVE it on a timer (start)
// and a test drive it BY HAND (step), with identical wiring — deterministic tests, single source of
// composition. `step()` advances exactly one tick and pushes to every client; `start()` runs the
// tick-driver's setInterval cadence with the overrun guard.
//
//   const game = createServer({
//     transport: "sse" | "ws",          // which wire (default "sse")
//     runTick,                          // async (tick, intents) -> { dirty, events? }
//     subjectsOf, snapOf,               // the snapshot-manager boundary (read the settled trace)
//     validate,                         // the intent-queue trust boundary
//     interest,                         // optional per-subscriber interest predicate (id, sub) => bool
//     bootstrap,                        // optional async () -> startTick (resume from the trace)
//     clientDir,                        // optional static client root
//     intervalMs, heartbeatMs,
//     onJoin,                           // ws-only: (conn, ctx) => session  (per-connection wiring)
//   })
//   game.handler                        // sse: the node:http request handler (pass to createServer)
//   game.attach(httpServer)             // ws: upgrade sockets on the http server
//   game.step()                         // advance ONE tick by hand (tests)
//   await game.start()                  // run the timer-driven tick-driver; resolves to a stop handle
//   game.hub / game.queue / game.snapshot

import { createIntentQueue } from "./intent-queue.mjs";
import { createSnapshotManager } from "./snapshot-manager.mjs";
import { createBroadcastHub } from "./broadcast-hub.mjs";
import { startTickDriver } from "./tick-driver.mjs";
import { createSseHandler } from "./http-sse-server.mjs";
import { attach as wsAttach, wsClient } from "./http-ws-server.mjs";

export function createServer({
  transport = "sse",
  runTick,
  subjectsOf,
  snapOf,
  validate,
  interest = null,
  bootstrap = null,
  clientDir = null,
  intervalMs = 200,
  heartbeatMs = 15000,
  onJoin = null,
} = {}) {
  if (typeof runTick !== "function") throw new TypeError("create-server: runTick is required");

  const queue = createIntentQueue({ validate });
  const snapshot = createSnapshotManager({ subjectsOf, snapOf, interest });
  const hub = createBroadcastHub();
  const perSubscriber = interest != null;

  let tick = 0;
  const tickNow = () => tick;

  // step — advance EXACTLY one tick by hand: drain → runTick (single writer) → resettle → push. The
  // deterministic sibling of start(); a test drives this to assert per-tick behavior without timers.
  async function step() {
    const next = tick + 1;
    const intents = queue.drain();
    const result = (await runTick(next, intents)) ?? {};
    tick = next;
    if (perSubscriber) {
      await snapshot.resettle(result.dirty ?? [], tick);
      hub.each((client, subscriber) => {
        if (!subscriber) return;
        const d = subscriber.delta(tick, client.lastSeq ?? 0);
        if (d.entities.length || d.removed.length) hub.send(client, d);
      });
    } else {
      const d = await snapshot.resettle(result.dirty ?? [], tick);
      if (d.entities.length || d.removed.length) hub.broadcast(d);
    }
    for (const ev of result.events ?? []) hub.broadcast(ev);
    return result;
  }

  // start — run the timer-driven tick-driver. It bootstraps the snapshot cache (and optionally
  // resumes the tick from the trace), then ticks every intervalMs with the overrun guard. Keeps the
  // local `tick` mirror in sync via the driver's tickNow.
  async function start() {
    const driver = await startTickDriver({
      hub, snapshot, queue, runTick, bootstrap, intervalMs, heartbeatMs, perSubscriber,
    });
    tick = driver.tickNow();
    // keep the local mirror current for handler reads (tickNow closure reads this `tick`).
    const orig = driver.tickNow;
    return {
      stop: driver.stop,
      tickNow() { tick = orig(); return tick; },
    };
  }

  // bootstrap the snapshot cache eagerly so a client connecting before the first tick still gets a
  // full opening frame. start() bootstraps again (cheap, idempotent) and may advance the tick.
  const ready = (async () => { await snapshot.bootstrap(tick); })();

  const api = { queue, snapshot, hub, step, start, tickNow, ready };

  // --- transport wiring -------------------------------------------------------------------------
  if (transport === "sse") {
    api.handler = createSseHandler({ hub, queue, snapshot, tickNow, clientDir });
  } else if (transport === "ws") {
    // ws — per connection, the game wires a session (onJoin) that reads frames and pushes the full
    // snapshot, OR, with no onJoin, a default session that binds a subscriber and queues raw frames.
    api.attach = (httpServer) => {
      wsAttach(httpServer, (conn) => {
        const client = wsClient(conn);
        const remove = hub.add(client);
        if (snapshot && typeof snapshot.subscribe === "function") {
          hub.bind(client, snapshot.subscribe(conn));
        }
        if (typeof onJoin === "function") {
          onJoin(conn, { hub, queue, snapshot, client, tickNow });
        } else {
          // default: a frame is a JSON intent — validate-and-queue (single-writer); the tick writes.
          conn.onMessage = (text) => {
            try { queue.push(JSON.parse(text)); } catch {}
          };
        }
        conn.onClose = remove;
      });
    };
    api.staticHandlerFor = clientDir; // the game pairs this with staticHandler(clientDir) if it wants
  } else {
    throw new TypeError(`create-server: unknown transport "${transport}" (use "sse" or "ws")`);
  }

  return api;
}
