/**
 * accounting report - settled readings over organizing ledger state.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { moneyFromParts } from "@emsenn/relating/economy";
import loadLedger, { posting, transaction } from "../dist/accounting/ledger.mjs";
import {
  balanceReport,
  checkReport,
  printReport,
  renderBalance,
  renderCheck,
  renderPrint,
  statsReport,
} from "../dist/accounting/report.mjs";

const usd = (num) => moneyFromParts(BigInt(num), 1n, "USD");

test("organizing accounting reports read balances, held checks, stats, and print text", () => {
  const tx = transaction({
    id: "txn:report",
    date: "2026-06-26",
    narration: "reportable settlement",
    postings: [
      posting({ account: "Assets:Cash", amount: usd(10) }),
      posting({ account: "Income:Sales", amount: usd(-8) }),
    ],
  });
  const ledger = loadLedger([tx]);

  const balance = balanceReport(ledger, {});
  const renderedBalance = renderBalance(balance, ledger);
  assert.match(renderedBalance, /Assets/);
  assert.match(renderedBalance, /Cash/);
  assert.match(renderedBalance, /Income/);
  assert.match(renderedBalance, /Sales/);

  const check = checkReport(ledger);
  assert.equal(check.exitCode, 0);
  assert.equal(check.ok, false);
  assert.match(renderCheck(check), /held problems/);

  const stats = statsReport(ledger);
  assert.equal(stats.transactions, 1);
  assert.equal(stats.held >= 1, true);

  const printed = printReport([tx]);
  assert.match(renderPrint(printed), /reportable settlement/);
  assert.match(renderPrint(printed), /Assets:Cash/);
});
