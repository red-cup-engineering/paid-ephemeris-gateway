// Board conductor: wire observed opportunities, risk assays, and allocation without owning them.
// pull the funder's pay-likelihood (funder-reputation) and our own track record (repo-trust
// ledger), fold them into the Bayesian estimator's features/history, and let the bandit
// allocator pick what to attempt within the free-compute request budget. This REPLACES the
// old additive qualify ranking with estimate-and-learn.
import { parseBountyCandidate } from "@rsc-quiescent/algora-opportunity-observation-service/parse";
import { buildRepoTrust } from "@rsc-quiescent/software-work-risk-assay-service/repo-trust";
import { allocate } from "@rsc-quiescent/software-work-allocation-service";

export async function planAttempts({
  candidatesInput,
  observedAt,
  historyRecords = [],
  funderAssess, // async (repo) -> { score, label, ... }  (injectable; cached per repo)
  budgetRequests = Infinity,
  costPerAttempt = 6,
  mode = "mean",
  rng,
}) {
  if (!observedAt) throw new Error("observedAt is required");
  const repoTrust = buildRepoTrust(historyRecords);
  const funderCache = new Map();
  const getFunder = async (repo) => {
    if (!funderCache.has(repo)) funderCache.set(repo, funderAssess ? await funderAssess(repo) : { score: 0.5, label: "unknown" });
    return funderCache.get(repo);
  };

  const decisionCands = [];
  const meta = new Map();
  for (const raw of candidatesInput) {
    const c = parseBountyCandidate({ ...raw, observedAt });
    const funder = await getFunder(c.repo);
    const hist = repoTrust.table[c.repo] || {};
    const id = `${c.repo}#${c.issueNumber}`;
    decisionCands.push({
      id,
      reward: c.reward?.kind === "cash" ? c.reward.amountUsd : 0,
      features: { funderScore: funder.score, activeCompetitors: c.competition.active, difficulty: null },
      history: { successes: hist.merges || 0, failures: hist.losses || 0 },
    });
    meta.set(id, { repo: c.repo, issueNumber: c.issueNumber, reward: c.reward, competition: c.competition, funder });
  }

  const { scored, selected, maxAttempts } = allocate(decisionCands, { budgetRequests, costPerAttempt, mode, rng });
  const attach = (s) => ({ ...s, meta: meta.get(s.id) });
  return { plan: scored.map(attach), selected: selected.map(attach), maxAttempts };
}
