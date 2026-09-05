/**
 * `ledger` — double-entry bookkeeping for real-money flows.
 *
 * Every cleared payment is recorded as a balanced transaction; unbalanced entries are
 * refused at the door. The journal renders to hledger text so the books are portable.
 */

/** One side of a transaction: an account path and a signed amount in a commodity. */
export interface Posting {
  readonly account: string;
  /** Signed decimal as a string (e.g. "4.99", "-4.99") — exact, never a float. */
  readonly amount: string;
  readonly commodity: string;
}

/** One journal entry: a dated, narrated, balanced set of postings. */
export interface LedgerEntry {
  readonly date: string;
  readonly narration: string;
  readonly postings: readonly Posting[];
  /** The order/event this entry records, for cross-reference with payments. */
  readonly ref: string;
}

/** Sum postings per commodity in integer minor units, to check the double-entry invariant. */
function imbalances(postings: readonly Posting[]): string[] {
  const byCommodity = new Map<string, number>();
  for (const p of postings) {
    const n = Number(p.amount);
    if (!Number.isFinite(n)) return [`non-numeric amount "${p.amount}"`];
    // Work in 1e6 minor units so 3-dp commodities (HIVE/HBD) and 2-dp (USD) are exact enough.
    byCommodity.set(p.commodity, Math.round((byCommodity.get(p.commodity) ?? 0) + n * 1e6));
  }
  const bad: string[] = [];
  for (const [c, sum] of byCommodity) if (sum !== 0) bad.push(`${c} off by ${sum / 1e6}`);
  return bad;
}

/** Render entries to hledger journal text. */
export function journalText(entries: readonly LedgerEntry[]): string {
  const out: string[] = [];
  for (const e of entries) {
    out.push(`${e.date} * ${e.narration}  ; ref:${e.ref}`);
    for (const p of e.postings) out.push(`    ${p.account}  ${p.amount} ${p.commodity}`);
    out.push("");
  }
  return out.join("\n");
}

export interface LedgerReport {
  readonly entries: number;
  /** Whether every entry replayed clean — false if any posting set failed to net to zero. */
  readonly balanced: boolean;
  /** Count of entries excluded from `balances` because their postings did not net to zero. */
  readonly malformed: number;
  /** account → commodity → formatted balance. */
  readonly balances: Record<string, Record<string, string>>;
  readonly journal: string;
}

export class Ledger {
  private readonly entries: LedgerEntry[] = [];

  constructor(initial: readonly LedgerEntry[] = []) {
    this.entries.push(...initial);
  }

  all(): readonly LedgerEntry[] {
    return this.entries;
  }

  /**
   * Append a balanced entry. Throws if the postings do not net to zero per commodity — an
   * unbalanced transaction is a bug, and we refuse to record bad books.
   */
  record(entry: LedgerEntry): void {
    const bad = imbalances(entry.postings);
    if (bad.length > 0) throw new RangeError(`ledger: unbalanced entry ${entry.ref}: ${bad.join("; ")}`);
    this.entries.push(entry);
  }

  /** Whether an entry with this ref already exists (idempotency for webhook retries). */
  has(ref: string): boolean {
    return this.entries.some((e) => e.ref === ref);
  }

  /**
   * Per-account balances plus the rendered journal. Independently re-checks every posting set
   * (not just the ones that came through `record()`) so an entry seeded straight into the
   * constructor — e.g. restored from a snapshot file — can't silently corrupt the totals.
   */
  report(): LedgerReport {
    const balances: Record<string, Record<string, string>> = {};
    let malformed = 0;
    for (const entry of this.entries) {
      if (imbalances(entry.postings).length > 0) { malformed++; continue; }
      for (const posting of entry.postings) {
        const row = balances[posting.account] ??= {};
        const prior = Number(row[posting.commodity] ?? 0);
        row[posting.commodity] = String(Math.round((prior + Number(posting.amount)) * 1e6) / 1e6);
      }
    }
    return { entries: this.entries.length, balanced: malformed === 0, malformed, balances, journal: journalText(this.entries) };
  }

  toJSON(): readonly LedgerEntry[] {
    return this.entries;
  }
}
