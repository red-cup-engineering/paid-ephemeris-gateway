import assert from "node:assert/strict";
import test from "node:test";

import {
  admitGovernanceRightAction,
  GOVERNANCE_RIGHT_ACTION_ADMISSION_PROFILE,
  recordGovernanceRightAction,
} from "../src/governance-right-action-admission.mjs";

function fixture() {
  return {
    profile: GOVERNANCE_RIGHT_ACTION_ADMISSION_PROFILE,
    evaluatedAt: "1784734750",
    evidence: {
      nonfungibleAssayId: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      recoveryAssayId: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      currentPreflightId: "ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      snapshot: { caip2: "eip155:42161", block: "48972555", blockHash: `0x${"ab".repeat(32)}`,
        observedAt: "1784734457", expiresAt: "1784735057" },
    },
    position: { id: "yanagi-turntide-dao-treasury", wallet: "YANAGI", kind: "governance-treasury",
      protocol: "Aragon OSx", reference: "turntide-islands-dao-native-treasury", caip2: "eip155:42161" },
    action: { kind: "recover-treasury", recoveryCandidateId: "yanagi-turntide-dao-native-treasury", deadlineAt: "0", humanSignerRequired: true },
    preflight: { positionStillOwned: true, contractProvenanceComplete: true, accountStateComplete: true, currentHeadVerified: true,
      noConflictingAction: true, legalScopeDisclosed: true, legalAcceptanceRequired: false, legalAcceptanceCompleted: true, taxRecordkeepingReady: true, proposalContentVerified: false },
    authority: { publicEvidenceOnly: true, intentOnly: true, transactionAssembly: false, signerMaterialPresent: false,
      signing: false, broadcast: false, chainMutation: false },
  };
}

function assertNoNumbers(value) {
  assert.notEqual(typeof value, "number");
  assert.notEqual(typeof value, "bigint");
  if (Array.isArray(value)) value.forEach(assertNoNumbers);
  else if (value != null && typeof value === "object") Object.values(value).forEach(assertNoNumbers);
}

test("admits a fresh and separately accounted DAO treasury recovery only for human review", () => {
  const result = admitGovernanceRightAction(fixture());
  assert.equal(result.verdict, "HUMAN_REVIEW_READY");
  assert.equal(result.position.wallet, "YANAGI");
  assert.equal(result.accounting.separateWalletBook, true);
  assert.equal(result.accounting.interWalletTransferPermitted, false);
  assert.equal(result.gate.executionAdmitted, false);
  assertNoNumbers(result);
});

test("holds a legal-release claim rather than treating it as a recoverable action", () => {
  const input = fixture();
  input.position = { ...input.position, id: "yanagi-gmx-glp-distribution", kind: "reward-claim", protocol: "GMX", reference: "gmx-glp-legal-release", caip2: "eip155:42161" };
  input.action = { kind: "claim-reward", recoveryCandidateId: "yanagi-gmx-glp-distribution", deadlineAt: "0", humanSignerRequired: true };
  input.preflight.legalAcceptanceRequired = true;
  input.preflight.legalAcceptanceCompleted = false;
  const result = admitGovernanceRightAction(input);
  assert.equal(result.verdict, "LEGAL_HOLD");
  assert.deepEqual(result.gate.reasons, ["legal-acceptance-not-complete"]);
});

test("requires a refresh at the exact evidence expiry and for missing recovery bindings", () => {
  const expiry = fixture(); expiry.evaluatedAt = expiry.evidence.snapshot.expiresAt;
  assert.equal(admitGovernanceRightAction(expiry).verdict, "REFRESH_REQUIRED");
  const missing = fixture(); missing.evidence.currentPreflightId = "";
  const result = admitGovernanceRightAction(missing);
  assert.equal(result.verdict, "REFRESH_REQUIRED");
  assert.match(result.gate.reasons.join(" "), /recovery-evidence-unbound/u);
});

test("refuses conflicts and expired deadlines, and keeps voluntary decline distinct", () => {
  const conflict = fixture(); conflict.preflight.noConflictingAction = false;
  assert.equal(admitGovernanceRightAction(conflict).verdict, "REFUSE");
  const deadline = fixture(); deadline.action.deadlineAt = "1784734750";
  assert.equal(admitGovernanceRightAction(deadline).verdict, "REFUSE");
  const decline = fixture(); decline.action = { kind: "decline", recoveryCandidateId: "", deadlineAt: "0", humanSignerRequired: true };
  assert.equal(admitGovernanceRightAction(decline).verdict, "DECLINED");
});

test("preserving a right does not invent a legal-acceptance requirement", () => {
  const input = fixture();
  input.action = { kind: "preserve-right", recoveryCandidateId: "", deadlineAt: "0", humanSignerRequired: true };
  input.preflight.legalAcceptanceCompleted = false;
  assert.equal(admitGovernanceRightAction(input).verdict, "HUMAN_REVIEW_READY");
});

test("requires verified proposal content for vote review and rejects incompatible or secret material", () => {
  const vote = fixture();
  vote.position = { ...vote.position, id: "yanagi-governance-vote", kind: "governance-vote", reference: "proposal-42", caip2: "eip155:42161" };
  vote.action = { kind: "review-governance-vote", recoveryCandidateId: "", deadlineAt: "1784735056", humanSignerRequired: true };
  vote.evidence.recoveryAssayId = ""; vote.evidence.currentPreflightId = "";
  assert.equal(admitGovernanceRightAction(vote).verdict, "REFRESH_REQUIRED");
  vote.preflight.proposalContentVerified = true;
  assert.equal(admitGovernanceRightAction(vote).verdict, "HUMAN_REVIEW_READY");
  const incompatible = fixture(); incompatible.action.kind = "review-governance-vote";
  assert.throws(() => admitGovernanceRightAction(incompatible), /incompatible/u);
  const numeric = fixture(); numeric.action.deadlineAt = 0;
  assert.throws(() => admitGovernanceRightAction(numeric), /decimal text/u);
  const secret = fixture(); secret.privateKey = "not-a-key";
  assert.throws(() => admitGovernanceRightAction(secret), /secret or transaction material/u);
  const transaction = fixture(); transaction.action.transactionRequest = {};
  assert.throws(() => admitGovernanceRightAction(transaction), /secret or transaction material/u);
  const authority = fixture(); authority.authority.broadcast = true;
  assert.throws(() => admitGovernanceRightAction(authority), /no transaction or custody authority/u);
});

test("is deterministic and records only through AGRODAO's settlement boundary", async () => {
  const first = fixture();
  const reordered = Object.fromEntries(Object.entries(first).reverse());
  assert.equal(admitGovernanceRightAction(first).id, admitGovernanceRightAction(reordered).id);
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return { digest: "ni:///sha-256;DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD" }; } };
  const recorded = await recordGovernanceRightAction(fixture(), { recordedAt: "2026-07-22T16:00:00.000Z", store });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.governance-right-action-admission");
  assert.equal(writes[0].record.decision.id, recorded.result.id);
  await assert.rejects(() => recordGovernanceRightAction(fixture(), { recordedAt: "2026-07-22T16:00:00.000Z", store: { ...store, actor: "urn:ame:other" } }), /AGRODAO's contracted/u);
});
