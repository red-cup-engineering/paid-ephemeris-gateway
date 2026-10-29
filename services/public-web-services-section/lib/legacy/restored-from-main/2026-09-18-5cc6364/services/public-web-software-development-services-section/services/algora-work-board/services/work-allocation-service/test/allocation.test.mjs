import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng, betaMean, betaVariance, sampleBeta } from "../src/bayes.mjs";
import { priorFromFeatures, posterior, estimateP } from "../src/estimator.mjs";
import { allocate } from "../src/allocate.mjs";
import { brierScore, reliability, baseRate } from "../src/calibration.mjs";

test("betaMean/variance basics", () => {
  assert.equal(betaMean(2, 2), 0.5);
  assert.ok(betaVariance(2, 2) > 0);
});

test("sampleBeta is unbiased (seeded, statistical)", () => {
  const rng = makeRng(12345);
  let s = 0; const N = 4000;
  for (let i = 0; i < N; i++) s += sampleBeta(2, 8, rng);
  assert.ok(Math.abs(s / N - 0.2) < 0.02); // E[Beta(2,8)] = 0.2
});

test("features set the prior: higher funder-pays -> higher mean, more competition -> lower", () => {
  const good = priorFromFeatures({ funderScore: 0.9, activeCompetitors: 0 });
  const contested = priorFromFeatures({ funderScore: 0.9, activeCompetitors: 9 });
  const nonpayer = priorFromFeatures({ funderScore: 0.05, activeCompetitors: 0 });
  assert.ok(betaMean(good.alpha, good.beta) > betaMean(contested.alpha, contested.beta));
  assert.ok(betaMean(good.alpha, good.beta) > betaMean(nonpayer.alpha, nonpayer.beta));
});

test("outcomes update the posterior (learning)", () => {
  const prior = priorFromFeatures({ funderScore: 0.5, activeCompetitors: 1 });
  const base = betaMean(prior.alpha, prior.beta);
  const afterWins = posterior(prior, { successes: 5, failures: 0 });
  const afterLosses = posterior(prior, { successes: 0, failures: 5 });
  assert.ok(betaMean(afterWins.alpha, afterWins.beta) > base);
  assert.ok(betaMean(afterLosses.alpha, afterLosses.beta) < base);
});

test("estimateP is monotonic in funder-pays likelihood", () => {
  const lo = estimateP({ funderScore: 0.2, activeCompetitors: 1 }, {});
  const hi = estimateP({ funderScore: 0.9, activeCompetitors: 1 }, {});
  assert.ok(hi > lo);
});

test("allocate respects the request budget and ranks by EV-per-request", () => {
  const cands = [
    { id: "a", reward: 500, features: { funderScore: 0.9, activeCompetitors: 0 }, history: {} }, // real payer, uncontested
    { id: "b", reward: 500, features: { funderScore: 0.05, activeCompetitors: 40 }, history: {} }, // farm, swarmed
    { id: "c", reward: 200, features: { funderScore: 0.7, activeCompetitors: 1 }, history: {} },
  ];
  const r = allocate(cands, { budgetRequests: 12, costPerAttempt: 6, mode: "mean" });
  assert.equal(r.maxAttempts, 2);
  assert.equal(r.selected.length, 2);
  assert.equal(r.scored[0].id, "a"); // best EV/request first
  assert.ok(r.scored.findIndex((x) => x.id === "b") === r.scored.length - 1); // farm sinks
});

test("Brier score: perfect=0, coin-flip on balanced=0.25", () => {
  assert.equal(brierScore([{ p: 1, y: 1 }, { p: 0, y: 0 }]), 0);
  assert.equal(brierScore([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }]), 0.25);
  assert.equal(baseRate([{ y: 1 }, { y: 0 }, { y: 1 }, { y: 1 }]), 0.75);
});

test("reliability bins account for every prediction", () => {
  const preds = [{ p: 0.1, y: 0 }, { p: 0.15, y: 0 }, { p: 0.95, y: 1 }];
  const bins = reliability(preds, 10);
  assert.equal(bins.reduce((s, b) => s + b.n, 0), 3);
});
