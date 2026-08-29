// analysis/timing — the HF25 curation-reward time window and the vote-timing
// diffraction spectrum (Voting v2 #13, #23).
//
// This is the single highest-leverage read for CURATION reward, and it lives in
// data nobody bothers with raw: the post's creation time and the per-post
// `active_votes` list — each vote's voter, rshares, and TIMESTAMP. Under two
// lenses it is the difference between capturing a share of the mint and donating
// mana to a cartel:
//
//   1. Curation time window (current mainnet, HF25 "Equilibrium", 2021-06-30).
//      The pre-HF25 five-minute reverse auction — which forfeited early-vote
//      curation back to the pool — was REMOVED. Verified against the chain and
//      the hardfork notes (hive_evaluator_social.cpp, the HF25 announcement):
//        • there is NO early-vote penalty — voting fresh is no longer punished;
//        • the first 24h is a FLAT early window (penalty divisor 1): curation is
//          paid on Hive Power × weight with no time-based diminishment, so fresh
//          content is the best curation target;
//        • the next 48h (24–72h) is the mid window (divisor 2 — half weight);
//        • 72h to the 7-day payout is the late window (divisor 8 — eighth);
//        • once the 7-day cashout passes there is no curation at all.
//      The window factor here is taken DIRECTLY from the upstream chain-exact
//      `curationWindow`/`curationPenaltyDivisor` (1, ½, ⅛, 0), so this heuristic
//      can never drift from the real reward. (This module owns ONLY the time
//      window; curation SATURATION — the pro-rata rshares split — is owned by
//      `analysis/reward`'s captureEfficiency, so the two never double-count.)
//
//   2. Diffraction spectrum. A genuine organic curation has irregularly spaced
//      votes (a broad, high-entropy inter-arrival spectrum). An automated trail
//      or cartel votes in lockstep — a sharp peak in the inter-arrival histogram,
//      low timing entropy: the Riemann-as-prime-diffraction lens (a pure tone =
//      a periodic lattice = a machine). High regularity means the curation
//      reward on that post is already being swept by a bot train; our expected
//      share is small even if the post looks under-priced. The diffraction
//      spectrum is thus a cartel/bot AUTHENTICITY radar over votes.
//
// All native arithmetic over the snapshot's vote rows. No Peano, no float money.

import {
  curationWindow,
  curationPenaltyDivisor,
  CASHOUT_WINDOW_SECONDS,
  type CurationWindow,
} from "@emsenn/computing-with-hive/computing/topology/curation";

import type { VoteRow } from "../substrate.mts";

export interface TimingReading {
  readonly author: string;
  readonly permlink: string;
  readonly voteCount: number;
  /** Post age in seconds (creation → now): which curation window it sits in. */
  readonly ageSeconds: number;
  /** The HF25 curation phase this post is in at observation time. */
  readonly windowPhase: CurationWindow;
  /** Diffraction regularity (0..1): 1 = perfectly periodic vote train (machine),
   *  0 = maximally irregular (organic). Derived from inter-arrival entropy. */
  readonly trainRegularity: number;
  /** Normalised Shannon entropy (0..1) of the inter-arrival gaps; the dual of
   *  regularity, surfaced for the analysis posts. */
  readonly timingEntropy: number;
  /** Authenticity verdict: a regular, dense train is flagged inauthentic. */
  readonly likelyCartelTrail: boolean;
  /** A multiplier (0..1) on this post's curation attractiveness from timing
   *  alone: full for fresh organic posts, decaying with age, ~0 past the
   *  lockout tail or once a bot train has swept the curation. */
  readonly timingScore: number;
}

/** The HF25 time-window curation multiplier from a post's age alone, taken
 *  DIRECTLY from the chain-exact upstream curve so the heuristic never drifts
 *  from the real reward: 1 in the first 24h (full, NO early penalty), ½ in the
 *  24–72h mid window, ⅛ in the 72h–7d late window, 0 once the post has paid out
 *  (`curationPenaltyDivisor`: early=1, mid=2, late=8, closed=0). */
export function curationWindowFactor(ageSeconds: number): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return 1; // unknown age → assume fresh
  if (ageSeconds >= CASHOUT_WINDOW_SECONDS) return 0;
  const divisor = curationPenaltyDivisor(curationWindow(ageSeconds));
  return divisor > 0n ? 1 / Number(divisor) : 0;
}

const rshareNum = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Shannon entropy of a discrete distribution, normalised to [0,1] by log(k). */
function normalisedEntropy(weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || weights.length <= 1) return 0;
  let h = 0;
  for (const w of weights) {
    if (w <= 0) continue;
    const p = w / total;
    h -= p * Math.log(p);
  }
  return h / Math.log(weights.length);
}

/** Histogram inter-arrival gaps into log-spaced buckets; a near-periodic train
 *  concentrates in one bucket (low entropy → high regularity). */
function gapRegularity(sortedTimesMs: readonly number[]): { regularity: number; entropy: number } {
  if (sortedTimesMs.length < 4) return { regularity: 0, entropy: 1 };
  const gaps: number[] = [];
  for (let i = 1; i < sortedTimesMs.length; i++) {
    const g = sortedTimesMs[i]! - sortedTimesMs[i - 1]!;
    gaps.push(g > 0 ? g : 1);
  }
  // Log-spaced buckets from 1s to ~1 day; a machine clusters, humans spread.
  const buckets = new Array<number>(16).fill(0);
  for (const g of gaps) {
    const secs = g / 1000;
    const idx = Math.max(0, Math.min(15, Math.floor(Math.log2(secs + 1))));
    buckets[idx]! += 1;
  }
  const entropy = normalisedEntropy(buckets);
  return { regularity: 1 - entropy, entropy };
}

/** Read the HF25 curation timing of one post: its age-driven window factor and
 *  the vote-train authenticity, from its creation time and active_votes. */
export function readTiming(
  author: string,
  permlink: string,
  createdIso: string,
  votes: readonly VoteRow[],
  nowMs: number = Date.now(),
): TimingReading {
  const created = Date.parse(createdIso);
  const timed = votes
    .map((v) => ({ t: Date.parse(v.time), r: rshareNum(v.rshares) }))
    .filter((v) => Number.isFinite(v.t))
    .sort((a, b) => a.t - b.t);

  // Post age = now − creation: which HF25 curation window the post sits in.
  const ageSeconds = Number.isFinite(created) ? Math.max(0, (nowMs - created) / 1000) : Number.NaN;
  const windowFactor = curationWindowFactor(ageSeconds);
  const windowPhase: CurationWindow = Number.isFinite(ageSeconds) ? curationWindow(ageSeconds) : "early";

  const { regularity, entropy } = gapRegularity(timed.map((v) => v.t));
  // A dense (>=8 votes) and regular (>0.6) train reads as an automated trail.
  const likelyCartelTrail = timed.length >= 8 && regularity > 0.6;

  // Timing score: full while fresh (HF25 has NO early penalty), decaying with
  // age to the lockout tail, discounted when a bot train has already swept the
  // curation (organic low). Saturation is handled separately in analysis/reward.
  const organic = 1 - regularity;
  const timingScore = windowFactor * (0.7 + 0.3 * organic);

  return Object.freeze({
    author,
    permlink,
    voteCount: timed.length,
    ageSeconds: Number.isFinite(ageSeconds) ? ageSeconds : 0,
    windowPhase,
    trainRegularity: regularity,
    timingEntropy: entropy,
    likelyCartelTrail,
    timingScore: Math.max(0, Math.min(1, timingScore)),
  });
}
