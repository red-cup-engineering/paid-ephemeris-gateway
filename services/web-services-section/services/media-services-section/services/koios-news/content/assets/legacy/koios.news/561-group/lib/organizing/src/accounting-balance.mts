/**
 * accounting-balance - exact conservation read for accounting transactions.
 *
 * The record-state projection lives in `accounting.mts`; this module is the
 * arithmetic read. It reuses relating's generic graded conservation law and only
 * supplies the accounting adapter: amounts are exact bigint rationals graded by
 * commodity, with JSON-safe decimal integer strings at the organizing boundary.
 */
import {
  commodityOf,
  gradedBalanceOf,
  inferElidedMoney,
  moneyFromParts,
  negateMoney,
  timesMoney,
  toExactString,
  type ExactValue,
} from "@emsenn/relating/economy";
import type { AccountingBalance } from "./schemas.mjs";
import type { AccountingEntry, Amount, Posting, Transaction } from "./schemas.mjs";

export type { AccountingBalance } from "./schemas.mjs";

/** Read whether a transaction conserves in every commodity and infer one elided leg if possible. */
export function accountingBalance(entry: AccountingEntry): AccountingBalance {
  if (!isTransaction(entry)) {
    throw new TypeError("accountingBalance: expected an accounting transaction");
  }
  const weights = entry.postings.flatMap((posting) => {
    const weight = postingWeight(posting);
    return weight === null ? [] : [weight];
  });
  const residual = residualOf(gradedBalanceOf(weights));
  const elided = elidedPostingIndex(entry.postings);
  const completion = elided === null
    ? null
    : inferElidedMoney(
        entry.postings
          .filter((_posting, index) => index !== elided)
          .flatMap((posting) => {
            const weight = postingWeight(posting);
            return weight === null ? [] : [weight];
          }),
      );
  const inferred = completion?.kind === "meme-analysis.conservation.graded-completion:witness" ? completion.inferred : null;
  return Object.freeze({
    kind: "organizing.accounting.balance" as const,
    balanced: residual.length === 0,
    residual: Object.freeze(residual.map(amountOut)),
    residualExact: Object.freeze(residual.map(exactString)),
    inferredPostingIndex: inferred === null ? null : elided,
    inferredAmount: inferred === null ? null : amountOut(inferred),
  }) as AccountingBalance;
}

export function admitAccountingTransaction(input: AccountingEntry, verb: string): Transaction {
  if (!isTransaction(input)) throw new TypeError(`${verb}: expected an accounting transaction`);
  return input;
}

function postingWeight(posting: Posting): ExactValue | null {
  const face = posting.amount === null ? null : amountIn(posting.amount);
  if (face === null) return null;
  const reduce = (reducer: { readonly kind: string; readonly amount: Amount | null }, totalKind: boolean): ExactValue => {
    const reduced = reducer.amount === null ? null : amountIn(reducer.amount);
    if (reduced === null) return face;
    if (totalKind) {
      const positiveTotal = isNegative(reduced) ? negateMoney(reduced) : reduced;
      return isNegative(face) ? negateMoney(positiveTotal) : positiveTotal;
    }
    return timesMoney(face, reduced, commodityOf(reduced));
  };
  if (posting.cost !== null) return reduce(posting.cost, posting.cost.kind === "total");
  if (posting.price !== null) return reduce(posting.price, posting.price.kind === "@@");
  return face;
}

function elidedPostingIndex(postings: readonly Posting[]): number | null {
  const indices: number[] = [];
  postings.forEach((posting, index) => {
    if (posting.amount === null) indices.push(index);
  });
  return indices.length === 1 ? indices[0]! : null;
}

function amountIn(value: Amount): ExactValue {
  return moneyFromParts(integer(value.num, "amount.num"), integer(value.den, "amount.den"), value.commodity);
}

function amountOut(value: ExactValue): Amount {
  const exact = toExactString(value);
  const match = /^(-?[0-9]+)\/([0-9]+)\s+(.+)$/.exec(exact);
  if (match === null) throw new TypeError(`accounting amount: malformed exact value ${JSON.stringify(exact)}`);
  return Object.freeze({ num: match[1]!, den: match[2]!, commodity: match[3]! });
}

function exactString(value: ExactValue): string {
  return toExactString(value);
}

function isNegative(value: ExactValue): boolean {
  return toExactString(value).trimStart().startsWith("-");
}

function residualOf(judgment: ReturnType<typeof gradedBalanceOf>): readonly ExactValue[] {
  return "residual" in judgment ? judgment.residual : [];
}

function integer(value: string, label: string): bigint {
  if (!/^-?[0-9]+$/.test(value)) throw new TypeError(`accountingBalance: ${label} must be a decimal integer string`);
  return BigInt(value);
}

function isTransaction(entry: AccountingEntry): entry is Transaction {
  return typeof entry === "object" && entry !== null && "postings" in entry && Array.isArray(entry.postings);
}
