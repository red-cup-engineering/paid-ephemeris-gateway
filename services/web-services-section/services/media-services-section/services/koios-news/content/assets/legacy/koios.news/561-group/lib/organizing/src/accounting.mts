/**
 * accounting - accounting records as organizing record-state utterances.
 *
 * This is the structural, relational part of the old animating-experimental
 * accounting substrate: normalize boundary-shaped accounting entries into a
 * finite utterance projection. Exact-number arithmetic and conservation checks
 * stay out of this module until the numeric IR can carry them faithfully.
 */
import {
  canonical,
  mark,
  utterance,
  type JsonRecord,
  type JsonValue,
  type UtteranceCarrier,
} from "@emsenn/relating";
import type { AccountingEntry } from "./schemas.mjs";
import type { AccountingUtterances } from "./schemas.mjs";

export type { AccountingEntry } from "./schemas.mjs";
export type { AccountingUtterances } from "./schemas.mjs";

export const ACCOUNTING_PREDICATES = Object.freeze({
  kind: "organizing.accounting.kind",
  date: "organizing.accounting.date",
  time: "organizing.accounting.time",
  flag: "organizing.accounting.flag",
  payee: "organizing.accounting.payee",
  narration: "organizing.accounting.narration",
  code: "organizing.accounting.code",
  sourceFile: "organizing.accounting.source-file",
  sourceLine: "organizing.accounting.source-line",
  posting: "organizing.accounting.posting",
  account: "organizing.accounting.account",
  amount: "organizing.accounting.amount",
  numerator: "organizing.accounting.numerator",
  denominator: "organizing.accounting.denominator",
  commodity: "organizing.accounting.commodity",
  cost: "organizing.accounting.cost",
  costKind: "organizing.accounting.cost-kind",
  price: "organizing.accounting.price",
  priceKind: "organizing.accounting.price-kind",
  balanceAssertion: "organizing.accounting.balance-assertion",
  sole: "organizing.accounting.sole",
  tag: "organizing.accounting.tag",
  link: "organizing.accounting.link",
  meta: "organizing.accounting.meta",
  directive: "organizing.accounting.directive",
  openAccount: "organizing.accounting.open-account",
  closeAccount: "organizing.accounting.close-account",
  booking: "organizing.accounting.booking",
  padAccount: "organizing.accounting.pad-account",
  tolerance: "organizing.accounting.tolerance",
  optionKey: "organizing.accounting.option-key",
  optionValue: "organizing.accounting.option-value",
  includePath: "organizing.accounting.include-path",
  includeResolved: "organizing.accounting.include-resolved",
  includeError: "organizing.accounting.include-error",
  malformedRaw: "organizing.accounting.malformed-raw",
  malformedReason: "organizing.accounting.malformed-reason",
});

export type AccountingTerm = readonly ["accounting", string, string];

type Source = Readonly<{ file: string | null; line: number }>;
type Amount = Readonly<{ num: string; den: string; commodity: string }>;
type Posting = Readonly<{
  account: string;
  amount: Amount | null;
  cost: Readonly<{ kind: "per-unit" | "total"; amount: Amount | null; date?: string; label?: string }> | null;
  price: Readonly<{ kind: "@" | "@@"; amount: Amount }> | null;
  balanceAssertion: Readonly<{ amount: Amount; sole?: boolean }> | null;
  meta: JsonRecord;
}>;

function asRecord(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label}: expected an object`);
  }
  return value as JsonRecord;
}

function stableJson(value: JsonValue): string {
  return canonical(value);
}

function term(kind: string, value: JsonValue): AccountingTerm {
  return Object.freeze(["accounting", kind, stableJson(value)] as const);
}

function relation(subject: JsonValue, predicate: string, object: JsonValue): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

function optional(out: UtteranceCarrier[], subject: JsonValue, predicate: string, object: JsonValue | undefined): void {
  if (object !== null && object !== undefined) out.push(relation(subject, predicate, object));
}

function sourceUtterances(subject: AccountingTerm, source: Source | null): readonly UtteranceCarrier[] {
  if (source === null) return Object.freeze([]);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.sourceFile, source.file),
    relation(subject, ACCOUNTING_PREDICATES.sourceLine, source.line),
  ]);
}

function amountTerm(amount: Amount): AccountingTerm {
  return term("amount", amount);
}

/** The finite utterance projection of one exact amount. */
export function amountUtterances(amount: Amount): readonly UtteranceCarrier[] {
  const subject = amountTerm(amount);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.kind, "amount"),
    relation(subject, ACCOUNTING_PREDICATES.numerator, amount.num),
    relation(subject, ACCOUNTING_PREDICATES.denominator, amount.den),
    relation(subject, ACCOUNTING_PREDICATES.commodity, amount.commodity),
  ]);
}

function costUtterances(subject: AccountingTerm, cost: Posting["cost"]): readonly UtteranceCarrier[] {
  if (cost === null) return Object.freeze([]);
  const costSubject = term("cost", cost as unknown as JsonValue);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.cost, costSubject),
    relation(costSubject, ACCOUNTING_PREDICATES.costKind, cost.kind),
    ...(cost.amount === null ? [] : [
      relation(costSubject, ACCOUNTING_PREDICATES.amount, amountTerm(cost.amount)),
      ...amountUtterances(cost.amount),
    ]),
    ...(cost.date === undefined ? [] : [relation(costSubject, ACCOUNTING_PREDICATES.date, cost.date)]),
    ...(cost.label === undefined ? [] : [relation(costSubject, ACCOUNTING_PREDICATES.meta, { label: cost.label })]),
  ]);
}

function priceUtterances(subject: AccountingTerm, price: Posting["price"]): readonly UtteranceCarrier[] {
  if (price === null) return Object.freeze([]);
  const priceSubject = term("price", price as unknown as JsonValue);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.price, priceSubject),
    relation(priceSubject, ACCOUNTING_PREDICATES.priceKind, price.kind),
    relation(priceSubject, ACCOUNTING_PREDICATES.amount, amountTerm(price.amount)),
    ...amountUtterances(price.amount),
  ]);
}

function balanceAssertionUtterances(subject: AccountingTerm, assertion: Posting["balanceAssertion"]): readonly UtteranceCarrier[] {
  if (assertion === null) return Object.freeze([]);
  const assertionSubject = term("balance-assertion", assertion as unknown as JsonValue);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.balanceAssertion, assertionSubject),
    relation(assertionSubject, ACCOUNTING_PREDICATES.amount, amountTerm(assertion.amount)),
    ...amountUtterances(assertion.amount),
    ...(assertion.sole === undefined ? [] : [relation(assertionSubject, ACCOUNTING_PREDICATES.sole, assertion.sole)]),
  ]);
}

/** The finite utterance projection of one transaction posting. */
export function postingUtterances(posting: Posting): readonly UtteranceCarrier[] {
  const subject = term("posting", posting as unknown as JsonValue);
  const out: UtteranceCarrier[] = [
    relation(subject, ACCOUNTING_PREDICATES.kind, "posting"),
    relation(subject, ACCOUNTING_PREDICATES.account, posting.account),
    ...costUtterances(subject, posting.cost),
    ...priceUtterances(subject, posting.price),
    ...balanceAssertionUtterances(subject, posting.balanceAssertion),
  ];
  if (posting.amount !== null) {
    out.push(relation(subject, ACCOUNTING_PREDICATES.amount, amountTerm(posting.amount)));
    out.push(...amountUtterances(posting.amount));
  }
  if (Object.keys(posting.meta).length > 0) out.push(relation(subject, ACCOUNTING_PREDICATES.meta, posting.meta));
  return Object.freeze(out);
}

function sourceOf(record: JsonRecord): Source | null {
  return record["source"] as Source | null;
}

/** The finite utterance projection of a transaction. */
export function transactionUtterances(transaction: JsonRecord): readonly UtteranceCarrier[] {
  const subject = term("transaction", (transaction["id"] ?? transaction) as JsonValue);
  const out: UtteranceCarrier[] = [
    relation(subject, ACCOUNTING_PREDICATES.kind, "transaction"),
    relation(subject, ACCOUNTING_PREDICATES.date, transaction["date"] as JsonValue),
  ];
  optional(out, subject, ACCOUNTING_PREDICATES.time, transaction["time"]);
  optional(out, subject, ACCOUNTING_PREDICATES.flag, transaction["flag"]);
  optional(out, subject, ACCOUNTING_PREDICATES.payee, transaction["payee"]);
  optional(out, subject, ACCOUNTING_PREDICATES.narration, transaction["narration"]);
  optional(out, subject, ACCOUNTING_PREDICATES.code, transaction["code"]);
  for (const tag of transaction["tags"] as readonly JsonValue[]) out.push(relation(subject, ACCOUNTING_PREDICATES.tag, tag));
  for (const link of transaction["links"] as readonly JsonValue[]) out.push(relation(subject, ACCOUNTING_PREDICATES.link, link));
  const meta = transaction["meta"] as JsonRecord;
  if (Object.keys(meta).length > 0) out.push(relation(subject, ACCOUNTING_PREDICATES.meta, meta));
  out.push(...sourceUtterances(subject, sourceOf(transaction)));
  for (const posting of transaction["postings"] as readonly JsonValue[]) {
    const postingRecord = asRecord(posting, "posting") as unknown as Posting;
    const postingSubject = term("posting", posting);
    out.push(relation(subject, ACCOUNTING_PREDICATES.posting, postingSubject));
    out.push(...postingUtterances(postingRecord));
  }
  return Object.freeze(out);
}

/** The finite utterance projection of an accounting directive. */
export function directiveUtterances(directive: JsonRecord): readonly UtteranceCarrier[] {
  const subject = term("directive", directive);
  const out: UtteranceCarrier[] = [
    relation(subject, ACCOUNTING_PREDICATES.kind, "directive"),
    relation(subject, ACCOUNTING_PREDICATES.directive, directive["directive"] as JsonValue),
  ];
  out.push(...sourceUtterances(subject, sourceOf(directive)));
  switch (directive["directive"]) {
    case "open":
      optional(out, subject, ACCOUNTING_PREDICATES.date, directive["date"]);
      out.push(relation(subject, ACCOUNTING_PREDICATES.openAccount, directive["account"] as JsonValue));
      for (const commodity of directive["commodities"] as readonly JsonValue[]) out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, commodity));
      optional(out, subject, ACCOUNTING_PREDICATES.booking, directive["booking"]);
      break;
    case "close":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive["date"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.closeAccount, directive["account"] as JsonValue));
      break;
    case "commodity": {
      optional(out, subject, ACCOUNTING_PREDICATES.date, directive["date"]);
      out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, directive["symbol"] as JsonValue));
      const meta = directive["meta"] as JsonRecord;
      if (Object.keys(meta).length > 0) out.push(relation(subject, ACCOUNTING_PREDICATES.meta, meta));
      break;
    }
    case "price": {
      const amount = directive["amount"] as unknown as Amount;
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive["date"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, directive["commodity"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.amount, amountTerm(amount)));
      out.push(...amountUtterances(amount));
      break;
    }
    case "pad":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive["date"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.account, directive["account"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.padAccount, directive["padAccount"] as JsonValue));
      break;
    case "balance": {
      const amount = directive["amount"] as unknown as Amount;
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive["date"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.account, directive["account"] as JsonValue));
      out.push(relation(subject, ACCOUNTING_PREDICATES.amount, amountTerm(amount)));
      out.push(...amountUtterances(amount));
      optional(out, subject, ACCOUNTING_PREDICATES.tolerance, directive["tolerance"]);
      break;
    }
    case "option":
      optional(out, subject, ACCOUNTING_PREDICATES.optionKey, directive["key"]);
      optional(out, subject, ACCOUNTING_PREDICATES.optionValue, directive["value"]);
      break;
    case "include":
      optional(out, subject, ACCOUNTING_PREDICATES.includePath, directive["path"]);
      out.push(relation(subject, ACCOUNTING_PREDICATES.includeResolved, directive["resolved"] as JsonValue));
      optional(out, subject, ACCOUNTING_PREDICATES.includeError, directive["error"]);
      break;
  }
  return Object.freeze(out);
}

/** The finite utterance projection of a malformed journal record. */
export function malformedUtterances(malformed: JsonRecord): readonly UtteranceCarrier[] {
  const subject = term("malformed", malformed);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.kind, "malformed"),
    relation(subject, ACCOUNTING_PREDICATES.malformedRaw, malformed["raw"] as JsonValue),
    relation(subject, ACCOUNTING_PREDICATES.malformedReason, malformed["reason"] as JsonValue),
    ...sourceUtterances(subject, sourceOf(malformed)),
  ]);
}

/** Normalize any accounting entry to its finite relating utterance projection. */
export function accountingUtterances(entry: AccountingEntry): AccountingUtterances {
  const record = asRecord(entry, "accountingUtterances");
  const utterances = "postings" in record
    ? transactionUtterances(record)
    : "directive" in record
      ? directiveUtterances(record)
      : malformedUtterances(record);
  return Object.freeze({
    kind: "organizing.accounting.utterances" as const,
    utterances,
  }) as AccountingUtterances;
}

/** Normalize a journal to relating utterances, preserving entry order. */
export function journalUtterances(entries: readonly AccountingEntry[]): AccountingUtterances {
  return Object.freeze({
    kind: "organizing.accounting.utterances" as const,
    utterances: Object.freeze(entries.flatMap((entry) => accountingUtterances(entry).utterances)),
  }) as AccountingUtterances;
}

export function admitAccountingInput(input: JsonValue, verb: string): AccountingEntry | readonly AccountingEntry[] {
  if (Array.isArray(input)) return input as unknown as readonly AccountingEntry[];
  if (input === null || typeof input !== "object") {
    throw new TypeError(`${verb}: expected an accounting entry or journal array`);
  }
  return input as unknown as AccountingEntry;
}

export function accountingInputUtterances(input: AccountingEntry | readonly AccountingEntry[]): AccountingUtterances {
  return Array.isArray(input)
    ? journalUtterances(input as readonly AccountingEntry[])
    : accountingUtterances(input as AccountingEntry);
}
