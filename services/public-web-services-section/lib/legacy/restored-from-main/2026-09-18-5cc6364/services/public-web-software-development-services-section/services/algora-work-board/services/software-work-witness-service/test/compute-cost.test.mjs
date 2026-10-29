import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCostRecord, GH_LINUX_USD_PER_MINUTE } from "../src/compute-cost.mjs";

test("bills per started minute, rounded up", () => {
  const r = computeCostRecord({ observedAt: "2026-07-18T00:00:00Z", repo: "a/b", issue: 1, runId: 9, durationSeconds: 130 });
  assert.equal(r.billableMinutes, 3); // 130s -> 3 started minutes
  assert.equal(r.estUsd, Math.round(3 * GH_LINUX_USD_PER_MINUTE * 10000) / 10000); // 0.024
  assert.ok(r.id.startsWith("ni:///sha-256;"));
});

test("free-allotment runs record minutes but $0", () => {
  const r = computeCostRecord({ observedAt: "2026-07-18T00:00:00Z", repo: "a/b", issue: 1, runId: 9, durationSeconds: 130, freeAllotment: true });
  assert.equal(r.billableMinutes, 3);
  assert.equal(r.estUsd, 0);
});
