/**
 * sync — the DOING of waggle: fetch a Hive account's new history, book it
 * idempotently against the persisted ledger, settle to balances, reconcile
 * against live chain state, and persist the result. Network access is
 * INJECTED (a constructed HiveComputer), so the whole pipeline is testable
 * offline with a stub transport.
 *
 * Persistence lives beside the key store, in
 * `~/.config/blockchain/hive/<account>/`:
 *   - `ledger.json`     the resumable booked state (lastSeq + transactions)
 *   - `balances.txt`    a human-readable balances + reconciliation summary
 *
 * Amounts are exact rationals (bigint num/den). JSON cannot hold bigint, so
 * serializeLedger renders num/den as decimal strings; deserializeLedger
 * parses them back. No float ever touches money.
 */
import {
  readFileSync, writeFileSync, renameSync, existsSync, mkdirSync,
} from "node:fs";
import path from "node:path";
import type { HiveComputer } from "@emsenn/computing-with-hive/client";
import type { HiveAccount } from "@emsenn/computing-with-hive/chain";
import {
  bookHistory, settle, reconcile,
  type HistoryEntry, type ChainState, type ReconcileReport, type LoadedLedger,
  type Transaction,
} from "./book.mjs";
import type { Money } from "@emsenn/relating/economy";
import { commodityOf, moneyFromParts, toExactString } from "@emsenn/relating/economy";
import { formatAmount } from "@emsenn/computing-with-ledgers/decimal";
import { keystoreDir, defaultKeystoreRoot } from "./keystore.mjs";

/** A safe cap on how many history ops a single sync will pull in one run. */
const DEFAULT_PAGE_LIMIT = 1000;
const MAX_PAGES = 1000;

// ---------- persisted ledger shape ----------

/** A JSON-safe Amount: bigint num/den rendered as decimal strings. */
interface JsonAmount {
  readonly num: string;
  readonly den: string;
  readonly commodity: string;
}

/** The on-disk persisted ledger (JSON). Transactions are stored verbatim, with Amounts JSON-ified. */
export interface PersistedLedger {
  readonly account: string;
  readonly lastSeq: number;
  readonly unmappedCount: number;
  readonly transactions: readonly unknown[];
}

function isAmount(v: unknown): v is Money {
  return typeof v === "object" && v !== null
    && (v as { kind?: unknown }).kind === "exactNumber.gradedRational"
    && typeof (v as { grade?: unknown }).grade === "string";
}

function isJsonAmount(v: unknown): v is JsonAmount & { readonly __amount: true } {
  return typeof v === "object" && v !== null && (v as { __amount?: unknown }).__amount === true;
}

/** Recursively JSON-ify any Amount (bigint num/den) found in a value. */
function jsonifyAmounts(value: unknown): unknown {
  if (isAmount(value)) {
    const [fraction] = toExactString(value).split(" ");
    const [num, den] = (fraction ?? "0/1").split("/");
    return { __amount: true, num: num ?? "0", den: den ?? "1", commodity: commodityOf(value) };
  }
  if (Array.isArray(value)) return value.map(jsonifyAmounts);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = jsonifyAmounts(v);
    return out;
  }
  return value;
}

/** Recursively rebuild exact Amounts from their JSON-ified form. */
function reviveAmounts(value: unknown): unknown {
  if (isJsonAmount(value)) {
    return moneyFromParts(BigInt(value.num), BigInt(value.den), value.commodity);
  }
  if (Array.isArray(value)) return value.map(reviveAmounts);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveAmounts(v);
    return out;
  }
  return value;
}

/** Serialize booked transactions + resume state to the JSON-safe persisted form. */
export function serializeLedger(account: string, transactions: readonly Transaction[], lastSeq: number, unmappedCount: number): PersistedLedger {
  return {
    account,
    lastSeq,
    unmappedCount,
    transactions: transactions.map((t) => jsonifyAmounts(t)),
  };
}

/** Parse a persisted ledger back into in-memory transactions with exact Amounts. */
export function deserializeLedger(persisted: PersistedLedger): { transactions: Transaction[]; lastSeq: number; unmappedCount: number } {
  const transactions = persisted.transactions.map((t) => reviveAmounts(t)) as Transaction[];
  return { transactions, lastSeq: persisted.lastSeq, unmappedCount: persisted.unmappedCount };
}

// ---------- paths ----------

function ledgerPath(account: string, root: string): string {
  return path.join(keystoreDir(account, root), "ledger.json");
}

function balancesPath(account: string, root: string): string {
  return path.join(keystoreDir(account, root), "balances.txt");
}

function atomicWrite(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, contents);
  renameSync(tmp, file);
}

// ---------- rendering ----------

function placesFor(commodity: string): number {
  return commodity === "VESTS" ? 6 : 3;
}

/** Render balances (account → commodity → Amount) as a stable list of lines. */
export function renderBalances(balances: LoadedLedger["balances"]): string[] {
  const lines: string[] = [];
  for (const account of [...balances.keys()].sort()) {
    const byCommodity = balances.get(account)!;
    for (const commodity of [...byCommodity.keys()].sort()) {
      const a = byCommodity.get(commodity)!;
      lines.push(`${account}  ${formatAmount(a, { places: placesFor(commodity), grouping: false })}`);
    }
  }
  return lines;
}

function chainStateOf(account: HiveAccount): ChainState {
  const cs: { -readonly [K in keyof ChainState]?: ChainState[K] } = {
    balance: account.balance,
    hbd_balance: account.hbd_balance,
  };
  if (typeof account["savings_balance"] === "string") cs.savings_balance = account["savings_balance"];
  if (typeof account["savings_hbd_balance"] === "string") cs.savings_hbd_balance = account["savings_hbd_balance"];
  return cs as ChainState;
}

// ---------- the sync ----------

export interface SyncOptions {
  readonly client: HiveComputer;
  readonly account: string;
  readonly root?: string | undefined;
  readonly pageLimit?: number | undefined;
}

export interface SyncResult {
  readonly account: string;
  /** Total history ops fetched this run (new ops walked back from head). */
  readonly opsFetched: number;
  /** Pages (RPC calls) made walking history this run. */
  readonly pagesFetched: number;
  readonly transactionsTotal: number;
  readonly unmappedTotal: number;
  /** Rendered balances lines (account → amount commodity). */
  readonly balances: readonly string[];
  readonly reconcile: ReconcileReport;
  /** Highest history seq booked; the resume point for the next sync. */
  readonly lastSeq: number;
}

/** Load persisted ledger from disk, or an empty starting state. */
function loadPersisted(account: string, root: string): { transactions: Transaction[]; lastSeq: number; unmappedCount: number } {
  const file = ledgerPath(account, root);
  if (!existsSync(file)) return { transactions: [], lastSeq: -1, unmappedCount: 0 };
  return deserializeLedger(JSON.parse(readFileSync(file, "utf8")) as PersistedLedger);
}

/**
 * Fetch NEW history entries, walking condenser get_account_history BACKWARD
 * from head (start = -1) until we reach `sinceSeq` (already-booked) or run
 * out. Each page asks for [account, start, limit]: condenser returns the
 * ascending [seq, op] rows with seq in `[max(0, start-limit) .. start]`
 * (limit is capped at `start`, since the window cannot run below seq 0). We
 * step `start` to (lowestSeq - 1) for the next, older page, and a final
 * `start = 0, limit = 0` call fetches op 0 itself. Stops when a page reaches
 * seq <= sinceSeq, at the genesis op, or at MAX_PAGES.
 */
async function fetchNewHistory(
  client: HiveComputer,
  account: string,
  sinceSeq: number,
  pageLimit: number,
): Promise<{ entries: HistoryEntry[]; pages: number }> {
  const collected: HistoryEntry[] = [];
  let start = -1; // head
  let pages = 0;
  for (; pages < MAX_PAGES; ) {
    // condenser caps the window at `start` (limit <= start); start=0 still
    // returns op 0 with limit 0, so only stop once start has gone negative.
    if (start !== -1 && start < 0) break;
    const limit = start === -1 ? pageLimit : Math.min(pageLimit, start);
    const rows = (await client.getAccountHistory(account, start, limit)) as HistoryEntry[];
    pages += 1;
    if (rows.length === 0) break;
    let lowest = Number.POSITIVE_INFINITY;
    let reachedSeen = false;
    for (const entry of rows) {
      const seq = entry[0];
      if (seq < lowest) lowest = seq;
      if (seq <= sinceSeq) { reachedSeen = true; continue; }
      collected.push(entry);
    }
    if (reachedSeen) break; // walked back into already-booked territory
    if (lowest <= 0) break; // reached the genesis of this account's history
    if (!Number.isFinite(lowest)) break;
    start = lowest - 1; // next, older page ends just before this one began
  }
  return { entries: collected, pages };
}

/**
 * Run a full sync for `account`: resume from persisted state, fetch and book
 * new history, settle balances, reconcile against live chain state, persist
 * the updated ledger + a human-readable summary, and return a SyncResult.
 */
export async function syncAccount(opts: SyncOptions): Promise<SyncResult> {
  const { client, account } = opts;
  const root = opts.root ?? defaultKeystoreRoot();
  const pageLimit = opts.pageLimit ?? DEFAULT_PAGE_LIMIT;

  // 1. resume point
  const persisted = loadPersisted(account, root);
  const seen = new Set<string>(persisted.transactions.map((t) => String(t.id)));

  // 2. fetch new history backward from head
  const { entries, pages } = await fetchNewHistory(client, account, persisted.lastSeq, pageLimit);

  // 3. book new entries, merging with persisted transactions
  const booked = bookHistory(entries, account, seen);
  const allTransactions = [...persisted.transactions, ...booked.transactions];
  const lastSeq = Math.max(persisted.lastSeq, booked.lastSeq);
  const unmappedTotal = persisted.unmappedCount + booked.unmapped.length;

  // 4. settle to balances
  const ledger = settle(allTransactions);

  // 5. reconcile against live chain state
  const chainAccount = await client.getAccount(account);
  const report = chainAccount
    ? reconcile(ledger.balances, chainStateOf(chainAccount))
    : ({ kind: "waggle.book.reconcile", lines: [], reconciled: false } as ReconcileReport);

  // 6. persist (atomic)
  const renderedBalances = renderBalances(ledger.balances);
  atomicWrite(ledgerPath(account, root), JSON.stringify(serializeLedger(account, allTransactions, lastSeq, unmappedTotal)));
  atomicWrite(balancesPath(account, root), renderSummary(account, renderedBalances, report, unmappedTotal, lastSeq));

  // 7. result
  return {
    account,
    opsFetched: entries.length,
    pagesFetched: pages,
    transactionsTotal: allTransactions.length,
    unmappedTotal,
    balances: renderedBalances,
    reconcile: report,
    lastSeq,
  };
}

/** A human-readable balances + reconciliation summary (the balances.txt body). */
export function renderSummary(account: string, balances: readonly string[], report: ReconcileReport, unmappedTotal: number, lastSeq: number): string {
  const lines: string[] = [];
  lines.push(`# @${account} — waggle balances`);
  lines.push(`# lastSeq=${lastSeq}  unmapped=${unmappedTotal}  reconciled=${report.reconciled}`);
  lines.push("");
  lines.push("## balances");
  for (const b of balances) lines.push(b);
  lines.push("");
  lines.push("## reconciliation");
  for (const l of report.lines) {
    lines.push(`${l.reconciled ? "ok  " : "DIFF"}  ${l.account}  booked ${l.booked}  actual ${l.actual}${l.reconciled ? "" : `  delta ${l.delta}`}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Read the persisted balances for an account without any network access. */
export function loadBalances(account: string, root: string = defaultKeystoreRoot()): { balances: string[]; lastSeq: number; unmappedCount: number } | undefined {
  const file = ledgerPath(account, root);
  if (!existsSync(file)) return undefined;
  const { transactions, lastSeq, unmappedCount } = loadPersisted(account, root);
  const ledger = settle(transactions);
  return { balances: renderBalances(ledger.balances), lastSeq, unmappedCount };
}
