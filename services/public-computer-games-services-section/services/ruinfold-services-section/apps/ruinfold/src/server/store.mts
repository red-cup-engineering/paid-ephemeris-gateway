// store — ruinfold's OWN remaining persistence surface after the daily-tournament core (runs/
// scores/scored-lock) moved to @red-cup-engineering/footing: the weekly reward-ledger and boon
// records, which stay ruinfold-local (no other game has this mechanic). Same append-only JSONL
// discipline as before, unmodified logic -- only the run/score/lock methods left this file.
//
// Layout under root:
//   reward-ledger.jsonl   would-pay ZBD accrual intents (reward-hook.mts) + no-op markers
//   boons.jsonl            computed weekly boon awards (+ "considered, nobody qualified" markers)

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface LedgerEntry {
  wouldPay: boolean;
  date: string;
  ref: string;
  actor: string | null;
  amountUsd: number;
  postings: { account: string; amount: number; commodity: string }[];
  reason: string;
  gates: { note: string };
  recordedAt: string;
}

export interface BoonRecord {
  actor: string | null; // null only for the "considered, nobody qualified" marker
  weeklyScore: number;
  rank: number; // 0 for the marker
  boonName: string | null;
  edge: Record<string, number>;
  sourceWeekStart: string;
  appliesWeekStart: string;
  computedAt: string;
  empty?: boolean;
}

export interface LedgerBoonStore {
  appendLedger(entry: LedgerEntry): void;
  hasLedgerRef(ref: string): boolean;
  appendBoon(entry: BoonRecord): void;
  readBoonsForWeek(appliesWeekStart: string): BoonRecord[];
  hasBoonsForWeek(appliesWeekStart: string): boolean;
}

function ensureDirFor(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function appendJSONL(file: string, obj: unknown): void {
  ensureDirFor(file);
  appendFileSync(file, JSON.stringify(obj) + "\n", "utf8");
}

function readJSONL<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

export function openFileLedgerBoonStore(root: string): LedgerBoonStore {
  const ledgerFile = join(root, "reward-ledger.jsonl");
  const boonsFile = join(root, "boons.jsonl");
  return {
    appendLedger(entry) {
      appendJSONL(ledgerFile, entry);
    },
    hasLedgerRef(ref) {
      return readJSONL<LedgerEntry>(ledgerFile).some((e) => e.ref === ref);
    },
    appendBoon(entry) {
      appendJSONL(boonsFile, entry);
    },
    readBoonsForWeek(appliesWeekStart) {
      return readJSONL<BoonRecord>(boonsFile).filter((b) => b.appliesWeekStart === appliesWeekStart);
    },
    hasBoonsForWeek(appliesWeekStart) {
      return readJSONL<BoonRecord>(boonsFile).some((b) => b.appliesWeekStart === appliesWeekStart);
    },
  };
}
