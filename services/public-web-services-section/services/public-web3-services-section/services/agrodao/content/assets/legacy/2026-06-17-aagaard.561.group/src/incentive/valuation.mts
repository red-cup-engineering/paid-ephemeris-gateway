// incentive/valuation — value, scam-filter, dedupe, and rank ingested offers (#25).
//
// An ingested offer is not yet worth acting on. This module:
//   • values the reward token in HBD via the liquidity map (#20), so a "500
//     PIZZA" prize and a "2 HBD" prize are comparable;
//   • filters scams and spam — dust rewards, key-phishing, off-chain "claim"
//     redirects, impossible amounts — BEFORE anything reaches the human gate;
//   • estimates expected value EV = p(payout) × value − action cost, where the
//     cost is the mana/RC/attention the required actions burn;
//   • dedupes and ranks, producing the worklist the authorization model (#26)
//     and the arbitration gate (#27) consume.
//
// Pure functions over the offer + a liquidity reading. No execution.

import type { LiquidityReading } from "../analysis/liquidity.mts";
import { tokenValueHbd } from "../analysis/liquidity.mts";
import type { IncentiveOffer, ActionKind } from "./offers.mts";

export type ScamReason =
  | "dust-reward"
  | "key-phishing"
  | "off-chain-claim"
  | "impossible-amount"
  | "no-reward";

export interface ScoredOffer {
  readonly offer: IncentiveOffer;
  /** Reward value in HBD (best-effort; 0 when unpriced). */
  readonly rewardHbd: number;
  /** Estimated cost of the required actions, in HBD-equivalent attention. */
  readonly actionCostHbd: number;
  /** Probability the offer actually pays (heuristic, 0..1). */
  readonly payoutProb: number;
  /** Expected value in HBD. */
  readonly ev: number;
  readonly scam: boolean;
  readonly scamReasons: readonly ScamReason[];
}

/** Per-action attention cost in HBD-equivalent. Votes/reblogs/follows are cheap
 *  (mana/RC); comments/posts cost real attention (a human reviews the draft). */
const ACTION_COST_HBD: Record<ActionKind, number> = {
  vote: 0.001,
  reblog: 0.002,
  follow: 0.002,
  delegate: 0.05,
  comment: 0.1,
  post: 0.5,
};

const DUST_HBD = 0.02;

const KEY_PHISHING_RE = /\b(active key|posting key|private key|owner key|master password|seed phrase|import your key|connect your wallet|send (?:your )?(?:hive|hbd)|memo .* to claim)\b/i;
const OFF_CHAIN_RE = /\bhttps?:\/\/(?!(?:peakd\.com|hive\.blog|ecency\.com|inleo\.io|leofinance\.io|3speak\.tv))[^\s)]+/i;

function scamCheck(offer: ScoredOffer["offer"], rewardHbd: number): ScamReason[] {
  const reasons: ScamReason[] = [];
  const text = offer.rawText;
  if (offer.reward === null) reasons.push("no-reward");
  if (KEY_PHISHING_RE.test(text)) reasons.push("key-phishing");
  if (OFF_CHAIN_RE.test(text)) reasons.push("off-chain-claim");
  if (offer.reward?.amount !== undefined && offer.reward.amount > 1_000_000) reasons.push("impossible-amount");
  if (offer.reward !== null && rewardHbd > 0 && rewardHbd < DUST_HBD) reasons.push("dust-reward");
  return reasons;
}

/** Heuristic payout probability: an offer rooted in a community, with a concrete
 *  amount, and no scam flags is more likely genuine. */
function payoutProbability(offer: ScoredOffer["offer"], scamReasons: readonly ScamReason[]): number {
  if (scamReasons.includes("key-phishing") || scamReasons.includes("off-chain-claim")) return 0.02;
  let p = 0.4;
  if (offer.source.community) p += 0.2;
  if (offer.reward?.amount !== undefined) p += 0.2;
  if (offer.deadline) p += 0.1;
  return Math.max(0, Math.min(1, p));
}

/** Value, scam-check, and score one offer against the liquidity map. */
export function scoreOffer(offer: IncentiveOffer, liquidity: LiquidityReading): ScoredOffer {
  const rewardHbd = offer.reward
    ? (tokenValueHbd(offer.reward.token, liquidity) ?? 0) * (offer.reward.amount ?? 1)
    : 0;
  const actionCostHbd = offer.requiredActions.reduce((s, a) => s + (ACTION_COST_HBD[a.kind] ?? 0.01), 0);
  const scamReasons = scamCheck(offer, rewardHbd);
  const scam = scamReasons.some((r) => r === "key-phishing" || r === "off-chain-claim" || r === "impossible-amount" || r === "dust-reward");
  const payoutProb = payoutProbability(offer, scamReasons);
  const ev = scam ? 0 : payoutProb * rewardHbd - actionCostHbd;
  return Object.freeze({ offer, rewardHbd, actionCostHbd, payoutProb, ev, scam, scamReasons: Object.freeze(scamReasons) });
}

/** Score, scam-filter, dedupe, and rank a batch of offers. Scams are dropped
 *  (not surfaced); the rest are returned best-EV first. */
export function rankOffers(offers: readonly IncentiveOffer[], liquidity: LiquidityReading): readonly ScoredOffer[] {
  const seen = new Set<string>();
  const scored: ScoredOffer[] = [];
  for (const offer of offers) {
    if (seen.has(offer.id)) continue;
    seen.add(offer.id);
    const s = scoreOffer(offer, liquidity);
    if (s.scam) continue; // never surface a scam to the gate
    scored.push(s);
  }
  return Object.freeze(scored.sort((a, b) => b.ev - a.ev));
}
