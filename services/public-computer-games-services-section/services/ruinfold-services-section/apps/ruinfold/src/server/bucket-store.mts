// bucket-store — ruinfold's OWN remaining GCS persistence surface: the weekly reward-ledger and
// boon records (see store.mts's header). Built on @red-cup-engineering/footing/bucket-store's
// exported createGcsClient -- the exact same conditional-write/retry-on-412 primitive the
// extracted run/score/lock store uses, reused rather than re-implemented, since it was already
// fully generic (no ruinfold-specific fields) before extraction.

import { createGcsClient } from "@red-cup-engineering/footing/bucket-store";
import type { BoonRecord, LedgerEntry } from "./store.mts";

export interface AsyncLedgerBoonStore {
  appendLedger(entry: LedgerEntry): Promise<void>;
  hasLedgerRef(ref: string): Promise<boolean>;
  appendBoon(entry: BoonRecord): Promise<void>;
  readBoonsForWeek(appliesWeekStart: string): Promise<BoonRecord[]>;
  hasBoonsForWeek(appliesWeekStart: string): Promise<boolean>;
}

function parseJsonl<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

function normalizeRoot(root: string): string {
  if (root === "") return "";
  return root.endsWith("/") ? root : `${root}/`;
}

export interface BucketLedgerBoonOptions {
  bucket: string;
  root?: string;
  apiBase?: string;
  request?: (url: string, init?: RequestInit) => Promise<Response>;
  googleApiRequestOptions?: unknown;
}

export function openBucketLedgerBoonStore(opts: BucketLedgerBoonOptions): AsyncLedgerBoonStore {
  const root = normalizeRoot(opts.root ?? "");
  const client = createGcsClient(opts as any);
  const ledgerFile = `${root}reward-ledger.jsonl`;
  const boonsFile = `${root}boons.jsonl`;

  async function readLedger(): Promise<LedgerEntry[]> {
    const obj = await client.getObject(ledgerFile);
    return obj ? parseJsonl<LedgerEntry>(obj.text) : [];
  }
  async function readBoons(): Promise<BoonRecord[]> {
    const obj = await client.getObject(boonsFile);
    return obj ? parseJsonl<BoonRecord>(obj.text) : [];
  }

  return {
    async appendLedger(entry) {
      await client.appendJsonlLine(ledgerFile, JSON.stringify(entry) + "\n");
    },
    async hasLedgerRef(ref) {
      return (await readLedger()).some((e) => e.ref === ref);
    },
    async appendBoon(entry) {
      await client.appendJsonlLine(boonsFile, JSON.stringify(entry) + "\n");
    },
    async readBoonsForWeek(appliesWeekStart) {
      return (await readBoons()).filter((b) => b.appliesWeekStart === appliesWeekStart);
    },
    async hasBoonsForWeek(appliesWeekStart) {
      return (await readBoons()).some((b) => b.appliesWeekStart === appliesWeekStart);
    },
  };
}
