// tidepool-runtime — a direct structural port of Farstone's `world-runtime.mts`, adapted for ONE
// real difference: Farstone's `MudServer.tick()` (mud-server.mjs) is synchronous; qwzspace's
// `room.stepOnce()` (room.mjs) is `async` (it awaits `gameRunTick`, `snapshot.resettle`, and
// per-subscriber sends). Every method here is `async` for that reason alone — the MODEL is
// otherwise identical, comment-for-comment:
//
//   1. CATCH-UP ON REQUEST — world time does not advance on a timer. Every incoming request
//      first asks "how many real ticks are owed since the last time this world was advanced?"
//      and runs that many `room.stepOnce()` calls, capped at `maxCatchUpTicksPerRequest` per
//      request; any remainder is left owed for the next request. Under `setInterval`, an LLM
//      agent thinking for 30 real seconds either races a live clock or the world silently drifts
//      while nobody's there to see it — the exact bug the hardening lane fixed for Farstone.
//      Catch-up-on-request means the harbor sleeps between visitors and an agent's thinking time
//      costs it nothing (design §3's own framing).
//   2. FLUSH-ON-MUTATION — every call that actually changes engine state (a catch-up that ran at
//      least one real tick, or an explicit forced tick) is followed by a save. An interval
//      backstop (serve.mts) exists only for an instance that stays warm across idle real-time
//      ticks with no request forcing a flush in between — never the thing correctness depends on.
//   3. Clock written FIRST, engine snapshot SECOND (clock-store.mts's own header) — a mid-flush
//      crash fails toward "under-count owed ticks" (bounded, safe), never "double-apply".
//
// CONCURRENCY — ported 2026-08-20 from Farstone's OWN post-incident fix, not from the version
// this file originally structurally copied. The first port of this file (see git-free history:
// the original header here claimed "confirmed live post mud-persistence-hardening") copied
// Farstone's catch-up/flush MODEL correctly but predated Farstone's own concurrency fix — the
// deploy runbook's "Known open issues" records the live incident this exposed: `#flush()` async
// with no mutual exclusion meant two overlapping requests could each capture their own engine
// snapshot and save out of order, an OLDER snapshot's write landing (after a 412 retry) AFTER a
// NEWER one already completed — silently reverting real player state. Piled-up concurrent
// flushes/catch-ups is also what produced the observed 429 storms and OOM pressure under real
// concurrent traffic. Tidepool's own multi-agent-plus-human sessions are exactly this traffic
// shape (two bots and a human all issuing requests around the same catch-up window), so this
// fix is not optional here. Both `#flush()` and the catch-up computation are now single-flight
// with trailing-edge coalescing, structurally identical to Farstone's landed
// `world-runtime.mts`:
//   - `#flush()`: only one flush actually runs `store.save()`/`clockStore.save()` at a time.
//     Callers that arrive while one is running fold into a QUEUED follow-up flush (never one
//     per waiter) that runs once, right after, capturing whatever the LATEST engine state is at
//     that later time.
//   - catch-up (`preRequestCatchUp`): also single-flight, so concurrent requests never
//     independently read `#lastTickAt`/run `#mud.tick()` in an overlapping window; a caller that
//     arrives mid-pass coalesces into one more pass, which re-reads real elapsed time fresh when
//     it actually starts.

export interface WorldRuntimeStore {
  save(engine: unknown): Promise<void>;
}
export interface WorldRuntimeClockStore {
  save(state: { lastTickAt: number }): Promise<void>;
}
export interface WorldRuntimeMud {
  tick(): Promise<unknown>;
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
  tickIntervalMs: number;
  maxCatchUpTicksPerRequest: number;
  now?: () => number;
  lastTickAt: number;
  store: WorldRuntimeStore | null;
  clockStore: WorldRuntimeClockStore | null;
  onFlush?: (info: FlushInfo) => void;
  onCatchUp?: (info: CatchUpInfo) => void;
}

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
  // pending follow-up: however many callers arrive while busy, they merge into this ONE deferred
  // entry and all share its single `promise`, which resolves only once the follow-up flush
  // itself completes — never the currently-running one — so a caller that queued a flush never
  // observes its own request as "done" before the state it asked to persist has actually been
  // captured by a flush that started after it arrived.
  #flushing: Promise<void> | null = null;
  #queuedFlush: {
    reason: FlushInfo["reason"];
    ticksRun: number;
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null = null;

  // Single-flight state for the catch-up tick computation — same deferred-coalescing shape as
  // flush's, so concurrent requests never independently read `#lastTickAt` / run `#mud.tick()`
  // in an overlapping window.
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

  ticksOwed(): number {
    return Math.max(0, Math.floor((this.#now() - this.#lastTickAt) / this.#tickIntervalMs));
  }

  /** Call at the top of every incoming request (or WS connection open), before any
   *  route-specific handling. A no-op, zero-cost past one arithmetic check, when nothing is
   *  owed — the common case. */
  async preRequestCatchUp(): Promise<CatchUpInfo> {
    // Single-flight (see the module header's "CONCURRENCY" section): if a catch-up is already
    // running, don't independently read `#lastTickAt`/run more ticks alongside it — coalesce
    // into the ONE pending follow-up pass instead and await ITS result, not the pass that's
    // already running — that follow-up re-reads real elapsed time fresh when it actually starts,
    // so nothing owed is ever lost, double-counted, or reported from a stale pass.
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
        this.#startCatchUp().then(queued.resolve, queued.reject);
      }
    }
  }

  async #runCatchUp(): Promise<CatchUpInfo> {
    const owed = this.ticksOwed();
    const run = Math.min(owed, this.#maxCatchUpTicksPerRequest);
    for (let i = 0; i < run; i++) await this.#mud.tick();
    if (run > 0) {
      this.#lastTickAt += run * this.#tickIntervalMs;
      await this.#flush("tick", run);
    }
    const info: CatchUpInfo = { ticksOwed: owed, ticksRun: run, ticksRemaining: owed - run };
    this.#onCatchUp(info);
    return info;
  }

  /** For a route that mutates engine state OUTSIDE of `preRequestCatchUp` (none in v1's wiring
   *  today — kept for parity with Farstone's own shape and for an explicit forced-tick admin
   *  route, should one be added later). `advancesClockBy` > 0 represents one more real tick
   *  having genuinely happened on top of whatever catch-up already ran. */
  async postRequestFlush(advancesClockBy = 0): Promise<void> {
    if (advancesClockBy > 0) this.#lastTickAt += advancesClockBy;
    await this.#flush("mutation", advancesClockBy > 0 ? 1 : 0);
  }

  /** Shutdown handler + the interval backstop save — no catch-up, no tick-bookkeeping change,
   *  just "persist exactly what's here right now". */
  async flushNow(): Promise<void> {
    await this.#flush("shutdown", 0);
  }

  // #flush — single-flight with trailing-edge coalescing (see the module header's "CONCURRENCY"
  // section). At most one #runFlush() actually executes at a time; any call that arrives while
  // one is in flight doesn't start a second one — it folds into a single queued follow-up that
  // runs once, immediately after, and captures whatever `#mud.engine()` returns AT THAT LATER
  // TIME (never a payload captured back when it was queued), so the follow-up is always at least
  // as fresh as every request that coalesced into it. Bounded memory: however many callers arrive
  // while busy, exactly one follow-up call is ever queued — never one per waiter.
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
    const start = performance.now();
    const engine = this.#mud.engine();
    if (this.#clockStore !== null) await this.#clockStore.save({ lastTickAt: this.#lastTickAt });
    if (this.#store !== null) await this.#store.save(engine);
    const durationMs = performance.now() - start;
    this.#onFlush({ reason, ticksRun, durationMs, engineBytes: measureEngineBytes(engine) });
  }
}

export function createWorldRuntime(mud: WorldRuntimeMud, opts: WorldRuntimeOptions): WorldRuntime {
  return new WorldRuntime(mud, opts);
}
