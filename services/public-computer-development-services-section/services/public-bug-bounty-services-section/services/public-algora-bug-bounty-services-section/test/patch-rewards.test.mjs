import assert from "node:assert/strict";
import test from "node:test";
import { assessPatchReward, patchRewardsFromOutcomes, tier1Repositories } from "../src/patch-rewards.mjs";
import { Outcome } from "../src/outcomes.mjs";

const scopeMarkdown = "## Tier 1\n- [Tink](https://github.com/tink-crypto/tink-java)\n- [gVisor](https://github.com/google/gvisor/tree/master)\n";
const at = (days) => new Date(Date.parse("2026-01-01T00:00:00Z") + days * 86_400_000).toISOString();

test("reads Tier 1 repositories from the scope document", () => {
  assert.deepEqual([...tier1Repositories(scopeMarkdown)].sort(), ["google/gvisor", "tink-crypto/tink-java"]);
});

test("a security patch is claim-ready only between one month and one year after merge", () => {
  const base = { repository: "https://github.com/google/gvisor", mergedAt: at(0), securityRationale: "bounds check", scopeMarkdown };
  assert.equal(assessPatchReward({ ...base, observedAt: at(10) }).disposition, "aging");
  assert.equal(assessPatchReward({ ...base, observedAt: at(10) }).submitAfter, at(30));
  assert.equal(assessPatchReward({ ...base, observedAt: at(40) }).disposition, "claim-ready");
  assert.equal(assessPatchReward({ ...base, observedAt: at(400) }).disposition, "expired");
  assert.equal(assessPatchReward({ ...base, observedAt: at(40), revertedAt: at(35) }).disposition, "ineligible");
  assert.equal(assessPatchReward({ ...base, observedAt: at(40), securityRationale: "" }).disposition, "needs-security-rationale");
  assert.equal(assessPatchReward({ ...base, repository: "acme/widgets", observedAt: at(40) }).disposition, "not-tier1");
});

test("won outcomes that record their merge are assessed; others are not", () => {
  const outcomes = [
    new Outcome({ repository: "google/gvisor", issueNumber: 1, status: "won", mergedAt: at(0), securityRationale: "fixes a race" }),
    new Outcome({ repository: "google/gvisor", issueNumber: 2, status: "won" }),
    new Outcome({ repository: "google/gvisor", issueNumber: 3, status: "lost", mergedAt: at(0) }),
  ];
  assert.deepEqual(patchRewardsFromOutcomes(outcomes, { scopeMarkdown, observedAt: at(45) }).map((assay) => assay.disposition), ["claim-ready"]);
});
