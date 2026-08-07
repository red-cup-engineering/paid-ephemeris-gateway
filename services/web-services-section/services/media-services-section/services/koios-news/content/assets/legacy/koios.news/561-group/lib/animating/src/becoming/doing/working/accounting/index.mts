// @emsenn/animating/becoming/doing/working/accounting — the pure algebraic substrate of double-entry accounting, recreated as
// a symptom of agency (formerly @emsenn/ledger/algebra). An agent expends and receives resources;
// double-entry is the discipline that keeps the books exact and balanced. The record-shaped API is a
// boundary convenience; its bedrock form is the finite utterance projection exported below. No parsing
// or representation codecs live here; no settling (that is @emsenn/trading/ledger, where the financial
// reading of these books lives).

// ── boundary records: admitted objects with utterance normalization ───────────
export type {
  Amount, Transaction, Posting, Cost, Price, BalanceAssertion,
  Directive, Entry, Malformed, Source, ParsedDecimal,
  OpenDirective, CloseDirective, CommodityDirective, PriceDirective,
  PadDirective, BalanceDirective, OptionDirective, IncludeDirective,
} from "./model/types.mjs";
export { isTransaction, isDirective, isMalformed } from "./model/types.mjs";
export {
  transaction, posting, txnId, open, close, commodity, price, pad, balance, option, include, malformed,
} from "./model/constructors.mjs";

// ── exact-rational money ──────────────────────────────────────────────────────
export {
  rational, amount, zero, isAmount,
  add, sub, negate, isZero, cmp, eq, absAmount, withinTolerance, scale, times,
  toExactString,
} from "./rational.mjs";

// ── commodity carrier ─────────────────────────────────────────────────────────
export type { Registry } from "./registry.mjs";
export { makeRegistry, declareCommodity, observe, precisionOf } from "./registry.mjs";

// ── conservation law (the boundary operator ∂) ────────────────────────────────
export { postingWeight, postingHolding, residual, inferElided, balances } from "./balance.mjs";

// ── normalization to relational carriers ─────────────────────────────────────
export {
  ACCOUNTING_PREDICATES,
  amountUtterances,
  postingUtterances,
  transactionUtterances,
  directiveUtterances,
  malformedUtterances,
  accountingUtterances,
  journalUtterances,
} from "./utterances.mjs";
export type { AccountingTerm } from "./utterances.mjs";
