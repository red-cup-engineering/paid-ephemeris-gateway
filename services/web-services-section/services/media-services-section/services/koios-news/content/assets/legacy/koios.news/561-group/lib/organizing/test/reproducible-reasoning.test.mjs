import test from "node:test";
import assert from "node:assert/strict";

import {
  REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION,
  rebuild,
  reproducibleReasoning,
  reproducibleReasoningBuildCarrier,
} from "../dist/index.mjs";

const reasoningTerm = (conclusion) => [
  "app",
  [
    "lam",
    ["pair", ["mark", "premise:bounded-evaluator"], ["mark", conclusion]],
  ],
  ["star"],
];

test("the same RMN reasoning term settles to the same store path twice", () => {
  const first = reproducibleReasoning({
    id: "reasoning:stable",
    name: "stable-conclusion",
    claim: "bounded evaluator settles",
    term: reasoningTerm("conclusion:normal-form"),
  });
  const second = reproducibleReasoning({
    id: "reasoning:stable",
    name: "stable-conclusion",
    claim: "bounded evaluator settles",
    term: reasoningTerm("conclusion:normal-form"),
  });

  assert.equal(reproducibleReasoningBuildCarrier.validate(first), true);
  assert.match(first.assumption, /does not invoke a real nix or guix binary/u);
  assert.match(first.assumption, /deterministic settling, not live agent cognition/u);
  assert.match(REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION, /not live agent cognition/u);
  assert.equal(first.contentAddress, second.contentAddress);
  assert.equal(first.storePath.$id, second.storePath.$id);
  assert.equal(first.storePath.path, second.storePath.path);
});

test("a different RMN reasoning term settles to a different content address", () => {
  const left = reproducibleReasoning({
    id: "reasoning:left",
    name: "left-conclusion",
    term: reasoningTerm("conclusion:left"),
  });
  const right = reproducibleReasoning({
    id: "reasoning:right",
    name: "right-conclusion",
    term: reasoningTerm("conclusion:right"),
  });

  assert.notEqual(left.contentAddress, right.contentAddress);
  assert.notEqual(left.storePath.hash, right.storePath.hash);
  assert.notEqual(left.normalForm[2][1], right.normalForm[2][1]);
});

test("rebuilding re-evaluates the derivation and recovers the normal form behind the hash", () => {
  const built = reproducibleReasoning({
    id: "reasoning:rebuild",
    name: "rebuild-conclusion",
    term: reasoningTerm("conclusion:rebuild"),
  });

  const rebuilt = rebuild(built);

  assert.equal(rebuilt.ok, true);
  assert.equal(rebuilt.expectedContentAddress, built.contentAddress);
  assert.equal(rebuilt.actualContentAddress, built.contentAddress);
  assert.deepEqual(rebuilt.normalForm, built.normalForm);
  assert.equal(rebuilt.storePath.$id, built.storePath.$id);
});
