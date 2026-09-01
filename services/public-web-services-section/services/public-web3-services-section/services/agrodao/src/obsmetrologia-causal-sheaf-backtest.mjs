import { createHash } from "node:crypto";

const PROFILE = "org.emsenn.agrodao.obsmetrologia-causal-sheaf-backtest.v1";
const GMX_CANDLES = "https://arbitrum-api.gmxinfra.io/prices/candles";
const YEAR_SECONDS = 365.25 * 24 * 60 * 60;
const DEFAULT_WINDOWS = Object.freeze([16, 32, 64]);
const PERIOD_SECONDS = Object.freeze({ "1m": 60, "5m": 300, "15m": 900, "1h": 3_600,
  "4h": 14_400, "1d": 86_400 });

function finite(name, value, minimum = -Infinity, maximum = Infinity) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be finite from ${minimum} through ${maximum}`);
  }
  return value;
}

function integer(name, value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function normalizeCandle(row, index) {
  if (!Array.isArray(row) || row.length !== 5) throw new Error(`candles[${index}] must be [timestamp,open,high,low,close]`);
  const timestamp = integer(`candles[${index}].timestamp`, row[0], 1, Number.MAX_SAFE_INTEGER);
  const [open, rawHigh, rawLow, close] = row.slice(1).map((value, field) => finite(`candles[${index}][${field + 1}]`, value, Number.MIN_VALUE));
  if (rawLow > rawHigh) throw new Error(`candles[${index}] has an inverted raw high-low range`);
  return { timestamp, open, high: Math.max(rawHigh, open, close), low: Math.min(rawLow, open, close), close };
}

export function normalizeGmxCandles(rows) {
  if (!Array.isArray(rows) || rows.length < 3) throw new Error("candles must contain at least three rows");
  const candles = rows.map(normalizeCandle).sort((a, b) => a.timestamp - b.timestamp);
  for (let index = 1; index < candles.length; index += 1) {
    if (candles[index].timestamp <= candles[index - 1].timestamp) throw new Error("candle timestamps must be unique");
  }
  return candles;
}

export async function fetchGmxCandles({ tokenSymbol = "BTC", period = "4h", limit = 10_000 } = {}, fetchImpl = fetch) {
  if (!/^[A-Z0-9]{2,16}$/u.test(tokenSymbol)) throw new Error("tokenSymbol must be bounded uppercase text");
  if (!["1m", "5m", "15m", "1h", "4h", "1d"].includes(period)) throw new Error("unsupported GMX candle period");
  integer("limit", limit, 3, 10_000);
  const url = new URL(GMX_CANDLES);
  url.searchParams.set("tokenSymbol", tokenSymbol);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(limit));
  const response = await fetchImpl(url, { method: "GET", headers: { accept: "application/json",
    "user-agent": "@red-cup-engineering/agrodao public-research" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`GMX candle HTTP ${response.status}`);
  const body = await response.json();
  if (body?.period !== period) throw new Error("GMX candle response changed the requested period");
  if (!Array.isArray(body.candles) || body.candles.length > limit) throw new Error("GMX candle response exceeded the bounded request");
  const ohlcBoundaryRepairCount = (body.candles ?? []).filter((row) => Array.isArray(row) && row.length === 5
    && (row[2] < Math.max(row[1], row[4]) || row[3] > Math.min(row[1], row[4]))).length;
  const candles = normalizeGmxCandles(body.candles);
  const gaps = candles.slice(1).map((candle, index) => candle.timestamp - candles[index].timestamp)
    .filter((seconds) => seconds !== PERIOD_SECONDS[period]);
  const digest = createHash("sha256").update(JSON.stringify(candles)).digest("base64url");
  return { source: url.href, tokenSymbol, period, candleDigest: `ni:///sha-256;${digest}`,
    sourceDisclosures: { ohlcBoundaryRepairCount, nonstandardIntervalCount: gaps.length,
      maximumIntervalSeconds: gaps.length === 0 ? PERIOD_SECONDS[period] : Math.max(...gaps),
    repair: "high=max(rawHigh,open,close);low=min(rawLow,open,close);strategy-uses-open-close-only" },
    candles };
}

export function diffractionConcentration(prices, lowFrequencyBins = 2) {
  if (!Array.isArray(prices) || prices.length < 4) throw new Error("diffraction input requires at least four prices");
  integer("lowFrequencyBins", lowFrequencyBins, 1, Math.floor(prices.length / 2));
  const logs = prices.map((price, index) => Math.log(finite(`prices[${index}]`, price, Number.MIN_VALUE)));
  const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
  const centered = logs.map((value) => value - mean);
  let totalPower = 0;
  let lowPower = 0;
  for (let frequency = 1; frequency <= Math.floor(centered.length / 2); frequency += 1) {
    let real = 0;
    let imaginary = 0;
    for (let time = 0; time < centered.length; time += 1) {
      const angle = -2 * Math.PI * frequency * time / centered.length;
      real += centered[time] * Math.cos(angle);
      imaginary += centered[time] * Math.sin(angle);
    }
    const power = (real * real) + (imaginary * imaginary);
    totalPower += power;
    if (frequency <= lowFrequencyBins) lowPower += power;
  }
  return totalPower <= Number.EPSILON ? 0 : lowPower / totalPower;
}

export function causalWindowFeatures(prices, lowFrequencyBins = 2) {
  if (!Array.isArray(prices) || prices.length < 4) throw new Error("causal window requires at least four prices");
  let bullishPairs = 0;
  let bearishPairs = 0;
  for (let left = 0; left < prices.length; left += 1) {
    finite(`prices[${left}]`, prices[left], Number.MIN_VALUE);
    for (let right = left + 1; right < prices.length; right += 1) {
      if (prices[left] < prices[right]) bullishPairs += 1;
      else if (prices[left] > prices[right]) bearishPairs += 1;
    }
  }
  const pairCount = prices.length * (prices.length - 1) / 2;
  const bullishOrderingFraction = bullishPairs / pairCount;
  const bearishOrderingFraction = bearishPairs / pairCount;
  const directionScore = bullishOrderingFraction - bearishOrderingFraction;
  return { pairCount, bullishPairs, bearishPairs, bullishOrderingFraction, bearishOrderingFraction,
    directionScore, dominantOrderingFraction: Math.max(bullishOrderingFraction, bearishOrderingFraction),
    freeEnergy: Math.min(bullishPairs, bearishPairs) / pairCount,
    diffractionConcentration: diffractionConcentration(prices, lowFrequencyBins) };
}

function normalizeWindows(values) {
  if (!Array.isArray(values) || values.length < 2 || values.length > 8) throw new Error("windows must contain two through eight entries");
  const windows = values.map((value, index) => integer(`windows[${index}]`, value, 4, 512)).sort((a, b) => a - b);
  if (new Set(windows).size !== windows.length) throw new Error("windows must be unique");
  return windows;
}

export function buildCausalFeatureSeries(candles, options = {}) {
  const normalized = candles.map((candle, index) => normalizeCandle(
    Array.isArray(candle) ? candle : [candle.timestamp, candle.open, candle.high, candle.low, candle.close], index));
  const windows = normalizeWindows(options.windows ?? DEFAULT_WINDOWS);
  const lowFrequencyBins = integer("lowFrequencyBins", options.lowFrequencyBins ?? 2, 1, Math.floor(windows[0] / 2));
  const features = new Array(normalized.length).fill(null);
  const previousEnergy = new Map();
  for (let index = windows.at(-1) - 1; index < normalized.length; index += 1) {
    const sections = windows.map((window) => {
      const closes = normalized.slice(index - window + 1, index + 1).map((candle) => candle.close);
      const value = causalWindowFeatures(closes, lowFrequencyBins);
      const prior = previousEnergy.get(window);
      previousEnergy.set(window, value.freeEnergy);
      return { window, ...value, previousFreeEnergy: prior ?? null };
    });
    features[index] = { timestamp: normalized[index].timestamp, sections };
  }
  return { candles: normalized, windows, lowFrequencyBins, features };
}

function normalizeParameters(parameters) {
  return { minimumStrength: finite("minimumStrength", parameters.minimumStrength, 0, 1),
    maximumDispersion: finite("maximumDispersion", parameters.maximumDispersion, 0, 1),
    minimumDiffraction: finite("minimumDiffraction", parameters.minimumDiffraction, 0, 1),
    energyTolerance: finite("energyTolerance", parameters.energyTolerance ?? 0, 0, 0.25) };
}

export function causalSheafSignal(feature, parameters) {
  const params = normalizeParameters(parameters);
  if (feature == null) return { position: 0, regime: "unavailable", reason: "insufficient-history" };
  const directions = feature.sections.map((section) => Math.abs(section.directionScore) >= params.minimumStrength
    ? Math.sign(section.directionScore) : 0);
  const strengths = feature.sections.map((section) => Math.abs(section.directionScore));
  const directionGlues = directions.every((direction) => direction !== 0 && direction === directions[0]);
  const dispersion = Math.max(...strengths) - Math.min(...strengths);
  const strengthGlues = dispersion <= params.maximumDispersion;
  const energySettles = feature.sections.every((section) => section.previousFreeEnergy != null
    && section.freeEnergy <= section.previousFreeEnergy + params.energyTolerance);
  const diffractionAdmits = feature.sections.every((section) => section.diffractionConcentration >= params.minimumDiffraction);
  const flat = directionGlues && strengthGlues;
  const position = flat && energySettles && diffractionAdmits ? directions[0] : 0;
  return { position, regime: flat ? "flat-rank-zero" : "curved-rank-none", directionGlues, strengthGlues,
    energySettles, diffractionAdmits, dispersion, minimumStrengthObserved: Math.min(...strengths),
    minimumDiffractionObserved: Math.min(...feature.sections.map((section) => section.diffractionConcentration)),
    formalProjectionLimits: ["empirical-poset-not-a-Lean-ClosureRegime-proof",
      "free-energy-is-normalized-inversion-mass", "diffraction-is-a-finite-DFT-concentration"] };
}

function normalizeCosts(costs = {}) {
  return { positionFeeRate: finite("positionFeeRate", costs.positionFeeRate ?? 0.0006, 0, 0.01),
    impactSpreadBps: finite("impactSpreadBps", costs.impactSpreadBps ?? 3, 0, 1_000),
    borrowFundingAnnualBps: finite("borrowFundingAnnualBps", costs.borrowFundingAnnualBps ?? 2_000, 0, 100_000),
    executionUsdPerOrder: finite("executionUsdPerOrder", costs.executionUsdPerOrder ?? 0.25, 0, 1_000),
    startingEquityUsd: finite("startingEquityUsd", costs.startingEquityUsd ?? 10_000, 1, 1e12),
    leverage: finite("leverage", costs.leverage ?? 1, 1, 10),
    maintenanceMarginRate: finite("maintenanceMarginRate", costs.maintenanceMarginRate ?? 0.05, 0, 0.5) };
}

function tradingCostRate(costs) {
  return costs.positionFeeRate + (costs.impactSpreadBps / 10_000);
}

function openPosition(equity, costs) {
  const notional = Math.max(0, costs.leverage * (equity - costs.executionUsdPerOrder)
    / (1 + (costs.leverage * tradingCostRate(costs))));
  return { equity: notional / costs.leverage, notional };
}

function closePosition(equity, notional, costs) {
  return Math.max(0, equity - (notional * tradingCostRate(costs)) - costs.executionUsdPerOrder);
}

function performance(candles, signals, start, end, rawCosts) {
  const costs = normalizeCosts(rawCosts);
  integer("start", start, 1, candles.length - 2);
  integer("end", end, start + 2, candles.length);
  let equity = costs.startingEquityUsd;
  let grossEquity = costs.startingEquityUsd;
  let peak = equity;
  let maximumDrawdown = 0;
  let position = 0;
  let positionNotional = 0;
  let grossPositionNotional = 0;
  let entryEquity = null;
  let operations = 0;
  let exposedIntervals = 0;
  let liquidated = false;
  let liquidationIndex = null;
  let minimumMarginRatio = Infinity;
  const trades = [];
  for (let index = start; index < end; index += 1) {
    const desired = signals[index - 1] ?? 0;
    if (desired !== position) {
      let nextPosition = 0;
      if (position !== 0) {
        equity = closePosition(equity, positionNotional, costs);
        operations += 1;
        trades.push(equity - entryEquity);
        entryEquity = null;
        positionNotional = 0;
        grossPositionNotional = 0;
      }
      if (desired !== 0) {
        const beforeEntryCost = equity;
        const opened = openPosition(equity, costs);
        if (opened.notional > 0) {
          equity = opened.equity;
          positionNotional = opened.notional;
          grossPositionNotional = grossEquity * costs.leverage;
          operations += 1;
          entryEquity = beforeEntryCost;
          nextPosition = desired;
        }
      }
      position = nextPosition;
    }
    if (position !== 0 && equity > 0) {
      exposedIntervals += 1;
      const exitPrice = index + 1 < end ? candles[index + 1].open : candles[index].close;
      const grossReturn = position * ((exitPrice / candles[index].open) - 1);
      const nextTimestamp = index + 1 < end ? candles[index + 1].timestamp : candles[index].timestamp + 1;
      const heldSeconds = Math.max(1, nextTimestamp - candles[index].timestamp);
      const holdingRate = (costs.borrowFundingAnnualBps / 10_000) * heldSeconds / YEAR_SECONDS;
      const adversePrice = position > 0 ? Math.min(candles[index].low, exitPrice)
        : Math.max(candles[index].high, exitPrice);
      const adverseReturn = position * ((adversePrice / candles[index].open) - 1);
      const adverseEquity = equity + (positionNotional * adverseReturn) - (positionNotional * holdingRate);
      const marginRatio = adverseEquity / positionNotional;
      minimumMarginRatio = Math.min(minimumMarginRatio, marginRatio);
      if (adverseEquity <= positionNotional * costs.maintenanceMarginRate) {
        liquidated = true;
        liquidationIndex = index;
        equity = 0;
        grossEquity = 0;
        operations += 1;
        trades.push(-entryEquity);
        entryEquity = null;
        position = 0;
        positionNotional = 0;
        grossPositionNotional = 0;
      } else {
        grossEquity = Math.max(0, grossEquity + (grossPositionNotional * grossReturn));
        equity = Math.max(0, equity + (positionNotional * grossReturn) - (positionNotional * holdingRate));
      }
    }
    peak = Math.max(peak, equity);
    maximumDrawdown = Math.max(maximumDrawdown, peak === 0 ? 1 : (peak - equity) / peak);
  }
  if (position !== 0) {
    equity = closePosition(equity, positionNotional, costs);
    operations += 1;
    trades.push(equity - entryEquity);
    peak = Math.max(peak, equity);
    maximumDrawdown = Math.max(maximumDrawdown, peak === 0 ? 1 : (peak - equity) / peak);
  }
  const gains = trades.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = -trades.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
  const buyHoldReturn = (candles[end - 1].close / candles[start].open) - 1;
  return { startTimestamp: candles[start].timestamp, endTimestamp: candles[end - 1].timestamp,
    startingEquityUsd: costs.startingEquityUsd, endingEquityUsd: equity,
    grossReturn: (grossEquity / costs.startingEquityUsd) - 1,
    netReturn: (equity / costs.startingEquityUsd) - 1, maximumDrawdown,
    tradeCount: trades.length, hitRate: trades.length === 0 ? null : trades.filter((value) => value > 0).length / trades.length,
    profitFactor: losses === 0 ? (gains > 0 ? null : 0) : gains / losses,
    exposure: exposedIntervals / (end - start), turnoverOperations: operations, buyHoldReturn,
    leverage: costs.leverage, maintenanceMarginRate: costs.maintenanceMarginRate,
    liquidated, liquidationIndex,
    minimumMarginRatio: minimumMarginRatio === Infinity ? null : minimumMarginRatio };
}

export function simulateFrozenSignals(candlesInput, signals, start, end, costs = {}) {
  if (!Array.isArray(signals) || signals.some((signal) => ![-1, 0, 1].includes(signal))) {
    throw new Error("signals must contain only -1, 0, or 1");
  }
  const candles = normalizeGmxCandles(candlesInput.map((candle) => Array.isArray(candle) ? candle
    : [candle.timestamp, candle.open, candle.high, candle.low, candle.close]));
  if (signals.length !== candles.length) throw new Error("signals must align one-for-one with candles");
  return performance(candles, signals, start, end, costs);
}

function parameterKey(parameters) {
  return [parameters.minimumStrength, parameters.maximumDispersion, parameters.minimumDiffraction,
    parameters.energyTolerance].map((value) => value.toFixed(6)).join(":");
}

export function defaultParameterGrid() {
  const output = [];
  for (const minimumStrength of [0.15, 0.25, 0.35])
    for (const maximumDispersion of [0.1, 0.2])
      for (const minimumDiffraction of [0.35, 0.5, 0.65])
        for (const energyTolerance of [0, 0.01]) output.push({ minimumStrength, maximumDispersion,
          minimumDiffraction, energyTolerance });
  return output;
}

function signalsFor(features, parameters) {
  return features.map((feature) => causalSheafSignal(feature, parameters).position);
}

export function anchoredWalkForwardBacktest(candlesInput, options = {}) {
  const featureSet = buildCausalFeatureSeries(candlesInput, { windows: options.windows ?? DEFAULT_WINDOWS,
    lowFrequencyBins: options.lowFrequencyBins ?? 2 });
  const { candles, features } = featureSet;
  if (candles.length < featureSet.windows.at(-1) + 100) throw new Error("insufficient candles for bounded train/validation/test partitions");
  const trainEnd = Math.floor(candles.length * finite("trainFraction", options.trainFraction ?? 0.5, 0.35, 0.75));
  const validationEnd = Math.floor(candles.length * finite("validationFraction", options.validationFraction ?? 0.7,
    (trainEnd / candles.length) + 0.1, 0.9));
  const start = featureSet.windows.at(-1) + 1;
  const grid = options.parameterGrid ?? defaultParameterGrid();
  if (!Array.isArray(grid) || grid.length === 0 || grid.length > 512) throw new Error("parameterGrid must contain 1 through 512 candidates");
  const costs = normalizeCosts(options.costs);
  const minimumTrainTrades = integer("minimumTrainTrades", options.minimumTrainTrades ?? 8, 1, 10_000);
  const candidates = grid.map(normalizeParameters).map((parameters) => {
    const metrics = performance(candles, signalsFor(features, parameters), start, trainEnd, costs);
    return { parameters, metrics, eligible: metrics.tradeCount >= minimumTrainTrades,
      score: metrics.netReturn - metrics.maximumDrawdown };
  }).sort((a, b) => (b.eligible - a.eligible) || (b.score - a.score)
    || parameterKey(a.parameters).localeCompare(parameterKey(b.parameters)));
  const selected = candidates.find((candidate) => candidate.eligible) ?? null;
  if (selected == null) return { profile: PROFILE, outcome: "no-eligible-training-candidate",
    candidateCount: candidates.length, minimumTrainTrades, bestIneligible: candidates[0],
    observationOnly: true, initialLeverage: 1, signerMaterialAccepted: false, transactionAssembly: false,
    signing: false, broadcast: false, chainMutation: false };
  const signals = signalsFor(features, selected.parameters);
  const validation = performance(candles, signals, trainEnd, validationEnd, costs);
  const test = performance(candles, signals, validationEnd, candles.length, costs);
  const stressedCosts = { ...costs, impactSpreadBps: costs.impactSpreadBps * 2,
    borrowFundingAnnualBps: costs.borrowFundingAnnualBps * 2,
    executionUsdPerOrder: costs.executionUsdPerOrder * 1.5 };
  const stressedTest = performance(candles, signals, validationEnd, candles.length, stressedCosts);
  const minimumOosTrades = integer("minimumOosTrades", options.minimumOosTrades ?? 3, 1, 10_000);
  const maximumOosDrawdown = finite("maximumOosDrawdown", options.maximumOosDrawdown ?? 0.2, 0, 1);
  const metricAdmits = (value) => value.tradeCount >= minimumOosTrades && value.netReturn > 0
    && value.maximumDrawdown <= maximumOosDrawdown
    && (value.profitFactor == null || value.profitFactor > 1);
  const evidenceAdmits = metricAdmits(validation) && metricAdmits(test) && metricAdmits(stressedTest);
  return { profile: PROFILE, outcome: "completed-research-assay", formalAnchors: {
    orderingFraction: "Obsmetrologia.CausalSets.Dimension.OrderingFraction.orderingFraction",
    curvatureRank: "Obsmetrologia.Flow.CurvatureRegime.curvatureRank",
    freeEnergyAntitone: "Obsmetrologia.Valuation.freeEnergy_antitone",
    finiteDiffractionMass: "Obsmetrologia.AperiodicOrder.Tiling.finiteDiffractionMass" },
    interpretation: "operational empirical projection; not a proof that market candles satisfy the Lean hypotheses",
    partitions: { train: [start, trainEnd], validation: [trainEnd, validationEnd], test: [validationEnd, candles.length] },
    selectionRule: "maximize train netReturn-minus-maximumDrawdown; minimum trades; lexical parameter tie-break",
    selectedParameters: selected.parameters, costs, stressedCosts, train: selected.metrics, validation, test, stressedTest,
    gate: { evidenceAdmits, executionAdmitted: false, leverageAdmitted: false,
      reasons: evidenceAdmits ? ["research-evidence-only", "separate-execution-authority-required"]
        : ["out-of-sample-or-cost-stress-gate-failed", "no-capital-admission"] },
    candidateCount: candidates.length, minimumTrainTrades, minimumOosTrades, maximumOosDrawdown,
    observationOnly: true, initialLeverage: 1, signerMaterialAccepted: false, credentialAccess: false,
    transactionAssembly: false, signing: false, broadcast: false, chainMutation: false };
}

export const OBSMETROLOGIA_CAUSAL_SHEAF_BACKTEST_PROFILE = PROFILE;
export const GMX_CANDLE_SOURCE = GMX_CANDLES;
