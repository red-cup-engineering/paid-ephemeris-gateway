// store-factory — composes @red-cup-engineering/footing's daily-tournament base store (runs/
// scores/scored-lock) with ruinfold's own remaining ledger/boon extension (store.mts/
// bucket-store.mts) into the one `Store` surface this app's server.mts/rollover.mts consume.
// Backend selection (file vs. GCS bucket) is still driven by RUINFOLD_BUCKET, resolved HERE
// (footing never reads process.env or knows this env var's name -- see footing's store-factory.mjs
// header) and passed as a plain bucket-name string to both footing's own selector and this file's
// own ledger/boon selector, so the two halves always agree on which backend is live.

import { openDailyStoreAuto } from "@red-cup-engineering/footing/store-factory";
import type { BucketStoreOptions } from "@red-cup-engineering/footing/bucket-store";
import { openFileLedgerBoonStore } from "./store.mts";
import { openBucketLedgerBoonStore } from "./bucket-store.mts";
import type { LedgerEntry, BoonRecord } from "./store.mts";

export interface StoreFactoryEnv {
  RUINFOLD_BUCKET?: string;
}

export interface Store {
  root: string;
  appendRun(rec: any): Promise<void>;
  readRunsForDate(date: string): Promise<any[]>;
  readRunById(date: string, runId: string): Promise<any | null>;
  appendScore(rec: any): Promise<void>;
  readScoresForDate(date: string): Promise<any[]>;
  listRunDates(): Promise<string[]>;
  listScoreDates(): Promise<string[]>;
  hasScoredLock(date: string, actor: string): Promise<boolean>;
  writeScoredLock(date: string, actor: string, runId: string): Promise<void>;
  appendLedger(entry: LedgerEntry): Promise<void>;
  hasLedgerRef(ref: string): Promise<boolean>;
  appendBoon(entry: BoonRecord): Promise<void>;
  readBoonsForWeek(appliesWeekStart: string): Promise<BoonRecord[]>;
  hasBoonsForWeek(appliesWeekStart: string): Promise<boolean>;
}

// asAsyncLedgerBoon — the same sync-to-async adapter shape footing's own asAsyncDailyStore uses,
// applied to the file-backed ledger/boon half so every Store method is uniformly Promise-returning
// regardless of backend (a caller should never need to know which half of a composed Store came
// from which package).
function asAsyncLedgerBoon(store: ReturnType<typeof openFileLedgerBoonStore>) {
  return {
    appendLedger: (entry: LedgerEntry) => Promise.resolve().then(() => store.appendLedger(entry)),
    hasLedgerRef: (ref: string) => Promise.resolve().then(() => store.hasLedgerRef(ref)),
    appendBoon: (entry: BoonRecord) => Promise.resolve().then(() => store.appendBoon(entry)),
    readBoonsForWeek: (w: string) => Promise.resolve().then(() => store.readBoonsForWeek(w)),
    hasBoonsForWeek: (w: string) => Promise.resolve().then(() => store.hasBoonsForWeek(w)),
  };
}

export function openStoreAuto(
  root: string,
  env: StoreFactoryEnv = process.env,
  bucketOptions: Omit<BucketStoreOptions, "bucket" | "root"> = {},
): Store {
  const bucket = env.RUINFOLD_BUCKET;
  const base = openDailyStoreAuto(root, bucket, bucketOptions);
  const ledgerBoon =
    bucket !== undefined && bucket !== ""
      ? openBucketLedgerBoonStore({ bucket, root, ...bucketOptions })
      : asAsyncLedgerBoon(openFileLedgerBoonStore(root));
  return { ...base, ...ledgerBoon } as Store;
}
