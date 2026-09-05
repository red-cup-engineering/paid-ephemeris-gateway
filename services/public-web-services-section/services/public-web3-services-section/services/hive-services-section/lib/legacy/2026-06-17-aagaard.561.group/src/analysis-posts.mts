// analysis-posts — compose daily analysis posts as LOCKED drafts (#17, #18, #19).
//
// The platform should be ABLE to publish what it learns — a daily Hive-Engine
// liquidity report from @help-fund, and the "strange" spectral analysis of Hive
// from @sigmund-vexler — without being able to post autonomously. So these are
// composers only: they turn the live liquidity map (#20) and the Voting v2
// intelligence (#8–#15) into complete, signable PostDrafts with
// `approvedForBroadcast: false`. Posting is in LOCKED_CAPABILITIES; a human reads
// the draft and only a source-level unlock can ever broadcast it.
//
// Daily cadence: a draft is composed at most once per UTC day per (account,
// topic), recorded to the drafts ledger for review.

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import { appendJsonl, readJsonl } from "@emsenn/computing-with-hive/scripts";

import type { PostDraft } from "./posting.mts";
import type { StateStore } from "./state.mts";
import type { LiquidityReading } from "./analysis/liquidity.mts";
import type { VotingIntelligence } from "./analysis/intelligence.mts";
import type { AlphaRadar } from "./alpha-radar.mts";

export type AnalysisTopic = "he-liquidity" | "hive-spectral";

export interface AnalysisDraft extends PostDraft {
  readonly topic: AnalysisTopic;
  readonly composedAt: string;
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Compose the daily Hive-Engine liquidity analysis (for @help-fund). */
export function composeLiquidityPost(account: string, liquidity: LiquidityReading, ts: string): AnalysisDraft {
  const day = utcDay(ts);
  const venueLines = liquidity.venues
    .map((v) => `- **${v.pair}** @ ${v.venue}: mid ${v.midpoint}, spread ${v.relativeSpreadBps}bps, depth ${v.bidDepth.toFixed(2)}↑/${v.askDepth.toFixed(2)}↓, imbalance ${(v.imbalance * 100).toFixed(0)}%${v.thin ? " _(thin)_" : ""}`)
    .join("\n");
  const poolLines = liquidity.pools
    .slice(0, 12)
    .map((p) => `- **${p.pair}**: implied ${p.impliedPrice.toFixed(6)}, TVL≈${p.tvlQuote.toFixed(2)} (quote), fee ${p.feeBps}bps`)
    .join("\n");
  const corridorLines = liquidity.corridors
    .slice(0, 8)
    .map((c) => `- **${c.symbol}**: ${c.cheapVenue} → ${c.richVenue}, divergence ${c.divergenceBps}bps, net after fees ${c.netCorridorBps}bps`)
    .join("\n");

  const body = [
    `# Hive-Engine liquidity report — ${day}`,
    ``,
    `An automated read of liquidity within and between Hive and Hive-Engine venues.`,
    ``,
    `## Order books`,
    venueLines || "_no venues observed_",
    ``,
    `## AMM pools`,
    poolLines || "_no pools observed_",
    ``,
    `## Cross-venue corridors (standing divergences)`,
    corridorLines || "_no corridors observed_",
    ``,
    `_Total observed liquidity proxy: ${liquidity.totalDepthProxy.toFixed(2)} (quote units)._`,
    ``,
    `---`,
    `*Prepared automatically; under review. Not financial advice.*`,
  ].join("\n");

  return Object.freeze({
    account,
    kind: "post" as const,
    title: `Hive-Engine liquidity report — ${day}`,
    body,
    tags: Object.freeze(["hive-engine", "liquidity", "defi", "analysis", "hive"]),
    approvedForBroadcast: false as const,
    topic: "he-liquidity" as const,
    composedAt: ts,
  });
}

/** Compose the daily spectral analysis of Hive (for @sigmund-vexler). */
export function composeSpectralPost(account: string, intel: VotingIntelligence, radar: AlphaRadar, ts: string): AnalysisDraft {
  const day = utcDay(ts);
  const s = intel.spectral;
  const topBridges = intel.curvature.bridges
    .slice(0, 5)
    .map((e) => `- ${e.a} ↔ ${e.b} (Forman ${e.curvature})`)
    .join("\n");
  const cartels = intel.cartels.tightPairs
    .slice(0, 6)
    .map((p) => `- @${p.a} ⇄ @${p.b} (co-voted ${p.coVotes} of the sampled posts)`)
    .join("\n");
  const trails = intel.posts.filter((p) => p.likelyCartelTrail).length;

  const body = [
    `# The spectral state of Hive — ${day}`,
    ``,
    `A reading of the Hive attention graph through its Laplacian spectrum, discrete`,
    `curvature, and cohomology. The reward field is treated as a potential on the`,
    `graph; its mispricing is the energy away from harmonic.`,
    ``,
    `## Mispricing field`,
    `- Total mispricing energy E(r): **${radar.mispricingEnergy.toFixed(1)}**`,
    `- Connected components of the attention graph: **${radar.components}** ${radar.durable ? "_(fragmented → durable alpha)_" : ""}`,
    `- Capturable under-priced sinks: **${radar.sinks.length}**`,
    ``,
    `## Spectral decay`,
    `- Algebraic connectivity λ₂ (Fiedler): **${s.fiedler.toFixed(4)}**`,
    `- Largest Laplacian eigenvalue: **${s.lambdaMax.toFixed(3)}**`,
    `- Mispricing half-life (slowest mode): **${s.decayHalfLife === Infinity ? "∞ (never corrects)" : s.decayHalfLife.toFixed(3) + " diffusion steps"}**`,
    ``,
    `## Cohomology — curation cartels (H¹)`,
    `- Independent co-vote cycles b₁: **${intel.cartels.cycle.b1}** (cycle density ${intel.cartels.cycle.cycleDensity.toFixed(3)})`,
    `- Vote-timing trails flagged as likely automated: **${trails}**`,
    cartels || "_no tight co-vote pairs in the sample_",
    ``,
    `## Curvature — structural bridges`,
    `Edges of strongly negative Forman–Ricci curvature bridge otherwise-separate`,
    `communities — high-reach, low-competition territory:`,
    topBridges || "_no bridges in the sample_",
    ``,
    `---`,
    `*Prepared automatically; under review. Strange mathematics, honestly applied.*`,
  ].join("\n");

  return Object.freeze({
    account,
    kind: "post" as const,
    title: `The spectral state of Hive — ${day}`,
    body,
    tags: Object.freeze(["hive", "mathematics", "spectral", "analysis", "curation"]),
    approvedForBroadcast: false as const,
    topic: "hive-spectral" as const,
    composedAt: ts,
  });
}

// ---- daily-cadence draft store ----

function ledgerPath(store: StateStore, account: string): string {
  return path.join(store.draftsDir, `${account}.drafts.jsonl`);
}
function lastDayPath(store: StateStore): string {
  return path.join(store.stateDir, "analysis-drafts-last.json");
}

function loadLastDays(store: StateStore): Record<string, string> {
  try { return JSON.parse(readFileSync(lastDayPath(store), "utf8")) as Record<string, string>; }
  catch { return {}; }
}

/** True if no draft of this topic was composed for this account today (UTC). */
export function isDraftDue(store: StateStore, account: string, topic: AnalysisTopic, ts: string): boolean {
  const key = `${account}:${topic}`;
  return loadLastDays(store)[key] !== utcDay(ts);
}

/** Record a composed draft and stamp today as its compose-day. */
export function recordAnalysisDraft(store: StateStore, draft: AnalysisDraft): void {
  appendJsonl(ledgerPath(store, draft.account), [draft]);
  const last = loadLastDays(store);
  last[`${draft.account}:${draft.topic}`] = utcDay(draft.composedAt);
  writeFileSync(lastDayPath(store), JSON.stringify(last, null, 2));
}

/** Read recent analysis drafts for an account (newest last). */
export function readAnalysisDrafts(store: StateStore, account: string, limit?: number): readonly AnalysisDraft[] {
  const all = readJsonl<AnalysisDraft>(ledgerPath(store, account));
  return limit !== undefined ? all.slice(-limit) : all;
}
