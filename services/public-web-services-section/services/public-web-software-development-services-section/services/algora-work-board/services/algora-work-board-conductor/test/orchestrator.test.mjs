import { test } from "node:test";
import assert from "node:assert/strict";
import { runLoop } from "../src/orchestrator.mjs";
import { appendOutcome, OUTCOME_CATEGORY } from "@red-cup-engineering/software-work-witness-service";

const OBSERVED = "2026-07-18T00:00:00Z";
const candidates = [
  { commentMarkdown: "## 💎 $100 bounty\n<table><tbody></tbody></table>", meta: { repo: "a/b", issueNumber: 1, title: "t1", rewardFormatted: "$100" } },
  { commentMarkdown: "## 💎 $200 bounty\n<table><tbody></tbody></table>", meta: { repo: "c/d", issueNumber: 2, title: "t2", rewardFormatted: "$200" } },
  { commentMarkdown: "points\n", meta: { repo: "e/f", issueNumber: 3, title: "t3", rewardFormatted: "50 points" } },
];

test("runLoop selects within the request budget and defers the rest of the long tail", async () => {
  const witnessed = [];
  const res = await runLoop({
    candidatesInput: candidates,
    observedAt: OBSERVED,
    requestBudget: 6, // one attempt worth of requests
    attemptCostRequests: 6,
    solve: async () => ({ status: "solved-free", solvedBy: "free-model" }),
    witnessOutcome: async (rec) => witnessed.push(rec),
  });
  assert.equal(res.summary.discovered, 3);
  assert.equal(res.summary.qualified, 2); // two cash; points refused
  assert.equal(res.summary.attempted, 1); // budget only affords one
  assert.equal(res.summary.deferredToNextBudget, 1);
  assert.equal(res.summary.solvedFree, 1);
  assert.equal(witnessed.length, 1);
  // highest EV-per-request attempted first: $200 uncontested
  assert.equal(witnessed[0].repo, "c/d");
});

test("runLoop witnesses every outcome and tallies by solving stage", async () => {
  const witnessed = [];
  const res = await runLoop({
    candidatesInput: candidates,
    observedAt: OBSERVED,
    requestBudget: Infinity,
    solve: async (cand) => (cand.repo === "c/d" ? { status: "solved-free", solvedBy: "free-model" } : { status: "failed", solvedBy: null }),
    witnessOutcome: async (rec) => witnessed.push(rec),
  });
  assert.equal(res.summary.attempted, 2);
  assert.equal(res.summary.solvedFree, 1);
  assert.equal(res.summary.failed, 1);
  assert.equal(witnessed.length, 2);
});

test("runLoop counts dry-run skips separately (safe measurement pass)", async () => {
  const res = await runLoop({
    candidatesInput: candidates,
    observedAt: OBSERVED,
    requestBudget: Infinity,
    solve: async () => ({ status: "skipped", solvedBy: null }),
  });
  assert.equal(res.summary.attempted, 2);
  assert.equal(res.summary.skipped, 2);
  assert.equal(res.summary.failed, 0);
});

test("runLoop requires observedAt and a solve function", async () => {
  await assert.rejects(runLoop({ candidatesInput: candidates, solve: async () => ({}) }));
  await assert.rejects(runLoop({ candidatesInput: candidates, observedAt: OBSERVED }));
});

test("solve outcomes cross the hired WitnessJournal boundary as typed settlement records", async () => {
  let request;
  const value = await appendOutcome({ async record(input) { request = input; return { documentNi: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", digest: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" }; } }, { observedAt: OBSERVED, repo: "a/b", issueNumber: 7, status: "passed" });
  assert.equal(request.category, OUTCOME_CATEGORY);
  assert.equal(request.record.kind, "algora-pilot.solve-outcome");
  assert.equal(value.witness.graph, "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
});
