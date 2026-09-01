// world-store — selects Tidepool's world-persistence backend, structurally identical to
// Farstone's own `world-store.mts` (the CURRENT landed MUD persistence pattern; per the deploy
// runbook's farstone/aletheon rows and the mud-persistence-hardening lane's own findings).
//
// Backend selection, from `FELTOS_BUCKET` / `FELTOS_SAVE`:
//   - `FELTOS_BUCKET` set (Cloud Run): the GCS bucket-backed store. `FELTOS_SAVE`, if also set,
//     becomes the OBJECT NAME within that bucket (default "world.json").
//   - `FELTOS_BUCKET` unset, `FELTOS_SAVE` set (local dev): a filesystem path, handled by
//     feltos's own `loadEngine`/`saveEngine`.
//   - Neither set: no persistence — `openWorldStore` returns `null`.
//
// Bucket-mode correctness: the world save is ONE mutable JSON blob (feltos's own
// `encodeSnapshot`/`decodeSnapshot` envelope), so a save is a conditional REPLACE guarded by the
// object's current GCS generation, retried on 412. This is only a genuine multi-writer hazard if
// two Tidepool instances tick the same world concurrently; the deploy pins `--max-instances 1`
// specifically so that never happens (same load-bearing precondition Farstone documents) — the
// retry loop here is a correctness backstop, not a substitute for that instance cap.

import { decodeSnapshot, encodeSnapshot, loadEngine, saveEngine } from "@red-cup-engineering/feltos/persistence";
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
        // 412 — another save landed between our read and our write; loop and retry against the
        // now-current generation (see module header for when this can genuinely happen).
      }
      throw new Error(`world-store: gcs save exhausted ${MAX_SAVE_RETRIES} retries for ${describe} (sustained contention)`);
    },
  };
}
