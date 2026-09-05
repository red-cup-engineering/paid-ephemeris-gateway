import { test } from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "./ledger.mts";

test("records balanced entries and rejects unbalanced ones", () => {
  const l = new Ledger();
  l.record({ date: "2026-06-19", narration: "test", ref: "r1", postings: [
    { account: "assets:cash:stripe", amount: "4.99", commodity: "USD" },
    { account: "income:premium", amount: "-4.99", commodity: "USD" },
  ] });
  assert.equal(l.all().length, 1);
  assert.throws(() => l.record({ date: "2026-06-19", narration: "bad", ref: "r2", postings: [
    { account: "a", amount: "4.99", commodity: "USD" },
    { account: "b", amount: "-3.00", commodity: "USD" },
  ] }), /unbalanced/);
});

test("report totals balances per account and renders the journal", () => {
  const l = new Ledger();
  l.record({ date: "2026-06-19", narration: "Kindling (p1)", ref: "ord-1", postings: [
    { account: "assets:cash:stripe", amount: "0.99", commodity: "USD" },
    { account: "income:premium", amount: "-0.99", commodity: "USD" },
  ] });
  l.record({ date: "2026-06-19", narration: "Bonfire (p2)", ref: "ord-2", postings: [
    { account: "assets:cash:hive", amount: "0.900", commodity: "HIVE" },
    { account: "income:premium", amount: "-0.900", commodity: "HIVE" },
  ] });
  const report = l.report();
  assert.equal(report.entries, 2);
  assert.equal(report.balanced, true);
  assert.equal(report.malformed, 0);
  assert.equal(report.balances["income:premium"]!["USD"], "-0.99");
  assert.equal(report.balances["income:premium"]!["HIVE"], "-0.9");
  assert.ok(report.journal.includes("ref:ord-1"));
});

test("report independently re-checks postings and excludes malformed entries from balances", () => {
  // `record()` refuses unbalanced entries, so exercise the constructor's `initial` seam
  // (e.g. a snapshot file that was hand-edited or corrupted) to reach report()'s own guard.
  const l = new Ledger([
    { date: "2026-06-19", narration: "good", ref: "ord-1", postings: [
      { account: "assets:cash:stripe", amount: "1.00", commodity: "USD" },
      { account: "income:premium", amount: "-1.00", commodity: "USD" },
    ] },
    { date: "2026-06-19", narration: "corrupted", ref: "ord-2", postings: [
      { account: "assets:cash:stripe", amount: "5.00", commodity: "USD" },
      { account: "income:premium", amount: "-4.00", commodity: "USD" },
    ] },
  ]);
  const report = l.report();
  assert.equal(report.entries, 2);
  assert.equal(report.balanced, false);
  assert.equal(report.malformed, 1);
  assert.equal(report.balances["income:premium"]!["USD"], "-1");
});

test("idempotency: has(ref) guards against double-posting webhook retries", () => {
  const l = new Ledger();
  assert.equal(l.has("ord-9"), false);
  l.record({ date: "2026-06-19", narration: "x", ref: "ord-9", postings: [
    { account: "assets:cash:stripe", amount: "1.00", commodity: "USD" },
    { account: "income:premium", amount: "-1.00", commodity: "USD" },
  ] });
  assert.equal(l.has("ord-9"), true);
});
