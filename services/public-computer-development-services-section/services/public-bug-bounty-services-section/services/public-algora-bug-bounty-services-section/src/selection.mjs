// A task that asks the solver to hand over its own instructions is a trap set for agents, whatever it pays.
const PRIVATE_MATERIAL = String.raw`(?:system\s+prompt|developer\s+message|initiali[sz]ation\s+payload|hidden\s+instructions?|private\s+prompt)`;
const EXTRACTION = String.raw`(?:paste|print|reveal|include|expose|submit|return|write|upload|show|provide)`;
const EXFILTRATION_TRAP = new RegExp(`${EXTRACTION}.{0,120}${PRIVATE_MATERIAL}|${PRIVATE_MATERIAL}.{0,120}${EXTRACTION}`, "isu");
export const asksForPrivatePromptMaterial = (bounty) => EXFILTRATION_TRAP.test([bounty.title, bounty.body].filter(Boolean).join("\n"));

/** A transparent score, not a fake precision model: reward divided by active competition. */
export class BountyAssessment {
  constructor(bounty, { minimumRewardUsd = 1, repositoryTrust = 0.5 } = {}) {
    this.bounty = bounty;
    this.trap = asksForPrivatePromptMaterial(bounty);
    this.eligible = !this.trap && bounty.rewardUsd >= minimumRewardUsd;
    this.repositoryTrust = Math.max(0, Math.min(1, repositoryTrust));
    this.winProbability = this.repositoryTrust / (1 + bounty.activeAttempts);
    this.expectedValue = bounty.rewardUsd * this.winProbability;
    this.score = this.eligible ? this.expectedValue : 0;
    this.reason = this.eligible
      ? `${bounty.rewardUsd.toFixed(2)} USD, ${(this.winProbability * 100).toFixed(0)}% estimated win probability, ${bounty.activeAttempts} active attempt(s)`
      : this.trap ? "refused: the task asks for the solver's private prompt or instructions"
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
