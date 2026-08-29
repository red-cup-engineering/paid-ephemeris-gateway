/**
 * @emsenn/trading/institution/ledger/book — stage-9 substrate: the chart of
 * accounts, the Hive-history → double-entry booking, the settle, and the
 * on-chain reconciliation, consolidated into one module.
 *
 * This is the PORT (CLAUDE.md "normalization is capability-preserving") of the
 * current `src/ledger/scripts/{accounts,book,settle,reconcile}.mts` onto the
 * rebuilt `@emsenn/trading` substrate. The capabilities are preserved exactly;
 * only the dependencies are re-homed:
 *
 *   - the retired `@emsenn/animating/.../accounting` `Amount` / `amount` / `sub`
 *     / `isZero` / `zero` / `toExactString` collapse into the rebuilt
 *     `../../money` module (exact money is `@emsenn/relating/analysis`'s
 *     `GradedRational`, NEVER a float — the anti-fetishism law: a price/holding
 *     is a settled charge, not free numeric data);
 *   - the `posting` / `transaction` constructors collapse into plain frozen
 *     carriers matching `../ledger.mjs`'s `Transaction` / `Posting` interfaces
 *     (the new ledger sub-layer owns those shapes; this module produces them);
 *   - `parseDecimal` stays at `@emsenn/computing-with-ledgers` — but is reached
 *     through the money module's `parseDecimalMoney`, the one decimal-parse edge.
 *
 * Theory (dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md
 * §4 stage 4 "conservation = double-entry" and stage 9 "the institution"):
 * every booked op is a CONSERVED articulation (every debit a credit), and the
 * ledger is the adjudicated record-state. Booking from the account's OWN
 * perspective (the 2026-06-11 chart-of-accounts memo): own holdings are Assets;
 * counterparties / the chain economy are Income & Expenses; in-flight states are
 * Liabilities. VESTS is stored NATIVE in `Assets:Hive:Vested` so the time-varying
 * HIVE-per-VESTS rate revalues without rewriting the ledger.
 *
 * Two doctrinal invariants drive the design:
 *   1. NO FLOAT — money is exact `Money` (`GradedRational`) end to end.
 *   2. NEVER DROP — an op we do not yet map is recorded as an `UnmappedOp` with
 *      full provenance, so reconciliation surfaces the gap as a real, signed
 *      discrepancy rather than a clean-looking lie. Only `transfer` /
 *      `transfer_to_savings` / `transfer_from_savings` /
 *      `fill_transfer_from_savings` / `interest` are mapped this cut;
 *      cross-commodity / reward ops are kept unmapped pending their rate-bearing
 *      virtual ops.
 */

import {
  type Money,
  commodityOf,
  negateMoney,
  subMoney,
  isZeroMoney,
  toExactString,
  toDecimalString,
  parseDecimalMoney,
} from "@emsenn/relating/economy";
import loadLedger, {
  type LoadedLedger,
  type Transaction,
  type Posting,
} from "@emsenn/organizing/accounting/ledger";

export type { LoadedLedger, Transaction } from "@emsenn/organizing/accounting/ledger";

// ── chart of accounts ────────────────────────────────────────────────────────
//
// The single Hive account's chart, from that account's own perspective
// (2026-06-11 design memo). Own holdings = Assets; counterparties & the chain
// economy = Income / Expenses; in-flight states = Liabilities.

export const ASSETS_HIVE_LIQUID = "Assets:Hive:Liquid";
/** Vested HIVE, stored in VESTS (the native unit), never pre-converted to HP. */
export const ASSETS_HIVE_VESTED = "Assets:Hive:Vested";
export const ASSETS_HBD_LIQUID = "Assets:Hbd:Liquid";
export const ASSETS_HIVE_SAVINGS = "Assets:Hive:Savings";
export const ASSETS_HBD_SAVINGS = "Assets:Hbd:Savings";

export const LIABILITIES_PENDING_WITHDRAW = "Liabilities:Hive:PendingWithdraw";
export const LIABILITIES_HBD_CONVERSION = "Liabilities:Hbd:ConversionRequests";

export const INCOME_REWARDS_AUTHOR = "Income:Rewards:Author";
export const INCOME_REWARDS_CURATION = "Income:Rewards:Curation";
export const INCOME_REWARDS_VESTING = "Income:Rewards:VestingMint";
export const INCOME_INTEREST_HBD = "Income:Interest:Hbd";

export const EQUITY_OPENING = "Equity:OpeningBalance";

/** Income leg for value received from a counterparty: `Income:Transfers:<from>`. */
export function incomeFromCounterparty(from: string): string {
  return `Income:Transfers:${from}`;
}

/** Expense leg for value sent to a counterparty: `Expenses:Transfers:<to>`. */
export function expenseToCounterparty(to: string): string {
  return `Expenses:Transfers:${to}`;
}

/** Bilateral delegation account (HP delegated out, tracked in VESTS). */
export function delegationOut(to: string): string {
  return `Assets:Hive:DelegatedOut:${to}`;
}

// ── raw history shapes ───────────────────────────────────────────────────────
//
// Each `condenser_api.get_account_history` entry is
// `[seq, { op:[type,data], block, trx_id, op_in_trx, trx_in_block, timestamp,
// virtual_op }]`.

export interface HistoryOp {
  readonly op: readonly [string, Record<string, unknown>];
  readonly block: number;
  readonly trx_id: string;
  readonly op_in_trx: number;
  readonly trx_in_block: number;
  readonly timestamp: string;
  readonly virtual_op?: boolean;
}

/** One `get_account_history` row: `[sequenceNumber, HistoryOp]`. */
export type HistoryEntry = readonly [number, HistoryOp];

// ── asset parsing (exact, never a float) ─────────────────────────────────────

/**
 * Parse a legacy Hive asset string (`"1.000 HIVE"`) into an exact `Money`. The
 * magnitude is parsed through the money module's `parseDecimalMoney`
 * (`@emsenn/computing-with-ledgers` `parseDecimal` → `Rational`), so no float
 * ever touches the holding.
 */
export function parseAsset(s: string): Money {
  const m = /^(-?[\d.,]+)\s+([A-Z]+)$/.exec(s.trim());
  if (!m) throw new TypeError(`trading/book: unparseable asset "${s}"`);
  const magnitude = (m[1] ?? "").replace(/,/g, "");
  const commodity = m[2] ?? "";
  if (commodity === "") throw new TypeError(`trading/book: missing commodity in "${s}"`);
  return parseDecimalMoney(magnitude, commodity);
}

/** The owner's liquid asset account for a HIVE or HBD amount. */
function liquidAccount(a: Money): string {
  const c = commodityOf(a);
  if (c === "HIVE") return ASSETS_HIVE_LIQUID;
  if (c === "HBD") return ASSETS_HBD_LIQUID;
  throw new TypeError(`trading/book: no liquid account for commodity ${c}`);
}

/** The owner's savings account for a HIVE or HBD amount. */
function savingsAccount(a: Money): string {
  const c = commodityOf(a);
  if (c === "HIVE") return ASSETS_HIVE_SAVINGS;
  if (c === "HBD") return ASSETS_HBD_SAVINGS;
  throw new TypeError(`trading/book: no savings account for commodity ${c}`);
}

// ── posting / transaction carriers (plain frozen, matching ../ledger.mjs) ─────

/** Build a `Posting` carrier in the shape `../ledger.mjs` consumes. */
function posting(account: string, amount: Money): Posting {
  return Object.freeze({
    account,
    amount,
    cost: null,
    price: null,
    balanceAssertion: null,
    meta: {},
  }) as unknown as Posting;
}

/**
 * The deterministic posting id for an op: `hive:<block>:<trxInBlock>:<opInTrx>`.
 * Deterministic so repeated syncs of overlapping windows never double-book (the
 * idempotency key for `bookHistory`'s `seen` dedup).
 */
export function postingId(op: HistoryOp): string {
  return `hive:${op.block}:${op.trx_in_block}:${op.op_in_trx}`;
}

/** Build a balanced `Transaction` carrier in the shape `../ledger.mjs` consumes. */
function tx(
  op: HistoryOp,
  seq: number,
  narration: string,
  postings: readonly Posting[],
): Transaction {
  const id = postingId(op);
  return Object.freeze({
    id,
    date: op.timestamp.split("T")[0] ?? op.timestamp,
    time: null,
    flag: "*",
    payee: null,
    narration,
    postings: Object.freeze([...postings]),
    tags: Object.freeze([]),
    links: Object.freeze([]),
    code: null,
    source: null,
    meta: { id, seq, trx: op.trx_id, virtual: op.virtual_op ?? false },
  }) as unknown as Transaction;
}

// ── unmapped (never-dropped) provenance ──────────────────────────────────────

export interface UnmappedOp {
  readonly kind: "waggle.book.unmapped";
  readonly id: string;
  readonly seq: number;
  readonly opType: string;
  readonly timestamp: string;
}

// ── per-op mapping ───────────────────────────────────────────────────────────

/**
 * Map one history entry to a balanced `Transaction` from `owner`'s view, or
 * `null` if the op type is not yet mapped (the caller records it as an
 * `UnmappedOp` — never silently dropped). Only `transfer` / savings transfers /
 * `interest` are mapped this cut; cross-commodity and reward ops carry a
 * time-varying rate we refuse to guess, so they stay unmapped with provenance.
 */
export function opToTransaction(entry: HistoryEntry, owner: string): Transaction | null {
  const [seq, op] = entry;
  const [type, data] = op.op;
  switch (type) {
    case "transfer": {
      const a = parseAsset(data["amount"] as string);
      const from = data["from"] as string;
      const to = data["to"] as string;
      const memo = (data["memo"] as string) || "";
      if (to === owner) {
        return tx(op, seq, `transfer from ${from}${memo ? `: ${memo.slice(0, 80)}` : ""}`, [
          posting(liquidAccount(a), a),
          posting(incomeFromCounterparty(from), negateMoney(a)),
        ]);
      }
      return tx(op, seq, `transfer to ${to}${memo ? `: ${memo.slice(0, 80)}` : ""}`, [
        posting(liquidAccount(a), negateMoney(a)),
        posting(expenseToCounterparty(to), a),
      ]);
    }
    case "transfer_to_savings": {
      const a = parseAsset(data["amount"] as string);
      // owner → owner's savings, else to another account's savings (an expense)
      if ((data["to"] as string) === owner) {
        return tx(op, seq, "to savings", [
          posting(savingsAccount(a), a),
          posting(liquidAccount(a), negateMoney(a)),
        ]);
      }
      return tx(op, seq, `to ${data["to"]} savings`, [
        posting(liquidAccount(a), negateMoney(a)),
        posting(expenseToCounterparty(data["to"] as string), a),
      ]);
    }
    case "fill_transfer_from_savings":
    case "transfer_from_savings": {
      const a = parseAsset(data["amount"] as string);
      // savings release back to liquid (owner is the recipient)
      return tx(op, seq, "from savings", [
        posting(liquidAccount(a), a),
        posting(savingsAccount(a), negateMoney(a)),
      ]);
    }
    case "interest": {
      const a = parseAsset(data["interest"] as string);
      return tx(op, seq, "HBD savings interest", [
        posting(ASSETS_HBD_SAVINGS, a),
        posting(INCOME_INTEREST_HBD, negateMoney(a)),
      ]);
    }
    default:
      return null;
  }
}

// ── book a whole history ─────────────────────────────────────────────────────

export interface BookResult {
  readonly transactions: readonly Transaction[];
  readonly unmapped: readonly UnmappedOp[];
  /** Highest history sequence number booked — pass as resume point next sync. */
  readonly lastSeq: number;
}

/**
 * Book a list of history entries into transactions, idempotently. Duplicate
 * posting ids (a re-fetched overlapping window) are dropped; unmapped op types
 * are recorded with full provenance (NEVER silently dropped). `seen` carries
 * posting ids already in the ledger so repeated syncs never double-book.
 */
export function bookHistory(
  entries: readonly HistoryEntry[],
  owner: string,
  seen: ReadonlySet<string> = new Set(),
): BookResult {
  const transactions: Transaction[] = [];
  const unmapped: UnmappedOp[] = [];
  const ids = new Set(seen);
  let lastSeq = -1;
  for (const entry of entries) {
    const [seq, op] = entry;
    if (seq > lastSeq) lastSeq = seq;
    const id = postingId(op);
    if (ids.has(id)) continue;
    const t = opToTransaction(entry, owner);
    if (t === null) {
      unmapped.push(
        Object.freeze({
          kind: "waggle.book.unmapped" as const,
          id,
          seq,
          opType: op.op[0],
          timestamp: op.timestamp,
        }),
      );
      continue;
    }
    ids.add(id);
    transactions.push(t);
  }
  return Object.freeze({
    transactions: Object.freeze(transactions),
    unmapped: Object.freeze(unmapped),
    lastSeq,
  });
}

// ── settle ───────────────────────────────────────────────────────────────────

/**
 * Settle booked transactions into a `LoadedLedger` (balances, section,
 * worklist). The booking *law* — imbalance / assertion handling, the
 * paraconsistent no-halt section — lives in `../ledger.mjs` (the one descent);
 * this is the thin DOING call that hands the transactions to it. An imbalanced
 * transaction is a HELD value on the worklist, never a thrown error.
 */
export function settle(transactions: readonly Transaction[]): LoadedLedger {
  return loadLedger([...transactions] as unknown as Parameters<typeof loadLedger>[0]);
}

// ── reconcile booked vs on-chain ─────────────────────────────────────────────

/** Booked balances: account → commodity → Money (the shape `settle` yields). */
export type BookedBalances = ReadonlyMap<string, ReadonlyMap<string, Money>>;

/** The live-chain fields reconciliation reads, as the chain states them. */
export interface ChainState {
  readonly balance: string; // liquid HIVE
  readonly hbd_balance: string; // liquid HBD
  readonly savings_balance?: string; // HIVE in savings
  readonly savings_hbd_balance?: string; // HBD in savings
}

export interface ReconcileLine {
  readonly account: string;
  readonly commodity: string;
  readonly booked: string; // exact decimal display
  readonly actual: string; // the chain's own stated string
  readonly delta: string; // exact, lossless (actual − booked); zero ⇒ reconciled
  readonly reconciled: boolean;
}

export interface ReconcileReport {
  readonly kind: "waggle.book.reconcile";
  /** True iff every line reconciled. */
  readonly reconciled: boolean;
  readonly lines: readonly ReconcileLine[];
}

/** The booked holding of `account` in `commodity`, or zero in that commodity. */
function bookedOf(
  balances: BookedBalances,
  account: string,
  commodity: string,
  reference: Money,
): Money {
  return balances.get(account)?.get(commodity) ?? subMoney(reference, reference);
}

/**
 * Reconcile one account against its on-chain string. A match is the witness; a
 * mismatch carries the SIGNED EXACT `Money` delta (actual − booked) — the
 * "ledger ≠ chain" obstruction the design memo names: an unmapped op or a
 * booking bug surfaces here as a real, signed discrepancy.
 */
function line(balances: BookedBalances, account: string, actualStr: string): ReconcileLine {
  const actual = parseAsset(actualStr);
  const commodity = commodityOf(actual);
  const booked = bookedOf(balances, account, commodity, actual);
  const delta = subMoney(actual, booked);
  return Object.freeze({
    account,
    commodity,
    booked: toDecimalString(booked),
    actual: actualStr,
    delta: toExactString(delta),
    reconciled: isZeroMoney(delta),
  });
}

/**
 * Reconcile booked balances against live on-chain account state. Pure: booked
 * balances in, chain state in, report out — exact rationals only. The report is
 * the obstruction-or-witness reading: `reconciled` is the witness when every
 * line matches; any mismatch line carries its signed exact delta.
 */
export function reconcile(balances: BookedBalances, chain: ChainState): ReconcileReport {
  const lines: ReconcileLine[] = [
    line(balances, ASSETS_HIVE_LIQUID, chain.balance),
    line(balances, ASSETS_HBD_LIQUID, chain.hbd_balance),
  ];
  if (chain.savings_balance !== undefined) {
    lines.push(line(balances, ASSETS_HIVE_SAVINGS, chain.savings_balance));
  }
  if (chain.savings_hbd_balance !== undefined) {
    lines.push(line(balances, ASSETS_HBD_SAVINGS, chain.savings_hbd_balance));
  }
  return Object.freeze({
    kind: "waggle.book.reconcile" as const,
    reconciled: lines.every((l) => l.reconciled),
    lines: Object.freeze(lines),
  });
}
