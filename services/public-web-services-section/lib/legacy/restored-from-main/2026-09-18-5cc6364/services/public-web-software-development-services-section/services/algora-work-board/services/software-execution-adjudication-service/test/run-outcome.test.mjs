import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTestCounts, parseMarkers, summarizeRun, differentialVerdict } from "../src/run-outcome.mjs";

const nodeTestLog = "# tests 5\n# pass 3\n# fail 2\n";

test("parses node --test summary counts", () => {
  assert.deepEqual(parseTestCounts(nodeTestLog), { tests: 5, pass: 3, fail: 2 });
});

test("detects harness/apply markers from REAL tool output, not script sentinels", () => {
  assert.deepEqual(parseMarkers("... Cannot find module '/x/src/tests' ..."), ["module-not-found"]);
  assert.deepEqual(parseMarkers("error: patch failed: apps/x.js:3\nerror: apps/x.js: patch does not apply"), ["patch-apply-failed"]);
  // the workflow's own echoed sentinel must NOT false-positive
  assert.deepEqual(parseMarkers('  git apply ... || { echo "PATCH_APPLY_FAILED"; exit 1; }'), []);
});

test("differential: fewer failures after patch = improved", () => {
  const base = { summary: summarizeRun("# tests 3\n# pass 2\n# fail 1\n") };
  const patched = { summary: summarizeRun("# tests 3\n# pass 3\n# fail 0\n") };
  assert.equal(differentialVerdict(base, patched).verdict, "improved");
});

test("differential: broken base harness = inconclusive (not a false fail)", () => {
  const base = { summary: summarizeRun("Error: Cannot find module '/x/src/tests'") };
  const patched = { summary: summarizeRun("Error: Cannot find module '/x/src/tests'") };
  assert.equal(differentialVerdict(base, patched).verdict, "inconclusive");
});

test("differential: more failures after patch = regression", () => {
  const base = { summary: summarizeRun("# tests 3\n# pass 3\n# fail 0\n") };
  const patched = { summary: summarizeRun("# tests 3\n# pass 1\n# fail 2\n") };
  assert.equal(differentialVerdict(base, patched).verdict, "regression");
});

test("differential: patch that doesn't apply is flagged distinctly", () => {
  const base = { summary: summarizeRun("# tests 1\n# pass 1\n# fail 0\n") };
  const patched = { summary: summarizeRun("error: patch failed: apps/x.js:3\nerror: apps/x.js: patch does not apply") };
  assert.equal(differentialVerdict(base, patched).verdict, "patch-does-not-apply");
});
