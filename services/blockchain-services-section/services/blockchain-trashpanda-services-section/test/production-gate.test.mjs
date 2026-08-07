import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { requireCoinbaseProductionGate } from "../src/production-gate.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "trashpanda-coinbase-gate-"));
  const paths = Object.fromEntries(["terminal", "rectification", "pricing", "distributionContract"].map((name) => [name, join(root, name)]));
  writeFileSync(paths.terminal, JSON.stringify({ type: "BlockchainTrashpandaVirtualsPilotTerminalEvidence", outcome: "completed", jobCount: 1, serviceOnly: true, recoveryWalletUsed: false, priceUsdc: "0.01" }));
  writeFileSync(paths.rectification, JSON.stringify({ type: "BlockchainTrashpandaMarketPricingRectification", pilotDemandExcludedFromPricing: true, timing: { productionPublication: "after the previously authorized one-job pilot reaches a terminal state" } }));
  writeFileSync(paths.pricing, JSON.stringify({ type: "TrashpandaServicesCurrentMarketPricingEvidence", pricingPrinciple: "Current comparable market prices and attributable delivery costs determine production price; pilot conversion does not.", admittedPrices: { coinbaseDirectUsdc: "0.03", coinbaseMarketActionUsdc: "0.04" } }));
  writeFileSync(paths.distributionContract, '(map ("boundaryEnterprise" "urn:ame:trashpanda-services") ("brand" "Trashpanda Services") ("refusal" "YANAGI payment gates"))');
  return paths;
}

test("admits exact market-priced Coinbase production only after a terminal operational pilot", () => {
  const admission = requireCoinbaseProductionGate(fixture());
  assert.deepEqual(admission.prices, { preSignUsdc: "0.03", marketActionUsdc: "0.04" });
  assert.equal(admission.pilotDemandUsedForPricing, false);
  assert.equal(admission.brand, "Trashpanda Services");
});

test("refuses before the pilot terminal record exists", () => {
  const paths = fixture();
  paths.terminal = join(tmpdir(), "absent-trashpanda-pilot-terminal.json");
  assert.throws(() => requireCoinbaseProductionGate(paths), /terminal evidence is absent/u);
});

test("refuses pilot-derived, penny, or incomplete pricing admission", () => {
  const paths = fixture();
  writeFileSync(paths.rectification, JSON.stringify({ type: "BlockchainTrashpandaMarketPricingRectification", pilotDemandExcludedFromPricing: false, timing: { productionPublication: "after the previously authorized one-job pilot reaches a terminal state" } }));
  assert.throws(() => requireCoinbaseProductionGate(paths), /price inferred from pilot conversion/u);
  writeFileSync(paths.rectification, JSON.stringify({ type: "BlockchainTrashpandaMarketPricingRectification", pilotDemandExcludedFromPricing: true, timing: { productionPublication: "after the previously authorized one-job pilot reaches a terminal state" } }));
  writeFileSync(paths.pricing, JSON.stringify({ type: "TrashpandaServicesCurrentMarketPricingEvidence", pricingPrinciple: "Current comparable market prices and attributable delivery costs determine production price; pilot conversion does not.", admittedPrices: { coinbaseDirectUsdc: "0.01", coinbaseMarketActionUsdc: "0.04" } }));
  assert.throws(() => requireCoinbaseProductionGate(paths), /current-market admission/u);
});

test("refuses recovery-wallet use and a non-Trashpanda public contract", () => {
  const paths = fixture();
  writeFileSync(paths.terminal, JSON.stringify({ type: "BlockchainTrashpandaVirtualsPilotTerminalEvidence", outcome: "completed", jobCount: 1, serviceOnly: true, recoveryWalletUsed: true, priceUsdc: "0.01" }));
  assert.throws(() => requireCoinbaseProductionGate(paths), /nonconforming/u);
  const clean = fixture();
  writeFileSync(clean.distributionContract, '(map ("brand" "Yanagi"))');
  assert.throws(() => requireCoinbaseProductionGate(clean), /distribution contract/u);
});
