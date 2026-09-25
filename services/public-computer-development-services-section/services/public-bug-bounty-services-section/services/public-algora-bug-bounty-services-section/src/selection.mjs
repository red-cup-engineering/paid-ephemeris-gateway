/** A transparent score, not a fake precision model: reward divided by active competition. */
export class BountyAssessment {
  constructor(bounty, { minimumRewardUsd = 1, repositoryTrust = 0.5 } = {}) {
    this.bounty = bounty;
    this.eligible = bounty.rewardUsd >= minimumRewardUsd;
    this.repositoryTrust = Math.max(0, Math.min(1, repositoryTrust));
    this.winProbability = this.repositoryTrust / (1 + bounty.activeAttempts);
    this.expectedValue = bounty.rewardUsd * this.winProbability;
    this.score = this.eligible ? this.expectedValue : 0;
    this.reason = this.eligible
      ? `${bounty.rewardUsd.toFixed(2)} USD, ${(this.winProbability * 100).toFixed(0)}% estimated win probability, ${bounty.activeAttempts} active attempt(s)`
      : `reward is below the ${minimumRewardUsd.toFixed(2)} USD minimum`;
    Object.freeze(this);
  }
}

export function rankBounties(bounties, options) {
  return bounties.map((bounty) => new BountyAssessment(bounty, {
    ...options,
    repositoryTrust: options?.repositoryTrustFor?.(bounty) ?? options?.repositoryTrust,
  }))
    .sort((left, right) => right.score - left.score || right.bounty.rewardUsd - left.bounty.rewardUsd);
}

/** Estimate acceptance from completed work. The prior prevents one outcome becoming certainty. */
export function repositoryTrust(outcomes, repository, { wins = 1, losses = 1 } = {}) {
  const records = outcomes.filter((outcome) => outcome.repository === repository);
  const won = records.filter((outcome) => outcome.status === "won").length;
  const lost = records.filter((outcome) => outcome.status === "lost").length;
  return (won + wins) / (won + lost + wins + losses);
}
