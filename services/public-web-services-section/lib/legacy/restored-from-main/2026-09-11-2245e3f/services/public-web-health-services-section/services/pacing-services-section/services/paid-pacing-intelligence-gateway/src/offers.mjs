import { declareOffer } from "@red-cup-engineering/x402-services-section/offer";

/**
 * This gateway's offers, declared once: every market's form of them is
 * derived from these declarations, and both transports build their routes
 * from them. The declarations carry no settlement-affecting constant --
 * the payout address, the network, and the settlement asset reach the
 * derivations from the deployment that runs them.
 */

const SECTION = "lib/emsenn/services/561-group/services/public-services-section/services/public-computer-services-section/services/public-web-services-section/services/public-web-health-services-section/services/pacing-services-section";
const ORIGIN = "https://paid-pacing-intelligence-gateway.morgan-sennhauser.workers.dev";
const GATEWAY = "paid-pacing-intelligence-gateway";
const PACKAGE = "@red-cup-engineering/paid-pacing-intelligence-gateway";
const LEDGER_ACCOUNT = "Income:Sales:X402:Paid-pacing-intelligence-gateway";
const MARKETS = ["x402-bazaar", "402index", "house-capability-market", "house-seller-catalog"];

const WORKWELL_EVIDENCE = "Workwell Foundation clinical rule of thumb; no validating primary study found (targeted PubMed search, 2026-09-01). Present as an informal heuristic, never as a validated instrument.";

export const PACING_ANALYSIS_ROUTE = "/v1/pacing/analysis";
export const HEART_RATE_THRESHOLD_ROUTE = "/v1/pacing/heart-rate-threshold";
export const STATUS_ROUTE = "/v1/status";

export const pacingAnalysisOffer = declareOffer({
  name: "Pacing Analysis",
  gateway: GATEWAY,
  gatewayPackageName: PACKAGE,
  section: SECTION,
  operation: "analyze-pacing",
  origin: ORIGIN,
  route: PACING_ANALYSIS_ROUTE,
  method: "POST",
  price: "$0.05",
  category: "health",
  bodyExample: {
    observations: [
      {
        recordType: "nutrition-biometric-observation",
        schemaVersion: "1.0.0",
        metric: "hrv-rmssd",
        measuredAt: "2026-08-30T07:00:00Z",
        measurement: { value: "42.1", unit: "ms", precision: "1" },
        missingness: { status: "observed" },
      },
    ],
    windowDays: 14,
  },
  bodySchema: {
    properties: {
      observations: {
        type: "array",
        minItems: 1,
        description:
          "nutrition-biometric-observation-v1-shaped records: { metric, measuredAt|enteredAt, measurement: { value, unit, precision }, missingness: { status } }.",
        items: {
          type: "object",
          required: ["metric"],
          properties: {
            metric: { type: "string" },
            measuredAt: { type: "string" },
            enteredAt: { type: "string" },
            measurement: {
              type: "object",
              properties: { value: {}, unit: { type: "string" }, precision: { type: "string" } },
            },
            missingness: { type: "object", properties: { status: { type: "string" } } },
          },
        },
      },
      windowDays: {
        type: "integer",
        minimum: 1,
        description: "Trailing rolling-baseline window in days; defaults to 14.",
      },
      metricIds: {
        type: "object",
        description: "Overrides which metric id names resting-heart-rate/hrv/sleep/activity.",
      },
    },
    required: ["observations"],
  },
  output: {
    schema: {
      type: "object",
      required: ["observationCount", "usableObservationCount", "windowDays", "restingHeartRate", "hrv", "sleep", "activity", "risk", "note"],
      properties: {
        observationCount: { type: "integer" },
        usableObservationCount: { type: "integer" },
        windowDays: { type: "integer" },
        restingHeartRate: { type: "object" },
        hrv: { type: "object" },
        sleep: { type: "object" },
        activity: { type: "object" },
        risk: { type: "object" },
        note: { type: "string" },
      },
    },
    example: {
      observationCount: 15,
      usableObservationCount: 15,
      windowDays: 14,
      restingHeartRate: { latestValue: 58, thresholdEstimate: { ceilingBpm: 73, restingHr: 58, formula: "resting heart rate + 15 bpm", evidenceStatus: WORKWELL_EVIDENCE } },
      hrv: {
        today: { timestamp: "2026-08-30T07:00:00Z", value: 31.2, status: "observed" },
        baseline: { median: 42.1, mad: 3.4, n: 13, windowDays: 14, missingCount: 1, insufficientData: false },
        deviation: { deviation: -4.3, rawDelta: -10.9, status: "ok", median: 42.1, mad: 3.4 },
      },
      sleep: {
        today: null,
        baseline: { median: null, mad: null, n: 0, windowDays: 14, missingCount: 0, insufficientData: true },
        deviation: { deviation: null, rawDelta: null, status: "insufficient-baseline", median: null, mad: null },
      },
      activity: {
        today: null,
        baseline: { median: null, mad: null, n: 0, windowDays: 14, missingCount: 0, insufficientData: true },
        deviation: { deviation: null, rawDelta: null, status: "insufficient-baseline", median: null, mad: null },
      },
      risk: {
        flags: [{
          code: "HRV_SUPPRESSED_VS_OWN_BASELINE",
          message: "Today's HRV (RMSSD) deviates notably below this person's own rolling baseline.",
          evidenceStatus: "Directionally consistent with Aboagye et al. 2025 (single post-COVID cohort, n=68, not externally validated) and Ruijgt et al. 2026 (observational, no validated threshold). Not a diagnostic or predictive claim.",
        }],
        dataQuality: { hrv: "ok", sleep: "insufficient-baseline", activity: "insufficient-baseline" },
        note: "Descriptive deviation-from-own-baseline flags only. No output of this function diagnoses, predicts, or confirms post-exertional malaise.",
      },
      note: "Descriptive statistics and labeled heuristic flags only. No diagnosis, prediction, or confirmation of post-exertional malaise is made or implied.",
    },
  },
  framings: [
    {
      key: "clinical",
      title: "Pacing Analysis",
      description:
        "Pacing Analysis: the full analyzePacing report over caller-submitted biometric observations -- rolling baselines, morning deviation, resting-heart-rate threshold estimate, and conservative PEM risk flags, each with citations and epistemic labels. Stateless: nothing submitted or computed is stored.",
      tags: ["pacing", "biometric", "me-cfs", "long-covid", "hrv"],
      serviceName: "561-group-pacing-analysis",
      category: "health",
    },
    {
      key: "agent",
      title: "Pacing Analysis for agents",
      description:
        "One call, one labeled report: rolling baselines and deviation-from-own-baseline flags over a caller's own biometric observations, every claim carrying its citation and evidence status. Stateless; stores nothing.",
      tags: ["agent", "health-data", "provenance", "stateless"],
      serviceName: "pacing-analysis-agent",
      category: "health",
    },
  ],
  ledgerAccount: LEDGER_ACCOUNT,
  markets: MARKETS,
  resources: ["one stateless compute call; no storage, no third-party call"],
});

export const heartRateThresholdOffer = declareOffer({
  name: "Heart-Rate Threshold",
  gateway: GATEWAY,
  gatewayPackageName: PACKAGE,
  section: SECTION,
  operation: "estimate-heart-rate-threshold",
  origin: ORIGIN,
  route: HEART_RATE_THRESHOLD_ROUTE,
  method: "POST",
  price: "$0.01",
  category: "health",
  bodyExample: { restingHr: 58 },
  bodySchema: {
    properties: {
      restingHr: { type: "number", exclusiveMinimum: 0, description: "Resting heart rate in beats per minute." },
    },
    required: ["restingHr"],
  },
  output: {
    schema: {
      type: "object",
      required: ["ceilingBpm", "restingHr", "formula", "evidenceStatus"],
      properties: {
        ceilingBpm: { type: "number" },
        restingHr: { type: "number" },
        formula: { type: "string" },
        evidenceStatus: { type: "string" },
      },
    },
    example: {
      ceilingBpm: 73,
      restingHr: 58,
      formula: "resting heart rate + 15 bpm",
      evidenceStatus: WORKWELL_EVIDENCE,
    },
  },
  framings: [
    {
      key: "clinical",
      title: "Heart-Rate Threshold",
      description:
        "Heart-Rate Threshold: the Workwell Foundation resting-heart-rate+15bpm pacing-ceiling heuristic, labeled as an unvalidated clinical rule of thumb. Stateless: nothing submitted or computed is stored.",
      tags: ["pacing", "biometric", "heart-rate", "workwell", "heuristic"],
      serviceName: "561-group-hr-threshold",
      category: "health",
    },
  ],
  ledgerAccount: LEDGER_ACCOUNT,
  markets: MARKETS,
  resources: ["one stateless arithmetic call; no storage, no third-party call"],
});

export const offers = Object.freeze([pacingAnalysisOffer, heartRateThresholdOffer]);
export default offers;

export const PACING_ANALYSIS_PRICE = pacingAnalysisOffer.declaration.price;
export const HEART_RATE_THRESHOLD_PRICE = heartRateThresholdOffer.declaration.price;
