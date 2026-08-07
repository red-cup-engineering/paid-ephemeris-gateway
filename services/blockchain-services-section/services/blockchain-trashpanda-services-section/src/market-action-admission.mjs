import { semanticDigest } from "./policy-conformance.mjs";

export const MARKET_ACTION_ENGINE_SPEC = Object.freeze({
  type: "BlockchainTrashpandaMarketActionAdmissionEngine",
  version: 1,
  operation: "evaluateMarketActionAdmission",
  determinism: "rmn-semantic-v1",
  evidenceAssurance: "customer-declared-unverified",
  verdictPrecedence: Object.freeze(["REFUSE", "ESCALATE", "ADMIT"]),
});
export const MARKET_ACTION_LIMITS = Object.freeze({
  clauses: 64,
  evidence: 64,
  listEntries: 64,
  scalarCharacters: 1024,
  scanNodes: 4096,
  scanDepth: 32,
  decisionWindowSeconds: 86_400,
});

const REQUEST_KEYS = ["type", "version", "candidate", "anchor", "evidence", "policy", "receiptProfile"];
const CANDIDATE_KEYS = ["type", "action", "venue", "instrument", "side", "notionalUsdMicros", "leverageBps"];
const ANCHOR_KEYS = ["type", "snapshot", "decisionAt", "expiresAt"];
const EVIDENCE_KEYS = ["id", "type", "snapshot", "metric", "value", "unit", "observedAt", "source"];
const POLICY_KEYS = ["type", "version", "clauses"];
const FORBIDDEN_KEYS = new Set([
  "mnemonic", "seedphrase", "recoveryphrase", "privatekey", "secret", "credential", "credentials",
  "signature", "signedtransaction", "rawtransaction", "custody", "custodygrant", "sign", "signinggrant",
  "broadcast", "broadcastgrant", "sendtransaction", "placeorder", "orderplacement", "venueapikey",
  "investmentauthority", "executionauthority", "walletconnecturi",
]);
const IDENTIFIER = /^[a-z][a-z0-9-]{0,63}$/u;
const METRIC = /^[a-z][a-z0-9.-]{0,127}$/u;
const UNIT = /^[a-z][a-z0-9._/-]{0,63}$/u;
const URN = /^urn:[A-Za-z0-9][A-Za-z0-9:._-]{2,255}$/u;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const UNSIGNED = /^(?:0|[1-9][0-9]*)$/u;
const SIGNED = /^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const ACTIONS = new Set(["BUY", "SELL", "CLOSE", "REDUCE", "HOLD"]);
const SIDES = new Set(["LONG", "SHORT", "NONE"]);
const MAX_MAGNITUDE_DIGITS = 78;

export class MarketActionAdmissionRefusal extends TypeError {
  constructor(code, message, path = "$") {
    super(message);
    this.name = "MarketActionAdmissionRefusal";
    this.code = code;
    this.path = path;
  }
}

function refuse(code, message, path) {
  throw new MarketActionAdmissionRefusal(code, message, path);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, path) {
  if (!isRecord(value)) refuse("malformed-input", `${path} must be an object`, path);
}

function requireExactKeys(value, keys, path) {
  requireRecord(value, path);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) {
    refuse("noncanonical-shape", `${path} must contain exactly: ${expected.join(", ")}`, path);
  }
}

function scanForbidden(value, path = "$", state = { nodes: 0, seen: new WeakSet() }, depth = 0) {
  if (depth > MARKET_ACTION_LIMITS.scanDepth || ++state.nodes > MARKET_ACTION_LIMITS.scanNodes) {
    refuse("resource-limit", "request exceeds structural scan limits", path);
  }
  if (isRecord(value) || Array.isArray(value)) {
    if (state.seen.has(value)) refuse("nondeterministic-input", "request contains a cyclic reference", path);
    state.seen.add(value);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbidden(entry, `${path}[${index}]`, state, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z]/giu, "").toLowerCase();
    if (FORBIDDEN_KEYS.has(normalized)) {
      refuse("forbidden-authority", `request contains forbidden field '${key}'`, `${path}.${key}`);
    }
    scanForbidden(entry, `${path}.${key}`, state, depth + 1);
  }
}

function requireString(value, pattern, path) {
  if (typeof value !== "string" || !pattern.test(value)) refuse("malformed-input", `${path} is not canonical`, path);
  return value;
}

function requireUnsigned(value, path) {
  requireString(value, UNSIGNED, path);
  if (value.length > MAX_MAGNITUDE_DIGITS) refuse("resource-limit", `${path} exceeds the integer limit`, path);
  return value;
}

function requireSigned(value, path) {
  requireString(value, SIGNED, path);
  const digits = value.startsWith("-") ? value.slice(1) : value;
  if (digits.length > MAX_MAGNITUDE_DIGITS) refuse("resource-limit", `${path} exceeds the integer limit`, path);
  return value;
}

function requireInstant(value, path) {
  requireString(value, INSTANT, path);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) refuse("malformed-input", `${path} is not a valid instant`, path);
  return { value, milliseconds };
}

function requireUrn(value, path) {
  return requireString(value, URN, path);
}

function requireSource(value, path) {
  if (typeof value !== "string" || value.length === 0 || value.length > MARKET_ACTION_LIMITS.scalarCharacters) {
    refuse("malformed-input", `${path} must be a bounded absolute public evidence URI`, path);
  }
  if (NI.test(value) || URN.test(value) || /^ipfs:\/\/[A-Za-z0-9]+$/u.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { refuse("malformed-input", `${path} must be an absolute public evidence URI`, path); }
  if (url.protocol !== "https:" || url.username || url.password) {
    refuse("malformed-input", `${path} must be credential-free HTTPS, ni, ipfs, or urn`, path);
  }
  return url.href;
}

function canonicalList(value, path, validator) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MARKET_ACTION_LIMITS.listEntries) {
    refuse("malformed-policy", `${path} must be a bounded non-empty array`, path);
  }
  const normalized = value.map((entry, index) => validator(entry, `${path}[${index}]`));
  if (new Set(normalized).size !== normalized.length || normalized.join("\0") !== [...normalized].sort().join("\0")) {
    refuse("noncanonical-order", `${path} must be unique and sorted`, path);
  }
  return Object.freeze(normalized);
}

function normalizeCandidate(value) {
  requireExactKeys(value, CANDIDATE_KEYS, "$.candidate");
  if (value.type !== "CandidateMarketAction") refuse("malformed-input", "unsupported candidate type", "$.candidate.type");
  if (!ACTIONS.has(value.action)) refuse("malformed-input", "unsupported market action", "$.candidate.action");
  if (!SIDES.has(value.side)) refuse("malformed-input", "unsupported market side", "$.candidate.side");
  if (value.action === "HOLD" && value.side !== "NONE") refuse("malformed-input", "HOLD requires side NONE", "$.candidate.side");
  return Object.freeze({
    type: value.type,
    action: value.action,
    venue: requireUrn(value.venue, "$.candidate.venue"),
    instrument: requireUrn(value.instrument, "$.candidate.instrument"),
    side: value.side,
    notionalUsdMicros: requireUnsigned(value.notionalUsdMicros, "$.candidate.notionalUsdMicros"),
    leverageBps: requireUnsigned(value.leverageBps, "$.candidate.leverageBps"),
  });
}

function normalizeAnchor(value) {
  requireExactKeys(value, ANCHOR_KEYS, "$.anchor");
  if (value.type !== "ImmutableMarketDecisionAnchor") refuse("mutable-anchor", "anchor must be immutable", "$.anchor.type");
  const decisionAt = requireInstant(value.decisionAt, "$.anchor.decisionAt");
  const expiresAt = requireInstant(value.expiresAt, "$.anchor.expiresAt");
  const window = expiresAt.milliseconds - decisionAt.milliseconds;
  if (window <= 0 || window > MARKET_ACTION_LIMITS.decisionWindowSeconds * 1000) {
    refuse("invalid-decision-window", "expiry must follow decisionAt by no more than 86400 seconds", "$.anchor.expiresAt");
  }
  return Object.freeze({
    type: value.type,
    snapshot: requireString(value.snapshot, NI, "$.anchor.snapshot"),
    decisionAt: decisionAt.value,
    expiresAt: expiresAt.value,
  });
}

function normalizeEvidence(value, anchor) {
  if (!Array.isArray(value) || value.length > MARKET_ACTION_LIMITS.evidence) {
    refuse("resource-limit", `$.evidence must contain at most ${MARKET_ACTION_LIMITS.evidence} entries`, "$.evidence");
  }
  const seen = new Set();
  const decisionMilliseconds = Date.parse(anchor.decisionAt);
  const normalized = value.map((item, index) => {
    const path = `$.evidence[${index}]`;
    requireExactKeys(item, EVIDENCE_KEYS, path);
    const id = requireString(item.id, IDENTIFIER, `${path}.id`);
    if (seen.has(id)) refuse("malformed-input", "evidence ids must be unique", `${path}.id`);
    seen.add(id);
    if (item.type !== "CustomerDeclaredMarketObservation") {
      refuse("malformed-input", "unsupported evidence type", `${path}.type`);
    }
    if (item.snapshot !== anchor.snapshot) refuse("mutable-evidence", "evidence snapshot must equal the anchor", `${path}.snapshot`);
    const observedAt = requireInstant(item.observedAt, `${path}.observedAt`);
    if (observedAt.milliseconds > decisionMilliseconds) {
      refuse("future-evidence", "evidence cannot follow decisionAt", `${path}.observedAt`);
    }
    return Object.freeze({
      id,
      type: item.type,
      snapshot: item.snapshot,
      metric: requireString(item.metric, METRIC, `${path}.metric`),
      value: requireSigned(item.value, `${path}.value`),
      unit: requireString(item.unit, UNIT, `${path}.unit`),
      observedAt: observedAt.value,
      source: requireSource(item.source, `${path}.source`),
    });
  });
  const ids = normalized.map((item) => item.id);
  if (ids.join("\0") !== [...ids].sort().join("\0")) {
    refuse("noncanonical-order", "evidence must be sorted by id", "$.evidence");
  }
  return Object.freeze(normalized);
}

function normalizeClause(clause, index) {
  const path = `$.policy.clauses[${index}]`;
  requireRecord(clause, path);
  const id = requireString(clause.id, IDENTIFIER, `${path}.id`);
  switch (clause.type) {
    case "ActionIn":
      requireExactKeys(clause, ["id", "type", "actions"], path);
      return Object.freeze({ id, type: clause.type, actions: canonicalList(clause.actions, `${path}.actions`, (entry, entryPath) => {
        if (!ACTIONS.has(entry)) refuse("malformed-policy", `${entryPath} is not a supported action`, entryPath);
        return entry;
      }) });
    case "VenueIn":
      requireExactKeys(clause, ["id", "type", "venues"], path);
      return Object.freeze({ id, type: clause.type, venues: canonicalList(clause.venues, `${path}.venues`, requireUrn) });
    case "InstrumentIn":
      requireExactKeys(clause, ["id", "type", "instruments"], path);
      return Object.freeze({ id, type: clause.type, instruments: canonicalList(clause.instruments, `${path}.instruments`, requireUrn) });
    case "NotionalUsdMicrosAtMost":
      requireExactKeys(clause, ["id", "type", "value"], path);
      return Object.freeze({ id, type: clause.type, value: requireUnsigned(clause.value, `${path}.value`) });
    case "LeverageBpsAtMost":
      requireExactKeys(clause, ["id", "type", "value"], path);
      return Object.freeze({ id, type: clause.type, value: requireUnsigned(clause.value, `${path}.value`) });
    case "EvidenceAtLeast":
    case "EvidenceAtMost":
      requireExactKeys(clause, ["id", "type", "evidenceId", "threshold", "unit"], path);
      return Object.freeze({ id, type: clause.type,
        evidenceId: requireString(clause.evidenceId, IDENTIFIER, `${path}.evidenceId`),
        threshold: requireSigned(clause.threshold, `${path}.threshold`),
        unit: requireString(clause.unit, UNIT, `${path}.unit`) });
    case "EvidenceFreshWithin":
      requireExactKeys(clause, ["id", "type", "evidenceId", "seconds"], path);
      return Object.freeze({ id, type: clause.type,
        evidenceId: requireString(clause.evidenceId, IDENTIFIER, `${path}.evidenceId`),
        seconds: requireUnsigned(clause.seconds, `${path}.seconds`) });
    default:
      refuse("unsupported-clause", `unsupported clause type '${clause.type ?? ""}'`, `${path}.type`);
  }
}

function normalizePolicy(value) {
  requireExactKeys(value, POLICY_KEYS, "$.policy");
  if (value.type !== "MarketActionAdmissionPolicy" || value.version !== 1) {
    refuse("malformed-policy", "unsupported policy type or version", "$.policy");
  }
  if (!Array.isArray(value.clauses) || value.clauses.length === 0 || value.clauses.length > MARKET_ACTION_LIMITS.clauses) {
    refuse("malformed-policy", "policy requires one through 64 clauses", "$.policy.clauses");
  }
  const clauses = value.clauses.map(normalizeClause);
  const ids = clauses.map((clause) => clause.id);
  if (new Set(ids).size !== ids.length || ids.join("\0") !== [...ids].sort().join("\0")) {
    refuse("noncanonical-order", "clauses must have unique ids and be sorted by id", "$.policy.clauses");
  }
  return Object.freeze({ type: value.type, version: value.version, clauses: Object.freeze(clauses) });
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function compareInteger(left, right) {
  const a = BigInt(left), b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function evidenceDisposition(clause, evidenceById, anchor, comparison) {
  const evidence = evidenceById.get(clause.evidenceId);
  if (!evidence) return { clauseId: clause.id, clauseType: clause.type, disposition: "ESCALATE",
    actual: null, expected: comparison === "fresh" ? { seconds: clause.seconds } : { value: clause.threshold, unit: clause.unit }, evidenceReferences: [] };
  const reference = semanticDigest("blockchain-trashpanda.market-action-evidence", evidence);
  if (comparison === "fresh") {
    const ageSeconds = String(Math.floor((Date.parse(anchor.decisionAt) - Date.parse(evidence.observedAt)) / 1000));
    return { clauseId: clause.id, clauseType: clause.type,
      disposition: compareInteger(ageSeconds, clause.seconds) <= 0 ? "PASS" : "FAIL",
      actual: { seconds: ageSeconds }, expected: { seconds: clause.seconds }, evidenceReferences: [reference] };
  }
  if (evidence.unit !== clause.unit) return { clauseId: clause.id, clauseType: clause.type, disposition: "ESCALATE",
    actual: { value: evidence.value, unit: evidence.unit }, expected: { value: clause.threshold, unit: clause.unit }, evidenceReferences: [reference] };
  const order = compareInteger(evidence.value, clause.threshold);
  const passed = comparison === "at-least" ? order >= 0 : order <= 0;
  return { clauseId: clause.id, clauseType: clause.type, disposition: passed ? "PASS" : "FAIL",
    actual: { value: evidence.value, unit: evidence.unit }, expected: { value: clause.threshold, unit: clause.unit }, evidenceReferences: [reference] };
}

function disposition(clause, candidate, evidenceById, anchor) {
  switch (clause.type) {
    case "ActionIn": return { clauseId: clause.id, clauseType: clause.type,
      disposition: clause.actions.includes(candidate.action) ? "PASS" : "FAIL", actual: candidate.action,
      expected: clause.actions, evidenceReferences: [] };
    case "VenueIn": return { clauseId: clause.id, clauseType: clause.type,
      disposition: clause.venues.includes(candidate.venue) ? "PASS" : "FAIL", actual: candidate.venue,
      expected: clause.venues, evidenceReferences: [] };
    case "InstrumentIn": return { clauseId: clause.id, clauseType: clause.type,
      disposition: clause.instruments.includes(candidate.instrument) ? "PASS" : "FAIL", actual: candidate.instrument,
      expected: clause.instruments, evidenceReferences: [] };
    case "NotionalUsdMicrosAtMost": return { clauseId: clause.id, clauseType: clause.type,
      disposition: compareInteger(candidate.notionalUsdMicros, clause.value) <= 0 ? "PASS" : "FAIL",
      actual: candidate.notionalUsdMicros, expected: clause.value, evidenceReferences: [] };
    case "LeverageBpsAtMost": return { clauseId: clause.id, clauseType: clause.type,
      disposition: compareInteger(candidate.leverageBps, clause.value) <= 0 ? "PASS" : "FAIL",
      actual: candidate.leverageBps, expected: clause.value, evidenceReferences: [] };
    case "EvidenceAtLeast": return evidenceDisposition(clause, evidenceById, anchor, "at-least");
    case "EvidenceAtMost": return evidenceDisposition(clause, evidenceById, anchor, "at-most");
    case "EvidenceFreshWithin": return evidenceDisposition(clause, evidenceById, anchor, "fresh");
  }
}

export function normalizeMarketActionAdmissionRequest(request) {
  requireRecord(request, "$");
  scanForbidden(request);
  requireExactKeys(request, REQUEST_KEYS, "$");
  if (request.type !== "MarketActionAdmissionRequest" || request.version !== 1) {
    refuse("malformed-input", "unsupported request type or version", "$");
  }
  if (request.receiptProfile !== "full-v1") {
    refuse("unsupported-profile", "only full-v1 receipts are supported", "$.receiptProfile");
  }
  const candidate = normalizeCandidate(request.candidate);
  const anchor = normalizeAnchor(request.anchor);
  const evidence = normalizeEvidence(request.evidence, anchor);
  const policy = normalizePolicy(request.policy);
  return deepFreeze({ type: request.type, version: request.version, candidate, anchor, evidence, policy,
    receiptProfile: request.receiptProfile });
}

export function evaluateMarketActionAdmission(request) {
  const normalized = normalizeMarketActionAdmissionRequest(request);
  const evidenceById = new Map(normalized.evidence.map((item) => [item.id, item]));
  const clauseResults = normalized.policy.clauses.map((clause) => disposition(
    clause, normalized.candidate, evidenceById, normalized.anchor,
  ));
  const verdict = clauseResults.some((result) => result.disposition === "FAIL") ? "REFUSE"
    : clauseResults.some((result) => result.disposition === "ESCALATE") ? "ESCALATE" : "ADMIT";
  const evidenceReferences = [...new Set(clauseResults.flatMap((result) => result.evidenceReferences))].sort();
  const engineId = semanticDigest("blockchain-trashpanda.market-action-engine", { specification: MARKET_ACTION_ENGINE_SPEC });
  const body = {
    type: "MarketActionAdmissionReceipt",
    version: 1,
    requestDigest: semanticDigest("blockchain-trashpanda.market-action-request", normalized),
    candidateDigest: semanticDigest("blockchain-trashpanda.market-action-candidate", normalized.candidate),
    policyDigest: semanticDigest("blockchain-trashpanda.market-action-policy", normalized.policy),
    snapshot: normalized.anchor.snapshot,
    decisionAt: normalized.anchor.decisionAt,
    validUntil: normalized.anchor.expiresAt,
    engine: { id: engineId, version: MARKET_ACTION_ENGINE_SPEC.version },
    clauseResults,
    verdict,
    evidenceReferences,
    evidenceAssurance: "customer-declared-unverified",
    decisionScope: "policy-admission-only-not-prediction-or-execution",
    replay: {
      operation: MARKET_ACTION_ENGINE_SPEC.operation,
      engineId,
      module: "@rsc-quiescent/blockchain-trashpanda",
      export: "evaluateMarketActionAdmission",
      runtime: "node>=22.18",
      normalizedRequest: normalized,
      expectedReceiptProfile: "full-v1",
    },
    forbiddenEffects: {
      credentials: false,
      custody: false,
      marketDataFetch: false,
      prediction: false,
      transactionAssembly: false,
      signing: false,
      orderPlacement: false,
      broadcast: false,
      stateMutation: false,
    },
  };
  return deepFreeze({ id: semanticDigest("blockchain-trashpanda.market-action-decision", body), ...body });
}

export const MARKET_ACTION_ADMISSION_PRODUCT = deepFreeze({
  profile: "org.emsenn.public-service-product-declaration.v1",
  provider: "urn:ame:blockchain-trashpanda",
  skill: { id: "admit-market-action", name: "Evaluate a market action against exact conditions" },
  epistemicStatus: "deterministic-customer-evidence-policy-evaluation",
  reproducibility: "exact-engine-source-law-request-and-evidence",
  credentialAccess: false,
  inference: false,
  custody: "none",
  execution: "none",
  settlementPolicy: "deployment-supplied-never-inferred",
});
