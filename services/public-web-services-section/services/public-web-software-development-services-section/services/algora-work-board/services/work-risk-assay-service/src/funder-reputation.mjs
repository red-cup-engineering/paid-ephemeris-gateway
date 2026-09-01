// Work-risk assay: a bounty is only worth chasing if whoever posted
// it actually pays. Scores a funder from cheap public signals (soft ranking, NEVER a hard
// gate): their Algora paid-out history, and whether the repo is a real project or a bounty
// farm. Deprioritizes non-payers and farms without ever excluding them.

// Pure scorer. signals: {algoraCompletedUsd, algoraOpenUsd, stars, forks, openIssues, repoAgeDays}
export function scoreFunder(signals = {}) {
  const s = signals;
  const reasons = [];
  let score = 0.5;

  // 1. Paid history — the decisive signal (the "do they ever accept bounties" question).
  if (s.algoraCompletedUsd != null && s.algoraCompletedUsd > 0) {
    score += 0.25;
    reasons.push(`has paid ~$${s.algoraCompletedUsd} in completed bounties`);
  } else {
    score -= 0.25;
    reasons.push("no completed/paid bounties on record — unproven payer");
  }

  // 2. Farm heuristic — very young repo + thousands of open issues + many forks.
  if (s.repoAgeDays != null && s.repoAgeDays < 120 && (s.openIssues || 0) > 500 && (s.forks || 0) > 200) {
    score -= 0.3;
    reasons.push("farm-suspected: young repo with thousands of open issues and many forks");
  }
  // Absurd open-issues-to-stars ratio = synthetic issue mill.
  if ((s.stars || 0) > 0 && (s.openIssues || 0) / s.stars > 20) {
    score -= 0.15;
    reasons.push("open issues vastly exceed stars — likely a synthetic issue mill");
  }

  // 3. Established real project.
  if ((s.stars || 0) >= 200 && (s.repoAgeDays == null || s.repoAgeDays > 365)) {
    score += 0.15;
    reasons.push("established project (stars + age)");
  }

  score = Math.max(0, Math.min(1, score));
  const label = score >= 0.6 ? "pays-likely" : score <= 0.35 ? "farm-or-nonpayer" : "unknown";
  return { score: Math.round(score * 100) / 100, label, reasons };
}

function parseUsd(shieldMessage) {
  const m = /\$([\d,]+(?:\.\d+)?)/.exec(String(shieldMessage || ""));
  return m ? Number.parseFloat(m[1].replace(/,/g, "")) : 0;
}

// Gather signals. `gh` is a github-api client; `fetchImpl` hits Algora's shields endpoint
// (the one Algora surface still alive). `now` is an ISO string (no hidden clock).
export async function fetchFunderSignals(repo, { gh, fetchImpl = fetch, now } = {}) {
  const owner = repo.split("/")[0];
  const shield = async (status) => {
    try {
      const res = await fetchImpl(`https://algora.io/api/shields/${owner}/bounties?status=${status}`);
      if (!res.ok) return 0;
      return parseUsd((await res.json()).message);
    } catch { return 0; }
  };
  const [algoraCompletedUsd, algoraOpenUsd] = [await shield("completed"), await shield("open")];
  const meta = await gh.getRepo(repo);
  const repoAgeDays = now && meta.created_at ? Math.max(0, (Date.parse(now) - Date.parse(meta.created_at)) / 86400000) : null;
  return {
    algoraCompletedUsd,
    algoraOpenUsd,
    stars: meta.stargazers_count,
    forks: meta.forks_count,
    openIssues: meta.open_issues_count,
    repoAgeDays: repoAgeDays == null ? null : Math.round(repoAgeDays),
  };
}

export async function assessFunder(repo, opts) {
  const signals = await fetchFunderSignals(repo, opts);
  return { repo, signals, ...scoreFunder(signals) };
}
