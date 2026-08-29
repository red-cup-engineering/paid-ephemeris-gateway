import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const semanticIdentity = (objectKind, value) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeGmxCandles, simulateFrozenSignals }
  from "./obsmetrologia-causal-sheaf-backtest.mjs";

const PROFILE = "org.emsenn.agrodao.obsmetrologia-causal-transport-backtest.v1";
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.obsmetrologia-causal-transport-research-assay";
const CAPITAL_DECISION_CATEGORY = "agrodao.strategy-capital-admission-decision";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const MODES = Object.freeze(["persistent-trend", "alternating-contrarian"]);

function finite(name, value, minimum = -Infinity, maximum = Infinity) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be finite from ${minimum} through ${maximum}`);
  }
  return value;
}

function integer(name, value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function normalizeParameters(raw) {
  if (!MODES.includes(raw.mode)) throw new TypeError(`mode must be one of ${MODES.join(", ")}`);
  return {
    lookback: integer("lookback", raw.lookback, 6, 256),
    mode: raw.mode,
    phaseThreshold: finite("phaseThreshold", raw.phaseThreshold, 0, 1),
    minimumDirectionalStrength: finite("minimumDirectionalStrength", raw.minimumDirectionalStrength, 0, 1),
    minimumOrderingDominance: finite("minimumOrderingDominance", raw.minimumOrderingDominance, 0.5, 1),
    deadband: finite("deadband", raw.deadband ?? 0.1, 0, 2),
    holdBars: integer("holdBars", raw.holdBars, 1, 64),
    cooldownBars: integer("cooldownBars", raw.cooldownBars, 0, 64),
  };
}

function normalizeCosts(raw = {}) {
  return {
    positionFeeRate: finite("positionFeeRate", raw.positionFeeRate ?? 0.0006, 0, 0.01),
    impactSpreadBps: finite("impactSpreadBps", raw.impactSpreadBps ?? 3, 0, 1_000),
    borrowFundingAnnualBps: finite("borrowFundingAnnualBps", raw.borrowFundingAnnualBps ?? 2_000, 0, 100_000),
    executionUsdPerOrder: finite("executionUsdPerOrder", raw.executionUsdPerOrder ?? 0.25, 0, 1_000),
    startingEquityUsd: finite("startingEquityUsd", raw.startingEquityUsd ?? 10_000, 1, 1e12),
    maintenanceMarginRate: finite("maintenanceMarginRate", raw.maintenanceMarginRate ?? 0.05, 0, 0.5),
  };
}

function parameterKey(parameters) {
  return [parameters.lookback, parameters.mode, parameters.phaseThreshold,
    parameters.minimumDirectionalStrength, parameters.minimumOrderingDominance, parameters.deadband,
    parameters.holdBars, parameters.cooldownBars]
    .map((value) => typeof value === "number" ? value.toFixed(6) : value).join(":");
}

function normalizeCandlesInput(candlesInput) {
  if (!Array.isArray(candlesInput)) throw new TypeError("candles must be an array");
  return normalizeGmxCandles(candlesInput.map((candle) => Array.isArray(candle) ? candle
    : [candle?.timestamp, candle?.open, candle?.high, candle?.low, candle?.close]));
}

function deepFreeze(value) {
  if (value != null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function returnCochainFeature(closes, deadband = 0.1) {
  if (!Array.isArray(closes) || closes.length < 7) throw new TypeError("closes must contain at least seven prices");
  const returns = closes.slice(1).map((close, index) => {
    finite(`closes[${index}]`, closes[index], Number.MIN_VALUE);
    finite(`closes[${index + 1}]`, close, Number.MIN_VALUE);
    return Math.log(close / closes[index]);
  });
  finite("deadband", deadband, 0, 2);
  const rms = Math.sqrt(returns.reduce((sum, value) => sum + (value * value), 0) / returns.length);
  const normalizedReturns = rms <= Number.EPSILON ? returns.map(() => 0) : returns.map((value) => value / rms);
  const signs = normalizedReturns.map((value) => value > deadband ? 1 : value < -deadband ? -1 : 0);
  let phaseDefects = 0;
  for (let index = 1; index < signs.length; index += 1) {
    if (signs[index] !== signs[index - 1]) phaseDefects += 1;
  }
  let increasingPairs = 0;
  let decreasingPairs = 0;
  for (let left = 0; left < normalizedReturns.length; left += 1) {
    for (let right = left + 1; right < normalizedReturns.length; right += 1) {
      if (normalizedReturns[left] < normalizedReturns[right]) increasingPairs += 1;
      else if (normalizedReturns[left] > normalizedReturns[right]) decreasingPairs += 1;
    }
  }
  const pairCount = normalizedReturns.length * (normalizedReturns.length - 1) / 2;
  const activeSigns = signs.filter((sign) => sign !== 0);
  const signMass = activeSigns.reduce((sum, sign) => sum + sign, 0);
  const latestSign = [...signs].reverse().find((sign) => sign !== 0) ?? 0;
  const persistentDirection = Math.sign(signMass);
  const persistentStrength = activeSigns.length === 0 ? 0 : Math.abs(signMass) / activeSigns.length;
  const latestImpulseStrength = Math.min(1, Math.abs(normalizedReturns.at(-1)));
  const increasingOrderingFraction = increasingPairs / pairCount;
  const decreasingOrderingFraction = decreasingPairs / pairCount;
  return {
    returnCount: returns.length,
    rms,
    signs,
    phaseDefectRate: phaseDefects / (signs.length - 1),
    phaseDefects,
    pairCount,
    increasingPairs,
    decreasingPairs,
    increasingOrderingFraction,
    decreasingOrderingFraction,
    orderingDominance: Math.max(increasingOrderingFraction, decreasingOrderingFraction),
    orderingScore: increasingOrderingFraction - decreasingOrderingFraction,
    persistentDirection,
    persistentStrength,
    latestSign,
    latestImpulseStrength,
    formalProjectionLimits: [
      "return-sign-sequence-is-an-empirical-finite-cochain-projection",
      "sign-change-rate-is-not-a-proof-of-a-nonzero-Lean-coboundary",
      "cross-asset-application-is-not-a-formal-pullback-between-market-processes",
    ],
  };
}

export function causalTransportSignal(feature, rawParameters) {
  const parameters = normalizeParameters(rawParameters);
  if (feature == null) return { position: 0, regime: "unavailable", reason: "insufficient-history" };
  const orderingAdmits = feature.orderingDominance >= parameters.minimumOrderingDominance;
  if (parameters.mode === "persistent-trend") {
    const phaseAdmits = feature.phaseDefectRate <= parameters.phaseThreshold;
    const directionAdmits = feature.persistentStrength >= parameters.minimumDirectionalStrength
      && feature.persistentDirection !== 0;
    return { position: phaseAdmits && directionAdmits && orderingAdmits ? feature.persistentDirection : 0,
      regime: "persistent", phaseAdmits, directionAdmits, orderingAdmits };
  }
  const phaseAdmits = feature.phaseDefectRate >= parameters.phaseThreshold;
  const directionAdmits = feature.latestImpulseStrength >= parameters.minimumDirectionalStrength
    && feature.latestSign !== 0;
  return { position: phaseAdmits && directionAdmits && orderingAdmits ? -feature.latestSign : 0,
    regime: "alternating", phaseAdmits, directionAdmits, orderingAdmits };
}

function featureSeries(candles, parameters) {
  const output = new Array(candles.length).fill(null);
  for (let index = parameters.lookback; index < candles.length; index += 1) {
    const closes = candles.slice(index - parameters.lookback, index + 1).map(({ close }) => close);
    output[index] = returnCochainFeature(closes, parameters.deadband);
  }
  return output;
}

export function causalTransportSignalSeries(candlesInput, rawParameters) {
  const parameters = normalizeParameters(rawParameters);
  const candles = normalizeCandlesInput(candlesInput);
  const features = featureSeries(candles, parameters);
  return { parameters, signals: signalsFromFeatures(features, parameters), features };
}

function signalsFromFeatures(features, parameters) {
  const signals = new Array(features.length).fill(0);
  let direction = 0;
  let remaining = 0;
  let cooldown = 0;
  for (let index = parameters.lookback; index < features.length; index += 1) {
    if (direction === 0) {
      if (cooldown > 0) cooldown -= 1;
      else {
        const signal = causalTransportSignal(features[index], parameters);
        if (signal.position !== 0) {
          direction = signal.position;
          remaining = parameters.holdBars;
        }
      }
    }
    if (direction !== 0) {
      signals[index] = direction;
      remaining -= 1;
      if (remaining === 0) {
        direction = 0;
        cooldown = parameters.cooldownBars;
      }
    }
  }
  return signals;
}

export function defaultCausalTransportGrid() {
  const output = [];
  for (const lookback of [12, 24, 48])
    for (const mode of MODES)
      for (const phaseThreshold of mode === "persistent-trend" ? [0.25, 0.4] : [0.6, 0.75])
        for (const minimumDirectionalStrength of [0.25, 0.4])
          for (const minimumOrderingDominance of [0.52, 0.6])
            for (const holdBars of [2, 4])
              for (const cooldownBars of [1, 2]) output.push({ lookback, mode, phaseThreshold,
                minimumDirectionalStrength, minimumOrderingDominance, deadband: 0.1, holdBars, cooldownBars });
  return output;
}

function metrics(candles, parameters, start, end, costs, leverage = 1, frozenSignals = null) {
  const signals = frozenSignals ?? causalTransportSignalSeries(candles, parameters).signals;
  return simulateFrozenSignals(candles, signals, start, end, { ...costs, leverage });
}

export function selectBtcCausalTransportModel(candlesInput, options = {}) {
  const candles = normalizeCandlesInput(candlesInput);
  const developmentFraction = finite("developmentFraction", options.developmentFraction ?? 0.7, 0.5, 0.8);
  const developmentEnd = Math.floor(candles.length * developmentFraction);
  const rawGrid = options.parameterGrid ?? defaultCausalTransportGrid();
  if (!Array.isArray(rawGrid) || rawGrid.length < 1 || rawGrid.length > 512) {
    throw new TypeError("parameterGrid must contain 1 through 512 candidates");
  }
  const grid = rawGrid.map(normalizeParameters);
  const commonStart = Math.max(...grid.map(({ lookback }) => lookback)) + 1;
  if (developmentEnd < commonStart + 100 || candles.length - developmentEnd < 20) {
    throw new TypeError("insufficient BTC candles for predeclared development and diagnostic partitions");
  }
  const costs = normalizeCosts(options.costs);
  const minimumDevelopmentTrades = integer("minimumDevelopmentTrades", options.minimumDevelopmentTrades ?? 8, 1, 10_000);
  const featureCache = new Map();
  const candidates = grid.map((parameters) => {
    const featureKey = `${parameters.lookback}:${parameters.deadband}`;
    if (!featureCache.has(featureKey)) featureCache.set(featureKey, featureSeries(candles, parameters));
    const signals = signalsFromFeatures(featureCache.get(featureKey), parameters);
    const development = metrics(candles, parameters, commonStart, developmentEnd, costs, 1, signals);
    return { parameters, development, eligible: !development.liquidated
      && development.tradeCount >= minimumDevelopmentTrades,
    score: development.netReturn - development.maximumDrawdown - (development.turnoverOperations / 1_000_000) };
  }).sort((left, right) => (right.eligible - left.eligible) || (right.score - left.score)
    || parameterKey(left.parameters).localeCompare(parameterKey(right.parameters)));
  const selected = candidates.find(({ eligible }) => eligible) ?? null;
  const selectedSignals = selected == null ? null
    : signalsFromFeatures(featureCache.get(`${selected.parameters.lookback}:${selected.parameters.deadband}`),
      selected.parameters);
  const diagnostic = selected == null ? null
    : metrics(candles, selected.parameters, developmentEnd, candles.length, costs, 1, selectedSignals);
  const selectionBody = {
    profile: PROFILE,
    sourceAsset: "BTC",
    developmentPartition: [commonStart, developmentEnd],
    btcDiagnosticPartition: [developmentEnd, candles.length],
    btcDiagnosticConsumedForSelection: false,
    selectionRule: "maximize BTC-development netReturn-minus-drawdown-minus-turnover; minimum trades and no liquidation; lexical parameter tie-break",
    selectedParameters: selected?.parameters ?? null,
    selectedDevelopment: selected?.development ?? null,
    btcDiagnostic: diagnostic,
    candidateCount: candidates.length,
    minimumDevelopmentTrades,
    costs,
  };
  return deepFreeze({ id: semanticId("agrodao.causal-transport-backtest-selection", selectionBody), ...selectionBody });
}

function validateFrozenSelection(selection) {
  if (selection == null || typeof selection !== "object" || selection.profile !== PROFILE
    || typeof selection.id !== "string" || !NI.test(selection.id) || selection.sourceAsset !== "BTC") {
    throw new TypeError("selection must be a content-identified BTC causal-transport selection");
  }
  const { id, ...body } = selection;
  if (semanticId("agrodao.causal-transport-backtest-selection", body) !== id) {
    throw new TypeError("selection identity does not match its frozen content");
  }
  if (selection.selectedParameters == null) throw new TypeError("selection has no eligible frozen model");
  return normalizeParameters(selection.selectedParameters);
}

function metricAdmits(value, costs, gate) {
  return !value.liquidated && value.tradeCount >= gate.minimumHoldoutTrades
    && value.netReturn > 0 && value.maximumDrawdown <= gate.maximumHoldoutDrawdown
    && (value.profitFactor == null || value.profitFactor > 1)
    && value.minimumMarginRatio != null
    && value.minimumMarginRatio >= costs.maintenanceMarginRate * gate.minimumMarginMultiple;
}

export function evaluateFrozenCausalTransport(selection, ethCandlesInput, options = {}) {
  const parameters = validateFrozenSelection(selection);
  const candles = normalizeCandlesInput(ethCandlesInput);
  const transportFraction = finite("transportFraction", options.transportFraction ?? 0.8, 0.65, 0.9);
  const transportEnd = Math.floor(candles.length * transportFraction);
  const start = parameters.lookback + 1;
  if (transportEnd < start + 100 || candles.length - transportEnd < 20) {
    throw new TypeError("insufficient ETH candles for predeclared transport and temporal holdouts");
  }
  const costs = normalizeCosts(options.costs ?? selection.costs);
  const stressedCosts = { ...costs, impactSpreadBps: costs.impactSpreadBps * 2,
    borrowFundingAnnualBps: costs.borrowFundingAnnualBps * 2,
    executionUsdPerOrder: costs.executionUsdPerOrder * 1.5 };
  const gateParameters = {
    minimumHoldoutTrades: integer("minimumHoldoutTrades", options.minimumHoldoutTrades ?? 5, 1, 10_000),
    maximumHoldoutDrawdown: finite("maximumHoldoutDrawdown", options.maximumHoldoutDrawdown ?? 0.2, 0, 1),
    minimumMarginMultiple: finite("minimumMarginMultiple", options.minimumMarginMultiple ?? 2, 1, 10),
  };
  const leverageGrid = options.leverageGrid ?? [1, 1.5, 2];
  if (!Array.isArray(leverageGrid) || leverageGrid.length < 1 || leverageGrid.length > 8
    || leverageGrid.some((value) => !Number.isFinite(value) || value < 1 || value > 10)
    || new Set(leverageGrid).size !== leverageGrid.length) {
    throw new TypeError("leverageGrid must contain one through eight unique values from 1 through 10");
  }
  const frozenSignals = causalTransportSignalSeries(candles, parameters).signals;
  const assays = [...leverageGrid].sort((left, right) => left - right).map((leverage) => {
    const transportValidation = metrics(candles, parameters, start, transportEnd, costs, leverage, frozenSignals);
    const stressedTransportValidation = metrics(candles, parameters, start, transportEnd, stressedCosts, leverage, frozenSignals);
    const temporalHoldout = metrics(candles, parameters, transportEnd, candles.length, costs, leverage, frozenSignals);
    const stressedTemporalHoldout = metrics(candles, parameters, transportEnd, candles.length, stressedCosts, leverage, frozenSignals);
    const modelAdmits = [transportValidation, stressedTransportValidation, temporalHoldout,
      stressedTemporalHoldout].every((value) => metricAdmits(value, costs, gateParameters));
    return { leverage, transportValidation, stressedTransportValidation, temporalHoldout,
      stressedTemporalHoldout, modelAdmits };
  });
  const unlevered = assays.find(({ leverage }) => leverage === 1) ?? null;
  const evidenceAdmits = unlevered?.modelAdmits === true;
  return {
    profile: PROFILE,
    outcome: "completed-causal-transport-research-assay",
    frozenSelectionId: selection.id,
    selectedParameters: parameters,
    formalAnchors: {
      cocyclePullback: "Obsmetrologia.CausalSets.Dimension.Manifoldlikeness.pullback_cocycle",
      classPullback: "Obsmetrologia.CausalSets.Causal.MLDClassification.pullback_sameClass",
      valuationClosureNaturality: "Obsmetrologia.Claim.TermContext.Hom.pullbackValuation_liftOp",
    },
    interpretation: "empirical cross-asset transportability test; the Lean pullback laws do not identify BTC and ETH market processes or prove transferable alpha",
    accessOrder: ["select-model-from-BTC-development", "freeze-selection-id", "fetch-and-evaluate-ETH"],
    partitionBoundaryTreatment: "each partition starts with fresh equity and may use only causally prior feature and hold-state warmup",
    targetAsset: "ETH",
    partitions: { transportValidation: [start, transportEnd], temporalHoldout: [transportEnd, candles.length] },
    costs,
    stressedCosts,
    gateParameters,
    leverageAssays: assays,
    gate: { evidenceAdmits, leverageAdmitted: false, executionAdmitted: false,
      reasons: evidenceAdmits
        ? ["cross-asset-and-temporal-research-evidence-only", "separate-current-preflight-and-human-authority-required"]
        : ["cross-asset-or-temporal-cost-funding-liquidation-stress-gate-failed", "no-capital-admission"] },
    observationOnly: true,
    credentialAccess: false,
    signerMaterialAccepted: false,
    transactionAssembly: false,
    signing: false,
    broadcast: false,
    chainMutation: false,
  };
}

function normalizeEvidence(observed, expectedToken) {
  if (observed == null || typeof observed !== "object" || Array.isArray(observed)) {
    throw new TypeError(`${expectedToken} observed evidence must be an object`);
  }
  const source = new URL(observed.source);
  if (source.protocol !== "https:" || source.username || source.password
    || source.origin !== "https://arbitrum-api.gmxinfra.io" || source.pathname !== "/prices/candles") {
    throw new TypeError("observed source must be the credential-free official GMX candle endpoint");
  }
  if (observed.tokenSymbol !== expectedToken || source.searchParams.get("tokenSymbol") !== expectedToken) {
    throw new TypeError(`observed source and tokenSymbol must bind ${expectedToken}`);
  }
  if (typeof observed.candleDigest !== "string" || !NI.test(observed.candleDigest)) {
    throw new TypeError("observed candleDigest must be a sha-256 ni URI");
  }
  if (!Array.isArray(observed.candles) || observed.candles.length < 3) {
    throw new TypeError("observed candles must be a bounded candle array");
  }
  return { source: source.href, tokenSymbol: observed.tokenSymbol, period: observed.period,
    candleDigest: observed.candleDigest, candleCount: observed.candles.length,
    sourceDisclosures: observed.sourceDisclosures };
}

export async function recordCausalTransportResearchAssay(observed, selection, options = {}) {
  const btcEvidence = normalizeEvidence(observed?.btc, "BTC");
  const ethEvidence = normalizeEvidence(observed?.eth, "ETH");
  validateFrozenSelection(selection);
  const assay = evaluateFrozenCausalTransport(selection, observed.eth.candles, options.backtest);
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const evidence = { btc: btcEvidence, eth: ethEvidence };
  const result = { id: semanticId("agrodao.causal-transport-backtest-result", { evidence, selection, assay }), ...assay };
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("causal transport research requires AGRODAO's contracted settlement store");
  }
  const record = { type: "ObsmetrologiaCausalTransportResearchAssayRecord", owner: "urn:ame:agrodao",
    evidence, frozenSelection: selection, assay: result, recordedAt,
    decisionBoundary: { researchOnly: true, leverageAdmitted: false, executionAdmitted: false,
      transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export async function recordCausalTransportCapitalDecision(assay, options = {}) {
  if (assay == null || assay.profile !== PROFILE || typeof assay.id !== "string" || !NI.test(assay.id)
    || typeof assay.frozenSelectionId !== "string" || !NI.test(assay.frozenSelectionId)
    || typeof assay.gate?.evidenceAdmits !== "boolean" || !Array.isArray(assay.gate.reasons)) {
    throw new TypeError("capital decision requires a content-identified causal-transport assay and gate");
  }
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const decision = {
    type: "StrategyCapitalAdmissionDecision",
    owner: "urn:ame:agrodao",
    strategyFamily: "obsmetrologia-causal-transport",
    assay: assay.id,
    frozenSelection: assay.frozenSelectionId,
    evidenceAdmits: assay.gate.evidenceAdmits,
    disposition: "reject-capital-admission",
    reasons: assay.gate.evidenceAdmits
      ? ["research-passing-is-not-capital-authority", "separate-current-preflight-and-human-authority-required"]
      : [...assay.gate.reasons],
    leverageAdmitted: false,
    executionAdmitted: false,
    transactionAssembly: false,
    signing: false,
    broadcast: false,
    chainMutation: false,
    recordedAt,
  };
  const store = options.store ?? createSettlementStore({ settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("capital decision requires AGRODAO's contracted settlement store");
  }
  const projection = await store.record({ category: CAPITAL_DECISION_CATEGORY, recordedAt, record: decision });
  return { decision, projection };
}

export const OBSMETROLOGIA_CAUSAL_TRANSPORT_BACKTEST_PROFILE = PROFILE;
export const OBSMETROLOGIA_CAUSAL_TRANSPORT_RECORD_CATEGORY = RECORD_CATEGORY;
export const OBSMETROLOGIA_CAUSAL_TRANSPORT_CAPITAL_DECISION_CATEGORY = CAPITAL_DECISION_CATEGORY;
