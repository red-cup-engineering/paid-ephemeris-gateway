// Google's OSS Patch Rewards pay for security-improving patches merged into its Tier 1 repositories,
// once a patch has stayed unreverted for a month and while it is under a year old. This assesses
// won work against the published scope; it never submits a claim.

export const GOOGLE_PATCH_REWARD_SCOPE_URL = "https://raw.githubusercontent.com/google/bughunters/main/patch-rewards-program/scope.md";
const DAY_MS = 86_400_000, MIN_AGE_DAYS = 30, MAX_AGE_DAYS = 365;

export function canonicalGithubRepo(value) {
  const raw = String(value ?? "").trim().replace(/\.git$/u, "");
  const match = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u.exec(raw) ?? /^https:\/\/github\.com\/([^/]+\/[^/?#]+)(?:[/?#]|$)/u.exec(raw);
  if (!match) throw new TypeError("repo must be owner/name or a GitHub repository URL");
  return match[1].replace(/\.git$/u, "").toLowerCase();
}

/** The Tier 1 GitHub repositories the scope document links. */
export function tier1Repositories(scopeMarkdown) {
  const repos = new Set();
  for (const match of String(scopeMarkdown ?? "").matchAll(/\]\(https:\/\/github\.com\/([^/\s)]+\/[^/\s)#]+)(?:[/?#][^)]*)?\)/giu)) repos.add(canonicalGithubRepo(match[1]));
  return repos;
}

export async function fetchPatchRewardScope({ fetchImpl = fetch, url = GOOGLE_PATCH_REWARD_SCOPE_URL } = {}) {
  const response = await fetchImpl(url, { headers: { accept: "text/markdown,text/plain;q=0.9" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Google Patch Rewards scope unavailable: HTTP ${response.status}`);
  return { source: url, observedAt: new Date().toISOString(), markdown: await response.text() };
}

/** Whether one merged patch can be claimed, and if not, why or when. */
export function assessPatchReward({ repository, mergedAt, observedAt, securityRationale, revertedAt = null, scopeMarkdown }) {
  const repo = canonicalGithubRepo(repository);
  const merged = Date.parse(mergedAt), observed = Date.parse(observedAt);
  if (!Number.isFinite(merged) || !Number.isFinite(observed)) throw new TypeError("mergedAt and observedAt must be ISO date/times");
  if (observed < merged) throw new RangeError("observedAt precedes mergedAt");
  const ageDays = Math.floor((observed - merged) / DAY_MS);
  const result = (disposition, reason, extra = {}) => Object.freeze({ program: "google-oss-patch-rewards", repository: repo, disposition, ageDays, reason, ...extra });
  if (!tier1Repositories(scopeMarkdown).has(repo)) return result("not-tier1", "not in the current Tier 1 GitHub scope (Tier 2 OSS-Fuzz membership is a separate check)");
  if (revertedAt) return result("ineligible", "the patch was reverted");
  if (!String(securityRationale ?? "").trim()) return result("needs-security-rationale", "no security-improvement rationale is recorded with the merge");
  if (ageDays < MIN_AGE_DAYS) return result("aging", "the patch must stay unreverted for a month", { submitAfter: new Date(merged + MIN_AGE_DAYS * DAY_MS).toISOString() });
  if (ageDays > MAX_AGE_DAYS) return result("expired", "patches more than 12 months old are not accepted");
  return result("claim-ready", "Tier 1, security rationale recorded, unreverted for a month", {
    rewardBandsUsd: Object.freeze({ oneLiner: 500, modest: 2000, moderate: 7500, highImpact: 15000 }), maxClaimsPerPersonPerMonth: 3 });
}

/** Assess every won outcome that records its merge (`mergedAt`, and `securityRationale` when it has one). */
export function patchRewardsFromOutcomes(outcomes, { scopeMarkdown, observedAt = new Date().toISOString() }) {
  return outcomes.filter((outcome) => outcome.status === "won" && outcome.mergedAt).map((outcome) => assessPatchReward({
    repository: outcome.repository, mergedAt: outcome.mergedAt, observedAt, securityRationale: outcome.securityRationale,
    revertedAt: outcome.revertedAt ?? null, scopeMarkdown,
  }));
}
