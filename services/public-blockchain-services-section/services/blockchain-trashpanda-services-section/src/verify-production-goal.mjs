#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE_ENV = resolve(ROOT, "../../../../../../../../.env");
const read = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const present = (path) => existsSync(join(ROOT, path));
const result = (requirement, held, evidence, missing = []) => ({ requirement, held, evidence, missing });

function ownership() {
  const path = "data/evidence/2026-07-22-yanagi-recovery-custody-migration.json";
  if (!present(path)) return result("secure-ownership-boundary", false, null, [path]);
  const evidence = read(path), env = readFileSync(WORKSPACE_ENV, "utf8"), assignmentAbsent = !/^YANAGI_WALLET=/mu.test(env);
  const held = evidence.type === "YanagiRecoveryOwnershipCustodyMigrationEvidence"
    && evidence.recoveryIdentity === "eip155:8453:0x224c08a8526751887a83e2711b167f890c6d078d"
    && evidence.keystoreFormat === "ethereum-secret-storage-v3" && evidence.plaintextSourceRetired === true
    && evidence.runtimeUseAuthorized === false && evidence.mnemonicRecorded === false && evidence.privateKeyRecorded === false && assignmentAbsent;
  return result("secure-ownership-boundary", held, { record: path, recoveryIdentity: evidence.recoveryIdentity, plaintextAssignmentAbsent: assignmentAbsent }, held ? [] : [path + "#invalid"]);
}

function institution() {
  const owner = read("lib/ownership.json");
  const artifacts = ["content/charters/blockchain-trashpanda.json", "content/offices/chief-executive-officer.json", "content/governance/ceo-formation-wager.json", "content/governance/founding-mutual-selection.json", "content/books/value-ledger.json"];
  const held = artifacts.every(present) && JSON.stringify(owner.rights) === JSON.stringify(["decision", "personnel", "distribution"]) && owner.approvalFromAbove === false;
  return result("rendanheyi-sovereign-enterprise", held, { rights: owner.rights, artifacts }, held ? [] : artifacts.filter((path) => !present(path)));
}

function product() {
  const path = "data/evidence/product-conformance.json";
  if (!present(path)) return result("deterministic-pre-sign-product", false, null, [path]);
  const evidence = read(path);
  const held = evidence.type === "BlockchainTrashpandaProductConformanceEvidence" && evidence.status === "held"
    && evidence.corpus?.passed === evidence.corpus?.expected && evidence.replays?.count >= 3 && evidence.replays?.byteIdentical === true;
  return result("deterministic-pre-sign-product", held, { record: path, corpus: evidence.corpus, replays: evidence.replays }, held ? [] : [path + "#invalid"]);
}

function virtuals() {
  const terminalPath = "data/evidence/virtuals-pilot-terminal.json", salePath = "data/evidence/virtuals-production-sale.json";
  const missing = [terminalPath, salePath].filter((path) => !present(path));
  if (missing.length) return result("sell-for-usdc-through-virtuals-acp", false, { productionPriceUsdc: "0.05" }, missing);
  const terminal = read(terminalPath), sale = read(salePath);
  const held = terminal.type === "BlockchainTrashpandaVirtualsPilotTerminalEvidence" && ["completed", "rejected", "expired"].includes(terminal.outcome)
    && sale.type === "BlockchainTrashpandaVirtualsProductionSaleEvidence" && sale.priceUsdc === "0.05"
    && sale.serviceOnly === true && sale.requiredFunds === false && sale.recoveryWalletUsed === false
    && typeof sale.platformReceipt === "string" && sale.platformReceipt.length > 0;
  return result("sell-for-usdc-through-virtuals-acp", held, { terminal: terminal.outcome, sale: sale.platformReceipt ?? null }, held ? [] : [salePath + "#invalid"]);
}

function coinbase() {
  const path = "data/evidence/coinbase-production-sale.json";
  if (!present(path)) return result("sell-for-usdc-through-coinbase-x402-bazaar", false, { brand: "Trashpanda Services", productionPriceUsdc: "0.03" }, [path]);
  const sale = read(path);
  const held = sale.type === "BlockchainTrashpandaCoinbaseProductionSaleEvidence" && sale.brand === "Trashpanda Services"
    && sale.priceUsdc === "0.03" && sale.network === "eip155:8453" && /^0x[0-9a-f]{64}$/u.test(sale.settlementTransaction ?? "")
    && typeof sale.bazaarResource === "string" && sale.bazaarResource.startsWith("https://") && sale.recoveryWalletUsed === false;
  return result("sell-for-usdc-through-coinbase-x402-bazaar", held, { record: path, transaction: sale.settlementTransaction ?? null, resource: sale.bazaarResource ?? null }, held ? [] : [path + "#invalid"]);
}

function tokenBoundary() {
  const offer = read("content/offers/virtuals-acp-pre-sign-conformance-production.json");
  const held = offer.paymentGate === "USDC service fee only; YANAGI is not required";
  return result("yanagi-remains-optional-community-identity-asset", held, { virtualsPaymentGate: offer.paymentGate }, held ? [] : ["token-boundary"]);
}

function economics() {
  const path = "data/books/production-economic-ledger.json";
  if (!present(path)) return result("separate-value-created-captured-and-cost", false, { prelaunch: "data/books/2026-07-22-prelaunch-economic-appraisal.json" }, [path]);
  const ledger = read(path), created = ledger.valueCreated?.entries, captured = ledger.valueCaptured?.entries, costs = ledger.costs?.entries;
  const entries = [...(created ?? []), ...(captured ?? []), ...(costs ?? [])];
  const held = ledger.type === "BlockchainTrashpandaProductionEconomicLedger" && Array.isArray(created) && created.length > 0
    && Array.isArray(captured) && captured.some((entry) => entry.channel === "Virtuals ACP") && captured.some((entry) => entry.channel === "Coinbase x402")
    && Array.isArray(costs) && costs.length > 0 && new Set(entries.map(({ id }) => id)).size === entries.length;
  return result("separate-value-created-captured-and-cost", held, { record: path }, held ? [] : [path + "#invalid"]);
}

function den() {
  const path = "data/evidence/den-lianqun-membership.json", evidence = read(path);
  const held = evidence.disposition === "not-yet-a-lianqun"
    ? evidence.claimMade === false && evidence.independentlySovereignMembers?.length === 0
    : evidence.disposition === "lianqun-formed" && evidence.claimMade === true && evidence.voluntary === true && evidence.commonAuthority === false && evidence.independentlySovereignMembers?.length >= 2;
  return result("den-lianqun-only-after-genuine-sovereign-members", held, { disposition: evidence.disposition, members: evidence.independentlySovereignMembers?.length }, held ? [] : [path + "#invalid"]);
}

export function verifyProductionGoal() {
  const requirements = [ownership(), institution(), product(), virtuals(), coinbase(), tokenBoundary(), economics(), den()];
  return Object.freeze({ type: "BlockchainTrashpandaProductionGoalAudit", held: requirements.every((entry) => entry.held), requirements });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const audit = verifyProductionGoal();
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  process.exitCode = audit.held ? 0 : 1;
}
