import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;
import { createSettlementStore } from "./settlement-witness.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCausalFeatureSeries,
  simulateFrozenSignals,
} from "./obsmetrologia-causal-sheaf-backtest.mjs";

const PROFILE = "org.emsenn.agrodao.obsmetrologia-curvature-release-backtest.v1";
const DEFAULT_WINDOWS = Object.freeze([8, 16, 32]);
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECORD_CATEGORY = "agrodao.obsmetrologia-curvature-release-research-assay";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

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
  return {
    minimumStrength: finite("minimumStrength", raw.minimumStrength, 0, 1),
    maximumResolvedDispersion: finite("maximumResolvedDispersion", raw.maximumResolvedDispersion, 0, 1),
    minimumPriorDispersion: finite("minimumPriorDispersion", raw.minimumPriorDispersion, 0, 1),
    minimumEnergyDrop: finite("minimumEnergyDrop", raw.minimumEnergyDrop, 0, 1),
    minimumDiffraction: finite("minimumDiffraction", raw.minimumDiffraction, 0, 1),
    holdBars: integer("holdBars", raw.holdBars, 1, 64),
    cooldownBars: integer("cooldownBars", raw.cooldownBars, 0, 64),
  };
}

function geometry(feature, parameters) {
  if (feature == null) return null;
  const strengths = feature.sections.map(({ directionScore }) => Math.abs(directionScore));
  const directions = feature.sections.map(({ directionScore }) => Math.abs(directionScore) >= parameters.minimumStrength
    ? Math.sign(directionScore) : 0);
  const nonzero = directions.filter((direction) => direction !== 0);
  const directionGlues = nonzero.length === directions.length
    && directions.every((direction) => direction === directions[0]);
  const hasConflict = nonzero.includes(1) && nonzero.includes(-1);
  const dispersion = Math.max(...strengths) - Math.min(...strengths);
  const meanEnergy = feature.sections.reduce((sum, section) => sum + section.freeEnergy, 0) / feature.sections.length;
  const minimumDiffraction = Math.min(...feature.sections.map((section) => section.diffractionConcentration));
  return { strengths, directions, directionGlues, hasConflict, dispersion, meanEnergy, minimumDiffraction,
    direction: directionGlues ? directions[0] : 0 };
}

export function curvatureReleaseEvent(previousFeature, currentFeature, rawParameters) {
  const parameters = normalizeParameters(rawParameters);
  const previous = geometry(previousFeature, parameters);
  const current = geometry(currentFeature, parameters);
  if (previous == null || current == null) return { position: 0, release: false, reason: "insufficient-history" };
  const priorCurved = previous.hasConflict || previous.dispersion >= parameters.minimumPriorDispersion;
  const resolved = current.directionGlues && current.dispersion <= parameters.maximumResolvedDispersion;
  const energyDrop = previous.meanEnergy - current.meanEnergy;
  const energySettles = energyDrop >= parameters.minimumEnergyDrop;
  const diffractionAdmits = current.minimumDiffraction >= parameters.minimumDiffraction;
  const release = priorCurved && resolved && energySettles && diffractionAdmits;
  return { position: release ? current.direction : 0, release, priorCurved, resolved, energySettles,
    diffractionAdmits, energyDrop, priorDispersion: previous.dispersion,
    resolvedDispersion: current.dispersion, direction: current.direction,
    formalProjectionLimits: [
      "empirical-ordering-fractions-are-not-a-Lean-causal-set-proof",
      "curvature-release-is-a-temporal-market-projection",
      "inversion-mass-is-not-Obsmetrologia-Valuation.freeEnergy",
      "finite-DFT-concentration-is-not-finiteDiffractionMass",
    ] };
}

export function curvatureReleaseSignalSeries(features, rawParameters) {
  const parameters = normalizeParameters(rawParameters);
  if (!Array.isArray(features) || features.length < 3) throw new TypeError("features must contain at least three entries");
  const signals = new Array(features.length).fill(0);
  const releases = [];
  let activeDirection = 0;
  let remaining = 0;
  let cooldown = 0;
  for (let index = 1; index < features.length; index += 1) {
    const current = geometry(features[index], parameters);
    if (activeDirection !== 0) {
      const shortestDirection = current?.directions[0] ?? 0;
      const opposingShortOrder = shortestDirection === -activeDirection;
      const curvatureReturned = current == null
        || current.dispersion > Math.min(1, parameters.minimumPriorDispersion + parameters.maximumResolvedDispersion);
      if (opposingShortOrder || curvatureReturned) {
        activeDirection = 0;
        remaining = 0;
        cooldown = parameters.cooldownBars;
      }
    }
    if (activeDirection === 0) {
      if (cooldown > 0) cooldown -= 1;
      else {
        const event = curvatureReleaseEvent(features[index - 1], features[index], parameters);
        if (event.release) {
          activeDirection = event.position;
          remaining = parameters.holdBars;
          releases.push({ index, ...event });
        }
      }
    }
    if (activeDirection !== 0 && remaining > 0) {
      signals[index] = activeDirection;
      remaining -= 1;
      if (remaining === 0) {
        activeDirection = 0;
        cooldown = parameters.cooldownBars;
      }
    }
  }
  return { parameters, signals, releases };
}

function parameterKey(parameters) {
  return [parameters.minimumStrength, parameters.maximumResolvedDispersion, parameters.minimumPriorDispersion,
    parameters.minimumEnergyDrop, parameters.minimumDiffraction, parameters.holdBars]
    .concat(parameters.cooldownBars)
    .map((value) => typeof value === "number" ? value.toFixed(6) : String(value)).join(":");
}

export function defaultCurvatureReleaseGrid() {
  const output = [];
  for (const minimumStrength of [0.1, 0.2])
    for (const maximumResolvedDispersion of [0.1, 0.2])
      for (const minimumPriorDispersion of [0.15, 0.3])
        for (const minimumEnergyDrop of [0, 0.01])
          for (const minimumDiffraction of [0.25, 0.5])
            for (const holdBars of [2, 4, 8])
              for (const cooldownBars of [2, 4]) output.push({ minimumStrength, maximumResolvedDispersion,
                minimumPriorDispersion, minimumEnergyDrop, minimumDiffraction, holdBars, cooldownBars });
  return output;
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

function metrics(candles, features, parameters, start, end, costs, leverage = 1) {
  const { signals } = curvatureReleaseSignalSeries(features, parameters);
  return simulateFrozenSignals(candles, signals, start, end, { ...costs, leverage });
}

export function anchoredCurvatureReleaseBacktest(candlesInput, options = {}) {
  const featureSet = buildCausalFeatureSeries(candlesInput, {
    windows: options.windows ?? DEFAULT_WINDOWS,
    lowFrequencyBins: options.lowFrequencyBins ?? 2,
  });
  const { candles, features, windows } = featureSet;
  if (candles.length < windows.at(-1) + 100) throw new TypeError("insufficient candles for bounded train/validation/test partitions");
  const trainEnd = Math.floor(candles.length * finite("trainFraction", options.trainFraction ?? 0.5, 0.35, 0.75));
  const validationEnd = Math.floor(candles.length * finite("validationFraction", options.validationFraction ?? 0.7,
    (trainEnd / candles.length) + 0.1, 0.9));
  const start = windows.at(-1) + 1;
  const rawGrid = options.parameterGrid ?? defaultCurvatureReleaseGrid();
  if (!Array.isArray(rawGrid) || rawGrid.length === 0 || rawGrid.length > 512) {
    throw new TypeError("parameterGrid must contain 1 through 512 candidates");
  }
  const grid = rawGrid.map(normalizeParameters);
  const costs = normalizeCosts(options.costs);
  const minimumTrainTrades = integer("minimumTrainTrades", options.minimumTrainTrades ?? 6, 1, 10_000);
  const candidates = grid.map((parameters) => {
    const train = metrics(candles, features, parameters, start, trainEnd, costs, 1);
    return { parameters, train, eligible: !train.liquidated && train.tradeCount >= minimumTrainTrades,
      score: train.netReturn - train.maximumDrawdown - (train.turnoverOperations / 1_000_000) };
  }).sort((left, right) => (right.eligible - left.eligible) || (right.score - left.score)
    || parameterKey(left.parameters).localeCompare(parameterKey(right.parameters)));
  const selected = candidates.find(({ eligible }) => eligible) ?? null;
  const boundary = {
    observationOnly: true,
    credentialAccess: false,
    signerMaterialAccepted: false,
    transactionAssembly: false,
    signing: false,
    broadcast: false,
    chainMutation: false,
  };
  if (selected == null) return { profile: PROFILE, outcome: "no-eligible-training-candidate",
    candidateCount: candidates.length, minimumTrainTrades, bestIneligible: candidates[0],
    gate: { evidenceAdmits: false, leverageAdmitted: false, executionAdmitted: false,
      reasons: ["no-eligible-training-candidate", "no-capital-admission"] }, ...boundary };
  const validation = metrics(candles, features, selected.parameters, trainEnd, validationEnd, costs, 1);
  const test = metrics(candles, features, selected.parameters, validationEnd, candles.length, costs, 1);
  const stressedCosts = { ...costs, impactSpreadBps: costs.impactSpreadBps * 2,
    borrowFundingAnnualBps: costs.borrowFundingAnnualBps * 2,
    executionUsdPerOrder: costs.executionUsdPerOrder * 1.5 };
  const stressedTest = metrics(candles, features, selected.parameters, validationEnd, candles.length, stressedCosts, 1);
  const minimumOosTrades = integer("minimumOosTrades", options.minimumOosTrades ?? 3, 1, 10_000);
  const maximumOosDrawdown = finite("maximumOosDrawdown", options.maximumOosDrawdown ?? 0.2, 0, 1);
  const minimumMarginMultiple = finite("minimumMarginMultiple", options.minimumMarginMultiple ?? 2, 1, 10);
  const metricAdmits = (value) => !value.liquidated && value.tradeCount >= minimumOosTrades
    && value.netReturn > 0 && value.maximumDrawdown <= maximumOosDrawdown
    && (value.profitFactor == null || value.profitFactor > 1)
    && value.minimumMarginRatio != null
    && value.minimumMarginRatio >= costs.maintenanceMarginRate * minimumMarginMultiple;
  const evidenceAdmits = metricAdmits(validation) && metricAdmits(test) && metricAdmits(stressedTest);
  const leverageGrid = options.leverageGrid ?? [1, 1.5, 2];
  if (!Array.isArray(leverageGrid) || leverageGrid.length === 0 || leverageGrid.length > 8
    || leverageGrid.some((value) => !Number.isFinite(value) || value < 1 || value > 10)
    || new Set(leverageGrid).size !== leverageGrid.length) {
    throw new TypeError("leverageGrid must contain one through eight unique values from 1 through 10");
  }
  const leverageAssays = [...leverageGrid].sort((a, b) => a - b).map((leverage) => {
    const leveragedValidation = metrics(candles, features, selected.parameters, trainEnd, validationEnd, costs, leverage);
    const leveragedTest = metrics(candles, features, selected.parameters, validationEnd, candles.length, costs, leverage);
    const leveragedStress = metrics(candles, features, selected.parameters, validationEnd, candles.length, stressedCosts, leverage);
    return { leverage, validation: leveragedValidation, test: leveragedTest, stressedTest: leveragedStress,
      modelAdmits: evidenceAdmits && metricAdmits(leveragedValidation) && metricAdmits(leveragedTest)
        && metricAdmits(leveragedStress) };
  });
  const modeled = leverageAssays.filter(({ modelAdmits }) => modelAdmits);
  return { profile: PROFILE, outcome: "completed-curvature-release-research-assay",
    formalAnchors: {
      causalAsymmetry: "Obsmetrologia.CausalSets.Causal.Order.CausalSet.reaches_asymm",
      orderingFraction: "Obsmetrologia.CausalSets.Dimension.OrderingFraction.orderingFraction",
      geometryIndependentOfTopology: "Obsmetrologia.CausalSets.Dimension.OrderingFraction.geometry_independent_of_topology",
      separatedSections: "Obsmetrologia.Sheaf.separated",
      curvatureRank: "Obsmetrologia.Flow.CurvatureRegime.curvatureRank",
      freeEnergyAntitone: "Obsmetrologia.Valuation.freeEnergy_antitone",
      finiteDiffractionMass: "Obsmetrologia.AperiodicOrder.Tiling.finiteDiffractionMass_mono",
    },
    interpretation: "operational empirical transition projection; not a proof that market candles satisfy the Lean hypotheses",
    partitions: { train: [start, trainEnd], validation: [trainEnd, validationEnd], test: [validationEnd, candles.length] },
    selectionRule: "maximize train netReturn-minus-drawdown-minus-turnover; minimum trades; lexical parameter tie-break",
    selectedParameters: selected.parameters, candidateCount: candidates.length,
    costs, stressedCosts, train: selected.train, validation, test, stressedTest,
    leverageAssays, highestModeledLeverage: modeled.length === 0 ? null : modeled.at(-1).leverage,
    minimumTrainTrades, minimumOosTrades, maximumOosDrawdown, minimumMarginMultiple,
    gate: { evidenceAdmits, leverageAdmitted: false, executionAdmitted: false,
      reasons: evidenceAdmits
        ? ["research-evidence-only", "leverage-model-is-not-capital-authority", "separate-current-preflight-and-human-authority-required"]
        : ["out-of-sample-or-cost-funding-liquidation-stress-gate-failed", "no-capital-admission"] },
    ...boundary };
}

export async function recordCurvatureReleaseResearchAssay(observed, options = {}) {
  if (observed == null || typeof observed !== "object" || Array.isArray(observed)) {
    throw new TypeError("observed candle evidence must be an object");
  }
  const source = new URL(observed.source);
  if (source.protocol !== "https:" || source.username || source.password
    || source.origin !== "https://arbitrum-api.gmxinfra.io" || source.pathname !== "/prices/candles") {
    throw new TypeError("observed source must be the credential-free official GMX candle endpoint");
  }
  if (typeof observed.candleDigest !== "string" || !NI.test(observed.candleDigest)) {
    throw new TypeError("observed candleDigest must be a sha-256 ni URI");
  }
  if (!Array.isArray(observed.candles) || observed.candles.length < 3) {
    throw new TypeError("observed candles must be a bounded candle array");
  }
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const assay = anchoredCurvatureReleaseBacktest(observed.candles, options.backtest);
  const evidence = {
    source: source.href,
    tokenSymbol: observed.tokenSymbol,
    period: observed.period,
    candleDigest: observed.candleDigest,
    candleCount: observed.candles.length,
    sourceDisclosures: observed.sourceDisclosures,
  };
  const result = { id: semanticId("agrodao.curvature-release-backtest-result", { evidence, assay }), ...assay };
  const store = options.store ?? createSettlementStore({
    settlementRoot: NODE_ROOT,
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT,
  });
  if (store.actor !== "urn:ame:agrodao" || typeof store.record !== "function") {
    throw new TypeError("curvature release research requires AGRODAO's contracted settlement store");
  }
  const record = { type: "ObsmetrologiaCurvatureReleaseResearchAssayRecord",
    owner: "urn:ame:agrodao", evidence, assay: result, recordedAt,
    decisionBoundary: { researchOnly: true, leverageAdmitted: false, executionAdmitted: false,
      transactionAssembly: false, signing: false, broadcast: false, chainMutation: false } };
  const projection = await store.record({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const OBSMETROLOGIA_CURVATURE_RELEASE_BACKTEST_PROFILE = PROFILE;
export const OBSMETROLOGIA_CURVATURE_RELEASE_RECORD_CATEGORY = RECORD_CATEGORY;
