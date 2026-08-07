/**
 * accounting/utterances — normalization of accounting records to relating
 * utterances.
 *
 * Accounting records remain useful boundary-shaped values for parsers and
 * report code, but their bedrock form is this finite utterance projection:
 * each record is a subject term, and each field is stated as a relation-shaped
 * mark under an `animating.accounting.*` predicate. Settlement, recall, and
 * topology reads happen downstream on the induced relating world.
 */

import {
  mark,
  utterance,
  type UtteranceCarrier,
} from "@emsenn/relating";
import { canonical, parse } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json";

import {
  isDirective,
  isMalformed,
  isTransaction,
  type Amount,
  type BalanceAssertion,
  type Cost,
  type Directive,
  type Entry,
  type Malformed,
  type Posting,
  type Price,
  type Source,
  type Transaction,
} from "./model/types.mjs";

export const ACCOUNTING_PREDICATES = Object.freeze({
  kind: "animating.accounting.kind",
  date: "animating.accounting.date",
  time: "animating.accounting.time",
  flag: "animating.accounting.flag",
  payee: "animating.accounting.payee",
  narration: "animating.accounting.narration",
  code: "animating.accounting.code",
  sourceFile: "animating.accounting.source-file",
  sourceLine: "animating.accounting.source-line",
  posting: "animating.accounting.posting",
  account: "animating.accounting.account",
  amount: "animating.accounting.amount",
  numerator: "animating.accounting.numerator",
  denominator: "animating.accounting.denominator",
  commodity: "animating.accounting.commodity",
  cost: "animating.accounting.cost",
  costKind: "animating.accounting.cost-kind",
  price: "animating.accounting.price",
  priceKind: "animating.accounting.price-kind",
  balanceAssertion: "animating.accounting.balance-assertion",
  sole: "animating.accounting.sole",
  tag: "animating.accounting.tag",
  link: "animating.accounting.link",
  meta: "animating.accounting.meta",
  directive: "animating.accounting.directive",
  openAccount: "animating.accounting.open-account",
  closeAccount: "animating.accounting.close-account",
  booking: "animating.accounting.booking",
  padAccount: "animating.accounting.pad-account",
  tolerance: "animating.accounting.tolerance",
  optionKey: "animating.accounting.option-key",
  optionValue: "animating.accounting.option-value",
  includePath: "animating.accounting.include-path",
  includeResolved: "animating.accounting.include-resolved",
  includeError: "animating.accounting.include-error",
  malformedRaw: "animating.accounting.malformed-raw",
  malformedReason: "animating.accounting.malformed-reason",
});

export type AccountingTerm = readonly ["accounting", string, string];

function stableJson(value: unknown): string {
  return canonical(parse(JSON.stringify(value, (_key, item: unknown) => typeof item === "bigint" ? item.toString() : item)));
}

function term(kind: string, value: unknown): AccountingTerm {
  return Object.freeze(["accounting", kind, stableJson(value)] as const);
}

function relation(subject: unknown, predicate: string, object: unknown): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

function optional(out: UtteranceCarrier[], subject: unknown, predicate: string, object: unknown): void {
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

/** The utterance projection of an exact rational amount. */
export function amountUtterances(amount: Amount): readonly UtteranceCarrier[] {
  const subject = amountTerm(amount);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.kind, "amount"),
    relation(subject, ACCOUNTING_PREDICATES.numerator, amount.num.toString()),
    relation(subject, ACCOUNTING_PREDICATES.denominator, amount.den.toString()),
    relation(subject, ACCOUNTING_PREDICATES.commodity, amount.commodity),
  ]);
}

function costUtterances(subject: AccountingTerm, cost: Cost | null): readonly UtteranceCarrier[] {
  if (cost === null) return Object.freeze([]);
  const costSubject = term("cost", cost);
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

function priceUtterances(subject: AccountingTerm, price: Price | null): readonly UtteranceCarrier[] {
  if (price === null) return Object.freeze([]);
  const priceSubject = term("price", price);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.price, priceSubject),
    relation(priceSubject, ACCOUNTING_PREDICATES.priceKind, price.kind),
    relation(priceSubject, ACCOUNTING_PREDICATES.amount, amountTerm(price.amount)),
    ...amountUtterances(price.amount),
  ]);
}

function balanceAssertionUtterances(
  subject: AccountingTerm,
  assertion: BalanceAssertion | null,
): readonly UtteranceCarrier[] {
  if (assertion === null) return Object.freeze([]);
  const assertionSubject = term("balance-assertion", assertion);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.balanceAssertion, assertionSubject),
    relation(assertionSubject, ACCOUNTING_PREDICATES.amount, amountTerm(assertion.amount)),
    ...amountUtterances(assertion.amount),
    ...(assertion.sole === undefined ? [] : [relation(assertionSubject, ACCOUNTING_PREDICATES.sole, assertion.sole)]),
  ]);
}

/** The utterance projection of one transaction posting. */
export function postingUtterances(posting: Posting): readonly UtteranceCarrier[] {
  const subject = term("posting", posting);
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

/** The utterance projection of a full transaction. */
export function transactionUtterances(transaction: Transaction): readonly UtteranceCarrier[] {
  const subject = term("transaction", transaction.id ?? transaction);
  const out: UtteranceCarrier[] = [
    relation(subject, ACCOUNTING_PREDICATES.kind, "transaction"),
    relation(subject, ACCOUNTING_PREDICATES.date, transaction.date),
  ];
  optional(out, subject, ACCOUNTING_PREDICATES.time, transaction.time);
  optional(out, subject, ACCOUNTING_PREDICATES.flag, transaction.flag);
  optional(out, subject, ACCOUNTING_PREDICATES.payee, transaction.payee);
  optional(out, subject, ACCOUNTING_PREDICATES.narration, transaction.narration);
  optional(out, subject, ACCOUNTING_PREDICATES.code, transaction.code);
  for (const tag of transaction.tags) out.push(relation(subject, ACCOUNTING_PREDICATES.tag, tag));
  for (const link of transaction.links) out.push(relation(subject, ACCOUNTING_PREDICATES.link, link));
  if (Object.keys(transaction.meta).length > 0) out.push(relation(subject, ACCOUNTING_PREDICATES.meta, transaction.meta));
  out.push(...sourceUtterances(subject, transaction.source));
  for (const posting of transaction.postings) {
    const postingSubject = term("posting", posting);
    out.push(relation(subject, ACCOUNTING_PREDICATES.posting, postingSubject));
    out.push(...postingUtterances(posting));
  }
  return Object.freeze(out);
}

/** The utterance projection of one accounting directive. */
export function directiveUtterances(directive: Directive): readonly UtteranceCarrier[] {
  const subject = term("directive", directive);
  const out: UtteranceCarrier[] = [
    relation(subject, ACCOUNTING_PREDICATES.kind, "directive"),
    relation(subject, ACCOUNTING_PREDICATES.directive, directive.directive),
  ];
  out.push(...sourceUtterances(subject, directive.source));
  switch (directive.directive) {
    case "open":
      optional(out, subject, ACCOUNTING_PREDICATES.date, directive.date);
      out.push(relation(subject, ACCOUNTING_PREDICATES.openAccount, directive.account));
      for (const commodity of directive.commodities) out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, commodity));
      optional(out, subject, ACCOUNTING_PREDICATES.booking, directive.booking);
      break;
    case "close":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive.date));
      out.push(relation(subject, ACCOUNTING_PREDICATES.closeAccount, directive.account));
      break;
    case "commodity":
      optional(out, subject, ACCOUNTING_PREDICATES.date, directive.date);
      out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, directive.symbol));
      if (Object.keys(directive.meta).length > 0) out.push(relation(subject, ACCOUNTING_PREDICATES.meta, directive.meta));
      break;
    case "price":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive.date));
      out.push(relation(subject, ACCOUNTING_PREDICATES.commodity, directive.commodity));
      out.push(relation(subject, ACCOUNTING_PREDICATES.amount, amountTerm(directive.amount)));
      out.push(...amountUtterances(directive.amount));
      break;
    case "pad":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive.date));
      out.push(relation(subject, ACCOUNTING_PREDICATES.account, directive.account));
      out.push(relation(subject, ACCOUNTING_PREDICATES.padAccount, directive.padAccount));
      break;
    case "balance":
      out.push(relation(subject, ACCOUNTING_PREDICATES.date, directive.date));
      out.push(relation(subject, ACCOUNTING_PREDICATES.account, directive.account));
      out.push(relation(subject, ACCOUNTING_PREDICATES.amount, amountTerm(directive.amount)));
      out.push(...amountUtterances(directive.amount));
      optional(out, subject, ACCOUNTING_PREDICATES.tolerance, directive.tolerance);
      break;
    case "option":
      optional(out, subject, ACCOUNTING_PREDICATES.optionKey, directive.key);
      optional(out, subject, ACCOUNTING_PREDICATES.optionValue, directive.value);
      break;
    case "include":
      optional(out, subject, ACCOUNTING_PREDICATES.includePath, directive.path);
      out.push(relation(subject, ACCOUNTING_PREDICATES.includeResolved, directive.resolved));
      optional(out, subject, ACCOUNTING_PREDICATES.includeError, directive.error);
      break;
  }
  return Object.freeze(out);
}

/** The utterance projection of a malformed journal record. */
export function malformedUtterances(malformed: Malformed): readonly UtteranceCarrier[] {
  const subject = term("malformed", malformed);
  return Object.freeze([
    relation(subject, ACCOUNTING_PREDICATES.kind, "malformed"),
    relation(subject, ACCOUNTING_PREDICATES.malformedRaw, malformed.raw),
    relation(subject, ACCOUNTING_PREDICATES.malformedReason, malformed.reason),
    ...sourceUtterances(subject, malformed.source),
  ]);
}

/** Normalize any accounting entry to its finite relating utterance projection. */
export function accountingUtterances(entry: Entry): readonly UtteranceCarrier[] {
  if (isTransaction(entry)) return transactionUtterances(entry);
  if (isDirective(entry)) return directiveUtterances(entry);
  if (isMalformed(entry)) return malformedUtterances(entry);
  throw new TypeError("accountingUtterances: unsupported accounting entry");
}

/** Normalize a journal to relating utterances, preserving entry order. */
export function journalUtterances(entries: readonly Entry[]): readonly UtteranceCarrier[] {
  return Object.freeze(entries.flatMap((entry) => accountingUtterances(entry)));
}
