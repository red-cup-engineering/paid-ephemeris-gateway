/**
 * accounting ledger — organizing's adjudicated accounting record-state.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { moneyFromParts, toExactString } from "@emsenn/relating/economy";
import loadLedger, {
  balance,
  balanceAt,
  balances,
  commodity,
  inferElided,
  makeRegistry,
  posting,
  runningBalances,
  transaction,
} from "../dist/accounting/ledger.mjs";

const usd = (num) => moneyFromParts(BigInt(num), 1n, "USD");

test("one elided posting is inferred by the organizing ledger engine", () => {
  const registry = makeRegistry();
  const tx = transaction({
    id: "txn:elided",
    date: "2026-06-26",
    narration: "elided leg",
    postings: [
      posting({ account: "Assets:Cash", amount: usd(10) }),
      posting({ account: "Income:Sales", amount: null }),
    ],
  });

  const inferred = inferElided(tx, registry);

  assert.equal(inferred.postings[1].amount === null, false);
  assert.equal(toExactString(inferred.postings[1].amount), "-10/1 USD");
  assert.equal(balances(inferred, registry).balanced, true);
});

test("loadLedger computes balances even when an imbalanced transaction is held", () => {
  const ledger = loadLedger([
    transaction({
      id: "txn:imbalanced",
      date: "2026-06-26",
      narration: "held imbalance",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(10) }),
        posting({ account: "Income:Sales", amount: usd(-8) }),
      ],
    }),
  ]);

  assert.equal(ledger.transactions.length, 1);
  assert.equal(ledger.worklist.length >= 1, true);
  assert.equal(toExactString(ledger.balances.get("Assets:Cash").get("USD")), "10/1 USD");
  assert.equal(toExactString(ledger.balances.get("Income:Sales").get("USD")), "-8/1 USD");
});

test("balance directives can synthesize pad transactions without halting the ledger", () => {
  const ledger = loadLedger([
    commodity({ symbol: "USD", precision: 2 }),
    transaction({
      id: "txn:opening",
      date: "2026-06-25",
      narration: "opening",
      postings: [
        posting({ account: "Assets:Cash", amount: usd(5) }),
        posting({ account: "Equity:Opening", amount: usd(-5) }),
      ],
    }),
    { directive: "pad", date: "2026-06-26", account: "Assets:Cash", padAccount: "Equity:Opening", source: null },
    balance({ date: "2026-06-27", account: "Assets:Cash", amount: usd(8) }),
  ]);

  assert.equal(ledger.synthesized.length, 1);
  assert.equal(toExactString(balanceAt([...ledger.transactions, ...ledger.synthesized], ledger.registry, "Assets:Cash", "USD", "2026-06-28")), "8/1 USD");
  assert.equal(runningBalances([...ledger.transactions, ...ledger.synthesized], ledger.registry).get("Assets:Cash").has("USD"), true);
});
