import assert from "node:assert/strict";
import test from "node:test";

import {
  runHeartRateThreshold,
  runPacingAnalysis,
  validateHeartRateThresholdRequest,
  validatePacingAnalysisRequest,
} from "../src/pacing-request.mjs";

const OBSERVED = {
  metric: "hrv-rmssd",
  measuredAt: "2026-08-30T07:00:00Z",
  measurement: { value: "42.1", unit: "ms", precision: "1" },
  missingness: { status: "observed" },
};

test("validatePacingAnalysisRequest(): accepts a well-formed body", () => {
  const body = { observations: [OBSERVED], windowDays: 14 };
  assert.equal(validatePacingAnalysisRequest(body), body);
});

test("validatePacingAnalysisRequest(): refuses a non-object body", () => {
  assert.throws(() => validatePacingAnalysisRequest(null), TypeError);
  assert.throws(() => validatePacingAnalysisRequest("not-an-object"), TypeError);
  assert.throws(() => validatePacingAnalysisRequest([OBSERVED]), TypeError);
});

test("validatePacingAnalysisRequest(): refuses a missing or non-array observations field", () => {
  assert.throws(() => validatePacingAnalysisRequest({}), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: "nope" }), TypeError);
});

test("validatePacingAnalysisRequest(): refuses an empty observations array", () => {
  assert.throws(() => validatePacingAnalysisRequest({ observations: [] }), RangeError);
});

test("validatePacingAnalysisRequest(): refuses a non-object observation record", () => {
  assert.throws(() => validatePacingAnalysisRequest({ observations: [null] }), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: ["nope"] }), TypeError);
});

test("validatePacingAnalysisRequest(): refuses a record missing metric", () => {
  const { metric, ...rest } = OBSERVED;
  assert.throws(() => validatePacingAnalysisRequest({ observations: [rest] }), /metric/u);
});

test("validatePacingAnalysisRequest(): refuses a record missing both measuredAt and enteredAt", () => {
  const { measuredAt, ...rest } = OBSERVED;
  assert.throws(() => validatePacingAnalysisRequest({ observations: [rest] }), /measuredAt or enteredAt/u);
});

test("validatePacingAnalysisRequest(): accepts enteredAt in place of measuredAt", () => {
  const { measuredAt, ...rest } = OBSERVED;
  const body = { observations: [{ ...rest, enteredAt: "2026-08-30T07:00:00Z" }] };
  assert.equal(validatePacingAnalysisRequest(body), body);
});

test("validatePacingAnalysisRequest(): refuses an observed record missing measurement.value", () => {
  const { measurement, ...rest } = OBSERVED;
  assert.throws(() => validatePacingAnalysisRequest({ observations: [rest] }), /measurement\.value/u);
});

test("validatePacingAnalysisRequest(): a missing-status record needs no measurement", () => {
  const body = { observations: [{ metric: "sleep-duration", measuredAt: "2026-08-30T07:00:00Z", missingness: { status: "missing" } }] };
  assert.equal(validatePacingAnalysisRequest(body), body);
});

test("validatePacingAnalysisRequest(): refuses a non-positive-integer windowDays", () => {
  assert.throws(() => validatePacingAnalysisRequest({ observations: [OBSERVED], windowDays: 0 }), TypeError);
  assert.throws(() => validatePacingAnalysisRequest({ observations: [OBSERVED], windowDays: "14" }), TypeError);
});

test("runPacingAnalysis(): composes analyzePacing over the observations, passing options through", () => {
  const result = runPacingAnalysis({ observations: [OBSERVED], windowDays: 7 });
  assert.equal(result.windowDays, 7);
  assert.equal(result.observationCount, 1);
});

test("validateHeartRateThresholdRequest(): accepts a well-formed body", () => {
  const body = { restingHr: 58 };
  assert.equal(validateHeartRateThresholdRequest(body), body);
});

test("validateHeartRateThresholdRequest(): refuses a non-object body", () => {
  assert.throws(() => validateHeartRateThresholdRequest(null), TypeError);
  assert.throws(() => validateHeartRateThresholdRequest([58]), TypeError);
});

test("validateHeartRateThresholdRequest(): refuses a missing, non-numeric, or non-positive restingHr", () => {
  assert.throws(() => validateHeartRateThresholdRequest({}), TypeError);
  assert.throws(() => validateHeartRateThresholdRequest({ restingHr: "58" }), TypeError);
  assert.throws(() => validateHeartRateThresholdRequest({ restingHr: -1 }), TypeError);
  assert.throws(() => validateHeartRateThresholdRequest({ restingHr: 0 }), TypeError);
});

test("runHeartRateThreshold(): applies the Workwell +15bpm heuristic with its evidence label", () => {
  const result = runHeartRateThreshold({ restingHr: 58 });
  assert.equal(result.ceilingBpm, 73);
  assert.match(result.evidenceStatus, /unvalidated|no validating primary study/iu);
});
