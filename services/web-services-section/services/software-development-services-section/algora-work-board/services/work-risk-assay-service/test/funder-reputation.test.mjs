import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreFunder } from "../src/funder-reputation.mjs";

test("a proven-paying established project scores high", () => {
  const r = scoreFunder({ algoraCompletedUsd: 12000, algoraOpenUsd: 800, stars: 5000, forks: 400, openIssues: 150, repoAgeDays: 1200 });
  assert.equal(r.label, "pays-likely");
  assert.ok(r.score >= 0.6);
});

test("a SecureBananaLabs-shaped farm scores low (never a hard exclude, just deprioritized)", () => {
  const r = scoreFunder({ algoraCompletedUsd: 0, algoraOpenUsd: 500000, stars: 243, forks: 807, openIssues: 9238, repoAgeDays: 64 });
  assert.equal(r.label, "farm-or-nonpayer");
  assert.ok(r.score <= 0.35);
  assert.match(r.reasons.join(" "), /unproven payer|farm-suspected|issue mill/);
});

test("unproven payer alone drops it below neutral", () => {
  const r = scoreFunder({ algoraCompletedUsd: 0, algoraOpenUsd: 100, stars: 50, forks: 5, openIssues: 20, repoAgeDays: 400 });
  assert.ok(r.score < 0.5);
});
