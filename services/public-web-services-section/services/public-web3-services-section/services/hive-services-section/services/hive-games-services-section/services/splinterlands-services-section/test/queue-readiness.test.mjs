import assert from "node:assert/strict";
import test from "node:test";

import { SPLINTERLANDS_OPERATOR_POLICY, admitOneSplinterlandsQueue } from "../src/queue-readiness.mjs";

const READY = Object.freeze({
  account: "aagaard-test",
  energy: 40,
  outstandingMatches: 0,
  collectionReady: true,
  coverageReady: true,
  alreadyAttempted: 0,
});

test("admission requires the exact account, energy floor, and clean queue budget", () => {
  const admission = admitOneSplinterlandsQueue(READY);
  assert.equal(admission.kind, "queue-one");
  assert.equal(admitOneSplinterlandsQueue({ ...READY, account: "!invalid" }).kind, "refuse");
  assert.match(admitOneSplinterlandsQueue({ ...READY, energy: 39 }).reason, /energy is below/);
  assert.match(admitOneSplinterlandsQueue({ ...READY, outstandingMatches: 1 }).reason, /outstanding/);
  assert.match(admitOneSplinterlandsQueue({ ...READY, collectionReady: false }).reason, /no owned-only Modern team core/);
  assert.match(admitOneSplinterlandsQueue({ ...READY, coverageReady: false }).reason, /does not cover every tested/);
  assert.match(admitOneSplinterlandsQueue({ ...READY, alreadyAttempted: 1 }).reason, /run budget is already spent/);
});

test("a queue-one admission is explicit that this module does not submit it", () => {
  assert.match(admitOneSplinterlandsQueue(READY).reason, /this service does not submit it/);
});

test("the policy is a conservative single-match owned-only posting-authority policy", () => {
  assert.equal(SPLINTERLANDS_OPERATOR_POLICY.maximumMatchesPerRun, 1);
  assert.equal(SPLINTERLANDS_OPERATOR_POLICY.inventory, "owned-only");
  assert.equal(SPLINTERLANDS_OPERATOR_POLICY.authority, "posting");
});
