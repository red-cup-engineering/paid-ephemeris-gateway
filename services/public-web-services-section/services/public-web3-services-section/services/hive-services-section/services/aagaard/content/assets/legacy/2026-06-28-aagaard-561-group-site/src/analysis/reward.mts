// analysis/reward — the reward-route read: where curation reward ACTUALLY flows
// (Voting v2 #23). A post being under-priced (a sink) is necessary but not
// sufficient; what we capture by voting it depends on the plumbing the raw data
// exposes but nobody scores:
//
//   • beneficiaries — a post can route 0–100% of its payout to other accounts
//     via the beneficiary mechanism. The author/curators split only the
//     remainder. A 90%-beneficiary post is a near-dead end for curation reward
//     no matter how under-priced it looks.
//   • curation saturation — curation reward on a post is split pro-rata by vote
//     weight (after the reverse-auction adjustment). If the post is already
//     thick with rshares, our marginal vote earns a small slice; if it is thin,
//     our vote dominates the split. net_rshares is the raw saturation signal.
//
// The capture efficiency combines these into a 0..1 multiplier on a sink's
// deficit: expected captured alpha ≈ deficit × captureEfficiency × timingScore.
// This is what turns "looks under-priced" into "is worth our mana".

import type { PostSnapshot } from "../substrate.mts";

export interface RewardRouteReading {
  readonly author: string;
  readonly permlink: string;
  /** Fraction (0..1) of payout routed away to beneficiaries before author/curators. */
  readonly beneficiaryFraction: number;
  /** Existing committed vote weight (net_rshares), as a raw number. */
  readonly netRshares: number;
  /** Saturation (0..1): this post's net_rshares relative to the candidate cohort
   *  max — high ⟹ curation reward already crowded. */
  readonly saturation: number;
  /** Capture efficiency (0..1): how much of a marginal vote actually lands as
   *  our curation reward after skim and crowding. */
  readonly captureEfficiency: number;
}

const numOf = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function beneficiaryFractionOf(post: PostSnapshot): number {
  const weight = post.beneficiaries.reduce((s, b) => s + (Number.isFinite(b.weight) ? b.weight : 0), 0);
  // Beneficiary weights are in hundredths of a percent (10000 = 100%).
  return Math.max(0, Math.min(1, weight / 10000));
}

/** Read the reward route over a cohort of candidate posts (saturation is
 *  cohort-relative, so the whole set is needed at once). */
export function readRewardRoutes(posts: readonly PostSnapshot[]): Map<string, RewardRouteReading> {
  const out = new Map<string, RewardRouteReading>();
  let maxR = 0;
  const rshares = new Map<string, number>();
  for (const p of posts) {
    const r = Math.max(0, numOf(p.netRshares));
    rshares.set(`${p.author}/${p.permlink}`, r);
    if (r > maxR) maxR = r;
  }
  for (const p of posts) {
    const key = `${p.author}/${p.permlink}`;
    const r = rshares.get(key) ?? 0;
    const saturation = maxR > 0 ? r / maxR : 0;
    const beneficiaryFraction = beneficiaryFractionOf(p);
    // Marginal vote lands more reward where the post is unsaturated and unskimmed.
    const captureEfficiency = (1 - beneficiaryFraction) * (1 - 0.7 * saturation);
    out.set(key, Object.freeze({
      author: p.author,
      permlink: p.permlink,
      beneficiaryFraction,
      netRshares: r,
      saturation,
      captureEfficiency: Math.max(0, Math.min(1, captureEfficiency)),
    }));
  }
  return out;
}
