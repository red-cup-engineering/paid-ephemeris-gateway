// Work-allocation die: budgeted allocation as a contextual bandit. The request budget is the
// scarce resource; we spend it to maximize expected earnings while LEARNING. Thompson sampling
// (draw p from each opportunity's posterior, rank by sampled EV-per-request) gives principled
// explore/exploit for free: never-tried funders get explored in proportion to their
// uncertainty, proven ones get exploited — no hand-set exploration constant.
import { posteriorFor } from "./estimator.mjs";
import { betaMean, sampleBeta } from "./bayes.mjs";

// candidates: [{ id, reward, features, history }]
export function allocate(candidates, { budgetRequests = Infinity, costPerAttempt = 6, mode = "thompson", rng } = {}) {
  const scored = candidates.map((c) => {
    const post = posteriorFor(c.features, c.history);
    const p = mode === "thompson" && rng ? sampleBeta(post.alpha, post.beta, rng) : betaMean(post.alpha, post.beta);
    const ev = p * (c.reward || 0);
    return { id: c.id, p: round(p, 4), ev: round(ev, 2), evPerRequest: round(ev / costPerAttempt, 4), posterior: post };
  }).sort((a, b) => b.evPerRequest - a.evPerRequest);

  const maxAttempts = Number.isFinite(budgetRequests) ? Math.floor(budgetRequests / costPerAttempt) : scored.length;
  return { scored, selected: scored.slice(0, maxAttempts), maxAttempts };
}

function round(n, dp) { const f = 10 ** dp; return Math.round(n * f) / f; }
