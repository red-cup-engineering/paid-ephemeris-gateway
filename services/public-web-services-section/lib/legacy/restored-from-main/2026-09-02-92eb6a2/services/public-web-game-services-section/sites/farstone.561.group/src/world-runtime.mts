// world-runtime — the honest world-time and persistence model for scale-to-zero.
//
// INTEGRATION SHAPE, load-bearing: this does NOT wrap the `MudServer` object itself. `http.mjs`
// (vendored, untouched — see the module header there) calls `mudServer.connect(...)`,
// `.metrics()`, `.tick()`, `.drain(...)` SYNCHRONOUSLY and feeds their return values straight
// into `JSON.stringify` in the same tick — `json(response, 200, mudServer.metrics())`, not
// `await`ed. If those methods were replaced with async ones (as an earlier draft of this file
// did), `mudServer.metrics()` would hand back a bare `Promise` object, `JSON.stringify` would
// silently serialize it as `{}`, and every route except `/health` would quietly return
// garbage — not a crash, a silent corruption of exactly the kind this whole change exists to
// stop introducing elsewhere. So: `createMudHttpServer` in `serve.mts` still gets the RAW,
// fully-synchronous `MudServer` instance, completely unchanged. This module instead sits
// OUTSIDE that — `serve.mts` builds its own thin `http.Server` that runs `preRequestCatchUp()`
// before delegating to `http.mjs`'s own request listener, and `postRequestFlush()` after, only
// for the two routes that actually mutate engine state (`POST /connect`, `POST /tick`). See
// `serve.mts` for exactly how that wiring is done (extracting `http.mjs`'s listener function
// rather than ever monkey-patching or copying it).
//
// THE BUG THIS REPLACES: Cloud Run at `min-instances 0` only guarantees CPU scheduling while a
// request is in flight. A `setInterval` world-tick loop and a `setInterval` autosave loop both
// assume a continuously-running process; between requests, Cloud Run's CPU throttling means
// neither timer is reliably scheduled to fire at all, no matter how much real time elapses. The
// live churn proof in the 2026-08-19 deploy runbook found exactly this: a dropped item lost, and
// the world's own tick/assertion counters going BACKWARD after a redeploy loaded a save that
// predated the drop — an unbounded loss, not the documented "up to one autosave interval".
//
// THE MODEL THIS IMPLEMENTS (see README.md's "World time" section for the player-facing
// account):
//   1. CATCH-UP ON REQUEST — world time does not advance on a timer. Every incoming request
//      first asks "how many real ticks are owed since the last time this world was advanced?"
//      (`(now() - lastTickAt) / tickIntervalMs`, floored) and runs that many `mud.tick()` calls
//      — capped at `maxCatchUpTicksPerRequest` per request so no single request stalls for
//      seconds; any remainder is simply left owed, and gets caught up (partially or fully) by
//      whichever request arrives next. The harbor sleeps between visitors — it does not
//      pretend to keep ticking while nobody is there to see it, and it does not pretend the
//      time in between never happened either: it catches up, honestly, bounded.
//   2. FLUSH-ON-MUTATION — every call that actually changes engine state (a catch-up that ran
//      at least one real tick, an explicit `POST /tick`, or `connect()` joining a new actor)
//      is followed by a save. This is the durability guarantee now; the interval save
//      `serve.mts` still runs is a backstop only — kept for the rare case an instance stays
//      warm across idle real-time ticks with no request forcing a flush in between — never the
//      thing correctness depends on.
//   3. `POST /command` (enqueue) is deliberately not a flush point: a queued command doesn't
//      mutate `engine()` at all (it sits in the MudServer's own in-memory pending list, per
//      feltos's own design — see `mud-server.mjs`), it only takes effect at the next tick that
//      admits it — which, same as before this change, IS a flush point (either the explicit
//      `POST /tick` that runs it, or a later request's catch-up). This exactly preserves the
//      pre-existing, already-documented "async command/tick/drain pipeline" gap (a command
//      briefly not yet applied); it does not widen it.
//
// CONCURRENCY — 2026-08-20 live incident (see the deploy runbook's Known-open-issues entry): the
// model above was correct in isolation but had no mutual exclusion between concurrent HTTP
// requests. `#flush()` is async (real GCS latency, observed up to 257s under contention/429s
// live) with no guard, so successive catch-ups whose flush outlives the next request's arrival —
// or a mutation-route flush racing the backstop interval's `flushNow()` — could have MULTIPLE
// flushes in flight at once. Each captures `this.#mud.engine()` (and therefore a snapshot of
// world state) at ITS OWN call time; `world-store.mts`'s save() only checks the GCS generation,
// not content freshness, so if an OLDER-snapshot flush's write lands (after retrying past a 412)
// AFTER a NEWER-snapshot flush already completed, the older state silently overwrites the newer
// one — this is the exact mechanism behind the live "drop reverted, actor vanished" bug. Piled-up
// concurrent flushes also each hold their own encoded-snapshot string and each run their own
// metadata-GET+conditional-PUT retry loop, which is exactly what the observed 429 storms and OOM
// pressure look like under real concurrent traffic.
//
// FIX — both `#flush()` and the catch-up tick computation are now single-flight, with trailing-
// edge coalescing:
//   - `#flush()`: only one flush actually runs `store.save()`/`clockStore.save()` at a time.
//     Callers that arrive while one is running are folded into a QUEUED follow-up flush (not a
//     stacked promise per caller, so memory never grows with waiter count) that runs once, right
//     after the current one finishes, capturing whatever the LATEST engine state is at that later
//     time — never a stale snapshot completing out of order.
//   - catch-up (`preRequestCatchUp`'s tick computation): also single-flight, so concurrent
//     requests never independently read `#lastTickAt`/run `#mud.tick()` in an overlapping window;
//     a request that arrives while a catch-up is already running waits for it (and, if real time
//     has moved on since, folds into one more coalesced pass) rather than racing it.

export interface WorldRuntimeStore {
  save(engine: unknown): Promise<void>;
}
export interface WorldRuntimeClockStore {
  save(state: { lastTickAt: number }): Promise<void>;
}
export interface WorldRuntimeMud {
  /** Synchronous (the raw MudServer's own `.tick()`) OR asynchronous (qwzspace's `room.stepOnce()`,
   *  used by serve.mts's WS-transport wiring — farstone-room.mts) — `#runCatchUp` below always
   *  `await`s this, which is a no-op delay for a synchronous return value and the REQUIRED await
   *  for an async one: `room.stepOnce()` self-guards re-entrancy (an already-running tick just
   *  returns early), so calling it in a tight loop without awaiting each call would silently skip
   *  ticks under real catch-up (owed > 1). See serve.mts's own header for why WorldRuntime's `tick`
   *  callback is `() => room.stepOnce()` when the qwzspace room is wired in. */
  tick(): unknown | Promise<unknown>;
  engine(): unknown;
}

export interface FlushInfo {
  reason: "tick" | "mutation" | "shutdown";
  ticksRun: number;
  durationMs: number;
  engineBytes: number;
}

export interface CatchUpInfo {
  ticksOwed: number;
  ticksRun: number;
  ticksRemaining: number;
}

export interface WorldRuntimeOptions {
  /** Real milliseconds per world tick. Must match `FELTOS_TICK_MS`'s prior meaning exactly —
   *  this is the same knob, just no longer driving a `setInterval`. */
  tickIntervalMs: number;
  /** Upper bound on ticks a single request will run to catch up. Bounds worst-case per-request
   *  latency to roughly `maxCatchUpTicksPerRequest * (per-tick cost)`; see README.md's "World
   *  time" section for the measured per-tick cost this default was chosen from. */
  maxCatchUpTicksPerRequest: number;
  /** The wall clock the world's request-driven advancement is measured against. Injectable so
   *  tests never depend on real elapsed time. */
  now?: () => number;
  /** Where the last request-driven catch-up left the world (epoch ms) — normally the value
   *  `clockStore.load()` returned at boot, or `now()` for a fresh world with no prior save. */
  lastTickAt: number;
  store: WorldRuntimeStore | null;
  clockStore: WorldRuntimeClockStore | null;
  /** Fires after every flush, real numbers only (no estimates) — this is the hook
   *  `serve.mts` and the benchmark tests use to report measured write size/latency. */
  onFlush?: (info: FlushInfo) => void;
  onCatchUp?: (info: CatchUpInfo) => void;
}

/** Byte length of what `store.save()` will actually serialize, purely for `onFlush` reporting —
 *  computed from a JSON encoding of the engine (best-effort instrumentation only; the real wire
 *  format is owned entirely by `world-store.mts`'s own `encodeSnapshot`, not duplicated here). */
function measureEngineBytes(engine: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(engine), "utf8");
  } catch {
    return 0;
  }
}

export class WorldRuntime {
  #mud: WorldRuntimeMud;
  #store: WorldRuntimeStore | null;
  #clockStore: WorldRuntimeClockStore | null;
  #now: () => number;
  #tickIntervalMs: number;
  #maxCatchUpTicksPerRequest: number;
  #lastTickAt: number;
  #onFlush: (info: FlushInfo) => void;
  #onCatchUp: (info: CatchUpInfo) => void;

  // Single-flight state for #flush() — see the module header's "CONCURRENCY" section. `#flushing`
  // is the currently-running flush (or null between flushes). `#queuedFlush` is at most ONE
  // pending follow-up — coalesced: however many callers arrive while busy, they merge into this
  // ONE deferred entry (never one entry per waiter, which is the "no per-waiter payload copies"
  // bound the concurrency test asserts) and all share its single `promise`, which resolves only
  // once the follow-up flush itself completes — never the currently-running one — so a caller
  // that queued a flush never observes its own request as "done" before the state it asked to
  // persist has actually been captured by a flush that started after it arrived.
  #flushing: Promise<void> | null = null;
  #queuedFlush: {
    reason: FlushInfo["reason"];
    ticksRun: number;
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null = null;

  // Single-flight state for the catch-up tick computation — same deferred-coalescing shape as
  // flush's, so concurrent requests never independently read `#lastTickAt` / run `#mud.tick()` in
  // an overlapping window, and a caller that coalesces into a follow-up pass gets that pass's own
  // result, not a stale one from whichever pass happened to be running when it arrived.
  #catchingUp: Promise<CatchUpInfo> | null = null;
  #queuedCatchUp: { promise: Promise<CatchUpInfo>; resolve: (info: CatchUpInfo) => void; reject: (error: unknown) => void } | null = null;

  constructor(mud: WorldRuntimeMud, opts: WorldRuntimeOptions) {
    if (!Number.isFinite(opts.tickIntervalMs) || opts.tickIntervalMs <= 0) {
      throw new TypeError("tickIntervalMs must be a positive number");
    }
    if (!Number.isSafeInteger(opts.maxCatchUpTicksPerRequest) || opts.maxCatchUpTicksPerRequest < 1) {
      throw new TypeError("maxCatchUpTicksPerRequest must be a positive integer");
    }
    this.#mud = mud;
    this.#store = opts.store;
    this.#clockStore = opts.clockStore;
    this.#now = opts.now ?? (() => Date.now());
    this.#tickIntervalMs = opts.tickIntervalMs;
    this.#maxCatchUpTicksPerRequest = opts.maxCatchUpTicksPerRequest;
    this.#lastTickAt = opts.lastTickAt;
    this.#onFlush = opts.onFlush ?? (() => {});
    this.#onCatchUp = opts.onCatchUp ?? (() => {});
  }

  /** How many ticks a request finds owed right now, without running any — pure inspection. */
  ticksOwed(): number {
    return Math.max(0, Math.floor((this.#now() - this.#lastTickAt) / this.#tickIntervalMs));
  }

  /** Call once at the top of every incoming request, before any route-specific handling. Runs
   *  (and flushes) whatever real-time ticks are owed, capped per request. A no-op, zero-cost
   *  past the one arithmetic check, when nothing is owed — which is the common case for a
   *  request that arrives less than one tick-interval after the last one. */
  async preRequestCatchUp(): Promise<CatchUpInfo> {
    // Single-flight (see the module header's "CONCURRENCY" section): if a catch-up is already
    // running, don't independently read `#lastTickAt`/run more ticks alongside it — coalesce into
    // the ONE pending follow-up pass instead (never more than one queued, however many concurrent
    // callers are waiting) and await ITS result, not the pass that's already running — that
    // follow-up re-reads real elapsed time fresh when it actually starts, so nothing owed is ever
    // lost, double-counted, or reported from a pass that ran before this call arrived.
    if (this.#catchingUp) {
      if (!this.#queuedCatchUp) {
        let resolve!: (info: CatchUpInfo) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<CatchUpInfo>((res, rej) => { resolve = res; reject = rej; });
        this.#queuedCatchUp = { promise, resolve, reject };
      }
      return this.#queuedCatchUp.promise;
    }
    return this.#startCatchUp();
  }

  async #startCatchUp(): Promise<CatchUpInfo> {
    const promise = this.#runCatchUp();
    this.#catchingUp = promise;
    try {
      return await promise;
    } finally {
      this.#catchingUp = null;
      const queued = this.#queuedCatchUp;
      if (queued) {
        this.#queuedCatchUp = null;
        // Chain the coalesced follow-up: its own callers (who deliberately did NOT get the
        // just-finished pass's result — see above) resolve/reject against THIS pass instead.
        this.#startCatchUp().then(queued.resolve, queued.reject);
      }
    }
  }

  async #runCatchUp(): Promise<CatchUpInfo> {
    const owed = this.ticksOwed();
    const run = Math.min(owed, this.#maxCatchUpTicksPerRequest);
    // awaited — see WorldRuntimeMud's own header for why this is required, not cosmetic, once a
    // qwzspace-room-backed (async, re-entrancy-guarded) `tick()` is wired in.
    for (let i = 0; i < run; i++) await this.#mud.tick();
    if (run > 0) {
      this.#lastTickAt += run * this.#tickIntervalMs;
      await this.#flush("tick", run);
    }
    const info: CatchUpInfo = { ticksOwed: owed, ticksRun: run, ticksRemaining: owed - run };
    this.#onCatchUp(info);
    return info;
  }

  /** Call after a route that itself just mutated engine state OUTSIDE of `preRequestCatchUp`
   *  (i.e. `POST /connect`, which joins an actor, and `POST /tick`, which runs one more real
   *  tick on top of whatever catch-up already did). `POST /tick` also owes the clock one more
   *  interval, since an explicit tick represents one more real tick having genuinely happened —
   *  pass `advancesClockBy` for that case; omit it (0) for `connect`, which mutates state
   *  without representing any elapsed world-time on its own. */
  async postRequestFlush(advancesClockBy = 0): Promise<void> {
    if (advancesClockBy > 0) this.#lastTickAt += advancesClockBy;
    await this.#flush("mutation", advancesClockBy > 0 ? 1 : 0);
  }

  /** Used by `serve.mts`'s shutdown handler and the interval backstop save — no catch-up, no
   *  tick-bookkeeping change, just "persist exactly what's here right now". */
  async flushNow(): Promise<void> {
    await this.#flush("shutdown", 0);
  }

  // #flush — single-flight with trailing-edge coalescing (see the module header's "CONCURRENCY"
  // section). At most one #runFlush() actually executes at a time; any call that arrives while
  // one is in flight doesn't start a second one (which is what let an out-of-order-completing
  // stale-snapshot write clobber a newer one, live) — it folds into a single queued follow-up
  // that runs once, immediately after, and captures whatever `#mud.engine()` returns AT THAT
  // LATER TIME (never a payload captured back when it was queued), so the follow-up is always at
  // least as fresh as every request that coalesced into it. Bounded memory: however many callers
  // arrive while busy, exactly one follow-up call (one `#runFlush` invocation, one engine
  // snapshot) is ever queued — never one per waiter.
  async #flush(reason: FlushInfo["reason"], ticksRun: number): Promise<void> {
    if (this.#flushing) {
      if (!this.#queuedFlush) {
        let resolve!: () => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
        this.#queuedFlush = { reason, ticksRun, promise, resolve, reject };
      } else {
        // Coalesce onto the one already-queued follow-up: sum the ticks it will report, keep the
        // latest reason — still exactly one queued flush regardless of how many callers merge in.
        this.#queuedFlush.reason = reason;
        this.#queuedFlush.ticksRun += ticksRun;
      }
      return this.#queuedFlush.promise;
    }
    return this.#startFlush(reason, ticksRun);
  }

  async #startFlush(reason: FlushInfo["reason"], ticksRun: number): Promise<void> {
    const promise = this.#runFlush(reason, ticksRun);
    this.#flushing = promise;
    try {
      await promise;
    } finally {
      this.#flushing = null;
      const queued = this.#queuedFlush;
      if (queued) {
        this.#queuedFlush = null;
        this.#startFlush(queued.reason, queued.ticksRun).then(queued.resolve, queued.reject);
      }
    }
  }

  async #runFlush(reason: FlushInfo["reason"], ticksRun: number): Promise<void> {
    // Real wall-clock duration, deliberately independent of the injectable `now()` used for
    // catch-up's business logic (that clock may be a fixed/stepped fake in tests — flush
    // timing should still reflect how long the actual save calls took).
    const start = performance.now();
    const engine = this.#mud.engine();
    // Clock written FIRST, engine SECOND — see clock-store.mts's header for exactly why this
    // ordering is the fail-safe direction if the process dies mid-flush.
    if (this.#clockStore !== null) await this.#clockStore.save({ lastTickAt: this.#lastTickAt });
    if (this.#store !== null) await this.#store.save(engine);
    const durationMs = performance.now() - start;
    this.#onFlush({ reason, ticksRun, durationMs, engineBytes: measureEngineBytes(engine) });
  }
}

export function createWorldRuntime(mud: WorldRuntimeMud, opts: WorldRuntimeOptions): WorldRuntime {
  return new WorldRuntime(mud, opts);
}
