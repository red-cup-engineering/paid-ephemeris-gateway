import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Bounty, parseAttempts, parseReward } from "../src/bounty.mjs";
import { listBounties } from "../src/github.mjs";
import { rankBounties } from "../src/selection.mjs";
import { Outcome, findPatterns, readOutcomes, recordOutcome } from "../src/outcomes.mjs";
import { compareTestRuns, testSummary } from "../src/validation.mjs";
import { executeRemotely, proposePatch, validatePatch } from "../src/solve.mjs";
import { RepositoryWorkspace } from "../src/repository.mjs";
import { dispatchGitHubAction } from "../src/github-actions.mjs";

const comment = "## 💎 $250 bounty <table><tr><td>🟢 @alice</td><td><a href=\"https://github.com/acme/widgets/pull/5\">PR</a></td></tr></table>";

test("parses a reward and active attempt into typed records", () => {
  assert.equal(parseReward(comment), 250);
  const [attempt] = parseAttempts(comment);
  assert.equal(attempt.status, "active");
  assert.deepEqual(attempt.people, ["alice"]);
  assert.equal(attempt.pullRequest, "https://github.com/acme/widgets/pull/5");
});

test("lists bounties from GitHub and ranks by reward per active attempt", async () => {
  const fetchImpl = async (url) => ({ ok: true, json: async () => url.includes("/search/issues")
    ? { items: [{ repository_url: "https://api.github.com/repos/acme/widgets", number: 42, title: "Fix", html_url: "https://github.com/acme/widgets/issues/42" }] }
    : [{ user: { login: "algora-pbc[bot]" }, body: comment }] });
  const [bounty] = await listBounties({ fetchImpl, observedAt: "2026-09-15T00:00:00Z" });
  assert.ok(bounty instanceof Bounty);
  assert.equal(bounty.id, "acme/widgets#42");
  assert.equal(rankBounties([bounty])[0].score, 62.5);
});

test("keeps evidence for repeated outcomes without changing policy", () => {
  const outcomes = [1, 2].map((issueNumber) => new Outcome({ repository: "acme/widgets", issueNumber, status: "lost", observedAt: "2026-09-15T00:00:00Z" }));
  const [pattern] = findPatterns(outcomes);
  assert.equal(pattern.suggestion, "review this repository before another attempt");
  assert.equal(pattern.evidence.length, 2);
});

test("persists content-addressed outcomes as a reusable local journal", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algora-outcomes-"));
  const saved = await recordOutcome(directory, { repository: "acme/widgets", issueNumber: 4, status: "won", observedAt: "2026-09-15T00:00:00Z" });
  const [loaded] = await readOutcomes(directory);
  assert.equal(loaded.id, saved.id);
});

test("adjudicates test results and only executes through an explicit adapter", async () => {
  assert.deepEqual(testSummary("# pass 4\n# fail 1"), { passed: 4, failed: 1 });
  assert.equal(compareTestRuns({ ok: true, output: "# fail 2" }, { ok: true, output: "# fail 1" }).verdict, "improved");
  const execution = await executeRemotely(async (request) => ({ ok: request.repository === "acme/widgets", output: "done" }), { repository: "acme/widgets" });
  assert.equal(execution.ok, true);
});

test("applies and validates a caller-supplied patch in a repository workspace", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algora-workspace-"));
  spawnSync("git", ["init", "--quiet", directory]);
  await writeFile(join(directory, "index.mjs"), "export const answer = 41;\n");
  const result = validatePatch(new RepositoryWorkspace(directory), {
    patch: "diff --git a/index.mjs b/index.mjs\n--- a/index.mjs\n+++ b/index.mjs\n@@ -1 +1 @@\n-export const answer = 41;\n+export const answer = 42;\n",
    testCommand: process.execPath,
    testArgs: ["--check", "index.mjs"],
  });
  assert.equal(result.applied.applied, true);
  assert.equal(result.verdict.verdict, "no-regression");
});

test("builds an explicit GitHub Actions dispatch without hiding repository or workflow", async () => {
  let args;
  const result = await dispatchGitHubAction({ repository: "acme/widgets", workflow: "verify.yml", ref: "fix-42", inputs: { issue: 42 } }, {
    run: async (received) => { args = received; return { ok: true, output: "dispatched" }; },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(args, ["workflow", "run", "verify.yml", "--repo", "acme/widgets", "--ref", "fix-42", "--raw-field", "issue=42"]);
});

test("accepts patch synthesis only through an explicit author", async () => {
  const patch = await proposePatch(async ({ bounty }) => `diff --git a/${bounty.issueNumber} b/${bounty.issueNumber}`, {
    bounty: { issueNumber: 42 }, workspace: { directory: "/tmp/work", remote: null, branch: null },
  });
  assert.match(patch, /diff --git/);
});
