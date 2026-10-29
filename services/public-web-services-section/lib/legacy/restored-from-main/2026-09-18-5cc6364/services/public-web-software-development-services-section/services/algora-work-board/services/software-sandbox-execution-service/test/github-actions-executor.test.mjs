import { test } from "node:test";
import assert from "node:assert/strict";
import { githubActionsExecutor } from "../src/github-actions-executor.mjs";

function fakeApi(overrides = {}) {
  const calls = { dispatched: 0, gistsCreated: 0, gistsDeleted: 0, correlationId: null };
  const api = {
    calls,
    getRepo: async () => ({ default_branch: "main" }),
    getTree: async () => ["src/a.mjs", "README.md"],
    getContent: async (_r, _ref, p) => `contents of ${p}`,
    createGist: async () => { calls.gistsCreated++; return { id: "g1", rawUrl: "https://gist/raw/patch.diff" }; },
    deleteGist: async () => { calls.gistsDeleted++; },
    dispatchWorkflow: async (_repo, _workflow, _ref, inputs) => { calls.dispatched++; calls.correlationId = inputs.correlation_id; },
    listRuns: async () => [
      { id: 98, status: "completed", conclusion: "success", displayTitle: "solve-and-test-unrelated" },
      { id: 99, status: "completed", conclusion: "success", displayTitle: `solve-and-test-${calls.correlationId}` },
    ],
    getRunResult: async () => ({ passed: true, output: "ok" }),
    ...overrides,
  };
  return api;
}

const cfg = (api) => ({ runnerRepo: "me/runner", token: "t", api, wait: async () => {} });

test("prepare reads target repo metadata + file list via the API (no execution)", async () => {
  const api = fakeApi();
  const ex = githubActionsExecutor(cfg(api));
  const h = await ex.prepare("acme/widgets");
  assert.equal(h.ref, "main");
  assert.equal(h.files.length, 2);
});

test("buildContext fetches focus files mentioned by the task, via the API", async () => {
  const api = fakeApi();
  const ex = githubActionsExecutor(cfg(api));
  const h = await ex.prepare("acme/widgets");
  const ctx = await ex.buildContext(h, { task: { title: "fix src/a.mjs", body: "" }, failures: [] });
  assert.deepEqual(ctx.focusFiles, ["src/a.mjs"]);
  assert.match(ctx.excerpts["src/a.mjs"], /contents of src\/a.mjs/);
});

test("runTests dispatches the sandbox workflow and reads pass/fail; cleans up the gist", async () => {
  const api = fakeApi();
  const ex = githubActionsExecutor(cfg(api));
  const h = await ex.prepare("acme/widgets");
  await ex.applyPatch(h, "diff --git a b");
  const res = await ex.runTests(h);
  assert.equal(res.passed, true);
  assert.equal(api.calls.dispatched, 1);
  assert.match(api.calls.correlationId, /^[0-9a-f-]{36}$/u);
  assert.equal(api.calls.gistsCreated, 1);
  assert.equal(api.calls.gistsDeleted, 1); // gist cleaned up even on success
});

test("runTests reports a failing run as not-passed", async () => {
  const api = fakeApi({ getRunResult: async () => ({ passed: false, output: "run 99 conclusion=failure" }) });
  const ex = githubActionsExecutor(cfg(api));
  const h = await ex.prepare("acme/widgets");
  await ex.applyPatch(h, "d");
  const res = await ex.runTests(h);
  assert.equal(res.passed, false);
});

test("runTests refuses before dispatch when no patch was staged", async () => {
  const api = fakeApi();
  const ex = githubActionsExecutor(cfg(api));
  const h = await ex.prepare("acme/widgets");
  await assert.rejects(ex.runTests(h), /staged nonempty patch/u);
  assert.equal(api.calls.dispatched, 0);
  assert.equal(api.calls.gistsCreated, 0);
});
