// world-store — selects Farstone's world-persistence backend and exposes one small
// `load`/`save` surface regardless of which backend was chosen, mirroring the shape of
// ruinfold's `store-factory.mts` (same house, same decision: env var present -> GCS bucket;
// absent -> local disk).
//
// Backend selection, from `FELTOS_BUCKET` / `FELTOS_SAVE`:
//   - `FELTOS_BUCKET` set (Cloud Run): the GCS bucket-backed store. `FELTOS_SAVE`, if also
//     set, becomes the OBJECT NAME within that bucket (default "world.json") rather than a
//     filesystem path — the same "root means something different per backend" shape
//     ruinfold's own `resolveStoreRoot()` documents and tests for.
//   - `FELTOS_BUCKET` unset, `FELTOS_SAVE` set (local dev, unchanged from before this
//     change): a filesystem path, handled by feltos's own `loadEngine`/`saveEngine`
//     (`@red-cup-engineering/feltos/persistence`) exactly as `serve.mts` called them
//     directly before. Nothing about local-dev persistence behavior changed.
//   - Neither set: no persistence — `openWorldStore` returns `null`, and callers keep the
//     engine in memory only, exactly as before.
//
// Bucket-mode correctness: the world save is ONE mutable JSON blob (feltos's own
// `encodeSnapshot`/`decodeSnapshot` envelope — the exact same bytes the file backend
// writes), not an append-only log, so a save is a conditional REPLACE guarded by the
// object's current GCS generation, retried on 412 (another save landed between our read
// and our write) — see `save()` below. This is only a genuine multi-writer hazard if two
// Farstone instances tick the same world concurrently; the deploy pins
// `--max-instances 1` specifically so that never happens (see the deploy notes in
// `../README.md`) — the retry loop here is a correctness backstop for the one real
// same-process race (a periodic autosave overlapping the shutdown-time final save), not a
// substitute for that instance cap.

import { loadEngine, saveEngine, encodeSnapshot, decodeSnapshot } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "./gcs-client.mts";
import type { GcsClientOptions } from "./gcs-client.mts";

export interface WorldStoreEnv {
  FELTOS_SAVE?: string;
  FELTOS_BUCKET?: string;
}

export type WorldBackend =
  | { kind: "none" }
  | { kind: "file"; path: string }
  | { kind: "bucket"; bucket: string; object: string };

const DEFAULT_BUCKET_OBJECT = "world.json";
const MAX_SAVE_RETRIES = 20;

/** Read the two env vars into a concrete backend choice. `env` is injectable for tests. */
export function resolveWorldBackend(env: WorldStoreEnv = process.env as WorldStoreEnv): WorldBackend {
  const bucket = env.FELTOS_BUCKET;
  if (bucket !== undefined && bucket !== "") {
    const object = env.FELTOS_SAVE !== undefined && env.FELTOS_SAVE !== "" ? env.FELTOS_SAVE : DEFAULT_BUCKET_OBJECT;
    return { kind: "bucket", bucket, object };
  }
  const path = env.FELTOS_SAVE;
  if (path !== undefined && path !== "") return { kind: "file", path };
  return { kind: "none" };
}

type Fallback = (() => unknown) | unknown;

function resolveFallback(fallback: Fallback): unknown {
  return typeof fallback === "function" ? (fallback as () => unknown)() : fallback;
}

export interface WorldStore {
  /** Human-readable description of where this store persists to, for the boot log line. */
  readonly describe: string;
  load(fallback: Fallback): Promise<unknown>;
  save(engine: unknown): Promise<void>;
}

export interface OpenWorldStoreOptions {
  gcsClientOptions?: Omit<GcsClientOptions, "bucket">;
}

/** `null` means "no backend configured" — caller keeps the engine in memory only. */
export function openWorldStore(backend: WorldBackend, opts: OpenWorldStoreOptions = {}): WorldStore | null {
  if (backend.kind === "none") return null;

  if (backend.kind === "file") {
    return {
      describe: backend.path,
      load: (fallback) => loadEngine(backend.path, { fallback: fallback as never }),
      save: (engine) => saveEngine(backend.path, engine as never),
    };
  }

  const client = createGcsClient({ bucket: backend.bucket, ...opts.gcsClientOptions });
  const object = backend.object;
  const describe = `gs://${backend.bucket}/${object}`;

  return {
    describe,
    async load(fallback) {
      let found;
      try {
        found = await client.getObject(object);
      } catch (error) {
        if (fallback === undefined) throw error;
        return resolveFallback(fallback);
      }
      if (found === null) {
        if (fallback === undefined) throw new Error(`world-store: no object at ${describe} and no fallback given`);
        return resolveFallback(fallback);
      }
      try {
        return decodeSnapshot(found.text);
      } catch (error) {
        if (fallback === undefined) throw error;
        return resolveFallback(fallback);
      }
    },
    async save(engine) {
      const text = encodeSnapshot(engine as never);
      for (let attempt = 0; attempt < MAX_SAVE_RETRIES; attempt++) {
        const current = await client.getObject(object);
        const precondition = current?.generation ?? "0";
        const result = await client.putObject(object, text, precondition);
        if (result.ok) return;
        // 412 — another save landed between our read and our write (see module header for
        // when this can genuinely happen with max-instances pinned to 1). Loop: re-read the
        // now-current generation and retry our own overwrite against it.
      }
      throw new Error(`world-store: gcs save exhausted ${MAX_SAVE_RETRIES} retries for ${describe} (sustained contention)`);
    },
  };
}
