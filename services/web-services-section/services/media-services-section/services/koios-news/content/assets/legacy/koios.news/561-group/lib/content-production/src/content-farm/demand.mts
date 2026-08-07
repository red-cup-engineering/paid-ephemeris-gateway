/**
 * demand — the assignment desk's demand reading. Demand creates
 * assignments, never evidence: what the farm covers next is decided here,
 * from (a) the property's seed term map, (b) earned views, (c) Search
 * Console material when present, and (d) coverage decay. Sources never
 * decide WHETHER a term is assigned; once it is, the term acts as a lens
 * that selects the single source story the article covers (./story.mts).
 *
 * Moved from sites/koios.news/src/demand.ts (2026-06-12), with the beat
 * space generalized to strings and the front-matter namespace (where a
 * property records its covered terms) made a parameter.
 */

import { existsSync, readFileSync } from "node:fs";

export type SeedTerm = Readonly<{ beat: string; term: string; priority: number }>;

export type SearchConsoleQuery = Readonly<{ query: string; impressions?: number; clicks?: number }>;

export type DemandEntry = Readonly<{
  beat: string;
  term: string;
  score: number;
  evidence: Readonly<{ priority: number; views: number; impressions: number; clicks: number; covered: number }>;
}>;

/** The shape of a content-store post the demand reading needs: its slug
 * and front matter. Any richer post carrier (a site's own) assigns. */
export type CandidatePost = Readonly<{
  slug: string;
  document: Readonly<{ frontMatter: Readonly<Record<string, unknown>> }>;
}>;

/** The view-counts reading demand folds: views by site-relative path. */
export type ViewCountsReading = Readonly<{ byPath: Readonly<Record<string, number>> }>;

export const NO_VIEWS: ViewCountsReading = Object.freeze({ byPath: Object.freeze({}) });

/** Read a search-console.json file if present: { queries: [{query, impressions, clicks}] }.
 * The seam for Search Console exports (the farm's demand pull, a manual
 * drop, or an API sync). A missing or malformed file is empty demand. */
export function readSearchConsole(path: string): readonly SearchConsoleQuery[] {
  if (!existsSync(path)) return Object.freeze([]);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { queries?: unknown };
    if (!Array.isArray(parsed.queries)) return Object.freeze([]);
    return Object.freeze(parsed.queries.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || typeof (entry as { query?: unknown }).query !== "string") return [];
      const record = entry as { query: string; impressions?: unknown; clicks?: unknown };
      return [Object.freeze({
        query: record.query,
        ...(typeof record.impressions === "number" ? { impressions: record.impressions } : {}),
        ...(typeof record.clicks === "number" ? { clicks: record.clicks } : {}),
      })];
    }));
  } catch {
    return Object.freeze([]);
  }
}

function normalize(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function overlap(a: string, b: string): number {
  const left = new Set(normalize(a).split(" "));
  const right = normalize(b).split(" ");
  return right.filter((word) => left.has(word)).length / Math.max(right.length, 1);
}

export type DemandTableInput = Readonly<{
  posts: readonly CandidatePost[];
  views?: ViewCountsReading;
  searchConsole?: readonly SearchConsoleQuery[];
  seeds: readonly SeedTerm[];
  /** The front-matter namespace under which the property records its SEO
   * term (e.g. "koios" → frontMatter.koios.seo_term). Default "farm". */
  termKey?: string;
}>;

/** Fold demand: seeds + earned views + searched queries − coverage. */
export function demandTable(input: DemandTableInput): readonly DemandEntry[] {
  const seeds = input.seeds;
  const queries = input.searchConsole ?? [];
  const views = input.views ?? NO_VIEWS;
  const termKey = input.termKey ?? "farm";
  const coverage = new Map<string, { count: number; paths: string[] }>();
  for (const post of input.posts) {
    const namespace = (post.document.frontMatter[termKey] ?? {}) as Readonly<Record<string, unknown>>;
    const terms = new Set([
      ...(typeof namespace["seo_term"] === "string" ? [namespace["seo_term"]] : []),
      ...(Array.isArray(post.document.frontMatter["keywords"]) ? (post.document.frontMatter["keywords"] as unknown[]).map(String) : []),
    ]);
    const path = `/posts/${post.slug}`;
    for (const term of terms) {
      const key = normalize(term);
      const entry = coverage.get(key) ?? { count: 0, paths: [] };
      entry.count += 1;
      entry.paths.push(path);
      coverage.set(key, entry);
    }
  }
  const entries = seeds.map((seed) => {
    const key = normalize(seed.term);
    const covered = coverage.get(key);
    const earned = (covered?.paths ?? []).reduce((sum, path) => sum + (views.byPath[path] ?? 0), 0);
    let impressions = 0;
    let clicks = 0;
    for (const query of queries) {
      if (overlap(seed.term, query.query) >= 0.6) {
        impressions += query.impressions ?? 0;
        clicks += query.clicks ?? 0;
      }
    }
    const score = seed.priority
      + 2 * Math.log2(1 + earned)
      + 0.5 * clicks
      + 0.01 * impressions
      - 3 * (covered?.count ?? 0);
    return Object.freeze({
      beat: seed.beat,
      term: seed.term,
      score,
      evidence: Object.freeze({ priority: seed.priority, views: earned, impressions, clicks, covered: covered?.count ?? 0 }),
    });
  });
  return Object.freeze([...entries].sort((left, right) => right.score - left.score || left.term.localeCompare(right.term)));
}
