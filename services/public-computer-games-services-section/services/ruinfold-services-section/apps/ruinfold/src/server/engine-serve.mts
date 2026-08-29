// engine-serve — hands the browser client the SAME `#engine/*.mts` source the server (and every
// engine test) imports, with TypeScript type syntax stripped via node:module's native
// `stripTypeScriptTypes` (Node stdlib, zero deps, `mode: "strip"` — erase-only, no downleveling)
// so it loads as a plain ES module in a browser. This is design §6.1's "the client never runs the
// dungeon generator... renders what it's told" turned into a "same code, two runtimes" build step:
// every engine module is written in only-erasable TypeScript (interfaces/type aliases/type-only
// imports, no enums/namespaces/parameter-properties), confirmed by every module round-tripping
// through `node --check` after stripping — so stripping IS the entire build step. No bundler.
//
// Only files directly inside src/engine, matching a conservative lowercase-kebab ".mts" filename
// allowlist, are ever read — the same path-injection posture @red-cup-engineering/footing/guard's isSafeId documents,
// specialized to this route's one legal shape.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stripTypeScriptTypes } from "node:module";

const SAFE_MODULE_RE = /^[a-z][a-z0-9-]*\.mts$/;

export interface EngineHit {
  status: 200;
  body: string;
}
export interface EngineMiss {
  status: 400 | 404;
}
export type EngineResult = EngineHit | EngineMiss;

export function readEngineModule(engineRoot: string, filename: string): EngineResult {
  if (!SAFE_MODULE_RE.test(filename)) return { status: 400 };
  const abs = join(engineRoot, filename);
  if (!existsSync(abs)) return { status: 404 };
  const src = readFileSync(abs, "utf8");
  // "strip" mode only erases type syntax (whitespace-preserving) — it throws on TS constructs
  // that have runtime semantics (enums, namespaces, parameter properties), none of which any
  // engine module uses; a throw here would mean an engine module drifted out of browser-safe
  // TypeScript, which is exactly the case worth surfacing as a 500 rather than silently masking.
  const body = stripTypeScriptTypes(src, { mode: "strip" });
  return { status: 200, body };
}
