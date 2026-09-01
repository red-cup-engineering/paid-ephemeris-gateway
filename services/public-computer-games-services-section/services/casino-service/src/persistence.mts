/**
 * persistence.mts — the smallest possible durability seam for `CasinoEconomy`'s in-memory
 * state: load a JSON snapshot at startup (if a path is configured), write one back on an
 * interval and at shutdown. Deliberately not a database: Cloud Run for this service runs
 * `max-instances 1` (in-process economy state is the house pattern here, same as
 * flickering-delve's own `FLICKERING_SAVE`/`loadJsonSnapshot`/`saveJsonSnapshot` precedent),
 * so a single JSON file on a mounted volume (or simply omitted, for pure in-memory dev/test
 * runs) is enough for this pass. Swapping this module's two functions for a GCS
 * read/write-if-changed pair (matching farstone-services-section's own GCS persistence
 * convention) is the seam a later pass takes; nothing in server.mts or casino-economy.mts
 * needs to change to do it, since both only ever call `loadSnapshot`/`saveSnapshot` by name.
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import type { CasinoEconomySnapshot } from './economy/casino-economy.mts';

/** Load a snapshot from `path`, or return `null` if the path is unset, the file doesn't exist
 *  yet (first boot), or its contents fail to parse (never throws — a corrupt/missing snapshot
 *  means "start fresh," not "crash the service"). */
export async function loadSnapshot(path: string | undefined): Promise<CasinoEconomySnapshot | null> {
  if (path === undefined || path === '') return null;
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as CasinoEconomySnapshot;
  } catch {
    return null;
  }
}

/** Write a snapshot to `path` atomically (write to a temp file, then rename over the target),
 *  so a crash mid-write never leaves a half-written, unparseable snapshot behind. A no-op if
 *  `path` is unset. */
export async function saveSnapshot(path: string | undefined, snapshot: CasinoEconomySnapshot): Promise<void> {
  if (path === undefined || path === '') return;
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(snapshot), 'utf8');
  await rename(tmp, path);
}
