import assert from "node:assert/strict";
import test from "node:test";

import { assayNonfungiblePositionExposure }
  from "../src/nonfungible-position-exposure-assay.mjs";

const BLOCK = "48961620";
const TIME = "1784712380";
const WALLET = "YANAGI";

function instrument(contract, id) {
  return `eip155:8453/erc721:${contract}/${id}`;
}

function amount(asset, value) {
  return { asset: `eip155:8453/erc20:${asset}`, amount: value };
}

function position(positionId, protocol, contract, id, overrides = {}) {
  return {
    positionId,
    wallet: WALLET,
    protocol,
    instrument: instrument(contract, id),
    chain: { caip2: "eip155:8453", snapshotBlock: BLOCK, snapshotTimestamp: TIME },
    evidence: {
      trustedContract: true,
      contractProvenanceComplete: true,
      accountStateComplete: true,
      recoverableStateComplete: true,
      liabilityStateComplete: true,
      ...overrides.evidence,
    },
    state: {
      activePosition: false,
      canLiquidate: false,
      recoverableAssets: [],
      liabilities: [],
      ...overrides.state,
    },
    sourceUrls: overrides.sourceUrls ?? ["https://base.blockscout.com/"],
  };
}

function fixture() {
  return {
    profile: "org.emsenn.agrodao.nonfungible-position-exposure-assay.v1",
    authority: { fixedBlockEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    positions: [
      position("yanagi-gammaswap-loan-1", "GammaSwap", "0x7135a4D1b8c81c95fE3C7dC6f4f3F5E4A6D8B201", "1"),
      position("yanagi-synthetix-account", "Synthetix Perps", "0xcb68A1158A7A8Aecb9D1aD2F77eF5f11A8C46A31", "170141183460469231731687303715884109776"),
      position("yanagi-uniswap-v3-brain", "Uniswap v3", "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1", "2823401", {
        state: { activePosition: true, recoverableAssets: [
          amount("0x4200000000000000000000000000000000000006", "758562835356"),
          amount("0x4A24B101728e07A52053c13FB4dB2BcF490CAbc3", "232820090814957975727"),
        ] },
      }),
      position("yanagi-live-margin-account", "Example Perps", "0x1111111111111111111111111111111111111111", "9", {
        state: { activePosition: true, canLiquidate: true,
          liabilities: [amount("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "1000000")] },
      }),
      position("yanagi-untrusted-voucher", "untrusted", "0x2222222222222222222222222222222222222222", "7", {
        evidence: { trustedContract: false, contractProvenanceComplete: false,
          accountStateComplete: false, recoverableStateComplete: false, liabilityStateComplete: false },
      }),
      position("yanagi-incomplete-position", "Unknown Position", "0x3333333333333333333333333333333333333333", "4", {
        evidence: { liabilityStateComplete: false }, state: { activePosition: true },
      }),
    ],
  };
}

test("classifies empty shells, recovery, liabilities, untrusted, and incomplete positions", () => {
  const result = assayNonfungiblePositionExposure(fixture());
  const dispositions = Object.fromEntries(result.positions.map(({ positionId, disposition }) => [positionId, disposition]));
  assert.equal(dispositions["yanagi-gammaswap-loan-1"], "inert-empty");
  assert.equal(dispositions["yanagi-synthetix-account"], "inert-empty");
  assert.equal(dispositions["yanagi-uniswap-v3-brain"], "recoverable-principal");
  assert.equal(dispositions["yanagi-live-margin-account"], "live-liability");
  assert.equal(dispositions["yanagi-untrusted-voucher"], "ignore-untrusted");
  assert.equal(dispositions["yanagi-incomplete-position"], "further-assay");
  assert.equal(result.gate.executionAdmitted, false);
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("gives liability precedence over recoverable principal", () => {
  const input = fixture();
  input.positions = [position("mixed-position", "Mixed Protocol", "0x4444444444444444444444444444444444444444", "1", {
    state: { activePosition: true,
      recoverableAssets: [amount("0x4200000000000000000000000000000000000006", "1")],
      liabilities: [amount("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "1")] },
  })];
  assert.equal(assayNonfungiblePositionExposure(input).positions[0].disposition, "live-liability");
});

test("refuses active zero-state positions instead of declaring them empty", () => {
  const input = fixture();
  input.positions = [position("active-zero", "Unknown Position", "0x5555555555555555555555555555555555555555", "1", {
    state: { activePosition: true },
  })];
  assert.equal(assayNonfungiblePositionExposure(input).positions[0].disposition, "further-assay");
});

test("identity is deterministic across position object key order", () => {
  const first = fixture();
  const second = fixture();
  second.positions = second.positions.map((entry) => Object.fromEntries(Object.entries(entry).reverse()));
  assert.equal(assayNonfungiblePositionExposure(first).id, assayNonfungiblePositionExposure(second).id);
});

test("refuses duplicate instruments, numeric quantities, transaction material, and live authority", () => {
  const duplicate = fixture(); duplicate.positions[1].instrument = duplicate.positions[0].instrument;
  assert.throws(() => assayNonfungiblePositionExposure(duplicate), /instruments must be unique/u);
  const numeric = fixture(); numeric.positions[0].chain.snapshotBlock = 48961620;
  assert.throws(() => assayNonfungiblePositionExposure(numeric), /decimal string/u);
  const transaction = fixture(); transaction.positions[0].calldata = "0xdeadbeef";
  assert.throws(() => assayNonfungiblePositionExposure(transaction), /transaction or secret material/u);
  const live = fixture(); live.authority.broadcast = true;
  assert.throws(() => assayNonfungiblePositionExposure(live), /no live mutation/u);
});
