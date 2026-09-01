// witnessing — the Aagaard feeds: "get this from the chain, witness it here".
//
// Replaces the old per-account history snapshot (which wrote the chain-global
// substrate once PER ACCOUNT, ~2.7 MB/tick) with EAVT feeds over the generic
// @emsenn/computing-with-hive/witnessing engine. There is one chain, so the
// chain-global feeds (the trending field, the market) are witnessed ONCE per
// fleet tick; only stake/mana and a wallet's own Hive-Engine balances are
// per-account.
//
// Every cell is witnessed at the DOMAIN time the fact holds, never the tick:
//   • a post's static fields (category, tags, beneficiaries, created) at `created`;
//   • each vote — its own entity — at the vote's cast time;
//   • the volatile aggregates (net_rshares, pending_payout) at the post's latest
//     vote time, the event that last moved them.
// So a post with no new votes since last tick re-witnesses to byte-identical rows
// and costs nothing; a settled (paid-out) post never grows again. Determinacy,
// not age, bounds the log — and the settlement filtration certifies it on record.

import {
  cell,
  attributesOf,
  witnessObservation,
  projectFeedState,
  projectFeedContent,
  type Feed,
  type WitnessStore,
} from "@emsenn/computing-with-hive/witnessing";
import type { MarketRunResult } from "@emsenn/computing-with-hive/scripts";

import type { PostSnapshot } from "./substrate.mts";

export type { WitnessStore } from "@emsenn/computing-with-hive/witnessing";

/** Hive payout finalises 7 days after a post is created; after that its votes,
 *  rshares and payout are frozen by later blocks — the determinacy boundary. */
const SETTLE_MS = 7 * 24 * 60 * 60 * 1000;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
type WitnessCell = ReturnType<typeof cell>;

function membersOf<T>(
  root: string,
  membership: string,
  members: readonly T[],
  entityOf: (member: T) => string,
  timeOf: (member: T) => string,
  cellize: (member: T, entity: string) => readonly WitnessCell[],
): readonly WitnessCell[] {
  const rows: WitnessCell[] = [];
  for (const member of members) {
    const entity = entityOf(member);
    const at = timeOf(member);
    rows.push(cell(root, membership, entity, at), ...cellize(member, entity));
  }
  return rows;
}

/** The latest cast time among a post's witnessed votes, else its creation time —
 *  the moment the post's reward aggregates last could have changed. */
function postValueTime(post: PostSnapshot): string {
  let latest = post.created;
  for (const vote of post.votes ?? []) if (vote.time > latest) latest = vote.time;
  return latest;
}

/** The trending candidate field — chain-global, witnessed once per fleet tick.
 *  Each post is a root entity; each of its votes is its own member entity. */
export const trendingFeed: Feed<readonly PostSnapshot[]> = {
  name: "trending-field",
  functional: [
    "category", "created", "author_reputation",
    "net_rshares", "pending_payout", "children",
    "voter", "rshares", "percent",
  ],
  cellize: (posts, at) => {
    const rows = [];
    for (const post of posts) {
      const e = `${post.author}/${post.permlink}`;
      const created = post.created || String(at);
      const valueAt = postValueTime(post);
      // Static fields, witnessed at the post's creation — written once, then deduped forever.
      rows.push(cell(e, "created", created, created));
      rows.push(...attributesOf(e, { category: post.category, author_reputation: post.authorReputation }, ["category", "author_reputation"], created));
      for (const tag of post.tags) rows.push(cell(e, "tag", tag, created));
      for (const b of post.beneficiaries) rows.push(cell(e, "beneficiary", { account: b.account, weight: b.weight }, created));
      // Reward aggregates, witnessed at the latest vote — unchanged between ticks ⇒ no new row.
      rows.push(cell(e, "net_rshares", post.netRshares, valueAt));
      rows.push(cell(e, "pending_payout", post.pendingPayout, valueAt));
      rows.push(cell(e, "children", post.children, valueAt));
      // Each vote its own entity, witnessed at its cast time — the substrate the
      // timing / diffraction / cartel reads need, and the grain that dedupes.
      rows.push(...membersOf(
        e, "vote", post.votes ?? [],
        (vote: NonNullable<PostSnapshot["votes"]>[number]) => `${e}#${vote.voter}`,
        (vote: NonNullable<PostSnapshot["votes"]>[number]) => vote.time,
        (vote: NonNullable<PostSnapshot["votes"]>[number], ve: string) => [
          cell(ve, "voter", vote.voter, vote.time),
          cell(ve, "rshares", vote.rshares, vote.time),
          cell(ve, "percent", vote.percent, vote.time),
        ],
      ));
    }
    return rows;
  },
};

/** The cross-venue market microstructure — chain-global, once per fleet tick. A
 *  genuine time series (a book has no settlement to collapse to), so no `settled`;
 *  it stays small (a few venues/pools × scalar levels) and dedupes when a book
 *  is unchanged between ticks. */
export const marketFeed: Feed<MarketRunResult> = {
  name: "market",
  functional: ["baseSymbol", "quoteSymbol", "bestBid", "bestAsk", "midpoint", "relativeSpreadBps", "baseQuantity", "quoteQuantity", "tradeFeeMultiplier"],
  cellize: (market, at) => {
    const rows = [];
    for (const m of market.markets) {
      const e = `venue:${m.venue}`;
      const report = m.report as { bestBid?: { display?: string }; bestAsk?: { display?: string }; midpoint?: { display?: string }; relativeSpreadBps?: number };
      // Venue identity is stable — witnessed at a stable per-venue time, not the tick.
      rows.push(cell(e, "baseSymbol", m.baseSymbol, m.venue));
      rows.push(cell(e, "quoteSymbol", m.quoteSymbol, m.venue));
      // Microstructure is volatile — witnessed at the tick.
      rows.push(cell(e, "bestBid", report.bestBid?.display ?? "0", at));
      rows.push(cell(e, "bestAsk", report.bestAsk?.display ?? "0", at));
      rows.push(cell(e, "midpoint", report.midpoint?.display ?? "0", at));
      rows.push(cell(e, "relativeSpreadBps", num(report.relativeSpreadBps), at));
    }
    for (const pool of market.poolStates) {
      const e = `pool:${pool.tokenPair}`;
      rows.push(cell(e, "tradeFeeMultiplier", pool.tradeFeeMultiplier, pool.tokenPair));
      rows.push(cell(e, "baseQuantity", pool.baseQuantity, at));
      rows.push(cell(e, "quoteQuantity", pool.quoteQuantity, at));
    }
    return rows;
  },
};

/** Per-account stake and mana — the mana-policy substrate. */
export const accountStateFeed: Feed<{ readonly account: string; readonly raw: Readonly<Record<string, unknown>> }> = {
  name: "account-state",
  functional: ["vesting_shares", "delegated_vesting_shares", "received_vesting_shares", "voting_power", "downvote_power"],
  cellize: ({ account, raw }, at) => {
    const e = `account:${account}`;
    const downvote = raw["downvote_manabar"] as Record<string, unknown> | undefined;
    return [
      cell(e, "vesting_shares", str(raw["vesting_shares"], "0.000000 VESTS"), at),
      cell(e, "delegated_vesting_shares", str(raw["delegated_vesting_shares"], "0.000000 VESTS"), at),
      cell(e, "received_vesting_shares", str(raw["received_vesting_shares"], "0.000000 VESTS"), at),
      cell(e, "voting_power", num(raw["voting_power"]), at),
      cell(e, "downvote_power", num(downvote?.["current_mana"]), at),
    ];
  },
};

/** Per-account Hive-Engine balances — each token its own entity. */
export const accountEngineFeed: Feed<{ readonly account: string; readonly heBalances: readonly { readonly symbol: string; readonly balance: string }[] }> = {
  name: "account-engine",
  functional: ["balance"],
  cellize: ({ account, heBalances }, at) =>
    heBalances.map((b) => cell(`account:${account}#he:${b.symbol}`, "balance", b.balance, at)),
};

/** One fleet tick's chain-global + per-account observations, witnessed and
 *  projected to current state. The chain-global feeds are witnessed once. */
export function witnessFleetTick(
  store: WitnessStore,
  at: string,
  globalPosts: readonly PostSnapshot[] | undefined,
  globalMarket: MarketRunResult | undefined,
  accounts: readonly { readonly account: string; readonly raw?: Readonly<Record<string, unknown>> | undefined; readonly heBalances?: readonly { readonly symbol: string; readonly balance: string }[] | undefined }[],
): void {
  if (globalPosts && globalPosts.length > 0) {
    witnessObservation(store, trendingFeed, globalPosts, at);
    projectFeedState(store, trendingFeed);
  }
  if (globalMarket) {
    witnessObservation(store, marketFeed, globalMarket, at);
    projectFeedState(store, marketFeed);
  }
  for (const a of accounts) {
    if (a.raw) witnessObservation(store, accountStateFeed, { account: a.account, raw: a.raw }, at);
    if (a.heBalances) witnessObservation(store, accountEngineFeed, { account: a.account, heBalances: a.heBalances }, at);
  }
  projectFeedState(store, accountStateFeed);
  projectFeedState(store, accountEngineFeed);
}

/** Compact settled posts out of the trending log into the record — the offline
 *  determinacy pass. Bounded: settlement runs per settled post (its own votes),
 *  never over the whole log. Call on a daily cadence, not in the hot tick. */
export function compactSettled(store: WitnessStore, _now: string): ReturnType<typeof projectFeedContent> {
  return projectFeedContent(store, trendingFeed);
}
