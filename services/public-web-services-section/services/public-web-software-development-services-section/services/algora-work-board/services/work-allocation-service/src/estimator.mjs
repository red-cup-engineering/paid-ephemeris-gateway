// The allocation estimator unifies the measured features (funder-pays likelihood,
// competition, difficulty) set an INFORMATIVE PRIOR; observed outcomes from the witness ledger
// update it into a POSTERIOR. So funder-score/competition/repo-trust stop being additive
// constants and become one coherent, learnable estimate of p = P(this attempt earns).
import { betaMean, betaVariance, sampleBeta } from "./bayes.mjs";

export const PRIOR_STRENGTH = 4; // weak prior (~4 pseudo-observations): a few real outcomes dominate.

export function competitionFactor(activeCompetitors) {
  return 1 / (1 + Math.max(0, activeCompetitors || 0));
}

// features: { funderScore (0..1, from funder-reputation), activeCompetitors, difficulty (0..1) }
export function priorFromFeatures(features = {}, { strength = PRIOR_STRENGTH } = {}) {
  const funder = features.funderScore == null ? 0.5 : features.funderScore;
  const comp = competitionFactor(features.activeCompetitors);
  let mean = funder * comp; // P(funder pays) x P(we win the merge against the field)
  if (features.difficulty != null) mean *= 1 - 0.5 * features.difficulty; // harder => less likely merged
  mean = Math.min(0.99, Math.max(0.01, mean));
  return { alpha: mean * strength, beta: (1 - mean) * strength };
}

export function posterior(prior, history = {}) {
  return { alpha: prior.alpha + (history.successes || 0), beta: prior.beta + (history.failures || 0) };
}

export function posteriorFor(features, history, opts) {
  return posterior(priorFromFeatures(features, opts), history);
}

// Point estimate (deterministic) or a Thompson sample (needs rng).
export function estimateP(features, history, { rng, opts } = {}) {
  const post = posteriorFor(features, history, opts);
  return rng ? sampleBeta(post.alpha, post.beta, rng) : betaMean(post.alpha, post.beta);
}

export function uncertainty(features, history, opts) {
  const post = posteriorFor(features, history, opts);
  return betaVariance(post.alpha, post.beta);
}
