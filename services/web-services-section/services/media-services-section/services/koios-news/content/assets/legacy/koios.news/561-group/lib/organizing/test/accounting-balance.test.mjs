/**
 * accounting-balance — organizing's accounting adapter over relating economy.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { accountingBalance } from "../dist/accounting-balance.mjs";

const amount = (num, den, commodity) => ({ num, den, commodity });
const posting = (account, value) => ({
  account,
  amount: value,
  cost: null,
  price: null,
  balanceAssertion: null,
  meta: {},
});
const transaction = (postings) => ({
  id: "txn:test",
  date: "2026-06-26",
  time: null,
  flag: "*",
  payee: null,
  narration: "test",
  postings,
  tags: [],
  links: [],
  meta: {},
  code: null,
  source: null,
});

test("balanced transactions conserve in each commodity", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", amount("-10", "1", "USD")),
  ]));

  assert.equal(report.kind, "organizing.accounting.balance");
  assert.equal(report.balanced, true);
  assert.deepEqual(report.residual, []);
  assert.deepEqual(report.residualExact, []);
  assert.equal(report.inferredPostingIndex, null);
  assert.equal(report.inferredAmount, null);
});

test("imbalanced transactions carry exact residuals", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", amount("-8", "1", "USD")),
  ]));

  assert.equal(report.balanced, false);
  assert.deepEqual(report.residual, [amount("2", "1", "USD")]);
  assert.deepEqual(report.residualExact, ["2/1 USD"]);
});

test("one elided posting is inferred through relating economy completion", () => {
  const report = accountingBalance(transaction([
    posting("Assets:Cash", amount("10", "1", "USD")),
    posting("Income:Sales", null),
  ]));

  assert.equal(report.balanced, false);
  assert.equal(report.inferredPostingIndex, 1);
  assert.deepEqual(report.inferredAmount, amount("-10", "1", "USD"));
});

test("total price/cost preserves the face sign over the reducer commodity", () => {
  const sharePosting = {
    ...posting("Assets:Shares", amount("-2", "1", "SHARE")),
    price: { kind: "@@", amount: amount("12", "1", "USD") },
  };
  const cashPosting = posting("Assets:Cash", amount("12", "1", "USD"));
  const report = accountingBalance(transaction([sharePosting, cashPosting]));

  assert.equal(report.balanced, true);
  assert.deepEqual(report.residualExact, []);
});
