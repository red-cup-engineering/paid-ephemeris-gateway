import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/**
 * Route identity, price, and Bazaar-discovery schema shared by every
 * transport this gateway runs on (the Express/Cloud Run `server.mjs` and
 * the Fetch/Cloudflare-Workers `worker.mjs`), the same split
 * `paid-ephemeris-gateway` uses so the two entrypoints never carry two
 * copies of the same product declaration.
 */
export const PACING_ANALYSIS_PRICE = "$0.05";
export const HEART_RATE_THRESHOLD_PRICE = "$0.01";
export const PACING_ANALYSIS_ROUTE = "/v1/pacing/analysis";
export const HEART_RATE_THRESHOLD_ROUTE = "/v1/pacing/heart-rate-threshold";
export const STATUS_ROUTE = "/v1/status";

const observationBodySchema = {
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
            properties: {
              value: {},
              unit: { type: "string" },
              precision: { type: "string" },
            },
          },
          missingness: {
            type: "object",
            properties: { status: { type: "string" } },
          },
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
};

export const pacingAnalysisDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: {
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
  inputSchema: observationBodySchema,
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
      restingHeartRate: { latestValue: 58, thresholdEstimate: { ceilingBpm: 73, restingHr: 58, formula: "resting heart rate + 15 bpm", evidenceStatus: "Workwell Foundation clinical rule of thumb; no validating primary study found (targeted PubMed search, 2026-09-01). Present as an informal heuristic, never as a validated instrument." } },
      hrv: { today: { timestamp: "2026-08-30T07:00:00Z", value: 31.2, status: "observed" }, baseline: { median: 42.1, mad: 3.4, n: 13, windowDays: 14, missingCount: 1, insufficientData: false }, deviation: { deviation: -4.3, rawDelta: -10.9, status: "ok", median: 42.1, mad: 3.4 } },
      sleep: { today: null, baseline: { median: null, mad: null, n: 0, windowDays: 14, missingCount: 0, insufficientData: true }, deviation: { deviation: null, rawDelta: null, status: "insufficient-baseline", median: null, mad: null } },
      activity: { today: null, baseline: { median: null, mad: null, n: 0, windowDays: 14, missingCount: 0, insufficientData: true }, deviation: { deviation: null, rawDelta: null, status: "insufficient-baseline", median: null, mad: null } },
      risk: {
        flags: [{ code: "HRV_SUPPRESSED_VS_OWN_BASELINE", message: "Today's HRV (RMSSD) deviates notably below this person's own rolling baseline.", evidenceStatus: "Directionally consistent with Aboagye et al. 2025 (single post-COVID cohort, n=68, not externally validated) and Ruijgt et al. 2026 (observational, no validated threshold). Not a diagnostic or predictive claim." }],
        dataQuality: { hrv: "ok", sleep: "insufficient-baseline", activity: "insufficient-baseline" },
        note: "Descriptive deviation-from-own-baseline flags only. No output of this function diagnoses, predicts, or confirms post-exertional malaise.",
      },
      note: "Descriptive statistics and labeled heuristic flags only. No diagnosis, prediction, or confirmation of post-exertional malaise is made or implied.",
    },
  },
});

export const heartRateThresholdDiscovery = declareDiscoveryExtension({
  method: "POST",
  bodyType: "json",
  input: { restingHr: 58 },
  inputSchema: {
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
      evidenceStatus:
        "Workwell Foundation clinical rule of thumb; no validating primary study found (targeted PubMed search, 2026-09-01). Present as an informal heuristic, never as a validated instrument.",
    },
  },
});
