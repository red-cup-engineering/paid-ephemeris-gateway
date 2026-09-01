import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRectifications, proposeLayer } from "../src/detect-rectifications.mjs";

const outcomes = [
  { repo: "a/win", issueNumber: 1, status: "solved-free", solvedBy: "free-model" },
  { repo: "a/win", issueNumber: 2, status: "solved-free", solvedBy: "free-model" },
  { repo: "b/once", issueNumber: 3, status: "solved-free", solvedBy: "free-model" },
  { repo: "c/fail", issueNumber: 4, status: "failed", solvedBy: null },
  { repo: "c/fail", issueNumber: 5, status: "refused", solvedBy: null },
];

test("detects repeated wins per repo -> a trusted-route proposal", () => {
  const props = detectRectifications(outcomes, { threshold: 2 });
  const win = props.find((p) => p.signature === "wins-in-repo:a/win");
  assert.ok(win);
  assert.equal(win.count, 2);
  assert.equal(win.retireManualCopyAfterWitness, true);
  assert.ok(win.id.startsWith("ni:///sha-256;"));
});

test("detects repeated fails per repo -> a cold-route proposal", () => {
  const props = detectRectifications(outcomes, { threshold: 2 });
  const fail = props.find((p) => p.signature === "fails-in-repo:c/fail");
  assert.ok(fail);
  assert.equal(fail.count, 2);
});

test("below-threshold patterns produce no proposal (no premature crystallization)", () => {
  const props = detectRectifications(outcomes, { threshold: 2 });
  assert.equal(props.find((p) => p.signature === "wins-in-repo:b/once"), undefined);
  // raising the threshold suppresses everything here
  assert.equal(detectRectifications(outcomes, { threshold: 3 }).length, 0);
});

test("proposeLayer follows the firm's memory->rule->skill->hook ladder", () => {
  assert.equal(proposeLayer({ mechanicallyCheckable: true, mustRunEveryTime: true }), "hook");
  assert.equal(proposeLayer({ mechanicallyCheckable: true, mustRunEveryTime: false }), "skill");
  assert.equal(proposeLayer({ mechanicallyCheckable: false }), "rule");
});
