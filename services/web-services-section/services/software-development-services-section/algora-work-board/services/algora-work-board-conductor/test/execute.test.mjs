import { test } from "node:test";
import assert from "node:assert/strict";
import { solveCandidate } from "../src/solve-candidate.mjs";
import { githubActionsExecutor } from "@red-cup-engineering/software-sandbox-execution-service";

const candidate = { repo: "acme/widgets", issueNumber: 1, title: "fix", body: "do it" };

test("solveCandidate refuses to run wet without an executor (no laptop execution)", async () => {
  const r = await solveCandidate(candidate, {}, {});
  assert.equal(r.status, "refused");
  assert.match(r.note, /no executor/);
});

test("solveCandidate dry-run skips without touching anything", async () => {
  const r = await solveCandidate(candidate, {}, { dryRun: true });
  assert.equal(r.status, "skipped");
});

test("solveCandidate runs through an injected sandbox executor", async () => {
  const mockExecutor = {
    name: "mock",
    prepare: async () => ({ dir: null }),
    buildContext: async (_h, { task, failures }) => ({ task, failures }),
    applyPatch: async () => ({ ok: true }),
    runTests: async () => ({ passed: true }),
    dispose: async () => {},
  };
  const r = await solveCandidate(candidate, {}, {
    executor: mockExecutor,
    generatePatch: async () => ({ patch: "d" }), // bypass live inference
  });
  assert.equal(r.status, "solved-free");
  assert.equal(r.solvedBy, "free-model");
});

test("github-actions executor refuses until its remote runner and hired provider are configured", async () => {
  delete process.env.GITHUB_RUNNER_REPO;
  await assert.rejects(githubActionsExecutor({}).prepare("acme/widgets"), /unconfigured/);
});
