import assert from "node:assert/strict";
import test from "node:test";

import { proposeBaseCbBtcDeleverage } from "../src/base-cbbtc-deleverage-proposal.mjs";

const TARGET = "urn:ame:wallet:target";
const FUNDING = "urn:ame:wallet:funding";
const TARGET_ADDRESS = "0x224C08A8526751887a83e2711B167f890c6D078d";
const FUNDING_ADDRESS = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const provenance = {
  chain: "base", chainId: 8453, caip2: "eip155:8453", blockNumber: "123", blockTag: "0x7b",
  blockHash: `0x${"ab".repeat(32)}`, provider: "https://mainnet.base.org",
};

function disclosure() {
  return {
    id: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    type: "TreasuryPortfolioDisclosure",
    moonwellRisk: [{
      subject: TARGET,
      account: `eip155:8453:${TARGET_ADDRESS.toLowerCase()}`,
      status: "observed",
      targetHealthFactor: { mantissa: "1500000000000000000", decimal: "1.5" },
      cbBtcRepayment: { known: true, exactMinimumSats: "1000" },
    }],
    portfolio: {
      chains: [{
        caip2: "eip155:8453", checked: true, provenance,
        wallets: [{
          subject: FUNDING, address: FUNDING_ADDRESS, checked: true,
          native: { checked: true, symbol: "ETH", raw: "10000" },
        }],
      }],
    },
  };
}

function quote(overrides = {}) {
  return {
    source: "https://quote.example/evidence/123",
    evidenceId: "quote-123",
    observedAt: "2026-09-01T22:30:00.000Z",
    expiresAt: "2026-09-01T22:35:00.000Z",
    spendWei: "8000",
    networkFeeWei: "1000",
    expectedCbBtcSats: "600",
    ...overrides,
  };
}

test("builds a bounded partial-repair card from observed health and caller quote evidence", () => {
  const proposal = proposeBaseCbBtcDeleverage({
    disclosure: disclosure(),
    targetSubject: TARGET,
    fundingSubject: FUNDING,
    quote: quote(),
    proposedAt: "2026-09-01T22:31:00.000Z",
  });

  assert.equal(proposal.target.exactMinimumRepaymentSats, "1000");
  assert.equal(proposal.funding.observedAvailableWei, "10000");
  assert.equal(proposal.remedy.proposedRepaymentSats, "600");
  assert.equal(proposal.remedy.partialRepair, true);
  assert.equal(proposal.remedy.remainingGapSats, "400");
  assert.equal(proposal.guard.maximumFundingDebitWei, "9000");
  assert.equal(proposal.guard.newLeverageAdmitted, false);
  assert.equal(proposal.guard.humanApprovalRequired, true);
  assert.equal(proposal.guard.transactionConstruction, false);
  assert.equal(proposal.guard.signing, false);
  assert.equal(proposal.guard.broadcast, false);
  assert.equal(proposal.provenance.blockHash, provenance.blockHash);
  assert.equal(proposal.steps.length, 2);

  const serialized = JSON.stringify(proposal);
  assert.doesNotMatch(serialized, /mnemonic|private.?key|seed.?phrase|calldata|signature|raw.?transaction/iu);
});

test("caps repayment at the observed requirement and reports quote excess", () => {
  const proposal = proposeBaseCbBtcDeleverage({
    disclosure: disclosure(), targetSubject: TARGET, fundingSubject: FUNDING,
    quote: quote({ expectedCbBtcSats: "1200" }), proposedAt: "2026-09-01T22:31:00.000Z",
  });
  assert.equal(proposal.remedy.proposedRepaymentSats, "1000");
  assert.equal(proposal.remedy.partialRepair, false);
  assert.equal(proposal.remedy.remainingGapSats, "0");
  assert.equal(proposal.remedy.excessCbBtcSats, "200");
});

test("refuses stale, unaffordable, or observation-unsupported proposals", () => {
  assert.throws(() => proposeBaseCbBtcDeleverage({
    disclosure: disclosure(), targetSubject: TARGET, fundingSubject: FUNDING,
    quote: quote(), proposedAt: "2026-09-01T22:36:00.000Z",
  }), /expired/);
  assert.throws(() => proposeBaseCbBtcDeleverage({
    disclosure: disclosure(), targetSubject: TARGET, fundingSubject: FUNDING,
    quote: quote({ spendWei: "10000" }), proposedAt: "2026-09-01T22:31:00.000Z",
  }), /exceeds observed funding Base ETH/);
  const unknown = disclosure();
  unknown.moonwellRisk[0] = { subject: TARGET, status: "unknown" };
  assert.throws(() => proposeBaseCbBtcDeleverage({
    disclosure: unknown, targetSubject: TARGET, fundingSubject: FUNDING,
    quote: quote(), proposedAt: "2026-09-01T22:31:00.000Z",
  }), /not known/);
});
