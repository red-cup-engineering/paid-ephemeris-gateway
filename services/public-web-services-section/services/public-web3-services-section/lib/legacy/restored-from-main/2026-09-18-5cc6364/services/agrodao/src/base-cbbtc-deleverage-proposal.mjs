const PROFILE = "org.emsenn.agrodao.base-cbbtc-deleverage-proposal.v1";
const BASE_CAIP2 = "eip155:8453";

function uint(name, value) {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new TypeError(`${name} must be an unsigned decimal integer string`);
  }
  return BigInt(value);
}

function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO date-time`);
  }
  return value;
}

function publicEvidence(quote) {
  if (quote === null || typeof quote !== "object" || Array.isArray(quote)) {
    throw new TypeError("quote must be caller-supplied evidence");
  }
  if (typeof quote.source !== "string" || quote.source.length === 0
      || typeof quote.evidenceId !== "string" || quote.evidenceId.length === 0) {
    throw new TypeError("quote requires public source and evidenceId");
  }
  const observedAt = iso("quote.observedAt", quote.observedAt);
  const expiresAt = iso("quote.expiresAt", quote.expiresAt);
  if (Date.parse(expiresAt) <= Date.parse(observedAt)) throw new RangeError("quote must expire after it was observed");
  const spendWei = uint("quote.spendWei", quote.spendWei);
  const networkFeeWei = uint("quote.networkFeeWei", quote.networkFeeWei);
  const expectedCbBtcSats = uint("quote.expectedCbBtcSats", quote.expectedCbBtcSats);
  if (spendWei === 0n || expectedCbBtcSats === 0n) throw new RangeError("quote spend and cbBTC receipt must be positive");
  return { source: quote.source, evidenceId: quote.evidenceId, observedAt, expiresAt,
    spendWei, networkFeeWei, expectedCbBtcSats };
}

function subjectWallet(disclosure, subject) {
  const base = disclosure.portfolio?.chains?.find(({ caip2 }) => caip2 === BASE_CAIP2);
  const wallet = base?.wallets?.find((candidate) => candidate.subject === subject);
  if (base?.checked !== true || wallet?.checked !== true) {
    throw new Error(`no checked Base portfolio observation for ${subject}`);
  }
  return { base, wallet };
}

/**
 * Turn observed health plus independently supplied quote/cost evidence into a bounded human
 * proposal. The result contains quantities and intent only: never calldata, signatures, RPC
 * instructions, allowances, routes, or broadcast material.
 */
export function proposeBaseCbBtcDeleverage({
  disclosure,
  targetSubject,
  fundingSubject,
  quote,
  proposedAt,
} = {}) {
  if (disclosure?.type !== "TreasuryPortfolioDisclosure") {
    throw new TypeError("a TreasuryPortfolioDisclosure is required");
  }
  if (typeof targetSubject !== "string" || typeof fundingSubject !== "string"
      || targetSubject === fundingSubject) {
    throw new TypeError("distinct public targetSubject and fundingSubject values are required");
  }
  iso("proposedAt", proposedAt);
  const evidence = publicEvidence(quote);
  if (Date.parse(proposedAt) > Date.parse(evidence.expiresAt)) throw new RangeError("quote expired before proposal time");
  const risk = disclosure.moonwellRisk?.find(({ subject }) => subject === targetSubject);
  if (risk?.status !== "observed" || risk.cbBtcRepayment?.known !== true) {
    throw new Error("target cbBTC repayment requirement is not known from checked Moonwell health");
  }
  const requiredSats = uint("risk exactMinimumSats", risk.cbBtcRepayment.exactMinimumSats);
  const { base, wallet: fundingWallet } = subjectWallet(disclosure, fundingSubject);
  if (fundingWallet.native?.checked !== true) throw new Error("funding account Base ETH balance is unknown");
  const availableWei = uint("funding Base ETH raw balance", fundingWallet.native.raw);
  const totalDebitWei = evidence.spendWei + evidence.networkFeeWei;
  if (totalDebitWei > availableWei) throw new RangeError("quoted spend plus network cost exceeds observed funding Base ETH");
  const proposedRepaymentSats = evidence.expectedCbBtcSats < requiredSats
    ? evidence.expectedCbBtcSats : requiredSats;
  const remainingGapSats = requiredSats - proposedRepaymentSats;
  const excessCbBtcSats = evidence.expectedCbBtcSats - proposedRepaymentSats;

  return Object.freeze({
    profile: PROFILE,
    kind: "CrossWalletCbBtcDeleverageProposal",
    proposedAt,
    disclosureId: disclosure.id,
    provenance: base.provenance,
    target: {
      subject: targetSubject,
      account: risk.account,
      targetHealthFactor: risk.targetHealthFactor,
      exactMinimumRepaymentSats: requiredSats.toString(),
    },
    funding: {
      subject: fundingSubject,
      account: `${BASE_CAIP2}:${fundingWallet.address.toLowerCase()}`,
      observedAvailableWei: availableWei.toString(),
    },
    quoteEvidence: {
      source: evidence.source,
      evidenceId: evidence.evidenceId,
      observedAt: evidence.observedAt,
      expiresAt: evidence.expiresAt,
      spendWei: evidence.spendWei.toString(),
      networkFeeWei: evidence.networkFeeWei.toString(),
      expectedCbBtcSats: evidence.expectedCbBtcSats.toString(),
    },
    remedy: {
      proposedRepaymentSats: proposedRepaymentSats.toString(),
      partialRepair: remainingGapSats > 0n,
      remainingGapSats: remainingGapSats.toString(),
      excessCbBtcSats: excessCbBtcSats.toString(),
    },
    guard: {
      newLeverageAdmitted: false,
      maximumFundingDebitWei: totalDebitWei.toString(),
      humanApprovalRequired: true,
      transactionConstruction: false,
      signing: false,
      broadcast: false,
    },
    steps: [
      { kind: "acquire-cbbtc-with-base-eth", fromSubject: fundingSubject,
        maximumSpendWei: evidence.spendWei.toString(), expectedReceiveSats: evidence.expectedCbBtcSats.toString() },
      { kind: "repay-moonwell-cbbtc", forSubject: targetSubject, maximumRepaymentSats: proposedRepaymentSats.toString() },
    ],
  });
}

export const BASE_CBBTC_DELEVERAGE_PROPOSAL_PROFILE = PROFILE;
