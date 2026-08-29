// analysis/intelligence — the composite voting intelligence. Folds every Voting
// v2 lens into one per-post expected-captured-alpha and the weight that captures
// it, plus the three reads that only exist at the composite level:
//
//   • Sheaf layer-disagreement (#8). The attention field is not one scalar but
//     several that should agree: PAYOUT (what the post is paid) and ENDORSEMENT
//     (net_rshares — genuine stake behind it). A sheaf glues local sections into
//     a global one; the gluing OBSTRUCTION is where the layers disagree. A post
//     paid high but thinly endorsed (or richly endorsed yet underpaid) is a
//     sheaf inconsistency — and the underpaid-but-endorsed case is the purest
//     sink. We read the per-post normalised disagreement as a first-order scalar
//     reduction of the multilayer sheaf Hodge Laplacian's harmonic obstruction.
//
//   • Kirchhoff optimal weight (#9). Conservation says reward flux balances:
//     ∂f = 0. A sink is a node where the law is violated — reward flows in below
//     its neighbourhood. Our vote is the MISSING EDGE whose current restores
//     balance; the optimal current is exactly the node's deficit. So the
//     principled vote weight is proportional to the deficit (clamped to mana/
//     risk), not a flat default.
//
//   • Reflexive λ₂ discount (#14). Taking alpha changes the field: our vote adds
//     stake and partially closes the gap it harvests, and the gap closes on its
//     own at rate λ₂ (the spectral decay constant). We discount expected alpha by
//     a bounded first-order factor of λ₂ — price-taker for small capital, decayed
//     for the field's own diffusion. Even "max alpha accounting for the fact that
//     taking it destroys it" is a bounded number.
//
// Native arithmetic throughout, over the history PostSnapshots.

import type { PostSnapshot } from "../substrate.mts";
import { readTiming, type TimingReading } from "./timing.mts";
import { readRewardRoutes, type RewardRouteReading } from "./reward.mts";
import { readContent, type ContentReading } from "./content.mts";
import { readSignals, type SignalReading } from "./signals.mts";
import { readSpectral, type SpectralReading, type WeightedEdge } from "./spectral.mts";
import { formanCurvature, readCartels, readDurability, type CartelReading, type CurvatureReading } from "./graph.mts";

const SCORE_CAP = 64;

function payoutBucket(pendingPayout: string): number {
  const whole = Number.parseInt(pendingPayout.split(".")[0] ?? "0", 10);
  if (!Number.isFinite(whole) || whole < 0) return 0;
  return Math.min(whole, SCORE_CAP);
}

const numOf = (s: string): number => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

export interface PostIntelligence {
  readonly author: string;
  readonly permlink: string;
  readonly key: string;
  readonly deficit: number;
  readonly captureEfficiency: number;
  readonly timingScore: number;
  readonly likelyCartelTrail: boolean;
  readonly contentFitness: number;
  readonly durability: number;
  readonly bridge: boolean;
  readonly cartelExposure: number;
  readonly downvotePressure: number;
  readonly frustration: number;
  readonly engagement: number;
  readonly layerDisagreement: number;
  readonly reflexiveDiscount: number;
  /** The composite: expected curation alpha we actually capture by voting now. */
  readonly expectedAlpha: number;
  /** The Kirchhoff-derived vote weight in basis points (pre risk-clamp). */
  readonly kirchhoffWeightBps: number;
}

export interface VotingIntelligence {
  readonly kind: "aagaard.voting-intelligence";
  readonly spectral: SpectralReading;
  readonly cartels: CartelReading;
  readonly curvature: CurvatureReading;
  /** Per-post composite, deepest expected-alpha first. */
  readonly posts: readonly PostIntelligence[];
}

/** Build the post↔tag bipartite graph as a node set + weighted edges. */
function attentionGraph(posts: readonly PostSnapshot[]): { nodes: Set<string>; edges: WeightedEdge[]; adjacency: Map<string, Set<string>> } {
  const nodes = new Set<string>();
  const edges: WeightedEdge[] = [];
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string): void => {
    (adjacency.get(a) ?? adjacency.set(a, new Set()).get(a)!).add(b);
    (adjacency.get(b) ?? adjacency.set(b, new Set()).get(b)!).add(a);
  };
  for (const p of posts) {
    const pk = `p:${p.author}/${p.permlink}`;
    nodes.add(pk);
    for (const t of p.tags) {
      const tk = `t:${t}`;
      nodes.add(tk);
      edges.push({ a: pk, b: tk, w: 1 });
      link(pk, tk);
    }
  }
  return { nodes, edges, adjacency };
}

/**
 * Read the full composite voting intelligence over a candidate cohort.
 * `sinkDeficits` come from the alpha radar (the Laplacian deviation magnitude).
 */
export function readVotingIntelligence(
  posts: readonly PostSnapshot[],
  sinkDeficits: ReadonlyMap<string, number>,
): VotingIntelligence {
  const reward = readRewardRoutes(posts);
  const content = readContent(posts);
  const signals = readSignals(posts);
  const durability = readDurability(posts, (p) => payoutBucket(p.pendingPayout));
  const { nodes, edges, adjacency } = attentionGraph(posts);
  const spectral = readSpectral(nodes, edges);
  const curvature = formanCurvature(adjacency);
  const cartels = readCartels(posts);

  // Accounts implicated in the cartel ring (recurring co-voters).
  const cartelVoters = new Set<string>();
  for (const pair of cartels.tightPairs) { cartelVoters.add(pair.a); cartelVoters.add(pair.b); }

  // Posts incident to a structural bridge edge get the bridge flag.
  const bridgePosts = new Set<string>();
  for (const e of curvature.bridges) {
    if (e.a.startsWith("p:")) bridgePosts.add(e.a.slice(2));
    if (e.b.startsWith("p:")) bridgePosts.add(e.b.slice(2));
  }

  // Sheaf layer normalisation constants.
  const maxPayout = Math.max(1, ...posts.map((p) => payoutBucket(p.pendingPayout)));
  const maxEndorse = Math.max(1, ...posts.map((p) => Math.max(0, numOf(p.netRshares))));

  // Reflexive discount: the field self-corrects at rate λ₂. Larger λ₂ ⟹ faster
  // decay ⟹ less of the edge survives to when we'd realise it. Bounded to (0,1].
  const reflexiveDiscount = spectral.fiedler > 0 ? 1 / (1 + spectral.fiedler) : 1;

  const out: PostIntelligence[] = [];
  for (const p of posts) {
    const key = `${p.author}/${p.permlink}`;
    const deficit = sinkDeficits.get(key) ?? 0;
    const rr: RewardRouteReading | undefined = reward.get(key);
    const captureEfficiency = rr?.captureEfficiency ?? 1;
    const timing: TimingReading | undefined = p.votes ? readTiming(p.author, p.permlink, p.created, p.votes) : undefined;
    const timingScore = timing?.timingScore ?? 0.5; // unknown timing → neutral
    const likelyCartelTrail = timing?.likelyCartelTrail ?? false;
    const cr: ContentReading | undefined = content.get(key);
    const contentFitness = cr?.fitness ?? 0;
    const dur = durability.get(key)?.persistence ?? 0;
    const bridge = bridgePosts.has(key);
    const sig: SignalReading | undefined = signals.get(key);
    const downvotePressure = sig?.downvotePressure ?? 0;
    const frustration = sig?.frustration ?? 0;
    const engagement = sig?.engagement ?? 0;

    // Cartel exposure: share of this post's (capped) voters who sit in the ring.
    const voters = (p.votes ?? []).slice(0, 40).map((v) => v.voter);
    const inRing = voters.filter((v) => cartelVoters.has(v)).length;
    const cartelExposure = voters.length > 0 ? inRing / voters.length : 0;

    // Sheaf disagreement: |normalised payout − normalised endorsement|.
    const nPay = payoutBucket(p.pendingPayout) / maxPayout;
    const nEnd = Math.max(0, numOf(p.netRshares)) / maxEndorse;
    const layerDisagreement = Math.abs(nPay - nEnd);

    // Composite expected captured alpha. Each factor is a multiplier in [~0, ~2].
    // A downvoted post is a flag-war trap: zero it out. Frustration and cartel
    // exposure discount; engagement, content fitness, durability, and bridges lift.
    const trailPenalty = likelyCartelTrail ? 0.4 : 1;
    const downvoteFactor = sig?.downvoted ? 0 : 1 - 0.5 * frustration;
    const expectedAlpha =
      deficit *
      captureEfficiency *
      timingScore *
      (1 + 0.5 * contentFitness) *
      (1 + 0.5 * dur) *
      (1 + 0.2 * engagement) *
      (bridge ? 1.25 : 1) *
      (1 - 0.5 * cartelExposure) *
      downvoteFactor *
      trailPenalty *
      reflexiveDiscount;

    // Kirchhoff missing-edge: the vote current that restores ∂f=0 at this sink is
    // its deficit; scale to a basis-point weight (deficit relative to the cohort
    // max deficit), so the deepest imbalance gets the strongest funded vote.
    const maxDeficit = Math.max(1, ...[...sinkDeficits.values()]);
    const kirchhoffWeightBps = Math.round(Math.max(0, Math.min(1, deficit / maxDeficit)) * 10000);

    out.push(Object.freeze({
      author: p.author,
      permlink: p.permlink,
      key,
      deficit,
      captureEfficiency,
      timingScore,
      likelyCartelTrail,
      contentFitness,
      durability: dur,
      bridge,
      cartelExposure,
      downvotePressure,
      frustration,
      engagement,
      layerDisagreement,
      reflexiveDiscount,
      expectedAlpha,
      kirchhoffWeightBps,
    }));
  }
  out.sort((a, b) => b.expectedAlpha - a.expectedAlpha);

  return Object.freeze({
    kind: "aagaard.voting-intelligence" as const,
    spectral,
    cartels,
    curvature,
    posts: Object.freeze(out),
  });
}
