// model/types.ts - ledger boundary records for every entry kind that can appear in a loaded
// journal. These records are not the ontology: accounting/utterances projects them to finite
// relating utterances. All fields are JSON-safe except Amount.num / Amount.den (bigint), which
// are serialized as strings at representation boundaries. Nothing here throws; every field nullable.

// ── Exact-rational money ─────────────────────────────────────────────────────

/** An exact rational number with a commodity: { num, den } reduced, den > 0. */
export interface Amount {
  readonly num: bigint;
  readonly den: bigint;
  readonly commodity: string;
}

/** A parsed decimal result: the rational value PLUS the original place-count (display hint only). */
export interface ParsedDecimal {
  readonly num: bigint;
  readonly den: bigint;
  readonly places: number;
}

// ── Posting sub-types ────────────────────────────────────────────────────────

/** A brace cost: { kind, amount } — per-unit {} or total {{}}. amount null = empty lot {}. */
export interface Cost {
  readonly kind: "per-unit" | "total";
  readonly amount: Amount | null;
  readonly date?: string;
  readonly label?: string;
}

/** A price annotation: { kind, amount } — per-unit @ or total @@. */
export interface Price {
  readonly kind: "@" | "@@";
  readonly amount: Amount;
}

/** An inline balance assertion on a posting line. */
export interface BalanceAssertion {
  readonly amount: Amount;
  readonly sole?: boolean;
}

// ── Core model entries ───────────────────────────────────────────────────────

/** Source location: the file and 1-based line where an entry was read. */
export interface Source {
  readonly file: string | null;
  readonly line: number;
}

/** One leg of a transaction: an account, an optional amount (null = elided), and optional cost/price/assertion. */
export interface Posting {
  readonly account: string;
  readonly amount: Amount | null;
  readonly cost: Cost | null;
  readonly price: Price | null;
  readonly balanceAssertion: BalanceAssertion | null;
  readonly meta: Record<string, unknown>;
}

/** A dated set of postings, expected to balance (but held if not). */
export interface Transaction {
  readonly id: string | null;
  readonly date: string;
  readonly time: string | null;
  readonly flag: string | null;
  readonly payee: string | null;
  readonly narration: string;
  readonly postings: readonly Posting[];
  readonly tags: readonly string[];
  readonly links: readonly string[];
  readonly meta: Record<string, unknown>;
  readonly code: string | null;
  readonly source: Source | null;
}

// ── Directives ───────────────────────────────────────────────────────────────

export interface OpenDirective {
  readonly directive: "open";
  readonly date: string | null;
  readonly account: string;
  readonly commodities: readonly string[];
  readonly booking: string | null;
  readonly source: Source | null;
}

export interface CloseDirective {
  readonly directive: "close";
  readonly date: string;
  readonly account: string;
  readonly source: Source | null;
}

export interface CommodityDirective {
  readonly directive: "commodity";
  readonly date: string | null;
  readonly symbol: string;
  readonly precision: number | null;
  readonly meta: Record<string, unknown>;
  readonly source: Source | null;
}

export interface PriceDirective {
  readonly directive: "price";
  readonly date: string;
  readonly commodity: string;
  readonly amount: Amount;
  readonly source: Source | null;
}

export interface PadDirective {
  readonly directive: "pad";
  readonly date: string;
  readonly account: string;
  readonly padAccount: string;
  readonly source: Source | null;
}

export interface BalanceDirective {
  readonly directive: "balance";
  readonly date: string;
  readonly account: string;
  readonly amount: Amount;
  readonly tolerance: string | null;
  readonly source: Source | null;
}

export interface OptionDirective {
  readonly directive: "option";
  readonly date: null;
  readonly key: string | null;
  readonly value: string | null;
  readonly source: Source | null;
}

export interface IncludeDirective {
  readonly directive: "include";
  readonly date: null;
  readonly path: string | null;
  readonly resolved: boolean;
  readonly error: string | null;
  readonly source: Source | null;
}

export type Directive =
  | OpenDirective
  | CloseDirective
  | CommodityDirective
  | PriceDirective
  | PadDirective
  | BalanceDirective
  | OptionDirective
  | IncludeDirective;

// ── Malformed ────────────────────────────────────────────────────────────────

/** A line that could not be parsed — held rather than thrown. */
export interface Malformed {
  readonly kind: "malformed";
  readonly raw: string;
  readonly reason: string;
  readonly source: Source | null;
}

// ── Union of all entry kinds ─────────────────────────────────────────────────

export type Entry = Transaction | Directive | Malformed;

// ── Type guards ──────────────────────────────────────────────────────────────

export const isTransaction = (e: unknown): e is Transaction =>
  typeof e === "object" && e !== null && Array.isArray((e as Transaction).postings);

export const isDirective = (e: unknown): e is Directive =>
  typeof e === "object" && e !== null && typeof (e as Directive).directive === "string";

export const isMalformed = (e: unknown): e is Malformed =>
  typeof e === "object" && e !== null && (e as Malformed).kind === "malformed";
