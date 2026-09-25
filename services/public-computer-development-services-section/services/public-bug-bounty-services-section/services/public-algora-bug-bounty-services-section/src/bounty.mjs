/** A person currently working on a bounty. */
export class Attempt {
  constructor({ people = [], status = "active", started = null, pullRequest = null } = {}) {
    this.people = [...people];
    this.status = status;
    this.started = started;
    this.pullRequest = pullRequest;
    Object.freeze(this.people);
    Object.freeze(this);
  }
}

/** The information needed to decide whether a GitHub issue is worth opening. */
export class Bounty {
  constructor({ repository, issueNumber, title, url, rewardUsd, attempts = [], observedAt }) {
    if (!/^.+\/.+$/.test(repository ?? "")) throw new TypeError("repository must be owner/name");
    if (!Number.isInteger(issueNumber) || issueNumber < 1) throw new TypeError("issueNumber must be a positive integer");
    if (!Number.isFinite(rewardUsd) || rewardUsd < 0) throw new TypeError("rewardUsd must be a non-negative number");
    this.repository = repository;
    this.issueNumber = issueNumber;
    this.title = title ?? "";
    this.url = url ?? `https://github.com/${repository}/issues/${issueNumber}`;
    this.rewardUsd = rewardUsd;
    this.attempts = attempts.map((attempt) => attempt instanceof Attempt ? attempt : new Attempt(attempt));
    this.observedAt = observedAt ?? new Date().toISOString();
    Object.freeze(this.attempts);
    Object.freeze(this);
  }

  get id() { return `${this.repository}#${this.issueNumber}`; }
  get activeAttempts() { return this.attempts.filter((attempt) => attempt.status === "active").length; }
}

export function parseReward(markdown) {
  const amount = /(?:💎\s*)?\$([\d,]+(?:\.\d{1,2})?)/.exec(String(markdown));
  return amount ? Number(amount[1].replaceAll(",", "")) : null;
}

export function parseAttempts(markdown) {
  const rows = String(markdown).match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  return rows.map((row) => {
    const names = [...row.matchAll(/@([\w-]+)/g)].map((match) => match[1]);
    const pullRequest = /https:\/\/github\.com\/[^"<\s]+\/pull\/\d+/.exec(row)?.[0] ?? null;
    const status = row.includes("🟢") ? "active" : row.includes("🟡") ? "warned" : row.includes("🔴") ? "inactive" : "unknown";
    return new Attempt({ people: names, status, pullRequest });
  });
}
