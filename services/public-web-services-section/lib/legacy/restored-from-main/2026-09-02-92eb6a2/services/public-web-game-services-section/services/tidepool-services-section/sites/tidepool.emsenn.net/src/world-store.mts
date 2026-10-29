// world-store — selects Tidepool's persistence backend (FELTOS_BUCKET set -> GCS bucket store,
// FELTOS_SAVE as the object name; FELTOS_BUCKET unset with FELTOS_SAVE set -> local file via
// feltos's loadEngine/saveEngine; neither set -> in-memory only, openWorldStore returns null),
// structurally identical to Farstone's own world-store.mts. Bucket-mode save is a conditional
// REPLACE guarded by GCS generation, retried on 412 — a correctness backstop, not a substitute
// for the deploy's --max-instances 1 pin that prevents real multi-writer contention.

import { decodeSnapshot, encodeSnapshot, loadEngine, saveEngine } from "@red-cup-engineering/feltos/persistence";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import type { GcsClientOptions } from "@red-cup-engineering/footing/gcs-client";

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

  // retry:true preserves this store's pre-footing default (footing's own default is opt-in-off).
  const client = createGcsClient({ bucket: backend.bucket, retry: true, ...opts.gcsClientOptions });
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
