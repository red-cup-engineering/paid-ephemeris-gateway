// world-runtime-concurrency — reproduces, then closes, the 2026-08-20 live incident (see the
// deploy runbook's Known-open-issues entry and world-runtime.mts's own "CONCURRENCY" header
// section): concurrent requests racing preRequestCatchUp()/#flush() against REAL network
// latency and real 429s. Before the single-flight fix landed, this reliably produced multiple
// overlapping flushes — each capturing its own engine snapshot, each running its own GCS
// metadata-GET + conditional-PUT retry loop — which is exactly the mechanism behind the live
// "drop reverted, actor vanished" bug and the observed 429/OOM pileup (257s worst flush, 15 OOM
// kills/25min). This test drives the REAL persistence path (world-store.mts / clock-store.mts /
// gcs-client.mts / gcs-retry.mts, the real feltos engine) against a real (loopback) fake-GCS
// server with INJECTED real setTimeout latency and injected 429s on writes, so it exercises the
// exact code and the exact class of condition the live incident ran into — not a simplified
// stand-in with a fake store and no real async gaps.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createEngine } from "@red-cup-engineering/feltos/engine";
import { createMudServer } from "@red-cup-engineering/feltos/mud-server";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { openWorldStore } from "./world-store.mts";
import { openClockStore } from "./clock-store.mts";
import { createWorldRuntime } from "./world-runtime.mts";
import { startFakeGcs } from "./fake-gcs.mts";

const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

// injectLatencyAnd429s — wraps a real fetch-shaped request function so every call pays REAL
// setTimeout latency (uniformly `minMs`..`maxMs`, the same order of magnitude the live incident's
// Cloud Run logs recorded for real GCS round trips under contention) before it ever reaches the
// fake-GCS server, and a configurable fraction of WRITE calls (the upload endpoint) come back
// HTTP 429 — run through the real, completely unmodified gcs-retry.mts backoff-and-retry path,
// exactly like the live 429s the runbook recorded ("GCS writes hit HTTP 429 (rate-limited)
// repeatedly").
function injectLatencyAnd429s(
  base: typeof fetch,
  opts: { minMs: number; maxMs: number; rate429: number; random?: () => number },
): typeof fetch {
  const random = opts.random ?? Math.random;
  return (async (url: string | URL, init?: RequestInit) => {
    const delay = opts.minMs + random() * (opts.maxMs - opts.minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
    const href = typeof url === "string" ? url : url.toString();
    if (href.includes("/upload/") && random() < opts.rate429) {
      return new Response(JSON.stringify({ error: { code: 429, message: "injected rate limit" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    return base(url as never, init);
  }) as typeof fetch;
}

// trackConcurrency — counts calls currently inside `fn` at once, tracking the historical max.
// Instruments directly the one number the single-flight fix promises to hold at exactly 1: how
// many `save()` calls (against the store/clockStore this flush actually persists to) are ever
// in flight simultaneously.
function trackConcurrency<T>(fn: (arg: T) => Promise<void>): {
  wrapped: (arg: T) => Promise<void>;
  state: { active: number; maxActive: number; calls: number };
} {
  const state = { active: 0, maxActive: 0, calls: 0 };
  const wrapped = async (arg: T): Promise<void> => {
    state.active++;
    state.calls++;
    state.maxActive = Math.max(state.maxActive, state.active);
    try {
      await fn(arg);
    } finally {
      state.active--;
    }
  };
  return { wrapped, state };
}

test(
  "concurrency: 20 concurrent preRequestCatchUp() calls against real-latency+429 fake-GCS never overlap a flush, never double-count ticks, stay memory-bounded, and all complete",
  async (t) => {
    const fake = await startFakeGcs("concurrency-bucket");
    t.after(() => fake.close());

    const request = injectLatencyAnd429s(unauthenticatedRequest, { minMs: 100, maxMs: 500, rate429: 0.15 });
    const gcsClientOptions = { apiBase: fake.url, request };
    const worldBackend = { kind: "bucket" as const, bucket: fake.bucket, object: "world.json" };

    const rawStore = openWorldStore(worldBackend, { gcsClientOptions })!;
    const rawClockStore = openClockStore(worldBackend, { gcsClientOptions })!;

    const engineSaves = trackConcurrency<unknown>((engine) => rawStore.save(engine));
    const clockSaves = trackConcurrency<{ lastTickAt: number }>((s) => rawClockStore.save(s));
    const store = { save: engineSaves.wrapped };
    const clockStore = { save: clockSaves.wrapped };

    const engine = createEngine(FARSTONE_GAME);
    const mud = createMudServer(FARSTONE_GAME, { runtime: FARSTONE_RUNTIME, engine, maxAssertions: 20_000 });
    const tickLog: number[] = [];
    const trackedMud = {
      tick: () => {
        const receipt = mud.tick();
        tickLog.push(mud.engine().tick as number);
        return receipt;
      },
      engine: () => mud.engine(),
    };

    const tickIntervalMs = 50;
    const now = () => Date.now();
    // A real, unpadded 3-second idle gap: comfortably more than `maxCatchUpTicksPerRequest *
    // tickIntervalMs` (10 * 50ms = 500ms), so the very first request's catch-up is capped and
    // leaves a real remainder for concurrent siblings to (safely, singly-flighted) keep chewing
    // through — the same "way more owed than one request should run" shape the live bug hit.
    const lastTickAtStart = Date.now() - 3000;

    const runtime = createWorldRuntime(trackedMud, {
      tickIntervalMs,
      maxCatchUpTicksPerRequest: 10,
      now,
      lastTickAt: lastTickAtStart,
      store,
      clockStore,
    });

    const CONCURRENT_REQUESTS = 20;
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, () => runtime.preRequestCatchUp()),
    );

    // All requests complete — none hang, none reject. A real injected 429 is retried
    // transparently by the unmodified gcs-retry.mts path; only permanent exhaustion (far more
    // attempts than this test's 15% rate could plausibly cause) would surface as a rejection.
    const rejected = results.filter((r) => r.status === "rejected");
    assert.deepEqual(
      rejected,
      [],
      `expected every concurrent request to complete; got rejections: ${rejected
        .map((r) => (r as PromiseRejectedResult).reason)
        .join("; ")}`,
    );

    // Exactly one in-flight flush at a time — the single-flight guarantee itself, measured
    // directly (not inferred from absence of symptoms). Both save() targets are checked
    // independently; either overlapping is the bug.
    assert.equal(
      engineSaves.state.maxActive,
      1,
      `engine store.save() overlapped itself — saw up to ${engineSaves.state.maxActive} concurrent calls (this is the exact mechanism behind the live "drop reverted" bug: an older-snapshot flush completing after a newer one)`,
    );
    assert.equal(
      clockSaves.state.maxActive,
      1,
      `clock store.save() overlapped itself — saw up to ${clockSaves.state.maxActive} concurrent calls`,
    );

    // Memory bounded: far fewer actual flushes than requests — coalescing into one queued
    // follow-up, not one queued payload per waiter.
    assert.ok(
      engineSaves.state.calls < CONCURRENT_REQUESTS / 2,
      `expected coalescing to keep the real flush count well under ${CONCURRENT_REQUESTS}, got ${engineSaves.state.calls} — memory grows with flush count (one engine snapshot per flush), so this bounds it`,
    );
    assert.equal(engineSaves.state.calls, clockSaves.state.calls, "clock and engine are flushed in lockstep, every flush");

    // No double-counted ticks: the total ticks actually run can never exceed what real elapsed
    // time could plausibly owe (plus one cap's worth of slack for scheduling jitter), and the
    // sequence of tick receipts is strictly increasing — no two catch-up passes ever interleaved
    // their tick() calls against each other.
    const elapsedMs = Date.now() - lastTickAtStart;
    const maxPlausibleTicks = Math.ceil(elapsedMs / tickIntervalMs) + 10;
    assert.ok(
      tickLog.length <= maxPlausibleTicks,
      `ran ${tickLog.length} ticks but at most ~${maxPlausibleTicks} could plausibly be owed over ${elapsedMs}ms — ticks were double-counted`,
    );
    assert.deepEqual(
      tickLog,
      [...tickLog].sort((a, b) => a - b),
      "tick receipts ran in strictly increasing order — no two catch-up passes interleaved their tick() calls",
    );

    // Final persisted state matches final live state — the actual live-incident symptom (a
    // stale, out-of-order-completing flush overwriting newer state) never happens here: whichever
    // flush ran last persisted the truth, not a snapshot captured earlier and delivered late.
    const persisted = (await rawStore.load(() => {
      throw new Error("expected a real saved snapshot");
    })) as { tick: number };
    assert.equal(
      persisted.tick,
      mud.engine().tick,
      "the persisted engine snapshot must match the final live tick count, not an earlier, since-superseded one",
    );
  },
);
