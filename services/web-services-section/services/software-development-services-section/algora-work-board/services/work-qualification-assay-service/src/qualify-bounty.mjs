// Work-qualification assay (deterministic, legible). Score one normalized candidate.
//
// ECONOMICS (revised 2026-07-18, Leader-flagged): attempts are paid in FREE-compute
// inference requests against a daily quota we are far under — not dollars. So the gate does
// NOT subtract a dollar cost and does NOT impose a dollar floor. Any cash bounty with a
// positive win probability is worth a slot; the only real budget is the daily request quota,
// so candidates are ranked by EV-PER-REQUEST and the quota is applied at selection time.
//
// Consequence: uncontested low-value bounties that others won't bid on now QUALIFY — they
// are the long tail, where pWin is highest (only the maintainer's merge stands between us
// and payout) and competition is nil.
//
//   pWin = repoTrustFactor · competitionFactor,  competitionFactor = 1/(1+activeCompetitors)
//   ev = pWin · rewardUsd            (no cost subtracted; compute is ~free)
//   evPerRequest = ev / attemptCostRequests     (the ranking key under a request quota)
//
// The constants are the RSI-tunable parameters a later Rectify stage adjusts, and
// attemptCostRequests should FALL as script-first resolvers absorb task-classes.

export const DEFAULTS = {
  attemptCostRequests: 6, // ~inference requests per solve attempt; shrinks as resolvers grow
  rewardFloorUsd: 0, // free compute -> chase the long tail; only literal-zero is refused
  highContentionActive: 8, // flag (not refuse) bounties this contested
};

export function competitionFactor(activeCompetitors) {
  return 1 / (1 + Math.max(0, activeCompetitors));
}

export function qualifyBounty(candidate, trust, config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const reasons = [];
  const flags = [];

  const rewardUsd = candidate.reward?.kind === "cash" ? candidate.reward.amountUsd : 0;
  const active = candidate.competition?.active ?? 0;
  const cFactor = competitionFactor(active);
  const pWin = trust * cFactor;
  const ev = pWin * rewardUsd;
  const evPerRequest = ev / cfg.attemptCostRequests;

  if (candidate.reward?.kind !== "cash") {
    reasons.push("reward is not cash (point/non-USD)");
    return verdict("refused", { rewardUsd, active, cFactor, trust, pWin, ev, evPerRequest, flags, reasons, cfg });
  }
  if (rewardUsd <= cfg.rewardFloorUsd) {
    reasons.push(`reward $${rewardUsd} at/below floor $${cfg.rewardFloorUsd}`);
    return verdict("refused", { rewardUsd, active, cFactor, trust, pWin, ev, evPerRequest, flags, reasons, cfg });
  }

  if (active === 0) { flags.push("uncontested"); reasons.push("uncontested: only the maintainer merge stands between us and payout"); }
  if (active >= cfg.highContentionActive) flags.push("high-contention");
  if (candidate.autopay == null) flags.push("autopay-unknown");
  else if (candidate.autopay === true) flags.push("autopay");

  reasons.push(`EV $${ev.toFixed(2)} (pWin ${(pWin * 100).toFixed(1)}%), ${evPerRequest.toFixed(3)} $/request`);
  return verdict("qualified", { rewardUsd, active, cFactor, trust, pWin, ev, evPerRequest, flags, reasons, cfg });
}

function verdict(kind, s) {
  return {
    verdict: kind,
    ev: round(s.ev),
    evPerRequest: round(s.evPerRequest, 4),
    rewardUsd: s.rewardUsd,
    pWin: round(s.pWin, 4),
    repoTrust: round(s.trust, 4),
    competitionFactor: round(s.cFactor, 4),
    activeCompetitors: s.active,
    attemptCostRequests: s.cfg.attemptCostRequests,
    flags: s.flags,
    reasons: s.reasons,
  };
}

function round(n, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
