/**
 * `history` — local history and the histogram model behind the end-of-daily summary. PURE and
 * Node/browser-agnostic on purpose: this is one of the modules `web/js/kernel.mjs` re-exports
 * straight into the browser, so it must never import `node:fs` or anything else Node-only — that
 * lives in the sibling `history-store.mts` instead (kept out of `kernel.mjs`'s re-export list).
 *
 * v1 is local-only, but every function here is written in the shape a future server-side
 * leaderboard endpoint would accept verbatim (ANATOMY digest): a `HistoryRecord` is exactly
 * `{ seed, moveLog, totalCost, finishedAt }` — the same input `replay.mts#replay` needs to
 * independently re-verify a claimed run. `buildHistogram` takes a plain `readonly number[]` of
 * costs and does not know or care whether those numbers came from `localStorage` (v1, via
 * `web/js/history-ui.mjs`) or a future `/leaderboard` fetch (v2) — "don't let it know the
 * difference" (ANATOMY digest).
 */
import type { HistoryRecord, RunState } from './types.mts';

export const HISTORY_KIND = 'crucible-history-v1';

export interface HistoryStore {
  readonly kind: typeof HISTORY_KIND;
  readonly records: readonly HistoryRecord[];
}

export function emptyStore(): HistoryStore {
  return { kind: HISTORY_KIND, records: [] };
}

/** Build the record a completed run produces. `finishedAt` is injected (an ISO-8601 string the
 * caller derived from its own clock read) — this module never reads the clock itself. */
export function recordFromRun(run: RunState, finishedAt: string): HistoryRecord {
  return { seed: run.seed, moveLog: run.log, totalCost: run.totalCost, finishedAt };
}

export function addRecord(store: HistoryStore, record: HistoryRecord): HistoryStore {
  return { kind: HISTORY_KIND, records: [...store.records, record] };
}

export function recordsForSeed(store: HistoryStore, seed: string): readonly HistoryRecord[] {
  return store.records.filter((r) => r.seed === seed);
}

export interface HistogramBucket {
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly count: number;
}

export interface Histogram {
  readonly bucketSize: number;
  readonly buckets: readonly HistogramBucket[];
  readonly total: number;
}

/** Bucket a plain list of costs into a fixed-width histogram. Storage-agnostic by design (see
 * module doc) — v1 calls this with local-history costs; a future leaderboard calls it with the
 * same function on server-fetched costs, unchanged. */
export function buildHistogram(costs: readonly number[], bucketSize = 5): Histogram {
  if (costs.length === 0) return { bucketSize, buckets: [], total: 0 };
  if (bucketSize <= 0) throw new RangeError('buildHistogram: bucketSize must be positive');
  const max = Math.max(...costs);
  const bucketCount = Math.floor(max / bucketSize) + 1;
  const buckets: HistogramBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const rangeStart = i * bucketSize;
    const rangeEnd = rangeStart + bucketSize;
    const count = costs.filter((c) => c >= rangeStart && c < rangeEnd).length;
    buckets.push({ rangeStart, rangeEnd, count });
  }
  return { bucketSize, buckets, total: costs.length };
}

/** Where in `histogram`'s buckets a given cost falls — used to highlight "your run" among the
 * distribution (theme digest's end-of-day framing). Returns -1 if `cost` falls outside every
 * bucket (should not happen for a cost drawn from the same list the histogram was built from). */
export function bucketIndexFor(histogram: Histogram, cost: number): number {
  return histogram.buckets.findIndex((b) => cost >= b.rangeStart && cost < b.rangeEnd);
}
