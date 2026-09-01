// substrate — the raw chain shapes the Voting v2 metrics read from.
//
// Every metric (spectral, topological, diffraction, information-theoretic) is a
// function of on-chain state at a moment. This module reduces the raw
// condenser_api objects to the typed substrate the analysis and the witnessing
// ledger consume: a candidate post's scored fields, and the per-post
// `active_votes` rows (voter, rshares, percent, timestamp) — inert in isolation,
// the diffraction/curvature/cartel substrate under the math.
//
// (The append-only ledger that once lived here is now the EAVT witnessing
// subsystem in @emsenn/computing-with-hive/witnessing, wired in ./witnessing.mts.
// This file is shape only: pure reductions, no filesystem, no clock.)

import type { HiveComputer } from "@emsenn/computing-with-hive/client";

/** One vote on a post, as carried by condenser_api active_votes. The timestamp
 *  and ordering are the whole point — they are inert in isolation and become a
 *  reverse-auction / cartel-timing signal only under the diffraction math. */
export interface VoteRow {
  readonly voter: string;
  readonly rshares: string;
  readonly percent: number;
  readonly time: string;
}

/** A candidate post reduced to the fields the metrics read, plus its vote rows. */
export interface PostSnapshot {
  readonly author: string;
  readonly permlink: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly created: string;
  readonly pendingPayout: string;
  readonly netRshares: string;
  readonly children: number;
  readonly authorReputation: number;
  readonly beneficiaries: readonly { readonly account: string; readonly weight: number }[];
  /** Present only for the top candidates we paid the extra read for. */
  readonly votes?: readonly VoteRow[];
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function tagsOf(post: Readonly<Record<string, unknown>>): readonly string[] {
  const tags = new Set<string>();
  const cat = str(post["category"]);
  if (cat) tags.add(cat);
  const meta = post["json_metadata"];
  if (typeof meta === "string") {
    try {
      const parsed = JSON.parse(meta) as { tags?: unknown };
      if (Array.isArray(parsed.tags)) for (const t of parsed.tags) if (typeof t === "string" && t) tags.add(t);
    } catch { /* malformed metadata: category tag still stands */ }
  }
  return [...tags].slice(0, 12);
}

function beneficiariesOf(post: Readonly<Record<string, unknown>>): readonly { account: string; weight: number }[] {
  const raw = post["beneficiaries"];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b) => {
    if (typeof b !== "object" || b === null) return [];
    const acct = str((b as Record<string, unknown>)["account"]);
    const weight = num((b as Record<string, unknown>)["weight"]);
    return acct ? [{ account: acct, weight }] : [];
  });
}

function votesOf(content: unknown): readonly VoteRow[] {
  if (typeof content !== "object" || content === null) return [];
  const raw = (content as Record<string, unknown>)["active_votes"];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((v) => {
    if (typeof v !== "object" || v === null) return [];
    const r = v as Record<string, unknown>;
    const voter = str(r["voter"]);
    if (!voter) return [];
    return [{ voter, rshares: str(r["rshares"], "0"), percent: num(r["percent"]), time: str(r["time"]) }];
  });
}

/**
 * Reduce a raw ranked post to a PostSnapshot (without vote rows). Vote rows are
 * attached separately for the bounded top set by `captureActiveVotes`.
 */
export function toPostSnapshot(post: Readonly<Record<string, unknown>>): PostSnapshot | null {
  const author = str(post["author"]);
  const permlink = str(post["permlink"]);
  if (!author || !permlink) return null;
  return {
    author,
    permlink,
    category: str(post["category"]),
    tags: tagsOf(post),
    created: str(post["created"]),
    pendingPayout: str(post["pending_payout_value"], "0.000 HBD"),
    netRshares: str(post["net_rshares"], "0"),
    children: num(post["children"]),
    authorReputation: num(post["author_reputation"]),
    beneficiaries: beneficiariesOf(post),
  };
}

/** Fetch active_votes for the top-K posts and return them keyed author/permlink.
 *  Bounded and best-effort: a failed read just omits that post's votes. */
export async function captureActiveVotes(
  hive: HiveComputer,
  posts: readonly PostSnapshot[],
  limit: number,
): Promise<Map<string, readonly VoteRow[]>> {
  const out = new Map<string, readonly VoteRow[]>();
  const top = posts.slice(0, limit);
  await Promise.all(top.map(async (p) => {
    try {
      const content = await hive.getContent(p.author, p.permlink);
      out.set(`${p.author}/${p.permlink}`, votesOf(content));
    } catch { /* best-effort: omit this post's vote rows */ }
  }));
  return out;
}
