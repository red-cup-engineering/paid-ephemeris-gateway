// strategy — the voting character of each wallet.
//
// The corpus argues Hive is already a concurrent idle game and that *a small
// wallet plays a different game than a whale*: it cannot move payouts much, so
// its edge is discovery, conversation, community-fit and early signal, while a
// larger or specialised wallet hunts mispricing across the whole field
// (`content/library/arts/ludics/games/.../hive-as-game.md`, §10 "Curation as
// idle optimization"; the Hivekeeper "player fantasy" — curator, gardener,
// archivist, small-wallet strategist, public-interest analyst, steward).
//
// A strategy is two things, no more:
//   1. A FEED ASSEMBLAGE — which slice of the chain this character watches: the
//      main trending field, its own following feed, specific community feeds,
//      bare tags, or named users' blogs. This becomes the `feeds` the upstream
//      `fetchCurationRun` assembles and the alpha radar scores — ONE field for
//      both. Nothing here re-fetches or re-derives; it composes existing reads.
//   2. An OBJECTIVE — how this character re-weights the upstream composite
//      `expectedAlpha` toward what its wallet-type values. The knapsack and the
//      Voting v2 intelligence stay authoritative (Aagaard never re-rolls them);
//      the objective is a bounded multiplier layered on top, so the SAME field
//      produces a different funded, ordered ballot per character.
//
// The objective is the corpus's multi-term curation goal made operational —
// underrecognition + community_fit + conversation_potential + source_quality +
// durable value − cartel/pile-on risk — not a flat max-E[reward].

import type { FeedSource } from "@emsenn/computing-with-hive/scripts";

import type { PostIntelligence } from "./analysis/intelligence.mts";
import type { PostSnapshot } from "./substrate.mts";

/** The feed slice a character watches. Each field projects to one or more
 *  upstream `FeedSource`s; the union (deduplicated) is the candidate field. */
export interface FeedAssemblage {
  /** Watch the chain-global trending field (`tag:""`). */
  readonly mainFeed?: boolean;
  /** Watch the account's own following feed (`bridge.get_account_feed`). */
  readonly ownFeed?: boolean;
  /** Watch specific community feeds, by their `hive-NNNNN` id. */
  readonly communities?: readonly string[];
  /** Watch bare tags. */
  readonly tags?: readonly string[];
  /** Watch named users' blogs. */
  readonly users?: readonly string[];
  /** Ranked sort for the main/community/tag feeds (default "trending"). */
  readonly sort?: string;
  /** Candidates pulled per source (kept modest; each post costs one content
   *  read in the knapsack). Default 12. */
  readonly perSourceLimit?: number;
}

/** How a character re-weights the upstream composite toward its wallet-type.
 *  Each weight amplifies (or, for cartelAversion, discounts) one factor of the
 *  composite as a bounded multiplier; 0 means "indifferent to this term". */
export interface VotingObjective {
  /** Hunger for underrecognised value — the radar sink deficit (the alpha play). */
  readonly underrecognition: number;
  /** Pull toward posts inside this character's own communities/tags/users. */
  readonly communityFit: number;
  /** Pull toward live discussion (engagement / conversation potential). */
  readonly conversation: number;
  /** Pull toward durable value (persistence over the reward filtration). */
  readonly durability: number;
  /** Pull toward cross-community bridge posts (high reach, low competition). */
  readonly bridge: number;
  /** Pull toward content fitness / source quality. */
  readonly quality: number;
  /** Aversion to curation cartels — discounts posts thick with ring voters. */
  readonly cartelAversion: number;
}

/** How a wallet husbands its regenerating voting mana — the idle-game pacing.
 *  The corpus is emphatic that "doing nothing is a valid action" and that one
 *  should vote only when "a high-confidence recommendation is available", not
 *  merely because the manabar is full (hive-as-game.md §4, §10). So a wallet
 *  spends mana on at most a few of the very best opportunities per tick, and
 *  only when they clear a conviction bar — otherwise it waits and lets mana
 *  regenerate. */
export interface VotingPacing {
  /** The most votes this wallet will cast in one tick. Default 1 — one good
   *  vote per tick, or none. Mana is scarce; spend it on conviction. */
  readonly maxVotesPerTick: number;
  /** Conviction bar: the chosen opportunity must out-score the field's typical
   *  (median positive) candidate by at least this factor before mana is spent.
   *  Higher ⇒ pickier ⇒ votes less often, husbands mana for clearer alpha. */
  readonly conviction: number;
  /** Husband mana below this voting power (basis points of max). The wallet
   *  abstains rather than spend when its manabar is below the floor, so every
   *  vote it does cast lands at high power and stays HP-meaningful. */
  readonly votingPowerFloorBps: number;
}

export interface VotingStrategy {
  readonly account: string;
  /** The player fantasy this wallet enacts (human-readable). */
  readonly archetype: string;
  /** One line on why this character votes the way it does. */
  readonly disposition: string;
  readonly feeds: FeedAssemblage;
  readonly objective: VotingObjective;
  readonly pacing: VotingPacing;
}

/** A balanced default objective — every term present, none dominant. */
const BALANCED: VotingObjective = Object.freeze({
  underrecognition: 1,
  communityFit: 0.4,
  conversation: 0.3,
  durability: 0.4,
  bridge: 0.3,
  quality: 0.4,
  cartelAversion: 0.6,
});

/** A balanced default pacing — one considered vote per tick on a clear standout,
 *  keeping voting power above 80%. */
const STEADY_PACING: VotingPacing = Object.freeze({
  maxVotesPerTick: 1,
  conviction: 1.5,
  votingPowerFloorBps: 8000,
});

// The fleet's characters. Each is a distinct wallet-type playing a distinct
// game over a distinct slice of the chain. Seeds are deliberately conservative
// and fully overridable from aagaard.config.json; a community id that resolves
// to nothing simply contributes no candidates (the assemblage is robust to it).
const STRATEGIES: Readonly<Record<string, VotingStrategy>> = Object.freeze({
  // The spectral analyst / trader. Hunts mispricing across the whole trending
  // field, deepest sink first, aggressive — the account that also authors the
  // daily "spectral state of Hive". Pure alpha: underrecognition + bridges +
  // durable edge, cartel-averse.
  "sigmund-vexler": Object.freeze({
    account: "sigmund-vexler",
    archetype: "alpha-hunter",
    disposition: "Reads the whole trending field as a reward topology and funds the deepest underpriced sinks first.",
    feeds: Object.freeze({ mainFeed: true, sort: "trending", perSourceLimit: 18 }),
    objective: Object.freeze({
      underrecognition: 1.6, communityFit: 0, conversation: 0.2, durability: 0.7,
      bridge: 0.8, quality: 0.3, cartelAversion: 1.0,
    }),
    // Aggressive: acts on the field's clearest sink most ticks, but still only
    // when it stands out, and keeps power above 70%.
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.3, votingPowerFloorBps: 7000 }),
  }),
  // The treasury / patron. Watches the finance & dev communities it underwrites
  // and lifts well-sourced, well-discussed work inside them — community health
  // over raw alpha.
  "help-fund": Object.freeze({
    account: "help-fund",
    archetype: "patron-steward",
    disposition: "Supports the communities it funds — rewards quality and conversation inside them, not the global field.",
    feeds: Object.freeze({
      communities: Object.freeze(["hive-167922", "hive-163521"]), // LeoFinance, STEMGeeks
      tags: Object.freeze(["leofinance", "hive", "dev"]),
      sort: "created", perSourceLimit: 12,
    }),
    objective: Object.freeze({
      underrecognition: 0.7, communityFit: 1.4, conversation: 0.7, durability: 0.5,
      bridge: 0.2, quality: 1.0, cartelAversion: 0.7,
    }),
    // Patient patron: spends only on a clear, well-sourced standout in its
    // communities, keeping power high.
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.6, votingPowerFloorBps: 8500 }),
  }),
  // The principal / curator. Tends its own following feed alongside the main
  // field — a person's careful read, balanced across quality and conversation.
  "emsenn0": Object.freeze({
    account: "emsenn0",
    archetype: "curator",
    disposition: "Curates its own following feed and the main field with a balanced, quality-first eye.",
    feeds: Object.freeze({ ownFeed: true, mainFeed: true, sort: "trending", perSourceLimit: 12 }),
    objective: Object.freeze({
      underrecognition: 1.0, communityFit: 0.5, conversation: 0.6, durability: 0.5,
      bridge: 0.4, quality: 0.8, cartelAversion: 0.7,
    }),
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.5, votingPowerFloorBps: 8000 }),
  }),
  // The gardener. Tends gaming communities — rewards durable, well-discussed
  // posts that keep a community alive rather than chasing field-wide alpha.
  "essiebee": Object.freeze({
    account: "essiebee",
    archetype: "gardener",
    disposition: "Tends gaming communities — favours durable, well-discussed posts that keep the board healthy.",
    feeds: Object.freeze({
      communities: Object.freeze(["hive-140217", "hive-13323"]), // Hive Gaming, Splinterlands
      tags: Object.freeze(["gaming", "splinterlands", "play2earn"]),
      sort: "created", perSourceLimit: 12,
    }),
    objective: Object.freeze({
      underrecognition: 0.8, communityFit: 1.3, conversation: 0.9, durability: 1.0,
      bridge: 0.3, quality: 0.6, cartelAversion: 0.6,
    }),
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.5, votingPowerFloorBps: 8000 }),
  }),
  // The scout. Ranges tags and looks for the cross-community bridge posts the
  // field hasn't priced — small-wallet discovery play.
  "marshian": Object.freeze({
    account: "marshian",
    archetype: "scout",
    disposition: "Ranges tags hunting cross-community bridge posts the reward graph hasn't found yet.",
    feeds: Object.freeze({
      tags: Object.freeze(["gaming", "art", "writing", "photography"]),
      sort: "created", perSourceLimit: 10,
    }),
    objective: Object.freeze({
      underrecognition: 1.3, communityFit: 0.3, conversation: 0.5, durability: 0.4,
      bridge: 1.4, quality: 0.6, cartelAversion: 0.8,
    }),
    // Ranges widely, acts on a real cross-community discovery when one appears.
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.4, votingPowerFloorBps: 8000 }),
  }),
  // The archivist. Follows a small set of trusted authors' blogs and its own
  // feed; conservative, durability- and provenance-first, cartel-wary.
  "michael561": Object.freeze({
    account: "michael561",
    archetype: "archivist",
    disposition: "Follows a few trusted authors and its own feed; conservative, durability- and quality-first.",
    feeds: Object.freeze({
      ownFeed: true,
      users: Object.freeze(["emsenn0"]),
      sort: "created", perSourceLimit: 12,
    }),
    objective: Object.freeze({
      underrecognition: 0.7, communityFit: 0.6, conversation: 0.4, durability: 1.2,
      bridge: 0.2, quality: 1.1, cartelAversion: 1.0,
    }),
    // Very patient: votes rarely, only on a strong durable standout, husbanding
    // mana hard (keeps power above 90%).
    pacing: Object.freeze({ maxVotesPerTick: 1, conviction: 1.8, votingPowerFloorBps: 9000 }),
  }),
});

/** The strategy for an account: a named character if we have one, else a
 *  balanced curator over the account's own feed and the main field. */
export function defaultStrategyFor(account: string): VotingStrategy {
  const named = STRATEGIES[account];
  if (named) return named;
  return Object.freeze({
    account,
    archetype: "curator",
    disposition: "Balanced curation over its own feed and the main field.",
    feeds: Object.freeze({ ownFeed: true, mainFeed: true, sort: "trending", perSourceLimit: 12 }),
    objective: BALANCED,
    pacing: STEADY_PACING,
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function strList(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) ? Object.freeze(value.filter((x): x is string => typeof x === "string")) : undefined;
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Resolve an account's strategy: its named character (or a balanced default),
 *  with an optional `aagaard.config.json` overlay merged on top. The overlay may
 *  retune any feed-assemblage field or objective weight, or override the
 *  archetype label — so an operator redirects a wallet's votes without code. */
export function resolveStrategy(account: string, overlay?: unknown): VotingStrategy {
  const base = defaultStrategyFor(account);
  if (!isRecord(overlay)) return base;
  const fo = isRecord(overlay["feeds"]) ? overlay["feeds"] : {};
  const oo = isRecord(overlay["objective"]) ? overlay["objective"] : {};
  const mainFeed = typeof fo["mainFeed"] === "boolean" ? fo["mainFeed"] : base.feeds.mainFeed;
  const ownFeed = typeof fo["ownFeed"] === "boolean" ? fo["ownFeed"] : base.feeds.ownFeed;
  const communities = strList(fo["communities"]) ?? base.feeds.communities;
  const tags = strList(fo["tags"]) ?? base.feeds.tags;
  const users = strList(fo["users"]) ?? base.feeds.users;
  const sort = typeof fo["sort"] === "string" ? fo["sort"] : base.feeds.sort;
  const feeds: FeedAssemblage = Object.freeze({
    ...(mainFeed !== undefined ? { mainFeed } : {}),
    ...(ownFeed !== undefined ? { ownFeed } : {}),
    ...(communities !== undefined ? { communities } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(users !== undefined ? { users } : {}),
    ...(sort !== undefined ? { sort } : {}),
    perSourceLimit: numOr(fo["perSourceLimit"], base.feeds.perSourceLimit ?? 12),
  });
  const o = base.objective;
  const objective: VotingObjective = Object.freeze({
    underrecognition: numOr(oo["underrecognition"], o.underrecognition),
    communityFit: numOr(oo["communityFit"], o.communityFit),
    conversation: numOr(oo["conversation"], o.conversation),
    durability: numOr(oo["durability"], o.durability),
    bridge: numOr(oo["bridge"], o.bridge),
    quality: numOr(oo["quality"], o.quality),
    cartelAversion: numOr(oo["cartelAversion"], o.cartelAversion),
  });
  const po = isRecord(overlay["pacing"]) ? overlay["pacing"] : {};
  const bp = base.pacing;
  const pacing: VotingPacing = Object.freeze({
    maxVotesPerTick: Math.max(0, Math.trunc(numOr(po["maxVotesPerTick"], bp.maxVotesPerTick))),
    conviction: numOr(po["conviction"], bp.conviction),
    votingPowerFloorBps: Math.max(0, Math.min(10_000, Math.trunc(numOr(po["votingPowerFloorBps"], bp.votingPowerFloorBps)))),
  });
  return Object.freeze({
    account,
    archetype: typeof overlay["archetype"] === "string" ? overlay["archetype"] : base.archetype,
    disposition: typeof overlay["disposition"] === "string" ? overlay["disposition"] : base.disposition,
    feeds,
    objective,
    pacing,
  });
}

/** Project a strategy's feed assemblage to the upstream `FeedSource[]` the
 *  curation run will assemble and the radar will score. The order is stable so
 *  the deduplicated union is deterministic across ticks. */
export function feedSourcesFor(strategy: VotingStrategy): readonly FeedSource[] {
  const { feeds } = strategy;
  const sort = feeds.sort ?? "trending";
  const limit = feeds.perSourceLimit ?? 12;
  const sources: FeedSource[] = [];
  if (feeds.mainFeed) sources.push({ kind: "ranked", sort, tag: "", limit });
  for (const community of feeds.communities ?? []) sources.push({ kind: "ranked", sort, tag: community, limit });
  for (const tag of feeds.tags ?? []) sources.push({ kind: "ranked", sort, tag, limit });
  if (feeds.ownFeed) sources.push({ kind: "following", limit });
  for (const user of feeds.users ?? []) sources.push({ kind: "blog", account: user, sort: "blog", limit });
  // A strategy with no configured source still gets the main field, so a
  // misconfigured character abstains rather than erroring the fleet.
  if (sources.length === 0) sources.push({ kind: "ranked", sort, tag: "", limit });
  return Object.freeze(sources);
}

/** The set of post keys whose author or tags fall inside this character's own
 *  communities/tags/users — the "community fit" indicator the objective lifts. */
export function emphasisKeys(strategy: VotingStrategy, posts: readonly PostSnapshot[]): ReadonlySet<string> {
  const { feeds } = strategy;
  const emphasisTags = new Set<string>([...(feeds.communities ?? []), ...(feeds.tags ?? [])]);
  const emphasisUsers = new Set<string>(feeds.users ?? []);
  const keys = new Set<string>();
  for (const p of posts) {
    const inUser = emphasisUsers.has(p.author);
    const inTag = p.tags.some((t) => emphasisTags.has(t));
    if (inUser || inTag) keys.add(`${p.author}/${p.permlink}`);
  }
  return keys;
}

/**
 * The character's score for one already-valued candidate: the upstream composite
 * `expectedAlpha` re-weighted by this wallet's objective. Every term is a bounded
 * multiplier in roughly [0, 1+w], so the substrate stays authoritative and the
 * character only tilts the ballot toward what it values. Used for BOTH the
 * funded-vote ordering and the per-vote intensity, so each wallet casts a
 * genuinely different ballot over the same field.
 */
export function strategyAlpha(
  pi: PostIntelligence,
  objective: VotingObjective,
  inEmphasis: boolean,
): number {
  const o = objective;
  const base = Math.max(pi.expectedAlpha, 1e-9);
  const m =
    (1 + o.underrecognition * normDeficit(pi.deficit)) *
    (1 + o.quality * clamp01(pi.contentFitness)) *
    (1 + o.conversation * clamp01(pi.engagement)) *
    (1 + o.durability * clamp01(pi.durability)) *
    (pi.bridge ? 1 + o.bridge : 1) *
    (inEmphasis ? 1 + o.communityFit : 1) *
    Math.max(0, 1 - o.cartelAversion * clamp01(pi.cartelExposure));
  return base * m;
}

/** Deficits are unbounded magnitudes; squash to (0,1) so the underrecognition
 *  term is a comparable multiplier rather than swamping the product. */
function normDeficit(deficit: number): number {
  const d = Math.max(0, deficit);
  return d / (1 + d);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
