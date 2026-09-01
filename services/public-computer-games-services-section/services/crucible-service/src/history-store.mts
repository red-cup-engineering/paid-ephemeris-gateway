/**
 * `history-store` — Node-side atomic local persistence for a `history.mts#HistoryStore`.
 *
 * Deliberately split out of `history.mts` (which stays pure and Node/browser-agnostic) because
 * this file imports `node:fs`/`node:path`/`node:crypto`, which do not exist in a browser and
 * must never be re-exported through `web/js/kernel.mjs`. This file exists for Node-side callers
 * only — tests, and any future CLI or server-side history; the browser client keeps its own thin
 * `localStorage` wrapper (`web/js/history-ui.mjs`) around the same `HistoryStore`/`HistoryRecord`
 * shapes `history.mts` defines, so the two never duplicate the histogram math, only the storage
 * mechanism.
 *
 * Mirrors onestone-service's `scene.mts` persistence doctrine exactly: a schema-versioned
 * (`kind`-tagged) JSON snapshot, atomic write via a uniquely-named tmp file in the same directory
 * followed by `rename` (POSIX-atomic on the same filesystem, so a crash mid-write never leaves a
 * torn/partial save), and restore-or-start-fresh on a missing or corrupt file.
 *
 * `randomUUID()` below is I/O bookkeeping (a unique tmp-file suffix), not game-state randomness —
 * it never influences a tangle, a move's cost, or anything `replay.mts` reproduces, so it does
 * not violate the "seeded PRNG and injected clock only" doctrine, exactly as onestone's own
 * `scene.mts` already establishes as house precedent.
 */
import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyStore, HISTORY_KIND, type HistoryStore } from './history.mts';

/** Load a `HistoryStore` from `filePath`. Missing file, unreadable file, or a payload that
 * doesn't carry the current `HISTORY_KIND` all resolve to a fresh empty store — never a thrown
 * error, per onestone's restore-or-start-fresh doctrine. */
export function loadStore(filePath: string): HistoryStore {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { kind?: unknown }).kind === HISTORY_KIND &&
      Array.isArray((parsed as { records?: unknown }).records)
    ) {
      return parsed as HistoryStore;
    }
  } catch {
    // missing file, unreadable, or corrupt JSON — fall through to a fresh store
  }
  return emptyStore();
}

/** Atomic write: a uniquely-named tmp file in the same directory, then `rename` (POSIX-atomic on
 * the same filesystem) — a crash mid-write never leaves a torn/partial save on `filePath`. */
export async function saveStore(filePath: string, store: HistoryStore): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tmp, JSON.stringify(store), 'utf8');
  await rename(tmp, filePath);
}
