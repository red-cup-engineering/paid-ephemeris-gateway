// local-log-compaction — the local-file-mode (WORLD_LOG=<path>) counterpart to log-store.mjs's
// bucket-mode compaction; snapshot.mjs's own header already named this file as its intended
// sibling. Closes the 2026-09-02 cold-red-gate incident: per-tick NPC "moved" appends grew
// WORLD_LOG to 8.3GB in ~36h. Row count is tracked in memory via the world's onAppend hook
// (avoids re-reading the growing file to size it); past threshold, the file is atomically
// replaced with snapshotRows()'s minimum row set — the same fold store.replay() already uses.

import { writeFlatfile } from "@red-cup-engineering/flatfile";
import { snapshotRows, encodeSnapshotRows, DEFAULT_COMPACT_THRESHOLD_ROWS } from "./snapshot.mjs";

/**
 * Create a local-file compactor for one WORLD_LOG path.
 * @param {object} opts
 * @param {string} opts.logPath - the WORLD_LOG file to compact in place.
 * @param {number} [opts.compactThresholdRows] - rows appended since the last compaction that
 *   trigger the next one (default snapshot.mjs's DEFAULT_COMPACT_THRESHOLD_ROWS).
 * @param {(info: {tailRowsBeforeCompaction: number, snapshotRows: number, durationMs: number}) => void} [opts.onCompact]
 * @returns {{
 *   setWorld: (worldOrGetWorld: object|(() => object)) => void,
 *   noteAppend: () => void,
 *   maybeCompact: () => boolean,
 *   compactBacklogIfOversized: (bootRowCount: number) => boolean,
 * }}
 */
export function createLocalLogCompactor({ logPath, compactThresholdRows = DEFAULT_COMPACT_THRESHOLD_ROWS, onCompact = () => {} }) {
  let getWorld = () => null;
  let sinceCompaction = 0;

  function compact() {
    const world = getWorld();
    if (!world) return false;
    const start = performance.now();
    const rows = snapshotRows(world);
    writeFlatfile(logPath, encodeSnapshotRows(rows));
    const tailRowsBeforeCompaction = sinceCompaction;
    sinceCompaction = 0;
    onCompact({ tailRowsBeforeCompaction, snapshotRows: rows.length, durationMs: performance.now() - start });
    return true;
  }

  return {
    /** Attach the live world (or a `() => world` accessor) so a threshold crossing has state to compact. */
    setWorld(worldOrGetWorld) {
      getWorld = typeof worldOrGetWorld === "function" ? worldOrGetWorld : () => worldOrGetWorld;
    },
    /** Record one row store.append() already wrote to logPath. No file I/O — the per-tick hot path. */
    noteAppend() { sinceCompaction++; },
    /** Call periodically; compacts and returns true once sinceCompaction reaches the threshold. */
    maybeCompact() {
      return sinceCompaction >= compactThresholdRows ? compact() : false;
    },
    /**
     * One-time boot-time catch-up for a log that was already oversized before this process's
     * first maybeCompact() tick — mirrors log-store.mjs's compactBacklogIfOversized(). Call once,
     * after setWorld(), with bootRowCount = rowsFromLog(logPath).length.
     */
    compactBacklogIfOversized(bootRowCount) {
      if (bootRowCount < compactThresholdRows) return false;
      if (!getWorld()) return false;
      sinceCompaction = bootRowCount;
      return compact();
    },
  };
}
