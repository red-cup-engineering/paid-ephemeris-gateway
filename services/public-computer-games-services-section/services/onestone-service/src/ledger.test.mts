import { test } from "node:test";
import assert from "node:assert/strict";
import { AuditLedger } from "./ledger.mts";

test("records balanced entries and rejects unbalanced ones", () => {
  const l = new AuditLedger();
  l.record({ date: "2026-08-12", narration: "100 Prisms (morgan)", ref: "ord-1", postings: [
    { account: "assets:cash:stripe", amount: "0.99", commodity: "USD" },
    { account: "income:premium", amount: "-0.99", commodity: "USD" },
  ] });
  assert.equal(l.all().length, 1);
  assert.throws(() => l.record({ date: "2026-08-12", narration: "bad", ref: "ord-2", postings: [
    { account: "a", amount: "4.99", commodity: "USD" },
    { account: "b", amount: "-3.00", commodity: "USD" },
  ] }), /unbalanced/);
});

test("audit independently replays the journal and confirms balance", () => {
  const l = new AuditLedger();
  l.record({ date: "2026-08-12", narration: "stripe purchase: 7-Day Pass (morgan)", ref: "ord-1", postings: [
    { account: "assets:cash:stripe", amount: "4.99", commodity: "USD" },
    { account: "income:premium", amount: "-4.99", commodity: "USD" },
  ] });
  l.record({ date: "2026-08-12", narration: "hive purchase: Life Refill (avery)", ref: "ord-2", postings: [
    { account: "assets:cash:hive", amount: "0.298", commodity: "HIVE" },
    { account: "income:premium", amount: "-0.298", commodity: "HIVE" },
  ] });
  const report = l.audit();
  assert.equal(report.entries, 2);
  assert.equal(report.malformed, 0);
  assert.equal(report.balanced, true);
  assert.ok(report.balances["income:premium"], "income account has a balance");
  assert.equal(report.balances["assets:cash:stripe"]?.["USD"], "4.99");
  assert.ok(report.journal.includes("ref:ord-1"));
  assert.ok(report.journal.includes("assets:cash:hive  0.298 HIVE"));
});

test("idempotency: has(ref) guards against double-posting webhook retries", () => {
  const l = new AuditLedger();
  assert.equal(l.has("ord-9"), false);
  l.record({ date: "2026-08-12", narration: "x", ref: "ord-9", postings: [
    { account: "assets:cash:stripe", amount: "1.00", commodity: "USD" },
    { account: "income:premium", amount: "-1.00", commodity: "USD" },
  ] });
  assert.equal(l.has("ord-9"), true);
});

test("audit tallies multiple entries against the same account across commodities", () => {
  const l = new AuditLedger();
  l.record({ date: "2026-08-12", narration: "a", ref: "ord-a", postings: [
    { account: "assets:cash:stripe", amount: "0.99", commodity: "USD" },
    { account: "income:premium", amount: "-0.99", commodity: "USD" },
  ] });
  l.record({ date: "2026-08-12", narration: "b", ref: "ord-b", postings: [
    { account: "assets:cash:stripe", amount: "19.99", commodity: "USD" },
    { account: "income:premium", amount: "-19.99", commodity: "USD" },
  ] });
  const report = l.audit();
  assert.equal(report.balances["assets:cash:stripe"]?.["USD"], "20.98");
  assert.equal(report.balances["income:premium"]?.["USD"], "-20.98");
});

test("a malformed entry cannot be constructed via record(), so audit() only ever meets malformed via toJSON-restored state", () => {
  // record() enforces balance at the boundary; audit()'s own malformed-detection path exists to
  // stay correct even if entries ever arrive pre-balanced from persisted state rather than record().
  const bad = { date: "2026-08-12", narration: "restored bad state", ref: "ord-x", postings: [
    { account: "a", amount: "1.00", commodity: "USD" },
    { account: "b", amount: "-0.50", commodity: "USD" },
  ] };
  const l = new AuditLedger([bad]);
  const report = l.audit();
  assert.equal(report.malformed, 1);
  assert.equal(report.balanced, false);
});
