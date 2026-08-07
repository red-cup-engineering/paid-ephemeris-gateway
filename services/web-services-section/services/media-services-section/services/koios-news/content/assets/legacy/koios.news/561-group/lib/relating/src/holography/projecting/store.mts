// holography/projecting/store — the thin filesystem binding for the three tiers.
//
// THIS IS THE ONLY EFFECTFUL FILE in projecting/: the one place that imports
// node:fs. Every other module here is pure mathematics over carriers. This binding
// congregates the fs idioms hand-rolled across the corpus (aagaard, ops, fizzos,
// koios all re-derived these): content-dedup append, ENOENT-tolerant read, and
// atomic temp-write + rename for the projected tiers.
//
//   data/log/<feed>.jsonl     append-only EAVT witnesses (truly append-only;
//                             unchanged cells dedupe to zero cost)
//   data/state/<feed>.json    the current view, projected from the log
//   data/record/<feed>.jsonl  settled invariants (Datoms), with the log compacted
//                             against them — pruning by determinacy, not by age
//
// Feed paths are FLAT (`<dir>/<feed>.jsonl`), matching the on-disk convention and
// the existing data files. The codec's term-addressed `address`/`logPath` (which
// nests `root/term/term.jsonl`) is the richer scheme available when a feed wants
// term-addressed sublogs; the flat leaf is the default the three tiers use.

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  canonical,
  parse as parseJson,
  serializeLines,
  requireJsonValue,
  type JsonValue,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
import type {
  EAVT,
  EAVTRecord,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
import {
  eavtId,
  eavtRecord,
  parse as parseEavt,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
import {
  serialize as serializeDatoms,
  type Datom,
} from "../../codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/datom/index.mjs";

import type { StateView } from "./state.mjs";

/** The three projection tiers on disk. Dirs are free-form, so a consumer with a
 *  legacy `data/logs` (plural) layout passes that string directly. */
export interface WitnessStore {
  readonly logDir: string;
  readonly stateDir: string;
  readonly recordDir: string;
}

/** The flat leaf path of a feed's file under a tier directory. */
export function feedPath(dir: string, feed: string, type: string): string {
  return path.join(dir, `${feed}.${type}`);
}

/** Atomically write `content` to `filePath`: temp file + rename, so a crash
 *  mid-write never corrupts the target (rename is atomic on POSIX). The single
 *  atomic-write idiom the corpus re-derived (ops `writeJsonState`, fizzos
 *  `fileStore.save`, the log compaction rewrite) collapses into this. */
export function writeFileAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.${process.pid}.tmp`;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, filePath);
}

/** Append records as newline-delimited canonical JSON, creating the directory as
 *  needed. Best-effort (advisory persistence): write errors are swallowed, never
 *  thrown — the generic JSONL append the corpus shares. `appendWitnesses` is its
 *  EAVT-deduped specialization. No-op on empty input. */
export function appendJsonl(filePath: string, records: readonly unknown[]): void {
  if (records.length === 0) return;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    appendFileSync(filePath, serializeLines(records.map((r) => requireJsonValue(r, "jsonl record"))), "utf8");
  } catch {
    // non-fatal: persistence is advisory
  }
}

/** Read newline-delimited JSON, skipping malformed lines individually (a single
 *  bad line never loses the rest); a missing file yields an empty array. The
 *  ENOENT/malformed-tolerant read the corpus shares. */
export function readJsonl<T = JsonValue>(filePath: string): T[] {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return []; // file does not exist yet
  }
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(parseJson(trimmed) as T);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

/** Read a single JSON document, or null if absent/unreadable. */
export function readJsonFile<T = JsonValue>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Ensure all three tier directories exist. */
export function ensureStoreDirs(store: WitnessStore): void {
  mkdirSync(store.logDir, { recursive: true });
  mkdirSync(store.stateDir, { recursive: true });
  mkdirSync(store.recordDir, { recursive: true });
}

/** Read a feed's witness log as EAVT tuples (newest-last, as appended). A missing
 *  file yields no witnesses; malformed lines are skipped by the codec. */
export function readWitnessLog(store: WitnessStore, feed: string): EAVT[] {
  let content: string;
  try {
    content = readFileSync(feedPath(store.logDir, feed, "jsonl"), "utf8");
  } catch {
    return [];
  }
  return parseEavt(content);
}

/** Append only the witnesses not already present (by content identity). Returns
 *  how many rows were genuinely new — the per-tick growth signal. Best-effort
 *  dedup is exact: a cell whose every coordinate is unchanged costs nothing. */
export function appendWitnesses(
  store: WitnessStore,
  feed: string,
  rows: readonly EAVTRecord[],
): { readonly appended: number } {
  if (rows.length === 0) return { appended: 0 };
  const present = new Set<string>(readWitnessLog(store, feed).map((e) => eavtId(e)));
  const fresh: EAVTRecord[] = [];
  for (const row of rows) {
    const id = eavtId(row);
    if (present.has(id)) continue;
    present.add(id);
    fresh.push(eavtRecord(row));
  }
  if (fresh.length === 0) return { appended: 0 };
  mkdirSync(store.logDir, { recursive: true });
  appendFileSync(feedPath(store.logDir, feed, "jsonl"), serializeLines(fresh), "utf8");
  return { appended: fresh.length };
}

/** Atomically write any JSON snapshot to `<dir>/<feed>.<type>` (temp file + rename,
 *  so a crash mid-write never corrupts the file — rename is atomic on POSIX). */
export function writeJsonAtomic(dir: string, feed: string, value: JsonValue, type = "json"): void {
  writeFileAtomic(feedPath(dir, feed, type), `${canonical(value)}\n`);
}

/** Write a feed's projected current view to data/state/<feed>.json, atomically. */
export function writeState(store: WitnessStore, feed: string, view: StateView): void {
  writeJsonAtomic(store.stateDir, feed, view as JsonValue);
}

/** Commit an invariant projection: append its Datoms to data/record/<feed>.jsonl
 *  and atomically rewrite data/log/<feed>.jsonl to the compacted (kept) rows. A
 *  no-op when there is nothing to record. */
export function commitRecord(
  store: WitnessStore,
  feed: string,
  datoms: readonly Datom[],
  keptLog: readonly EAVT[],
): void {
  if (datoms.length === 0) return;
  mkdirSync(store.recordDir, { recursive: true });
  appendFileSync(feedPath(store.recordDir, feed, "jsonl"), serializeDatoms(datoms), "utf8");
  writeFileAtomic(feedPath(store.logDir, feed, "jsonl"), serializeLines(keptLog as readonly JsonValue[]));
}
