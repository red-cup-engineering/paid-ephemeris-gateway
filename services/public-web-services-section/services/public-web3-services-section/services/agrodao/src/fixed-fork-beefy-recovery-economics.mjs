import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = "org.emsenn.agrodao.fixed-fork-beefy-recovery-economics.v1";
const RECORD_CATEGORY = "agrodao.fixed-fork-beefy-recovery-economics";
const TOKENS = Object.freeze([
  "0x04c0599ae5a44757c0af6f9ec3b93da8976c150a",
  "0x1f55a02a049033e3419a8e2975cf3f572f4e6e9a",
  "0x4200000000000000000000000000000000000006",
  "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452",
]);
const WETH = "0x4200000000000000000000000000000000000006";
const CANDIDATES = new Set(["yanagi-beefy-weeth-weth", "yanagi-beefy-sfrxeth-wsteth"]);
const CANDIDATE_DEFINITIONS = Object.freeze({
  "yanagi-beefy-weeth-weth": Object.freeze({ vault: "0x47579c50c7aedea788d18927aed4c827fe34996a",
    lpToken: "0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8", tokens: Object.freeze([TOKENS[0], TOKENS[2]].sort()) }),
  "yanagi-beefy-sfrxeth-wsteth": Object.freeze({ vault: "0xdee327bf6b0182a1727caec9c6344a0d27d6da99",
    lpToken: "0x456c166e63634d75a4b49edec86cb51424d4c926", tokens: Object.freeze([TOKENS[1], TOKENS[3]].sort()) }),
});
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

const resultDigest = (value) => semanticId("agrodao.fixed-fork-beefy-recovery-economics", value);
function text(name, value, pattern = /^.+$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} is malformed`);
  return value;
}
function decimal(name, value) { text(name, value, /^(0|[1-9][0-9]{0,77})$/u); return BigInt(value); }
function ceilDiv(numerator, denominator) { return (numerator + denominator - 1n) / denominator; }
function assertNoNumericOrTransactionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") throw new TypeError(`${path} must encode integers as decimal text`);
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoNumericOrTransactionMaterial(entry, `${path}[${index}]`));
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|mnemonic|privateKey|rawTransaction|rlp|secret|seed|signedTransaction|transactionRequest)$/iu.test(key)) {
      throw new TypeError(`${path}.${key} is secret or transaction material and is refused`);
    }
    assertNoNumericOrTransactionMaterial(entry, `${path}.${key}`);
  }
}
function rational(source, name) {
  text(name, source, /^(?:0|[1-9][0-9]{0,39})(?:\.[0-9]{1,40})?(?:[eE][+-]?[0-9]{1,3})?$/u);
  const [, whole, fraction = "", exponentText = "0"] = source.match(/^([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/u);
  const exponent = BigInt(exponentText) - BigInt(fraction.length);
  if (exponent < -78n || exponent > 78n) throw new TypeError(`${name} exponent is outside the bounded domain`);
  const coefficient = BigInt(`${whole}${fraction}`);
  return exponent >= 0n ? { numerator: coefficient * 10n ** exponent, denominator: 1n }
    : { numerator: coefficient, denominator: 10n ** -exponent };
}
function scaledFloor(source, scale, multiplier, divisor, name) {
  const value = rational(source, name);
  return value.numerator * scale * multiplier / (value.denominator * divisor);
}
function scaledCeil(source, scale, multiplier, divisor, name) {
  const value = rational(source, name);
  return ceilDiv(value.numerator * scale * multiplier, value.denominator * divisor);
}
function parsePriceResponse(rawText) {
  text("priceResponse", rawText);
  if (Buffer.byteLength(rawText, "utf8") > 20_000) throw new TypeError("price response exceeds the bounded domain");
  const parsed = JSON.parse(rawText, (key, value, context) =>
    ["decimals", "price", "timestamp", "confidence"].includes(key) ? context.source : value);
  if (parsed == null || typeof parsed !== "object" || parsed.coins == null || Array.isArray(parsed.coins)) {
    throw new TypeError("price response must contain a coins object");
  }
  return parsed.coins;
}
function assertAuthority(authority) {
  if (authority?.publicEvidenceOnly !== true || authority?.fixedForkEvidenceOnly !== true
    || authority?.liveMutation !== false || authority?.transactionAssembly !== false
    || authority?.signerMaterialPresent !== false || authority?.outputCalldata !== false
    || authority?.signing !== false || authority?.broadcast !== false || authority?.chainMutation !== false) {
    throw new TypeError("authority must admit only public and fixed-fork evidence without transaction authority");
  }
}

export function assayFixedForkBeefyRecoveryEconomics(input) {
  assertNoNumericOrTransactionMaterial(input);
  if (input?.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  assertAuthority(input.authority);
  const head = input.head;
  const headBlock = decimal("head.block", head?.block);
  const headTimestamp = decimal("head.timestamp", head?.timestamp);
  text("head.hash", head?.hash, /^0x[0-9a-fA-F]{64}$/u);
  const observation = input.providerObservation;
  const { id: observationId, ...observationBody } = observation ?? {};
  if (!NI.test(observationId ?? "") || observationId !== ethereumObservationId("ethereum.fixed-fork-beefy-vault-exit-observation", observationBody)
    || observation?.block !== headBlock.toString() || observation?.blockHash.toLowerCase() !== head.hash.toLowerCase()
    || observation?.timestamp !== headTimestamp.toString() || observation?.gate?.feeCeilingComplete !== true
    || observation?.gate?.outputVerified !== true || observation?.gate?.executionAdmitted !== false
    || observation?.gate?.priceEvidenceComplete !== false) {
    throw new TypeError("provider observation is invalid or is not bound to the supplied head");
  }
  const sourceUrl = new URL(text("priceSource.url", input.priceSource?.url));
  if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password || sourceUrl.search || sourceUrl.hash
    || sourceUrl.origin !== "https://coins.llama.fi" || !sourceUrl.pathname.startsWith("/prices/current/")) {
    throw new TypeError("price source must be the credential-free DefiLlama current-price endpoint");
  }
  const requestedKeys = decodeURIComponent(sourceUrl.pathname.slice("/prices/current/".length))
    .split(",").map((key) => key.toLowerCase()).sort();
  const expectedKeys = TOKENS.map((token) => `base:${token}`).sort();
  if (JSON.stringify(requestedKeys) !== JSON.stringify(expectedKeys)) {
    throw new TypeError("price source URL must request exactly the admitted tokens");
  }
  const coins = parsePriceResponse(input.priceSource.rawResponse);
  const keys = Object.keys(coins).map((key) => key.toLowerCase()).sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) throw new TypeError("price response must cover exactly the admitted tokens");
  const priceByToken = new Map();
  for (const token of TOKENS) {
    const key = `base:${token}`;
    const row = coins[key] ?? coins[Object.keys(coins).find((candidate) => candidate.toLowerCase() === key)];
    if (decimal(`${key}.decimals`, row?.decimals) !== 18n) throw new TypeError(`${key} must have eighteen decimals`);
    const timestamp = decimal(`${key}.timestamp`, row.timestamp);
    if (timestamp > headTimestamp || headTimestamp - timestamp > 3_600n) throw new TypeError(`${key} price is future or stale`);
    const confidence = rational(row.confidence, `${key}.confidence`);
    if (confidence.numerator * 100n < confidence.denominator * 99n) throw new TypeError(`${key} confidence is below 0.99`);
    const outputPriceMicroUsdFloor = scaledFloor(row.price, 1_000_000n, 9_500n, 10_000n, `${key}.price`);
    const feePriceMicroUsdCeil = token === WETH
      ? scaledCeil(row.price, 1_000_000n, 10_500n, 10_000n, `${key}.price`) : null;
    if (outputPriceMicroUsdFloor <= 0n) throw new TypeError(`${key} price must be positive`);
    priceByToken.set(token, { token, symbol: text(`${key}.symbol`, row.symbol, /^[A-Za-z0-9._-]{1,24}$/u),
      timestamp: timestamp.toString(), confidence: row.confidence, sourcePriceUsd: row.price,
      outputPriceMicroUsdFloor: outputPriceMicroUsdFloor.toString(),
      ...(feePriceMicroUsdCeil == null ? {} : { feePriceMicroUsdCeil: feePriceMicroUsdCeil.toString() }) });
  }
  if (!Array.isArray(observation.candidates) || observation.candidates.length < 1 || observation.candidates.length > 2) {
    throw new TypeError("provider observation candidates must be bounded");
  }
  const seen = new Set();
  const candidates = observation.candidates.map((candidate) => {
    if (!CANDIDATES.has(candidate.candidateId) || seen.has(candidate.candidateId)) throw new TypeError("candidate is unsupported or duplicate");
    seen.add(candidate.candidateId);
    const definition = CANDIDATE_DEFINITIONS[candidate.candidateId];
    if (String(candidate.vault).toLowerCase() !== definition.vault
      || String(candidate.lpToken).toLowerCase() !== definition.lpToken
      || decimal("candidate.sharesBurned", candidate.sharesBurned) <= 0n
      || decimal("candidate.lpBurned", candidate.lpBurned) <= 0n
      || decimal("candidate.routeGasUsed", candidate.routeGasUsed) <= 0n
      || decimal("candidate.gasUnitsCeil", candidate.gasUnitsCeil) <= 0n
      || candidate.conservationVerified !== true || candidate.outputVerified !== true
      || candidate.feeCeilingComplete !== true) {
      throw new TypeError("candidate contradicts its reviewed fixed-fork topology or gates");
    }
    if (!Array.isArray(candidate.outputs) || candidate.outputs.length !== 2) throw new TypeError("candidate must have two outputs");
    let gross = 0n;
    const outputs = candidate.outputs.map((output) => {
      const token = text("output.token", output.token, /^0x[0-9a-fA-F]{40}$/u).toLowerCase();
      const price = priceByToken.get(token);
      if (price == null) throw new TypeError("candidate output lacks admitted price evidence");
      const amount = decimal("output.amount", output.amount);
      const valueMicroUsdFloor = amount * BigInt(price.outputPriceMicroUsdFloor) / 10n ** 18n;
      gross += valueMicroUsdFloor;
      return { token, amount: amount.toString(), valueMicroUsdFloor: valueMicroUsdFloor.toString() };
    });
    if (new Set(outputs.map(({ token }) => token)).size !== 2) throw new TypeError("candidate output tokens must be unique");
    if (JSON.stringify(outputs.map(({ token }) => token).sort()) !== JSON.stringify(definition.tokens)) {
      throw new TypeError("candidate outputs contradict the reviewed token topology");
    }
    const feeWei = decimal("candidate.fee.totalFeeWeiCeil", candidate.fee?.totalFeeWeiCeil);
    const executionFeeMicroUsdCeil = ceilDiv(feeWei * BigInt(priceByToken.get(WETH).feePriceMicroUsdCeil), 10n ** 18n);
    const net = gross - executionFeeMicroUsdCeil;
    if (net <= 0n) throw new TypeError("candidate net value must remain positive");
    return { candidateId: candidate.candidateId, outputs, grossMicroUsdFloor: gross.toString(),
      executionFeeMicroUsdCeil: executionFeeMicroUsdCeil.toString(), netMicroUsdAfterFeeCeiling: net.toString() };
  }).sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const body = { profile: PROFILE,
    outcome: "completed-fixed-fork-beefy-recovery-economics", providerObservation: observation.id,
    head: { block: headBlock.toString(), hash: head.hash.toLowerCase(), timestamp: headTimestamp.toString() },
    priceSource: { url: sourceUrl.href, rawResponseDigest: semanticId("agrodao.price-source-response", { rawResponse: input.priceSource.rawResponse }) },
    prices: [...priceByToken.values()].sort((left, right) => left.token.localeCompare(right.token)), candidates,
    gate: { publicAndFixedForkEvidenceOnly: true, priceEvidenceComplete: true,
      legalScopeComplete: false, taxScopeComplete: false, executionAdmitted: false,
      transactionAssembly: false, outputCalldata: false, signing: false, broadcast: false, chainMutation: false } };
  return { id: resultDigest(body), ...body };
}

export async function recordFixedForkBeefyRecoveryEconomics(input, options = {}) {
  const result = assayFixedForkBeefyRecoveryEconomics(input);
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("recovery economics requires AGRODAO's settlement store");
  }
  const record = { type: "FixedForkBeefyRecoveryEconomicsRecord", owner: "urn:ame:agrodao",
    economics: result, evidenceInput: input, recordedAt, decisionBoundary: result.gate };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const FIXED_FORK_BEEFY_RECOVERY_ECONOMICS_PROFILE = PROFILE;
export const FIXED_FORK_BEEFY_RECOVERY_ECONOMICS_RECORD_CATEGORY = RECORD_CATEGORY;
