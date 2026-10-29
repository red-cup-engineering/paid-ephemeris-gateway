import { analyzePacing, heartRateThresholdEstimate } from "@red-cup-engineering/pacing-intelligence-services-section";

/**
 * Refuse a malformed `POST /v1/pacing/analysis` body before payment is ever
 * requested. `analyzePacing` itself only throws when `observations` is not
 * an array -- by design it skips individually malformed records rather than
 * throwing, so this admission check enforces the stricter per-record shape
 * a paying caller is expected to submit.
 *
 * @param {unknown} body - parsed JSON request body
 * @returns {{observations: object[], windowDays: (number|undefined), metricIds: (object|undefined)}} the validated body
 * @throws {TypeError} if the body, its observations array, or any observation record is malformed
 * @throws {RangeError} if observations is present but empty
 */
export function validatePacingAnalysisRequest(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("request body must be a JSON object shaped { observations: [...] }");
  }
  if (!Array.isArray(body.observations)) {
    throw new TypeError("observations must be an array of biometric-observation records");
  }
  if (body.observations.length === 0) {
    throw new RangeError("observations must contain at least one biometric-observation record");
  }
  body.observations.forEach((observation, index) => {
    if (observation === null || typeof observation !== "object" || Array.isArray(observation)) {
      throw new TypeError(`observations[${index}] must be an object`);
    }
    if (typeof observation.metric !== "string" || observation.metric.trim() === "") {
      throw new TypeError(`observations[${index}].metric must be a nonempty string`);
    }
    const timestamp = observation.measuredAt ?? observation.enteredAt;
    if (typeof timestamp !== "string" || timestamp.trim() === "") {
      throw new TypeError(`observations[${index}] must carry a measuredAt or enteredAt ISO timestamp`);
    }
    if (observation.missingness?.status !== "missing") {
      const value = observation.measurement?.value;
      if (value === undefined || value === null || value === "") {
        throw new TypeError(`observations[${index}].measurement.value is required unless missingness.status is "missing"`);
      }
    }
  });
  if (body.windowDays !== undefined && (!Number.isInteger(body.windowDays) || body.windowDays <= 0)) {
    throw new TypeError("windowDays must be a positive integer when supplied");
  }
  return body;
}

/** Run analyzePacing() over an already-validated request body. */
export function runPacingAnalysis(body, dependencies = {}) {
  const { observations, ...options } = body;
  return (dependencies.analyzePacing || analyzePacing)(observations, options);
}

/**
 * Refuse a malformed `POST /v1/pacing/heart-rate-threshold` body before
 * payment is requested, by delegating to `heartRateThresholdEstimate`'s own
 * admission check -- the same TypeError either the pre-payment refusal or
 * the paid computation would raise.
 *
 * @param {unknown} body - parsed JSON request body
 * @returns {{restingHr: number}} the validated body
 * @throws {TypeError} if restingHr is missing or not a finite positive number
 */
export function validateHeartRateThresholdRequest(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("request body must be a JSON object shaped { restingHr }");
  }
  heartRateThresholdEstimate({ restingHr: body.restingHr });
  return body;
}

/** Run heartRateThresholdEstimate() over an already-validated request body. */
export function runHeartRateThreshold(body, dependencies = {}) {
  return (dependencies.heartRateThresholdEstimate || heartRateThresholdEstimate)({ restingHr: body.restingHr });
}
