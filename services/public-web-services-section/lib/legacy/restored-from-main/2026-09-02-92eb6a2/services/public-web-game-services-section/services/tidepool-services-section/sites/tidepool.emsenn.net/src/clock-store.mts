// clock-store — persists lastTickAt, the wall-clock instant (epoch ms) up to which the world
// has been advanced. Structurally identical to Farstone's own clock-store.mts. A separate
// object/file from world-store.mts's engine snapshot, so that wire format stays unchanged.
// Not atomic with the engine save: tidepool-runtime.mts writes the clock first, then the
// snapshot, so a mid-write crash under-counts owed catch-up ticks rather than double-applying.

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

const CLOCK_KIND = "tidepool.world-clock.v1";

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

  // Remember the generation the last successful write returned and reuse it directly, falling
  // back to a fresh `getObject` only the very first time and after a genuine 412 — halves the
  // network round trips flush-on-mutation pays per tick (measured in Farstone's own benchmark
  // this pattern was ported from). Correctness rests on the single-writer `--max-instances 1`
  // pin, same as `world-store.mts`.
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
        return null; // a corrupt/foreign clock object degrades to "unknown" — never fatal
      }
      return isValidClockPayload(payload) ? { lastTickAt: payload.lastTickAt } : null;
    },
    async save(state) {
      const text = JSON.stringify({ kind: CLOCK_KIND, lastTickAt: state.lastTickAt });
      let precondition = cachedGeneration;
      if (precondition === undefined) {
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
      }
      let result = await client.putObject(object, text, precondition);
      if (!result.ok) {
        const current = await client.getObject(object);
        precondition = current?.generation ?? "0";
        result = await client.putObject(object, text, precondition);
      }
      if (result.ok) cachedGeneration = result.generation;
    },
  };
}
