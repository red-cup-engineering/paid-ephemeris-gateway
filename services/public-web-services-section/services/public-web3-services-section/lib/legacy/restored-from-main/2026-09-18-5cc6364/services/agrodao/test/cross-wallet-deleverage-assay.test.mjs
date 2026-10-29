import assert from "node:assert/strict";
import test from "node:test";

import { assayCrossWalletDeleverage, EXPECTED_DELEVERAGE_STEPS, recordCrossWalletDeleverageAssay }
  from "../src/cross-wallet-deleverage-assay.mjs";

const gasUsed = ["187778", "266557", "69270", "227441", "36749", "166409", "48514", "42828", "251481"];

function fixture() {
  return {
    profile: "org.emsenn.agrodao.cross-wallet-deleverage-assay.v1",
    chain: { caip2: "eip155:8453", snapshotBlock: "48959712", snapshotTimestamp: "1784709265" },
    authority: { forkSimulationOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    route: {
      receipts: EXPECTED_DELEVERAGE_STEPS.map((label, index) => ({ label, status: "success", gasUsed: gasUsed[index] })),
      totalGasUsed: "1297027",
      repayErrorCode: "0",
      lpWithdrawn: "4972013193",
      vaultPricePerFullShareWad: "1074021824950192426",
      tbtcLpBurnReceivedRaw: "530911211664675",
      cbBtcLpBurnReceivedSats: "46369",
      tbtcAfterLpBurnRaw: "531082920596854",
      cbBtcAfterLpBurnSats: "46376",
      cbBtcSwapQuotedSats: "53048",
      cbBtcSwapReceivedSats: "53048",
      tbtcRawPerSat: "10000000000",
      transferSats: "64000",
      repaymentSats: "64000",
    },
    sourceBefore: { vaultShares: "4030254124", stakedVaultShares: "599086806",
      looseTbtcRaw: "171708932179", looseCbBtcSats: "7" },
    sourceAfter: { rewardPoolShares: "0", vaultShares: "0", lpShares: "0", tbtcRaw: "0", cbBtcSats: "35424" },
    targetBefore: { looseCbBtcSats: "3", cbBtcDebtSats: "273463" },
    targetAfter: { looseCbBtcSats: "3", cbBtcDebtSats: "209463", cbBtcAllowanceSats: "0" },
    health: {
      targetWad: "1250000000000000000",
      beforeCurrentWad: "1059661600781364520",
      afterCurrentWad: "1383337944274934121",
      afterScenarios: [
        { name: "lbtc-collateral-haircut-10-percent", healthFactorWad: "1253427230688309429" },
        { name: "lbtc-down-5-cbbtc-up-2-percent", healthFactorWad: "1292531948523357094" },
        { name: "cbbtc-interest-30-days", healthFactorWad: "1382176578888662292" },
      ],
    },
    economics: {
      gasPriceWei: "6000000",
      ethPriceMantissa: "1911000000000000000000",
      ethPriceScale: "1000000000000000000",
      btcPriceMantissa: "659743074000000000000000000000000",
      btcPriceScale: "10000000000000000000000000000",
      beefyApyWad: "10656381998426223",
      cbBtcBorrowRatePerSecondWad: "323366464",
      secondsPerYear: "31536000",
      maximumAllInDragBps: "25",
      minimumRemainingLiquidSats: "30000",
    },
    review: { taxLegalStatus: "not-performed", livePreflightCompleted: false, liveSignerAvailable: false },
    disclosures: {
      rewardProgramsExpired: true,
      sourceUrls: [
        "https://docs.beefy.finance/developer-documentation/vault-contract",
        "https://api.beefy.finance/apy/breakdown",
        "https://support.moonwell.fi/en/articles/15426169-credit-limits-and-liquidations",
      ],
    },
  };
}

function assertNoNumericValues(value) {
  assert.notEqual(typeof value, "number");
  assert.notEqual(typeof value, "bigint");
  if (Array.isArray(value)) value.forEach(assertNoNumericValues);
  else if (value != null && typeof value === "object") Object.values(value).forEach(assertNoNumericValues);
}

test("fixed Base fork is an economic candidate but never an execution admission", () => {
  const result = assayCrossWalletDeleverage(fixture());
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.equal(result.capital.grossExitSats, "99484");
  assert.equal(result.capital.postSwapLiquidSats, "99424");
  assert.equal(result.capital.repaymentSats, "64000");
  assert.equal(result.capital.remainingLiquidSats, "35424");
  assert.equal(result.executionEconomics.conversionLossSats, "60");
  assert.equal(result.executionEconomics.gasSatsCeil, "23");
  assert.equal(result.executionEconomics.allInDragSats, "83");
  assert.equal(result.executionEconomics.allInDragBpsCeil, "9");
  assert.equal(result.annualSimpleCarry.beefyYieldForegoneSatsFloor, "1059");
  assert.equal(result.annualSimpleCarry.debtInterestSavedSatsFloor, "652");
  assert.equal(result.annualSimpleCarry.changeBeforeRedeploymentSats, "-407");
  assert.equal(result.health.allDeclaredScenariosAdmit, true);
  assert.equal(result.gate.economicCandidate, true);
  assert.equal(result.gate.executionAdmitted, false);
  assert.equal(result.gate.transactionAssembly, false);
  assert.equal(result.gate.signing, false);
  assert.equal(result.gate.broadcast, false);
  assertNoNumericValues(result);
});

test("fresh full-output repayment may deliberately leave no source-wallet cbBTC reserve", () => {
  const input = fixture();
  input.chain = { caip2: "eip155:8453", snapshotBlock: "48963088", snapshotTimestamp: "1784715523" };
  const freshGas = ["187778", "266557", "69270", "227441", "36749", "166409", "43738", "42852", "251505"];
  input.route.receipts = EXPECTED_DELEVERAGE_STEPS.map((label, index) => ({ label, status: "success", gasUsed: freshGas[index] }));
  input.route.totalGasUsed = "1292299";
  input.route.transferSats = "99424";
  input.route.repaymentSats = "99424";
  input.sourceAfter.cbBtcSats = "0";
  input.targetBefore.cbBtcDebtSats = "273464";
  input.targetAfter.cbBtcDebtSats = "174040";
  input.health = {
    targetWad: "1500000000000000000",
    beforeCurrentWad: "1059729472386544000",
    afterCurrentWad: "1665122157990465000",
    afterScenarios: [
      { name: "lbtc-collateral-haircut-10-percent", healthFactorWad: "1508770239230175000" },
      { name: "lbtc-down-5-cbbtc-up-2-percent", healthFactorWad: "1555829606498093000" },
      { name: "cbbtc-interest-30-days", healthFactorWad: "1663741621731393000" },
    ],
  };
  input.economics = {
    ...input.economics,
    gasPriceWei: "5000000",
    ethPriceMantissa: "1922391397390000000000",
    btcPriceMantissa: "659026314251700000000000000000000",
    beefyApyWad: "10612493611373397",
    cbBtcBorrowRatePerSecondWad: "320130416",
    minimumRemainingLiquidSats: "0",
  };

  const result = assayCrossWalletDeleverage(input);
  assert.equal(result.capital.repaymentSats, "99424");
  assert.equal(result.capital.remainingLiquidSats, "0");
  assert.equal(result.capital.debtAfterSats, "174040");
  assert.equal(result.executionEconomics.gasSatsCeil, "19");
  assert.equal(result.executionEconomics.allInDragSats, "79");
  assert.equal(result.executionEconomics.allInDragBpsCeil, "8");
  assert.equal(result.annualSimpleCarry.beefyYieldForegoneSatsFloor, "1055");
  assert.equal(result.annualSimpleCarry.debtInterestSavedSatsFloor, "1003");
  assert.equal(result.annualSimpleCarry.changeBeforeRedeploymentSats, "-52");
  assert.equal(result.health.allDeclaredScenariosAdmit, true);
  assert.equal(result.gate.economicCandidate, true);
  assert.equal(result.gate.executionAdmitted, false);
});

test("result identity is deterministic across input object key order", () => {
  const input = fixture();
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.equal(assayCrossWalletDeleverage(input).id, assayCrossWalletDeleverage(reordered).id);
});

test("refuses live mutation, transaction assembly, signing, and broadcast flags", () => {
  for (const field of ["liveMutation", "transactionAssembly", "signing", "broadcast"]) {
    const input = fixture(); input.authority[field] = true;
    assert.throws(() => assayCrossWalletDeleverage(input), /credential-free, non-signing, non-broadcast/u);
  }
});

test("refuses missing, failed, or reordered fork receipts", () => {
  const missing = fixture(); missing.route.receipts.pop();
  assert.throws(() => assayCrossWalletDeleverage(missing), /exactly 9 receipts/u);
  const failed = fixture(); failed.route.receipts[2].status = "failed";
  assert.throws(() => assayCrossWalletDeleverage(failed), /did not succeed/u);
  const reordered = fixture(); [reordered.route.receipts[0], reordered.route.receipts[1]]
    = [reordered.route.receipts[1], reordered.route.receipts[0]];
  assert.throws(() => assayCrossWalletDeleverage(reordered), /out of order/u);
});

test("refuses receipt gas, debt delta, and repayment funding mismatches", () => {
  const gas = fixture(); gas.route.totalGasUsed = "1297026";
  assert.throws(() => assayCrossWalletDeleverage(gas), /receipt gas sum/u);
  const debt = fixture(); debt.targetAfter.cbBtcDebtSats = "209464";
  assert.throws(() => assayCrossWalletDeleverage(debt), /debt delta/u);
  const funding = fixture(); funding.route.transferSats = "100000"; funding.route.repaymentSats = "100000";
  funding.targetAfter.cbBtcDebtSats = "173463";
  assert.throws(() => assayCrossWalletDeleverage(funding), /cannot fund/u);
});

test("refuses broken vault-share and LP-burn conservation", () => {
  const shares = fixture(); shares.route.lpWithdrawn = "4972013192";
  assert.throws(() => assayCrossWalletDeleverage(shares), /combined vault shares/u);
  const burn = fixture(); burn.route.tbtcLpBurnReceivedRaw = "530911211664674";
  assert.throws(() => assayCrossWalletDeleverage(burn), /LP burn receipts/u);
});

test("refuses any declared health scenario below the target", () => {
  const input = fixture(); input.health.afterScenarios[0].healthFactorWad = "1249999999999999999";
  assert.throws(() => assayCrossWalletDeleverage(input), /health factor is below target/u);
});

test("uses a conservative ceiling for gas and all-in drag basis points", () => {
  const result = assayCrossWalletDeleverage(fixture());
  assert.equal(result.executionEconomics.gasSatsCeil, "23");
  assert.equal(result.executionEconomics.allInDragBpsCeil, "9");
});

test("refuses floating point and transaction material", () => {
  const numeric = fixture(); numeric.economics.gasPriceWei = 6000000;
  assert.throws(() => assayCrossWalletDeleverage(numeric), /decimal string/u);
  const transaction = fixture(); transaction.calldata = "0xdeadbeef";
  assert.throws(() => assayCrossWalletDeleverage(transaction), /transaction or secret material/u);
});

test("records accepted evidence only through AGRODAO's settlement-store boundary", async () => {
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return { digest: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }; } };
  const recorded = await recordCrossWalletDeleverageAssay(fixture(), { recordedAt: "2026-07-22T10:45:00.000Z", store });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.cross-wallet-deleverage-assay");
  assert.equal(writes[0].record.assay.id, recorded.result.id);
  assert.equal(writes[0].record.decisionBoundary.executionAdmitted, false);
  assert.equal(writes[0].record.decisionBoundary.signing, false);
  await assert.rejects(() => recordCrossWalletDeleverageAssay(fixture(), { recordedAt: "not-a-time", store }), /ISO timestamp/u);
  await assert.rejects(() => recordCrossWalletDeleverageAssay(fixture(), {
    recordedAt: "2026-07-22T10:45:00.000Z", store: { ...store, actor: "urn:ame:not-agrodao" },
  }), /AGRODAO's contracted settlement store/u);
});
