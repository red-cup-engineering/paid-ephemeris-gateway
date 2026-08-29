// clock-store — persists the ONE small fact request-driven catch-up needs to survive a
// restart: `lastTickAt`, the real wall-clock instant (epoch ms) up to which the world has
// actually been advanced. Deliberately a SEPARATE object/file from the engine snapshot
// `world-store.mts` already persists, not a new field folded into it — `world-store.mts`'s
// wire format (feltos's own `encodeSnapshot`/`decodeSnapshot`) is left byte-for-byte
// unchanged, so every existing save/load test and the file backend's documented "handled by
// feltos's own loadEngine/saveEngine, exactly as before" invariant both stay true.
//
// HONEST TRADE-OFF, stated plainly rather than hidden: writing two separate objects/files per
// flush is not atomic. `world-runtime.mts` writes the clock FIRST, then the engine snapshot
// SECOND, specifically because that ordering fails safe: if the process dies between the two
// writes, the persisted clock claims the world is caught up to a point the persisted engine
// hasn't actually reached yet. On restart, catch-up computes fewer (or zero) owed ticks than
// reality, and those ticks are never replayed — a small, BOUNDED loss (at most one flush's worth
// of ticks, capped by `maxCatchUpTicksPerRequest`), never a double-application of ticks that
// already ran. That is categorically better than the bug this whole change fixes (interval
// autosave losing an UNBOUNDED amount of idle time, with tick counters observed going
// backward) — but it is not perfect atomicity, and this comment exists so nobody mistakes it
// for that.
//
// Backend shape mirrors `world-store.mts` exactly: `openClockStore(backend)` returns `null` for
// `{kind:"none"}` (no persistence configured — request-driven catch-up still works, it just has
// no restart-durable memory of elapsed idle time, matching the pre-existing "in-memory only"
// posture for that mode).

import { loadJsonSnapshot, saveJsonSnapshot } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "./gcs-client.mts";
import type { GcsClientOptions } from "./gcs-client.mts";
import type { WorldBackend } from "./world-store.mts";

export interface ClockState {
  lastTickAt: number;
}

export interface ClockStore {
  readonly describe: string;
  load(): Promise<ClockState | null>;
  save(state: ClockState): Promise<void>;
}

const CLOCK_KIND = "farstone.world-clock.v1";

function fileClockPath(path: string): string {
  return `${path}.clock.json`;
}

function bucketClockObject(object: string): string {
  return object.endsWith(".json") ? `${object.slice(0, -".json".length)}.clock.json` : `${object}.clock.json`;
}

function isValidClockPayload(value: unknown): value is { kind: string; lastTickAt: number } {
  return typeof value === "object" && value !== null
    && (value as { kind?: unknown }).kind === CLOCK_KIND
    && Number.isFinite((value as { lastTickAt?: unknown }).lastTickAt);
}

export interface OpenClockStoreOptions {
  gcsClientOptions?: Omit<GcsClientOptions, "bucket">;
}

/** `null` means "no backend configured" — mirrors `openWorldStore`'s own null-for-none shape. */
export function openClockStore(backend: WorldBackend, opts: OpenClockStoreOptions = {}): ClockStore | null {
  if (backend.kind === "none") return null;

  if (backend.kind === "file") {
    const path = fileClockPath(backend.path);
    return {
      describe: path,
      async load() {
        const payload = await loadJsonSnapshot(path, { fallback: () => null });
        return isValidClockPayload(payload) ? { lastTickAt: payload.lastTickAt } : null;
      },
      async save(state) {
        await saveJsonSnapshot(path, { kind: CLOCK_KIND, lastTickAt: state.lastTickAt });
      },
    };
  }

  const client = createGcsClient({ bucket: backend.bucket, ...opts.gcsClientOptions });
  const object = bucketClockObject(backend.object);
  const describe = `gs://${backend.bucket}/${object}`;

  // PERFORMANCE NOTE, measured: an earlier version of this save() did a `getObject` (to learn
  // the current generation) before every single `putObject`, doubling the real network round
  // trips flush-on-mutation pays on every request that ticks. Since correctness here already
  // rests on the single-writer `--max-instances 1` pin (documented below — the same precondition
  // `world-store.mts`'s own header names), this store instead remembers the generation its own
  // last successful write returned and reuses it directly, falling back to a fresh
  // `getObject` only the very first time and after a genuine 412. Cut measured average flush
  // latency against a real (loopback) fake-GCS server roughly in half in this tree's own
  // `world-runtime-live.test.mts` benchmark.
  let cachedGeneration: string | undefined;

  return {
    describe,
    async load() {
      const found = await client.getObject(object);
      if (found === null) return null;
      cachedGeneration = found.generation;
      let payload: unknown;
      try {
        payload = JSON.parse(found.text);
      } catch {
        return null; // a corrupt/foreign clock object degrades to "unknown" — never fatal, catch-up just runs 0 ticks
      }
      return isValidClockPayload(payload) ? { lastTickAt: payload.lastTickAt } : null;
    },
    async save(state) {
      // Best-effort, unconditional-in-practice overwrite. Unlike `world-store.mts`'s engine
      // save, this is not defended by an unbounded 412-retry loop — the single-writer
      // `--max-instances 1` deploy pin (see the runbook) means real contention here is not
      // expected, and losing one clock write to a genuine race just means catch-up under-runs
      // by a bounded amount next time, not corruption.
      const text = JSON.stringify({ kind: CLOCK_KIND, lastTickAt: state.lastTickAt });
      let precondition = cachedGeneration;
      if (precondition === undefined) {
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
      }
      let result = await client.putObject(object, text, precondition);
      if (!result.ok) {
        // Our cached generation was stale (a real, if rare, single-writer-violation race) —
        // refetch the true current generation and retry exactly once more, best-effort.
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
        result = await client.putObject(object, text, precondition);
      }
      if (result.ok) cachedGeneration = result.generation;
    },
  };
}
