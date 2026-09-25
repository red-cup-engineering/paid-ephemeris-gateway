import { listBounties } from "./github.mjs";
import { rankBounties, repositoryTrust } from "./selection.mjs";
import { Outcome, findPatterns, readOutcomes, recordOutcome } from "./outcomes.mjs";

/** Plan work from public bounty facts and witnessed local history. */
export async function planBounties({ historyDirectory, ...githubOptions } = {}) {
  const [bounties, outcomes] = await Promise.all([listBounties(githubOptions), historyDirectory ? readOutcomes(historyDirectory) : []]);
  return rankBounties(bounties, { repositoryTrustFor: (bounty) => repositoryTrust(outcomes, bounty.repository) });
}

/** Record an intentional boundary crossing; this never claims or publishes a bounty. */
export async function recordAttempt(historyDirectory, bounty, details = {}) {
  return recordOutcome(historyDirectory, new Outcome({ repository: bounty.repository, issueNumber: bounty.issueNumber, status: "attempted", ...details }));
}

export async function reviewHistory(historyDirectory) {
  return findPatterns(await readOutcomes(historyDirectory));
}

export { Outcome, findPatterns, readOutcomes, recordOutcome } from "./outcomes.mjs";
export { Bounty, Attempt, parseAttempts, parseReward } from "./bounty.mjs";
export { RepositoryWorkspace, cloneRepository } from "./repository.mjs";
export { proposePatch, solveBounty, validatePatch, executeRemotely } from "./solve.mjs";
export { dispatchGitHubAction } from "./github-actions.mjs";
