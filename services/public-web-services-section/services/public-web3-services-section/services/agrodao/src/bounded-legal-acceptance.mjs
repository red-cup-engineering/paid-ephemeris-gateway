import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE = "org.emsenn.agrodao.bounded-legal-acceptance.v1";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.bounded-legal-acceptance";
const CAIP10 = /^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;

function object(name, value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function text(name, value, pattern = /^.{1,4096}$/u) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} must be bounded text`);
  return value;
}

function instant(name, value) {
  text(name, value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO instant`);
  return value;
}

function quantity(name, value) { return BigInt(text(name, value, DECIMAL)); }

function gcd(left, right) {
  let a = left < 0n ? -left : left; let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function fraction(name, raw) {
  const value = object(name, raw);
  const numerator = quantity(`${name}.numerator`, value.numerator);
  const denominator = quantity(`${name}.denominator`, value.denominator);
  if (denominator === 0n || numerator > denominator) throw new TypeError(`${name} must be in [0,1]`);
  const divisor = gcd(numerator, denominator);
  const normalized = { numerator: String(numerator / divisor), denominator: String(denominator / divisor) };
  if (normalized.numerator !== value.numerator || normalized.denominator !== value.denominator) {
    throw new TypeError(`${name} must be a reduced canonical fraction`);
  }
  return normalized;
}

function assertNoExecutionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") throw new TypeError(`${path} must encode every integer as decimal text`);
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoExecutionMaterial(entry, `${path}[${index}]`));
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|privateKey|mnemonic|rawTransaction|rlp|secret|signature|signedTransaction|transactionRequest)$/iu.test(key)) {
      throw new TypeError(`${path}.${key} is execution, signature, or secret material and is refused`);
    }
    assertNoExecutionMaterial(entry, `${path}.${key}`);
  }
}

function deepFreeze(value) {
  if (value != null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function admitBoundedLegalAcceptance(rawInput) {
  assertNoExecutionMaterial(rawInput);
  const input = object("input", rawInput);
  if (input.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  const principal = object("principal", input.principal);
  const source = object("source", input.source);
  const terms = object("terms", input.terms);
  const claim = object("claim", input.claim);
  const contribution = object("contribution", input.contribution);
  const account = text("principal.account", principal.account, CAIP10).toLowerCase();
  const chain = account.split(":").slice(0, 2).join(":");
  const termsUri = text("terms.uri", terms.uri, /^ipfs:\/\/[a-z0-9]+$/u);
  const weight = fraction("contribution.weight", contribution.weight);
  if (contribution.accepted !== true || weight.numerator !== weight.denominator) {
    throw new TypeError("legal acceptance must be explicit and carry full 1/1 principal contribution");
  }
  const outputs = Array.isArray(claim.outputs) ? claim.outputs.map((raw, index) => {
    const output = object(`claim.outputs[${index}]`, raw);
    return {
      token: text(`claim.outputs[${index}].token`, output.token, ADDRESS).toLowerCase(),
      amount: quantity(`claim.outputs[${index}].amount`, output.amount).toString(),
      symbol: text(`claim.outputs[${index}].symbol`, output.symbol, /^[A-Za-z0-9-]{1,32}$/u),
    };
  }) : (() => { throw new TypeError("claim.outputs must be an array"); })();
  if (outputs.length === 0 || outputs.length > 16 || new Set(outputs.map(({ token }) => token)).size !== outputs.length
      || outputs.some(({ amount }) => BigInt(amount) === 0n)) throw new TypeError("claim outputs must be one through sixteen unique positive token amounts");
  const normalized = {
    profile: PROFILE,
    principal: {
      actor: text("principal.actor", principal.actor, /^urn:[A-Za-z0-9:._-]{3,256}$/u),
      enterprise: text("principal.enterprise", principal.enterprise, /^urn:ame:[A-Za-z0-9._-]{2,128}$/u),
      account,
    },
    source: {
      channel: text("source.channel", source.channel, /^[A-Za-z0-9:._-]{2,128}$/u),
      utterance: text("source.utterance", source.utterance),
      observedAt: instant("source.observedAt", source.observedAt),
    },
    terms: {
      uri: termsUri,
      sha256: text("terms.sha256", terms.sha256, SHA256),
      byteLength: quantity("terms.byteLength", terms.byteLength).toString(),
      title: text("terms.title", terms.title, /^.{1,256}$/u),
      updated: text("terms.updated", terms.updated, /^\d{4}-\d{2}-\d{2}$/u),
    },
    claim: {
      protocol: text("claim.protocol", claim.protocol, /^[A-Za-z0-9 ._-]{2,80}$/u),
      chain: text("claim.chain", claim.chain, /^eip155:[1-9][0-9]*$/u),
      distributionId: quantity("claim.distributionId", claim.distributionId).toString(),
      outputs,
    },
    contribution: { accepted: true, weight, role: "financial-principal" },
  };
  if (normalized.claim.chain !== chain) throw new TypeError("claim chain must match the principal account");
  const result = {
    profile: PROFILE,
    outcome: "bounded-legal-acceptance-seated",
    scope: { principal: normalized.principal, terms: normalized.terms, claim: normalized.claim },
    source: normalized.source,
    contribution: normalized.contribution,
    gate: { legalAcceptanceCompleted: true, principalContribution: weight },
    authority: {
      namedLegalGateOnly: true, generalTradingMandate: false, investmentAuthority: false, custody: false,
      taxReview: false, transactionAssembly: false, signing: false, broadcast: false, chainMutation: false,
    },
  };
  return deepFreeze({ id: semanticId("agrodao.bounded-legal-acceptance", { input: normalized, result }), ...result });
}

export async function recordBoundedLegalAcceptance(rawInput, options = {}) {
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  instant("recordedAt", recordedAt);
  const result = admitBoundedLegalAcceptance(rawInput);
  const store = options.store ?? createSettlementStore({
    settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT,
  });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") throw new TypeError("legal acceptance requires AGRODAO's contracted settlement store");
  const record = { type: "BoundedLegalAcceptanceRecord", owner: "urn:ame:agrodao", acceptance: result, recordedAt };
  return { result, record, projection: await store.record({ category: RECORD_CATEGORY, recordedAt, record }) };
}

export const BOUNDED_LEGAL_ACCEPTANCE_PROFILE = PROFILE;
export const BOUNDED_LEGAL_ACCEPTANCE_RECORD_CATEGORY = RECORD_CATEGORY;
