// holography/projecting/store — the thin filesystem binding for the three tiers.
//
// THIS IS THE ONLY EFFECTFUL FILE in projecting/: the one place that imports
// node:fs. Every other module here is pure mathematics over carriers. It
// congregates the fs idioms re-derived across the corpus: content-dedup append,
// ENOENT-tolerant read, and atomic temp-write + rename for the projected tiers.
//
//   <logDir>/<feed>.jsonl      append-only EAVT witnesses (the boundary)
//   <stateDir>/<feed>.json     the current view, projected from the log (bulk)
//   <recordDir>/<feed>.jsonl   settled invariants (Datoms), log compacted (bulk)

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { canonical, requireJsonValue, serializeLines, type JsonValue } from "../../codecs/json.mjs";
import {
  eavtId,
  eavtRecord,
  parse as parseEavt,
  serialize as serializeEavt,
  serializeDatoms,
  type Datom,
  type EAVT,
  type EAVTRecord,
} from "../../codecs/eavt.mjs";

/** The three projection-tier directories on disk. Free-form strings. */
export interface WitnessStore {
  readonly logDir: string;
  readonly stateDir: string;
  readonly recordDir: string;
}

/** The flat leaf path of a feed's file under a tier directory. */
export function feedPath(dir: string, feed: string, type: string): string {
  return path.join(dir, `${feed}.${type}`);
}

/** Atomically write content: temp file + rename (atomic on POSIX), so a crash
 *  mid-write never corrupts the target. */
export function writeFileAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.${process.pid}.tmp`;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, filePath);
}

/** Append records as newline-delimited canonical JSON. Best-effort (advisory):
 *  write errors are swallowed, never thrown. No-op on empty input. */
export function appendJsonl(filePath: string, records: readonly unknown[]): void {
  if (records.length === 0) return;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    appendFileSync(filePath, serializeLines(records.map((r) => requireJsonValue(r, "jsonl record"))), "utf8");
  } catch {
    // non-fatal: persistence is advisory
  }
}

/** Read newline-delimited JSON, skipping malformed lines; a missing file is []. */
export function readJsonl<T = JsonValue>(filePath: string): T[] {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
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

/** Read a feed's witness log as normalized EAVT records. Missing file yields []. */
export function readWitnessLog(store: WitnessStore, feed: string): EAVTRecord[] {
  let content: string;
  try {
    content = readFileSync(feedPath(store.logDir, feed, "jsonl"), "utf8");
  } catch {
    return [];
  }
  return parseEavt(content);
}

/** Append only the witnesses not already present (by content identity). Returns
 *  how many rows were genuinely new — the per-tick growth signal. */
export function appendWitnesses(
  store: WitnessStore,
  feed: string,
  rows: readonly (EAVT | EAVTRecord)[],
): { readonly appended: number } {
  if (rows.length === 0) return { appended: 0 };
  const present = new Set<string>(readWitnessLog(store, feed).map((row) => eavtId(row)));
  const fresh: EAVTRecord[] = [];
  for (const row of rows) {
    const id = eavtId(row);
    if (present.has(id)) continue;
    present.add(id);
    fresh.push(eavtRecord(row));
  }
  if (fresh.length === 0) return { appended: 0 };
  mkdirSync(store.logDir, { recursive: true });
  appendFileSync(feedPath(store.logDir, feed, "jsonl"), serializeEavt(fresh), "utf8");
  return { appended: fresh.length };
}

/** Atomically write a JSON snapshot to `<dir>/<feed>.<type>`. */
export function writeJsonAtomic(dir: string, feed: string, value: JsonValue, type = "json"): void {
  writeFileAtomic(feedPath(dir, feed, type), `${canonical(value)}\n`);
}

/** Commit a settled projection: append its Datoms to the record tier and
 *  atomically rewrite the log to the compacted (kept) rows. No-op when empty. */
export function commitRecord(
  store: WitnessStore,
  feed: string,
  datoms: readonly Datom[],
  keptLog: readonly EAVTRecord[],
): void {
  if (datoms.length === 0) return;
  mkdirSync(store.recordDir, { recursive: true });
  appendFileSync(feedPath(store.recordDir, feed, "jsonl"), serializeDatoms(datoms), "utf8");
  writeFileAtomic(feedPath(store.logDir, feed, "jsonl"), serializeEavt(keptLog));
}
