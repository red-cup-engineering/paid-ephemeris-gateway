// clock-store — persists the one fact request-driven catch-up needs to survive a restart:
// lastTickAt, the wall-clock instant (epoch ms) up to which the world has been advanced.
// Deliberately a separate object/file from world-store.mts's engine snapshot, so that wire
// format stays byte-for-byte unchanged. Not atomic with the engine save: world-runtime.mts
// writes the clock first, then the snapshot, so a mid-write crash under-counts owed catch-up
// ticks (bounded, never double-applies) rather than losing an unbounded amount of idle time.
// openClockStore(backend) returns null for {kind:"none"}, mirroring openWorldStore.

import { loadJsonSnapshot, saveJsonSnapshot } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import type { GcsClientOptions } from "@red-cup-engineering/footing/gcs-client";
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

  // retry:true preserves this store's pre-footing default (footing's own default is opt-in-off).
  const client = createGcsClient({ bucket: backend.bucket, retry: true, ...opts.gcsClientOptions });
  const object = bucketClockObject(backend.object);
  const describe = `gs://${backend.bucket}/${object}`;

  // Measured perf fix: caches the generation its own last write returned instead of an extra
  // getObject before every putObject (halved measured flush latency against real fake-GCS —
  // see world-runtime-live.test.mts); falls back to a fresh getObject on the first call or a 412.
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
