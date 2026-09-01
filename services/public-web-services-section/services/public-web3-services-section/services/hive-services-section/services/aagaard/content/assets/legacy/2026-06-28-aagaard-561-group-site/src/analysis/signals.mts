// analysis/signals — two more chain-data reads that are free from substrate we
// already capture (#29, the no-extra-fetch half).
//
//   • Signed-vote frustration. active_votes carry NEGATIVE rshares — downvotes.
//     A post with both up- and down-vote mass is contested: a signed graph whose
//     frustration (the share of vote mass fighting the consensus sign) measures
//     controversy. Curating into a downvote war risks our reward being nullified
//     or our stake drawn into a flag fight — so frustration is a penalty, and a
//     purely-downvoted post is a trap to avoid, not a sink to capture.
//
//   • Comment-tree branching. `children` is the post's reply-tree size. High
//     branching = high genuine engagement (eyes, discussion) — legitimacy that
//     distinguishes an organically-rising post from a whale-inflated one. A
//     mild positive signal, normalised across the cohort.
//
// Both are computed from the existing PostSnapshot; no extra chain reads.

import type { PostSnapshot, VoteRow } from "../substrate.mts";

export interface SignalReading {
  readonly author: string;
  readonly permlink: string;
  /** Downvote share (0..1): |negative rshares| / total |rshares|. */
  readonly downvotePressure: number;
  /** Signed-graph frustration (0..1): how balanced the up/down fight is — peaks
   *  at 0.5/0.5, the maximally contested post. */
  readonly frustration: number;
  /** True when downvotes dominate — a flag target, avoid. */
  readonly downvoted: boolean;
  /** Engagement (0..1): comment-tree branching normalised across the cohort. */
  readonly engagement: number;
}

const rshareNum = (s: string): number => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

function signedMass(votes: readonly VoteRow[]): { up: number; down: number } {
  let up = 0;
  let down = 0;
  for (const v of votes) {
    const r = rshareNum(v.rshares);
    if (r >= 0) up += r; else down += -r;
  }
  return { up, down };
}

/** Read signed-vote + engagement signals over a cohort (engagement needs the
 *  cohort max children, so the whole set is taken at once). */
export function readSignals(posts: readonly PostSnapshot[]): Map<string, SignalReading> {
  const out = new Map<string, SignalReading>();
  const maxChildren = Math.max(1, ...posts.map((p) => p.children));
  for (const p of posts) {
    const { up, down } = signedMass(p.votes ?? []);
    const total = up + down;
    const downvotePressure = total > 0 ? down / total : 0;
    // Frustration peaks where up and down mass are balanced (4·x·(1−x)).
    const frustration = 4 * downvotePressure * (1 - downvotePressure);
    out.set(`${p.author}/${p.permlink}`, Object.freeze({
      author: p.author,
      permlink: p.permlink,
      downvotePressure,
      frustration,
      downvoted: downvotePressure > 0.5,
      engagement: p.children / maxChildren,
    }));
  }
  return out;
}
