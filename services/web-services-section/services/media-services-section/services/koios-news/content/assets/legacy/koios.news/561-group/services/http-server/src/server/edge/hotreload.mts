// edge/hotreload.ts — Zero-downtime hot reload via file-watching manifest swap.
//
// The "manifest" is a JSON file that describes which App module to load.
// On SIGHUP or file change, the manifest is re-read, the new module imported,
// and the App reference atomically swapped — in-flight requests complete on the old App.
//
// The swap is a Meme: {subject: "app", predicate: "reload", object: version}.
// A successfully loaded app becomes the live version.

import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { App, Middleware } from "../types.mjs";

export type HotReloadOptions = {
  /** Path to a JSON manifest with at minimum { "module": "./path/to/app.mjs" }. */
  manifestPath: string;
  /** Called after a successful reload with the new App. */
  onReload?: (app: App, version: number) => void;
  /** Called if a reload fails. Default: log to stderr. */
  onError?: (err: unknown, version: number) => void;
  /** Watch the manifest file for changes (default true). */
  watch?: boolean;
  /** Also reload on SIGHUP (default true). */
  sighup?: boolean;
};

export type Manifest = {
  module: string;
  [key: string]: unknown;
};

export type ReloadableApp = {
  /** Current live App. */
  current(): App;
  /** Middleware that always forwards to the current App's handler. */
  middleware: Middleware;
  /** Trigger a reload now. */
  reload(): Promise<void>;
  /** Stop watching. */
  stop(): void;
};

export function hotReload(opts: HotReloadOptions): ReloadableApp {
  const store = new UtteranceLog();
  let version = 0;
  let currentApp: App = { resources: [] };
  let watcher: ReturnType<typeof watch> | null = null;

  async function loadApp(manifest: Manifest): Promise<App> {
    // Dynamic import with cache-busting via URL query param
    const mod = await import(`${manifest.module}?v=${++version}`) as { default?: App; app?: App };
    return (mod.default ?? mod.app ?? {}) as App;
  }

  async function doReload(): Promise<void> {
    const v = version + 1;
    try {
      const raw = await readFile(opts.manifestPath, "utf8");
      const manifest = JSON.parse(raw) as Manifest;
      const newApp = await loadApp(manifest);

      witness(store, { subject: "app", predicate: "reload", object: String(v) }, [true, false]);

      currentApp = newApp;
      opts.onReload?.(newApp, v);
    } catch (err) {
      opts.onError?.(err, v) ?? console.error("[hotreload] failed:", err);
    }
  }

  if (opts.watch !== false) {
    try {
      watcher = watch(opts.manifestPath, () => void doReload());
    } catch { /* file may not exist yet */ }
  }

  if (opts.sighup !== false) {
    process.on("SIGHUP", () => void doReload());
  }

  const middleware: Middleware = async (ctx) => {
    // The middleware just calls through — the pipeline uses currentApp's resources.
    // To actually swap resources, callers update app.resources = reloadable.current().resources.
    const app = currentApp;
    for (const mw of app.middlewares ?? []) {
      const result = await mw(ctx);
      if (result === true) return true;
    }
    return;
  };

  return {
    current() { return currentApp; },
    middleware,
    async reload() { await doReload(); },
    stop() { if (watcher) { watcher.close(); watcher = null; } },
  };
}
