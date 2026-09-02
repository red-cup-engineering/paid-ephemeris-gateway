import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EXPECTED_DELEVERAGE_STEPS } from "./cross-wallet-deleverage-assay.mjs";

const PROFILE = "org.emsenn.agrodao.wallet-segregated-deleverage-intent.v1";
const RECORD_CATEGORY = "agrodao.wallet-segregated-deleverage-intent";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CAIP10 = /^eip155:([1-9][0-9]*):0x[0-9a-f]{40}$/u;
const CAIP19 = /^eip155:([1-9][0-9]*)\/erc20:0x[0-9a-f]{40}$/u;
const UINT = /^(?:0|[1-9][0-9]*)$/u;
const FORBIDDEN = /^(?:calldata|credential|credentials|data|mnemonic|privatekey|rawtransaction|rlp|secret|seedphrase|signature|signedtransaction|transactionrequest)$/iu;

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}
function exactKeys(name, value, keys) {
  object(name, value);
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) throw new TypeError(`${name} must contain exactly: ${expected.join(", ")}`);
}
function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} is not canonical`);
  return value;
}
function quantity(name, value) { return BigInt(text(name, value, UINT)); }
function positive(name, value) { const result = quantity(name, value); if (result === 0n) throw new TypeError(`${name} must be positive`); return result; }
function flag(name, value) { if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`); return value; }
function ceilDiv(numerator, denominator) { return (numerator + denominator - 1n) / denominator; }
function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  return value;
}
function scan(value, path = "input", seen = new WeakSet()) {
  if (typeof value === "number" || typeof value === "bigint") throw new TypeError(`${path} must encode every integer as decimal text`);
  if (value == null || typeof value !== "object") return;
  if (seen.has(value)) throw new TypeError(`${path} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) return value.forEach((entry, index) => scan(entry, `${path}[${index}]`, seen));
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN.test(key.replace(/[^a-z]/giu, ""))) throw new TypeError(`${path}.${key} is secret or transaction material and is refused`);
    scan(entry, `${path}.${key}`, seen);
  }
}
function account(name, value) {
  const match = CAIP10.exec(text(name, value, CAIP10));
  return { value, chainId: match[1] };
}
function normalizeScenarios(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 12) throw new TypeError("action.healthStressScenarios must contain two through twelve entries");
  const seen = new Set();
  const result = value.map((entry, index) => {
    exactKeys(`action.healthStressScenarios[${index}]`, entry, ["name", "healthFactorWad"]);
    const name = text(`action.healthStressScenarios[${index}].name`, entry.name, /^[a-z][a-z0-9-]{2,79}$/u);
    if (seen.has(name)) throw new TypeError("health stress scenario names must be unique");
    seen.add(name);
    return { name, healthFactorWad: positive(`action.healthStressScenarios[${index}].healthFactorWad`, entry.healthFactorWad) };
  });
  if (result.map(({ name }) => name).join("\0") !== [...seen].sort().join("\0")) throw new TypeError("health stress scenarios must be sorted by name");
  return result;
}
function normalizeRoute(value) {
  if (!Array.isArray(value) || value.length !== EXPECTED_DELEVERAGE_STEPS.length
      || value.some((step, index) => step !== EXPECTED_DELEVERAGE_STEPS[index])) {
    throw new TypeError(`action.routeSteps must equal the ${EXPECTED_DELEVERAGE_STEPS.length} ordered semantic deleverage steps`);
  }
  return [...value];
}

function normalize(raw) {
  scan(raw);
  exactKeys("input", raw, ["profile", "evaluatedAt", "evidence", "wallets", "action", "accounting", "preflight", "authority"]);
  if (raw.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  const evaluatedAt = positive("evaluatedAt", raw.evaluatedAt);

  exactKeys("evidence", raw.evidence, ["crossWalletAssayId", "currentPreflightId", "snapshot"]);
  const evidence = { crossWalletAssayId: text("evidence.crossWalletAssayId", raw.evidence.crossWalletAssayId, NI),
    currentPreflightId: text("evidence.currentPreflightId", raw.evidence.currentPreflightId, NI) };
  exactKeys("evidence.snapshot", raw.evidence.snapshot, ["caip2", "block", "blockHash", "observedAt", "expiresAt"]);
  const snapshot = { caip2: text("evidence.snapshot.caip2", raw.evidence.snapshot.caip2, /^eip155:[1-9][0-9]*$/u),
    block: positive("evidence.snapshot.block", raw.evidence.snapshot.block),
    blockHash: text("evidence.snapshot.blockHash", raw.evidence.snapshot.blockHash, /^0x[0-9a-f]{64}$/u),
    observedAt: positive("evidence.snapshot.observedAt", raw.evidence.snapshot.observedAt),
    expiresAt: positive("evidence.snapshot.expiresAt", raw.evidence.snapshot.expiresAt) };
  if (snapshot.expiresAt <= snapshot.observedAt || evaluatedAt < snapshot.observedAt) throw new TypeError("evidence time order must satisfy observedAt <= evaluatedAt and observedAt < expiresAt");
  evidence.snapshot = snapshot;

  exactKeys("wallets", raw.wallets, ["source", "target"]);
  exactKeys("wallets.source", raw.wallets.source, ["id", "account"]);
  exactKeys("wallets.target", raw.wallets.target, ["id", "account"]);
  const sourceAccount = account("wallets.source.account", raw.wallets.source.account);
  const targetAccount = account("wallets.target.account", raw.wallets.target.account);
  if (raw.wallets.source.id !== "SIGMUND" || raw.wallets.target.id !== "YANAGI") throw new TypeError("the deleverage route must preserve SIGMUND as source and YANAGI as target");
  if (sourceAccount.value === targetAccount.value || sourceAccount.chainId !== targetAccount.chainId
      || snapshot.caip2 !== `eip155:${sourceAccount.chainId}`) throw new TypeError("wallet accounts must be distinct and bound to the snapshot chain");
  const wallets = { source: { id: "SIGMUND", account: sourceAccount.value }, target: { id: "YANAGI", account: targetAccount.value } };

  const actionKeys = ["asset", "purpose", "grossExitSats", "principalSats", "conversionLossSats", "gasSatsCeil",
    "externalDebtBeforeSats", "externalDebtAfterSats", "healthBeforeWad", "healthAfterWad", "healthTargetWad",
    "healthStressScenarios", "annualBeefyYieldForegoneSats", "annualDebtInterestSavedSats", "maximumAllInDragBps", "routeSteps"];
  exactKeys("action", raw.action, actionKeys);
  const assetMatch = CAIP19.exec(text("action.asset", raw.action.asset, CAIP19));
  if (assetMatch[1] !== sourceAccount.chainId) throw new TypeError("action.asset must be bound to the wallet chain");
  if (raw.action.purpose !== "repay-moonwell-cbbtc-debt") throw new TypeError("action.purpose is unsupported");
  const action = {
    asset: raw.action.asset, purpose: raw.action.purpose,
    grossExitSats: positive("action.grossExitSats", raw.action.grossExitSats),
    principalSats: positive("action.principalSats", raw.action.principalSats),
    conversionLossSats: quantity("action.conversionLossSats", raw.action.conversionLossSats),
    gasSatsCeil: quantity("action.gasSatsCeil", raw.action.gasSatsCeil),
    externalDebtBeforeSats: positive("action.externalDebtBeforeSats", raw.action.externalDebtBeforeSats),
    externalDebtAfterSats: positive("action.externalDebtAfterSats", raw.action.externalDebtAfterSats),
    healthBeforeWad: positive("action.healthBeforeWad", raw.action.healthBeforeWad),
    healthAfterWad: positive("action.healthAfterWad", raw.action.healthAfterWad),
    healthTargetWad: positive("action.healthTargetWad", raw.action.healthTargetWad),
    healthStressScenarios: normalizeScenarios(raw.action.healthStressScenarios),
    annualBeefyYieldForegoneSats: quantity("action.annualBeefyYieldForegoneSats", raw.action.annualBeefyYieldForegoneSats),
    annualDebtInterestSavedSats: quantity("action.annualDebtInterestSavedSats", raw.action.annualDebtInterestSavedSats),
    maximumAllInDragBps: positive("action.maximumAllInDragBps", raw.action.maximumAllInDragBps),
    routeSteps: normalizeRoute(raw.action.routeSteps),
  };

  exactKeys("accounting", raw.accounting, ["classification", "receivableHolder", "payableOwedBy", "receivableSats", "payableSats", "internalCompensationStatus", "separateWalletBooks", "taxLotCaptureRequired"]);
  if (raw.accounting.classification !== "btc-denominated-inter-wallet-receivable" || raw.accounting.receivableHolder !== "SIGMUND"
      || raw.accounting.payableOwedBy !== "YANAGI" || flag("accounting.separateWalletBooks", raw.accounting.separateWalletBooks) !== true
      || flag("accounting.taxLotCaptureRequired", raw.accounting.taxLotCaptureRequired) !== true) throw new TypeError("accounting must preserve separate wallet books and explicit BTC receivable/payable");
  const accounting = { classification: raw.accounting.classification, receivableHolder: "SIGMUND", payableOwedBy: "YANAGI",
    receivableSats: positive("accounting.receivableSats", raw.accounting.receivableSats),
    payableSats: positive("accounting.payableSats", raw.accounting.payableSats),
    internalCompensationStatus: text("accounting.internalCompensationStatus", raw.accounting.internalCompensationStatus, /^(?:unpriced-risk-reduction|zero-interest-owner-allocation|priced-separately)$/u),
    separateWalletBooks: true, taxLotCaptureRequired: true };

  const preflightKeys = ["positionStillOwned", "fixedForkAtHead", "contractUnchanged", "outputVerified", "gasEstimated", "priceFresh", "headFresh", "legalScopeDisclosed", "taxRecordkeepingReady"];
  exactKeys("preflight", raw.preflight, preflightKeys);
  const preflight = Object.fromEntries(preflightKeys.map((key) => [key, flag(`preflight.${key}`, raw.preflight[key])]));
  exactKeys("authority", raw.authority, ["publicEvidenceOnly", "intentOnly", "transactionAssembly", "signerMaterialPresent", "signing", "broadcast", "chainMutation"]);
  if (flag("authority.publicEvidenceOnly", raw.authority.publicEvidenceOnly) !== true || flag("authority.intentOnly", raw.authority.intentOnly) !== true
      || ["transactionAssembly", "signerMaterialPresent", "signing", "broadcast", "chainMutation"].some((key) => flag(`authority.${key}`, raw.authority[key]) !== false)) {
    throw new TypeError("authority must be public-evidence intent-only with no transaction or custody authority");
  }
  return { profile: PROFILE, evaluatedAt, evidence, wallets, action, accounting, preflight,
    authority: { publicEvidenceOnly: true, intentOnly: true, transactionAssembly: false, signerMaterialPresent: false, signing: false, broadcast: false, chainMutation: false } };
}

export function evaluateWalletSegregatedDeleverageIntent(raw) {
  const input = normalize(raw), { action, accounting, evidence, preflight } = input;
  const debtReductionSats = action.externalDebtBeforeSats - action.externalDebtAfterSats;
  if (debtReductionSats <= 0n || debtReductionSats !== action.principalSats) throw new TypeError("external debt reduction must equal principal");
  if (action.grossExitSats !== action.principalSats + action.conversionLossSats) throw new TypeError("gross BTC exit must equal principal plus conversion loss");
  if (accounting.receivableSats !== action.principalSats || accounting.payableSats !== action.principalSats) throw new TypeError("inter-wallet receivable and payable must both equal principal");
  const allInDragSats = action.conversionLossSats + action.gasSatsCeil;
  const allInDragBpsCeil = ceilDiv(allInDragSats * 10_000n, action.grossExitSats);
  const healthAdmits = action.healthAfterWad >= action.healthTargetWad
    && action.healthStressScenarios.every(({ healthFactorWad }) => healthFactorWad >= action.healthTargetWad);
  const riskAdmits = healthAdmits && allInDragBpsCeil <= action.maximumAllInDragBps && action.healthAfterWad > action.healthBeforeWad;
  // An evidence window is half-open: once its expiry instant is reached, the
  // intent must be refreshed rather than treated as current.
  const fresh = input.evaluatedAt < evidence.snapshot.expiresAt;
  const evidenceComplete = Object.values(preflight).every(Boolean);
  const verdict = !riskAdmits ? "REFUSE" : !fresh || !evidenceComplete ? "REFRESH_REQUIRED" : "HUMAN_REVIEW_READY";
  const annualCarryChangeBeforeRedeploymentSats = action.annualDebtInterestSavedSats - action.annualBeefyYieldForegoneSats;
  const netWorthDeltaSatsEquivalent = -allInDragSats;
  const result = {
    profile: PROFILE,
    outcome: "completed-wallet-segregated-deleverage-intent",
    verdict,
    evidence: serializable(evidence),
    accounting: {
      classification: accounting.classification,
      internalCompensationStatus: accounting.internalCompensationStatus,
      sourceWallet: { wallet: "SIGMUND", externalBtcPositionDeltaSats: `-${action.grossExitSats}`,
        interWalletReceivableDeltaSats: action.principalSats.toString(), conversionLossExpenseSats: action.conversionLossSats.toString(),
        gasExpenseSatsEquivalent: action.gasSatsCeil.toString(), netWorthDeltaSatsEquivalent: netWorthDeltaSatsEquivalent.toString() },
      targetWallet: { wallet: "YANAGI", externalMoonwellDebtDeltaSats: `-${action.principalSats}`,
        interWalletPayableDeltaSats: action.principalSats.toString(), netWorthDeltaSatsEquivalent: "0" },
      consolidated: { externalBtcAssetDeltaSats: `-${action.grossExitSats}`, externalMoonwellDebtDeltaSats: `-${action.principalSats}`,
        interWalletEliminationSats: action.principalSats.toString(), conversionLossSats: action.conversionLossSats.toString(),
        gasExpenseSatsEquivalent: action.gasSatsCeil.toString(), netWorthDeltaSatsEquivalent: netWorthDeltaSatsEquivalent.toString() },
    },
    economics: { grossExitSats: action.grossExitSats.toString(), principalSats: action.principalSats.toString(),
      allInDragSats: allInDragSats.toString(), allInDragBpsCeil: allInDragBpsCeil.toString(),
      annualCarryChangeBeforeRedeploymentSats: annualCarryChangeBeforeRedeploymentSats.toString() },
    health: { beforeWad: action.healthBeforeWad.toString(), afterWad: action.healthAfterWad.toString(),
      targetWad: action.healthTargetWad.toString(), afterScenarios: serializable(action.healthStressScenarios), allDeclaredScenariosAdmit: healthAdmits },
    gate: { riskAdmits, evidenceFresh: fresh, evidenceComplete, humanReviewReady: verdict === "HUMAN_REVIEW_READY",
      executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false,
      reasons: verdict === "REFUSE" ? ["risk-or-drag-gate-failed"] : verdict === "REFRESH_REQUIRED" ? [
        ...(fresh ? [] : ["evidence-window-expired"]), ...(evidenceComplete ? [] : ["current-preflight-incomplete"]),
      ] : ["fresh-evidence-and-segregated-accounting-ready-for-human-review"] },
    replay: { module: "@red-cup-engineering/agrodao/wallet-segregated-deleverage-intent", export: "evaluateWalletSegregatedDeleverageIntent", normalizedInput: serializable(input) },
  };
  return { id: semanticId("agrodao.wallet-segregated-deleverage-intent", { input: serializable(input), result }), ...result };
}

export async function recordWalletSegregatedDeleverageIntent(raw, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const result = evaluateWalletSegregatedDeleverageIntent(raw);
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") throw new TypeError("wallet-segregated intent requires AGRODAO's contracted settlement store");
  const record = { type: "WalletSegregatedDeleverageIntentRecord", owner: "urn:ame:agrodao", decision: result,
    recordedAt, decisionBoundary: { intentOnly: true, executionAdmitted: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const WALLET_SEGREGATED_DELEVERAGE_INTENT_PROFILE = PROFILE;
export const WALLET_SEGREGATED_DELEVERAGE_INTENT_RECORD_CATEGORY = RECORD_CATEGORY;
