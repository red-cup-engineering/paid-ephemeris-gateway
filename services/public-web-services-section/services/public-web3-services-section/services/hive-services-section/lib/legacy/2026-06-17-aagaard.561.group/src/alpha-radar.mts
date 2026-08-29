// alpha-radar — the next-generation curation edge: reward mispricing read off
// the attention graph (docs/max-alpha.md, Layers 1–2).
//
// Ordinary curation bots score each post in isolation (payout, age, author
// reputation) and vote the top of a flat list. The frontier thesis is sharper:
// curation alpha is the *under-pricing of a post relative to its neighbourhood*
// in the attention graph. A post paid far below the cohort it shares tags with
// is an under-recognized sink — exactly where an early upvote captures the
// largest curation return. This module builds that graph from the candidate set
// and reads the exact max-alpha functionals over it:
//
//   • mispricing energy  E(r) = Σ_{i~j} w_ij (r_i − r_j)²  — the total
//     addressable alpha in the reward field (zero iff every post already sits at
//     its neighbourhood mean: fully priced, no edge);
//   • capturable sinks   (L r)_i < 0  — posts priced BELOW their tag-cohort,
//     the negative harmonic deviation, deepest deficit first: the opportunity
//     set the voting lane prioritises;
//   • fragmentation      connected-component count — a fractured attention field
//     (silos, cartels) corrects slowly, so the edge it hides is durable.
//
// Backing the exact contract with bigint/number, deliberately. The upstream
// `@emsenn/computing-with-hive/organizing/analysis` ships these same functionals
// against `@emsenn/relating`'s Rational — but that carrier is a *unary Peano*
// construction, and E(r) sums tens-to-hundreds of terms whose denominators
// multiply, so the value becomes an astronomically large unary natural and the
// computation never returns (the exact infeasibility documented in
// computing-with-hive/organizing/emission). So — exactly as that emission module
// did — we keep the formula and its meaning verbatim and evaluate it over the
// post↔tag graph in native numbers: the reward field is small-integer payout
// buckets, the weights are integer co-occurrence counts, and E(r)/deviation are
// finite sums of small products. Same Dirichlet energy, same Laplacian
// deviation, same harmonic-sink semantics — feasible at the fleet's real scale.

export interface RadarCandidate {
  readonly author: string;
  readonly permlink: string;
  readonly tags: readonly string[];
  /** Pending payout bucketed to a small non-negative integer (the reward field). */
  readonly score: number;
}

export interface SinkReading {
  readonly key: string;
  readonly author: string;
  readonly permlink: string;
  /** How far below its tag-cohort the post is priced (the negative Laplacian
   *  deviation, sign-flipped to a positive deficit). */
  readonly deficit: number;
}

export interface AlphaRadar {
  readonly kind: "aagaard.alpha-radar";
  readonly posts: number;
  /** Total addressable alpha E(r) — the mispricing energy of the reward field. */
  readonly mispricingEnergy: number;
  /** Connected components of the attention graph; >1 ⟹ fragmented ⟹ durable. */
  readonly components: number;
  readonly durable: boolean;
  /** Under-priced posts, deepest deficit first — the opportunity set. */
  readonly sinks: readonly SinkReading[];
}

const SCORE_CAP = 64;

/** Bucket a Hive pending-payout string ("12.345 HBD") into a small integer
 *  reward score — the reward field of the attention graph. */
export function payoutScore(pendingPayout: string): number {
  const whole = Number.parseInt(pendingPayout.split(".")[0] ?? "0", 10);
  if (!Number.isFinite(whole) || whole < 0) return 0;
  return whole > SCORE_CAP ? SCORE_CAP : whole;
}

/** Extract content tags from a raw bridge/condenser post: the category plus any
 *  json_metadata tags, de-duplicated and bounded. */
export function postTags(post: Readonly<Record<string, unknown>>): readonly string[] {
  const tags = new Set<string>();
  if (typeof post["category"] === "string" && post["category"]) tags.add(post["category"]);
  if (typeof post["json_metadata"] === "string") {
    try {
      const meta = JSON.parse(post["json_metadata"]) as { tags?: unknown };
      if (Array.isArray(meta.tags)) {
        for (const t of meta.tags) if (typeof t === "string" && t) tags.add(t);
      }
    } catch {
      // malformed metadata — category tag (if any) still stands
    }
  }
  return Object.freeze([...tags].slice(0, 8));
}

/** Reduce a raw post to a radar candidate. */
export function toRadarCandidate(post: Readonly<Record<string, unknown>>): RadarCandidate | null {
  const author = typeof post["author"] === "string" ? post["author"] : "";
  const permlink = typeof post["permlink"] === "string" ? post["permlink"] : "";
  if (!author || !permlink) return null;
  const payout = typeof post["pending_payout_value"] === "string" ? post["pending_payout_value"] : "0.000 HBD";
  return Object.freeze({ author, permlink, tags: postTags(post), score: payoutScore(payout) });
}

/** Connected components of the post↔tag bipartite graph by union-find — the
 *  zero-eigenvalue multiplicity of the Laplacian, i.e. the field's fragmentation. */
function componentCount(candidates: readonly RadarCandidate[]): number {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) ?? r;
    let c = x;
    while (parent.get(c) !== r) { const n = parent.get(c) ?? r; parent.set(c, r); c = n; }
    return r;
  };
  const ensure = (x: string): void => { if (!parent.has(x)) parent.set(x, x); };
  const union = (a: string, b: string): void => { ensure(a); ensure(b); parent.set(find(a), find(b)); };
  for (const c of candidates) {
    const pk = `p:${c.author}/${c.permlink}`;
    ensure(pk);
    for (const t of c.tags) union(pk, `t:${t}`);
  }
  const roots = new Set<string>();
  for (const node of parent.keys()) roots.add(find(node));
  return roots.size;
}

/**
 * Read the alpha radar over a candidate post set. Builds the post↔tag attention
 * graph, scores each tag at its cohort mean (so a post below its tags shows a
 * negative Laplacian deviation), and evaluates the mispricing energy and the
 * capturable sinks directly — the exact max-alpha functionals, in feasible
 * arithmetic.
 */
export function readAlphaRadar(rawPosts: readonly Readonly<Record<string, unknown>>[]): AlphaRadar {
  const candidates = rawPosts.map(toRadarCandidate).filter((c): c is RadarCandidate => c !== null);

  // Tag reward level = mean of its member posts' scores — the neighbourhood each
  // post is measured against.
  const tagAgg = new Map<string, { sum: number; n: number }>();
  for (const c of candidates) {
    for (const t of c.tags) {
      const e = tagAgg.get(t) ?? { sum: 0, n: 0 };
      tagAgg.set(t, { sum: e.sum + c.score, n: e.n + 1 });
    }
  }
  const tagScore = new Map<string, number>();
  for (const [t, { sum, n }] of tagAgg) tagScore.set(t, n > 0 ? sum / n : 0);

  // E(r) over the post↔tag edges, and each post's Laplacian deviation
  // (L r)_i = Σ_j w_ij (r_i − r_j). Weights are 1 per (post,tag) edge.
  let energy = 0;
  const sinks: SinkReading[] = [];
  for (const c of candidates) {
    let dev = 0;
    for (const t of c.tags) {
      const rt = tagScore.get(t) ?? 0;
      const diff = c.score - rt;
      energy += diff * diff;       // Σ_{i~j} w_ij (r_i − r_j)²  (each edge once)
      dev += diff;                 // (L r)_post accumulation
    }
    if (dev < 0) {
      sinks.push({
        key: `hive.post.${c.author}/${c.permlink}`,
        author: c.author,
        permlink: c.permlink,
        deficit: -dev,
      });
    }
  }
  sinks.sort((a, b) => b.deficit - a.deficit);

  const components = componentCount(candidates);
  return Object.freeze({
    kind: "aagaard.alpha-radar" as const,
    posts: candidates.length,
    mispricingEnergy: energy,
    components,
    durable: components > 1,
    sinks: Object.freeze(sinks),
  });
}
