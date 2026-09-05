// Work-risk assay: learned per-repo trust is the K the loop keeps because Algora's own reputation is a
// dead, non-adjudicating signal. Win probability is P(maintainer merges OUR PR), and the
// only durable predictor we can accumulate is: in this repo, how often has a PR we
// attempted actually merged?
//
// Reads an append-only outcome ledger of records shaped:
//   { repo, issueNumber, action: "attempt" | "merge" | "loss", occurredAt, ... }
// "merge" = our claiming PR merged (a win). "loss" = resolved without our PR winning.
// Laplace-smoothed trust in [0,1]. Prior (alpha=1, beta=6) is deliberately pessimistic
// to encode the documented cold-start (~0% acceptance until a repo trusts you). These
// priors are RSI-tunable parameters.
export function repoTrustFactor(merges, resolved, { alpha = 1, beta = 6 } = {}) {
  return (merges + alpha) / (resolved + alpha + beta);
}

// Aggregate the ledger into { "owner/repo": { attempts, merges, losses, resolved, trust } }.
export function buildRepoTrust(records = [], opts = {}) {
  const table = {};
  if (!Array.isArray(records)) throw new Error("repo trust requires an explicit array of witnessed outcomes");
  for (const rec of records) {
    if (!rec || !rec.repo) continue;
    const r = (table[rec.repo] ||= { attempts: 0, merges: 0, losses: 0 });
    if (rec.action === "attempt") r.attempts += 1;
    else if (rec.action === "merge") r.merges += 1;
    else if (rec.action === "loss") r.losses += 1;
  }
  for (const r of Object.values(table)) {
    r.resolved = r.merges + r.losses;
    r.trust = repoTrustFactor(r.merges, r.resolved, opts);
  }
  return { table, coldPrior: repoTrustFactor(0, 0, opts) };
}

export function trustFor(repoTrust, repo) {
  return repoTrust.table[repo]?.trust ?? repoTrust.coldPrior;
}
