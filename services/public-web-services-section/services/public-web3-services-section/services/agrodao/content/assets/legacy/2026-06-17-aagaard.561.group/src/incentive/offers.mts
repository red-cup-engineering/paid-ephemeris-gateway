// incentive/offers — ingestion of "do X, get Y" incentive announcements (#24).
//
// Beyond curation, Hive communities constantly post bounties: "comment your
// favourite X for a chance at xx tokens", "reblog + upvote to enter", "delegate
// for a share of rewards", "follow and comment". These are a second reward
// channel for the same on-chain actions we already take — but only if we can
// READ the announcement, structure it, and route it through the gate.
//
// This module is the ingestion half: pure heuristic parsers over the raw posts
// we already fetch (title + body + json_metadata) that recognise the offer
// pattern and extract a structured IncentiveOffer — required actions, the
// reward, a deadline if stated. No valuation, no execution: just turning prose
// announcements into structured offers. Everything downstream (value, scam
// filter, authorization, the human gate) consumes this shape.

export type ActionKind = "vote" | "reblog" | "comment" | "post" | "delegate" | "follow";

export interface RequiredAction {
  readonly kind: ActionKind;
  /** Where the action is directed, when the post implies one (else the post itself). */
  readonly target?: string;
  /** Any literal constraint phrase the announcement attached ("include a photo"). */
  readonly constraint?: string;
}

export interface IncentiveReward {
  readonly token: string;
  /** Stated reward amount when a number was found next to the token. */
  readonly amount?: number;
}

export interface IncentiveOffer {
  readonly id: string;
  readonly source: { readonly author: string; readonly permlink: string; readonly community?: string };
  readonly requiredActions: readonly RequiredAction[];
  readonly reward: IncentiveReward | null;
  readonly deadline?: string;
  /** The matched announcement sentence(s), for the human gate to read. */
  readonly rawText: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Action verbs → kinds. A bounty almost always phrases the ask as an imperative.
const ACTION_PATTERNS: readonly { kind: ActionKind; re: RegExp }[] = [
  { kind: "comment", re: /\b(comment|reply|drop a comment|leave a comment|tell us|share your)\b/i },
  { kind: "reblog", re: /\b(reblog|resteem|re-?blog)\b/i },
  { kind: "vote", re: /\b(upvote|up-?vote|vote for|give it a vote)\b/i },
  { kind: "follow", re: /\b(follow us|follow me|follow the account|give a follow)\b/i },
  { kind: "delegate", re: /\b(delegate|delegation)\b/i },
  { kind: "post", re: /\b(make a post|write a post|create a post|submit a post|enter with a post)\b/i },
];

// Reward cue: a number adjacent to a token symbol, or a token after "win/get/earn".
const REWARD_AMOUNT_RE = /(\d+(?:[.,]\d+)?)\s*([A-Z][A-Z0-9._-]{1,14})\b/;
const REWARD_VERB_RE = /\b(win|get|earn|receive|reward(?:ed)?|prize|paid|share of)\b/i;
const DEADLINE_RE = /\b(?:deadline|ends?|closes?|until|before)\b[^.\n]{0,40}?(\d{1,2}\s*(?:hours?|days?|h|d)|\d{4}-\d{2}-\d{2}|[A-Z][a-z]+\s+\d{1,2})/i;

// Tokens that are not rewards (avoid matching ALLCAPS noise / tickers in prose).
const NON_REWARD_TOKENS = new Set(["I", "A", "USD", "USA", "HF", "AI", "NFT", "DAO", "OK", "PS", "TLDR", "FYI"]);

function communityOf(post: Readonly<Record<string, unknown>>): string | undefined {
  const cat = str(post["category"]);
  return cat.startsWith("hive-") ? cat : undefined;
}

function extractReward(text: string): IncentiveReward | null {
  // Prefer an amount+symbol next to a reward verb.
  const verbIdx = text.search(REWARD_VERB_RE);
  const scan = verbIdx >= 0 ? text.slice(verbIdx, verbIdx + 80) : text;
  const m = REWARD_AMOUNT_RE.exec(scan) ?? REWARD_AMOUNT_RE.exec(text);
  if (m) {
    const token = (m[2] ?? "").toUpperCase();
    if (!NON_REWARD_TOKENS.has(token)) {
      const amount = Number(m[1]!.replace(",", "."));
      return Number.isFinite(amount) ? { token, ...(amount > 0 ? { amount } : {}) } : { token };
    }
  }
  // Token after a reward verb without a number (e.g. "earn PIZZA").
  if (verbIdx >= 0) {
    const t = /\b([A-Z][A-Z0-9._-]{2,14})\b/.exec(text.slice(verbIdx, verbIdx + 40));
    if (t && !NON_REWARD_TOKENS.has(t[1]!)) return { token: t[1]!.toUpperCase() };
  }
  return null;
}

function detectActions(text: string): RequiredAction[] {
  const actions: RequiredAction[] = [];
  for (const { kind, re } of ACTION_PATTERNS) {
    const m = re.exec(text);
    if (m) actions.push({ kind });
  }
  return actions;
}

/** Parse a single raw post into an IncentiveOffer, or null if it is not one. */
export function parseOffer(post: Readonly<Record<string, unknown>>): IncentiveOffer | null {
  const author = str(post["author"]);
  const permlink = str(post["permlink"]);
  if (!author || !permlink) return null;
  const title = str(post["title"]);
  const body = str(post["body"]).slice(0, 4000); // bound the scan
  const text = `${title}\n${body}`;

  const actions = detectActions(text);
  const reward = extractReward(text);
  // An offer needs at least one required action AND a reward cue; otherwise it is
  // ordinary content, not a "do X get Y".
  if (actions.length === 0 || (reward === null && !REWARD_VERB_RE.test(text))) return null;

  // The matched sentence(s) for the gate: the first lines mentioning a verb.
  const sentence = (title + ". " + body).split(/(?<=[.!?])\s/).find((s) => REWARD_VERB_RE.test(s) || ACTION_PATTERNS.some((p) => p.re.test(s))) ?? title;
  const deadlineMatch = DEADLINE_RE.exec(text);

  const community = communityOf(post);
  return Object.freeze({
    id: `hive.offer.${author}/${permlink}`,
    source: { author, permlink, ...(community ? { community } : {}) },
    requiredActions: Object.freeze(actions),
    reward,
    ...(deadlineMatch ? { deadline: deadlineMatch[1] } : {}),
    rawText: sentence.slice(0, 280),
  });
}

/** Ingest all offers from a candidate post set. */
export function ingestOffers(posts: readonly Readonly<Record<string, unknown>>[]): readonly IncentiveOffer[] {
  const out: IncentiveOffer[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    const offer = parseOffer(post);
    if (offer && !seen.has(offer.id)) { seen.add(offer.id); out.push(offer); }
  }
  return Object.freeze(out);
}
