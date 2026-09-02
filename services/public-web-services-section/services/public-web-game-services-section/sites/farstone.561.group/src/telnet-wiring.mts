// telnet-wiring — feltos's telnet transport (@red-cup-engineering/feltos/telnet) wired onto
// Farstone's SAME live MudServer instance (serve.mts's `mud`), split out for direct testability
// exactly like world-hosting's http-wiring. See each export's own JSDoc for the "one clock, not two" design
// and the feltos-side composition gap this module works around without editing feltos.

import { closeMudTelnetServer, createMudTelnetServer, listenMudTelnetServer, tickMudTelnetServer } from "@red-cup-engineering/feltos/telnet";
import type { WorldRuntime } from "@red-cup-engineering/world-hosting/world-runtime";

/** The exact slice of a feltos `MudServer` (`mud-server.mjs`) this module reads from and wraps.
 *  `connectAnonymous`/`register`/`login`/`who`/`chat`/`tell` are the anonymouse-on-connect
 *  identity/talker verbs telnet.mjs's `createMudTelnetServer` validates at startup
 *  (`connectAnonymous`) or calls straight off this object at runtime (the rest) — see this
 *  file's header for the "one clock" composition this module wraps them into. */
export interface TelnetMudLike {
  connect(name: unknown): unknown;
  connectAnonymous(): unknown;
  disconnect(actor: unknown): void;
  enqueue(actor: unknown, command: unknown): void;
  drain(actor: unknown): unknown;
  engine(): unknown;
  register(actor: unknown, name: unknown): unknown;
  login(actor: unknown, name: unknown, password: unknown): unknown;
  who(): unknown;
  whoami(actor: unknown): unknown;
  finger(name: unknown): unknown;
  chat(actor: unknown, body: unknown): unknown;
  tell(actor: unknown, targetName: unknown, body: unknown): unknown;
}

export interface FarstoneTelnetOptions {
  host?: string;
  port?: number;
  /** How often, while >=1 telnet session is connected, this runs `runtime.preRequestCatchUp()`
   *  on telnet's behalf — telnet sessions raise no HTTP/WS request of their own to drive the
   *  world's one clock. Defaults to the world's own tick interval. */
  catchUpIntervalMs?: number;
  onCatchUpError?: (error: unknown) => void;
}

export interface FarstoneTelnetServer {
  server: ReturnType<typeof createMudTelnetServer>;
  origin: string;
  /** Live connected-socket count, tracked via this module's own `'connection'`/`'close'`
   *  listeners on the underlying `net.Server` (additive: Node dispatches these events to every
   *  registered listener, alongside feltos's own). */
  sessionCount: () => number;
  close: () => Promise<void>;
}

function defaultCatchUpErrorLog(error: unknown): void {
  process.stderr.write(`Farstone telnet catch-up failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
}

/**
 * listenFarstoneTelnet — wire feltos's telnet transport onto `mud` (the SAME live MudServer
 * `serve.mts` hands to `createWorldHttpServer`), tick-driven from `runtime`'s own catch-up
 * path — one clock, never a second independent setInterval driving the ENGINE (serve.mts's own
 * stated design; see world-hosting's world-runtime's header). feltos's `tickMudTelnetServer` bundles "tick
 * the engine" with "push connected sessions' output" in one call and exposes no push-only
 * counterpart nor an injectable tick function (a feltos-side gap, filed not fixed — a parallel
 * lot owns feltos): this function works around it by handing `createMudTelnetServer` a thin
 * wrapper whose `.tick()` is a no-op and whose other methods pass straight through to `mud` —
 * same world, same actors, same state, tick ownership subtracted out. Callers drive the actual
 * push half via `pushFarstoneTelnetUpdates`, from `runtime`'s own `onCatchUp` hook.
 *
 * A second feltos-side gap (also filed, not fixed): `createMudTelnetServer`'s `MudServer`-shaped
 * interface requires fully SYNCHRONOUS `connect`/`enqueue` (telnet.mjs's own `handleLine` never
 * awaits them), unlike world-hosting's http-wiring's composition (which wraps http.mjs's request listener
 * from OUTSIDE and awaits `preRequestCatchUp()` before it runs). Telnet has no equivalent
 * request/response boundary to interpose an async catch-up on, so a fresh `connect()` here can
 * only flush afterward fire-and-forget (below), not block the line on catch-up first — the
 * steady `catchUpIntervalMs` timer is what keeps telnet's view of the world moving instead.
 *
 * Defaults to port 4242, override via `opts.port` exactly like `PORT` overrides the HTTP port.
 */
export async function listenFarstoneTelnet(
  mud: TelnetMudLike,
  runtime: WorldRuntime,
  opts: FarstoneTelnetOptions = {},
): Promise<FarstoneTelnetServer> {
  const onCatchUpError = opts.onCatchUpError ?? defaultCatchUpErrorLog;

  const telnetMud: TelnetMudLike & { tick(): undefined } = {
    connect: (name: unknown) => {
      const actor = mud.connect(name);
      // Fire-and-forget flush-on-mutation, mirroring world-hosting's http-wiring's POST /connect — see this
      // function's own JSDoc for why it cannot be awaited here.
      void runtime.postRequestFlush(0).catch(onCatchUpError);
      return actor;
    },
    connectAnonymous: () => {
      const actor = mud.connectAnonymous();
      // Same rationale as connect() above: also a fresh join() into the engine, with no HTTP
      // request boundary of its own to flush from.
      void runtime.postRequestFlush(0).catch(onCatchUpError);
      return actor;
    },
    disconnect: (actor: unknown) => mud.disconnect(actor),
    enqueue: (actor: unknown, command: unknown) => mud.enqueue(actor, command),
    drain: (actor: unknown) => mud.drain(actor),
    engine: () => mud.engine(),
    register: (actor: unknown, name: unknown) => {
      const password = mud.register(actor, name);
      // register() reassigns engine.world (identity.mjs's registerAccount) — same
      // flush-on-mutation rationale as connect/connectAnonymous above.
      void runtime.postRequestFlush(0).catch(onCatchUpError);
      return password;
    },
    login: (actor: unknown, name: unknown, password: unknown) => {
      const authenticated = mud.login(actor, name, password);
      void runtime.postRequestFlush(0).catch(onCatchUpError);
      return authenticated;
    },
    who: () => mud.who(),
    // whoami()/finger() (2026-09-01 web-transport verb-parity lot) are pure reads, like who() —
    // no engine.world reassignment, so no flush here either.
    whoami: (actor: unknown) => mud.whoami(actor),
    finger: (name: unknown) => mud.finger(name),
    // chat()/tell() only push to in-memory event queues and the presence log — they never
    // reassign engine.world, so (like HTTP's own MUTATING_ROUTES) they need no flush here.
    chat: (actor: unknown, body: unknown) => mud.chat(actor, body),
    tell: (actor: unknown, targetName: unknown, body: unknown) => mud.tell(actor, targetName, body),
    tick: () => undefined,
  };

  const server = createMudTelnetServer(telnetMud as never);

  let sessionCount = 0;
  server.on("connection", (socket) => {
    sessionCount += 1;
    socket.once("close", () => { sessionCount -= 1; });
  });

  const { origin } = await listenMudTelnetServer(server, {
    host: opts.host ?? "127.0.0.1",
    port: opts.port ?? 4242,
  });

  const catchUpIntervalMs = opts.catchUpIntervalMs ?? 1000;
  const catchUpTimer = setInterval(() => {
    if (sessionCount > 0) void runtime.preRequestCatchUp().catch(onCatchUpError);
  }, catchUpIntervalMs);

  return {
    server,
    origin,
    sessionCount: () => sessionCount,
    close: async () => {
      clearInterval(catchUpTimer);
      await closeMudTelnetServer(server);
    },
  };
}

/**
 * pushFarstoneTelnetUpdates — the push half of feltos's `tickMudTelnetServer`, safe to call as
 * often as needed because `telnet`'s underlying MudServer wrapper's `.tick()` is a no-op (see
 * `listenFarstoneTelnet`). Call from `runtime`'s own `onCatchUp` hook (serve.mts) whenever a
 * catch-up pass actually ran ticks, so connected telnet sessions get their drained output plus
 * GMCP/MSDP/MXP push exactly once per pass — the same one clock as every other transport.
 */
export function pushFarstoneTelnetUpdates(telnet: FarstoneTelnetServer): void {
  tickMudTelnetServer(telnet.server);
}
