// researching/sourcing/source-submission — the submission desk.
//
// Sourcing usually listens to the configured wires and lets demand pull a story
// out of the witnessed intake. The submission desk runs the other direction: an
// operator hands the newsroom ONE specific source material and asks whether it
// belongs in Koios.News — and, if it does, works it into a draft candidate.
//
// This is not a second pipeline. It is a parameterization of the same
// content-farm cultivation cycle every Koios article already runs through. The
// submitted material is injected as the witnessed intake (`items`); the
// appraised beat and term are the forced assignment; and the farm's default
// selection, composition, editorial gates, and draft-candidate recording carry
// it the rest of the way. The one judgment this desk adds before the cycle is
// appropriateness: a submission that falls outside every Koios beat is
// witnessed as out-of-frame and never drafted — the same lawful shape as the
// cycle's own unsupported-demand obstruction (no article, witnessed).

import {
  cultivate,
  intakeItems,
  distinctiveTermWords,
  normalizeTerm,
  type Ask,
  type CultivationJudgment,
  type FarmProperty,
  type FetchLike,
  type SeedTerm,
  type SelectStory,
  type SyndicationItem,
} from "@emsenn/content-production/content-farm";

import { koiosFarmProperty } from "../../demand.mjs";

/** One specific source material an operator submits for editorial appraisal. */
export type SubmittedSource = Readonly<{
  /** The canonical permalink — the URL the draft will cite. */
  url: string;
  title: string;
  /** The editorial digest the composer reads (key facts, figures, named
   * entities). The farm composer sees up to ~900 characters of this. */
  summary?: string;
  /** Fuller text the appraisal may read for frame-fit when no summary carries
   * the signal — an article body, an editor's note. Not stored; appraisal and
   * composition fall back to it. */
  text?: string;
  authors?: readonly string[];
  published?: string;
  /** Force the beat, skipping inference. Must be a configured Koios beat. */
  beat?: string;
  /** Force the SEO/assignment term, skipping inference. */
  term?: string;
}>;

/** How one beat scored against the submitted material during appraisal. */
export type BeatFitScore = Readonly<{
  beat: string;
  score: number;
  matched: readonly string[];
}>;

/** The appropriateness judgment: does this material belong in a Koios beat, and
 * under which lens term. `appropriate` is false when the best beat fails to
 * clear the signal threshold and no beat was forced. */
export type SubmissionAppraisal = Readonly<{
  kind: "koios.news.source-submission.appraisal";
  appropriate: boolean;
  beat: string | null;
  term: string | null;
  score: number;
  threshold: number;
  forced: boolean;
  matchedTerms: readonly string[];
  evidence: string;
  beatScores: readonly BeatFitScore[];
}>;

/** A submission Koios cannot place in any beat: witnessed, never drafted. */
export type SourceSubmissionOutOfFrame = Readonly<{
  kind: "koios.news.source-submission:out-of-frame";
  url: string;
  title: string;
  appraisal: SubmissionAppraisal;
  evidence: string;
}>;

/** What the desk gathered around the seed before composing: the seed leads, the
 * editor's discovered sources follow, then related items clustered out of the
 * beat's own wires. This is the "find more" half of the capability. */
export type GatheredSources = Readonly<{
  kind: "koios.news.source-submission.gathered";
  seedUrl: string;
  relatedCount: number;
  sourceUrls: readonly string[];
  wireObstructions: readonly string[];
}>;

/** A submission worked into the cultivation cycle: the appraisal that placed it,
 * what the desk gathered around it, and the cycle's own witness (a draft
 * candidate synthesized across the gathered sources, or its lawful obstruction). */
export type SourceSubmissionCultivated = Readonly<{
  kind: "koios.news.source-submission:cultivated";
  url: string;
  title: string;
  mode: "single" | "expand";
  appraisal: SubmissionAppraisal;
  gathered: GatheredSources;
  cultivation: CultivationJudgment;
}>;

export type SourceSubmissionJudgment = SourceSubmissionOutOfFrame | SourceSubmissionCultivated;

export type SubmitSourceOptions = Readonly<{
  /** How to work the source into a post. "expand" (the default) finds related
   * sources from the beat's wires plus any the editor supplies, anchors on the
   * seed, and synthesizes ORIGINAL multi-source analysis. "single" drafts from
   * the seed alone (a paraphrase — kept only for narrow re-use). */
  mode?: "single" | "expand";
  /** Additional real sources the editor already found (e.g. by research) to
   * fold into the intake alongside the seed and the wire matches. */
  discoveredSources?: readonly SubmittedSource[];
  /** Cap on related wire items clustered into the intake. Default 8. */
  maxRelated?: number;
  /** The publication property; default the Koios farm property from config. */
  property?: FarmProperty;
  /** The day stamp recorded on the candidate and run trace. Default: today. */
  at?: string;
  /** Inject the composer (the prompt-to-text morphism). Default: the property's
   * configured provider/model, reached through the farm cycle. */
  ask?: Ask;
  provider?: string;
  model?: string;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
  dryRun?: boolean;
  /** Minimum distinct-signal-word overlap a beat must reach to be appropriate
   * when no beat is forced. Default 2. */
  threshold?: number;
  now?: () => string;
}>;

const DEFAULT_APPRAISAL_THRESHOLD = 2;

function isOutOfFrame(judgment: SourceSubmissionJudgment): judgment is SourceSubmissionOutOfFrame {
  return judgment.kind === "koios.news.source-submission:out-of-frame";
}

export { isOutOfFrame };

function submissionHaystack(submitted: SubmittedSource): ReadonlySet<string> {
  const text = [submitted.title, submitted.summary ?? "", submitted.text ?? ""].join(" ");
  return new Set(normalizeTerm(text).split(" ").filter((word) => word.length > 2));
}

/** The distinctive vocabulary of a beat: the distinctive words of each of its
 * seed terms, plus its category label. This is the frame the submission is
 * appraised against — beat-generic words prove nothing and are excluded. */
function beatVocabulary(property: FarmProperty, beat: string): ReadonlySet<string> {
  const generic = new Set(property.genericTermWords ?? []);
  const words = new Set<string>();
  for (const seed of property.seeds) {
    if (seed.beat !== beat) continue;
    for (const word of distinctiveTermWords(seed.term, generic)) words.add(word);
  }
  const category = property.beatCategory?.[beat];
  if (category !== undefined) for (const word of distinctiveTermWords(category, generic)) words.add(word);
  return words;
}

function beatFitScores(property: FarmProperty, haystack: ReadonlySet<string>): readonly BeatFitScore[] {
  return Object.freeze(Object.keys(property.beatSources)
    .map((beat): BeatFitScore => {
      const matched = [...beatVocabulary(property, beat)].filter((word) => haystack.has(word));
      return Object.freeze({ beat, score: matched.length, matched: Object.freeze(matched) });
    })
    .sort((left, right) => right.score - left.score || left.beat.localeCompare(right.beat)));
}

/** Choose the assignment term within a beat: the seed term whose distinctive
 * words overlap the submission most (priority breaks ties); failing any
 * overlap, the beat's highest-priority seed; failing seeds, the beat label. */
function inferTerm(property: FarmProperty, beat: string, haystack: ReadonlySet<string>): string | null {
  const generic = new Set(property.genericTermWords ?? []);
  const seeds = property.seeds.filter((seed): seed is SeedTerm => seed.beat === beat);
  if (seeds.length === 0) return property.beatCategory?.[beat] ?? null;
  const ranked = [...seeds]
    .map((seed) => ({
      term: seed.term,
      priority: seed.priority ?? 0,
      overlap: [...distinctiveTermWords(seed.term, generic)].filter((word) => haystack.has(word)).length,
    }))
    .sort((left, right) => right.overlap - left.overlap || right.priority - left.priority || left.term.localeCompare(right.term));
  return ranked[0]?.term ?? null;
}

/** Appraise whether a submitted source belongs in a Koios beat, and under which
 * lens term. A forced beat/term is honoured (the operator's assignment); an
 * unforced submission must clear the signal threshold against some beat. */
export function appraiseSubmission(
  submitted: SubmittedSource,
  property: FarmProperty,
  options: Readonly<{ threshold?: number }> = {},
): SubmissionAppraisal {
  const threshold = options.threshold ?? DEFAULT_APPRAISAL_THRESHOLD;
  const haystack = submissionHaystack(submitted);
  const beatScores = beatFitScores(property, haystack);
  const configuredBeats = new Set(Object.keys(property.beatSources));

  if (submitted.beat !== undefined) {
    if (!configuredBeats.has(submitted.beat)) {
      return Object.freeze({
        kind: "koios.news.source-submission.appraisal" as const,
        appropriate: false,
        beat: null,
        term: null,
        score: 0,
        threshold,
        forced: true,
        matchedTerms: Object.freeze([]),
        evidence: `Forced beat "${submitted.beat}" is not a configured Koios beat (${[...configuredBeats].join(", ")}).`,
        beatScores,
      });
    }
    const fit = beatScores.find((entry) => entry.beat === submitted.beat);
    const term = submitted.term ?? inferTerm(property, submitted.beat, haystack);
    return Object.freeze({
      kind: "koios.news.source-submission.appraisal" as const,
      appropriate: term !== null,
      beat: submitted.beat,
      term,
      score: fit?.score ?? 0,
      threshold,
      forced: true,
      matchedTerms: fit?.matched ?? Object.freeze([]),
      evidence: `Operator forced beat "${submitted.beat}"${submitted.term === undefined ? ` with inferred term "${term ?? "(none)"}"` : ` with term "${submitted.term}"`}.`,
      beatScores,
    });
  }

  const best = beatScores[0];
  if (best === undefined || best.score < threshold) {
    return Object.freeze({
      kind: "koios.news.source-submission.appraisal" as const,
      appropriate: false,
      beat: null,
      term: null,
      score: best?.score ?? 0,
      threshold,
      forced: false,
      matchedTerms: best?.matched ?? Object.freeze([]),
      evidence: `No Koios beat reaches the signal threshold of ${threshold} distinct words against this material (best: ${best?.beat ?? "none"} at ${best?.score ?? 0}). Force a beat to override, or this source is out of frame.`,
      beatScores,
    });
  }
  const term = submitted.term ?? inferTerm(property, best.beat, haystack);
  return Object.freeze({
    kind: "koios.news.source-submission.appraisal" as const,
    appropriate: term !== null,
    beat: best.beat,
    term,
    score: best.score,
    threshold,
    forced: false,
    matchedTerms: best.matched,
    evidence: `Material fits beat "${best.beat}" (${best.score} distinct signal words: ${best.matched.slice(0, 8).join(", ")}); lens term "${term ?? "(none)"}".`,
    beatScores,
  });
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

/** Project a submitted source into the syndication item the cycle witnesses as
 * its single-story intake. The summary the composer reads falls back to the
 * fuller text when no digest was supplied. */
export function syndicationItemFromSubmission(submitted: SubmittedSource): SyndicationItem {
  const summary = submitted.summary ?? (submitted.text === undefined ? undefined : submitted.text.slice(0, 900));
  const source = domainOf(submitted.url) ?? "submitted";
  return Object.freeze({
    url: submitted.url,
    title: submitted.title,
    ...(summary === undefined ? {} : { summary }),
    ...(submitted.authors === undefined ? {} : { authors: submitted.authors }),
    ...(submitted.published === undefined ? {} : { published: submitted.published }),
    source,
  });
}

function dedupeByUrl(items: readonly SyndicationItem[]): readonly SyndicationItem[] {
  const seen = new Set<string>();
  const kept: SyndicationItem[] = [];
  for (const item of items) {
    const key = item.url.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(item);
  }
  return Object.freeze(kept);
}

/** "Find more": from the beat's own wires (and any sources the editor already
 * discovered), cluster the items that overlap the seed and the lens term, and
 * return the intake the cycle will synthesize over — the seed leading, the
 * editor's discoveries next, then the wire matches. Wire-fetch failures are
 * obstruction values, never throws. */
export async function gatherRelatedSources(
  seed: SubmittedSource,
  beat: string,
  term: string,
  property: FarmProperty,
  options: Readonly<{ fetchImpl?: FetchLike; discovered?: readonly SubmittedSource[]; max?: number }> = {},
): Promise<Readonly<{ items: readonly SyndicationItem[]; obstructions: readonly string[]; relatedCount: number }>> {
  const seedItem = syndicationItemFromSubmission(seed);
  const discovered = (options.discovered ?? []).map(syndicationItemFromSubmission);
  const generic = new Set(property.genericTermWords ?? []);
  const keywords = new Set<string>([
    ...distinctiveTermWords(term, generic),
    ...normalizeTerm(`${seed.title} ${seed.summary ?? ""}`).split(" ").filter((word) => word.length > 3 && !generic.has(word)),
  ]);
  const intake = await intakeItems(property, beat, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
  });
  const seedKey = seedItem.url.replace(/\/+$/, "");
  const related = intake.items
    .filter((item) => item.url.replace(/\/+$/, "") !== seedKey)
    .map((item) => {
      const haystack = normalizeTerm(`${item.title} ${item.summary ?? ""}`);
      const score = [...keywords].filter((word) => haystack.includes(word)).length;
      return { item, score };
    })
    .filter((scored) => scored.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.max ?? 8)
    .map((scored) => scored.item);
  const items = dedupeByUrl([seedItem, ...discovered, ...related]);
  return Object.freeze({ items, obstructions: intake.obstructions, relatedCount: items.length - 1 });
}

/** Anchor the cycle on the seed: the submitted source is the subject story, the
 * gathered related items are the supporting context the analysis draws on. */
const seedLeadSelect: SelectStory = ({ items }) => Object.freeze({
  story: items[0]!,
  context: Object.freeze(items.slice(1, 6)),
});

/** The submission desk: appraise a specific source, and if it belongs in a
 * Koios beat, work it into a draft candidate. By default ("expand") it finds
 * related sources from the beat's wires (and the editor's discoveries), anchors
 * on the seed, and synthesizes original multi-source analysis through the same
 * content-farm cycle every article runs through. */
export async function submitSource(
  submitted: SubmittedSource,
  options: SubmitSourceOptions = {},
): Promise<SourceSubmissionJudgment> {
  const property = options.property ?? koiosFarmProperty();
  const appraisal = appraiseSubmission(submitted, property, {
    ...(options.threshold === undefined ? {} : { threshold: options.threshold }),
  });
  if (!appraisal.appropriate || appraisal.beat === null || appraisal.term === null) {
    return Object.freeze({
      kind: "koios.news.source-submission:out-of-frame" as const,
      url: submitted.url,
      title: submitted.title,
      appraisal,
      evidence: appraisal.evidence,
    });
  }
  const mode = options.mode ?? "expand";
  const now = options.now ?? (() => new Date().toISOString());
  const at = options.at ?? now().slice(0, 10);

  const gathered: Readonly<{ items: readonly SyndicationItem[]; obstructions: readonly string[]; relatedCount: number }> =
    mode === "single"
      ? Object.freeze({ items: Object.freeze([syndicationItemFromSubmission(submitted)]), obstructions: Object.freeze([]), relatedCount: 0 })
      : await gatherRelatedSources(submitted, appraisal.beat, appraisal.term, property, {
        ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
        ...(options.discoveredSources === undefined ? {} : { discovered: options.discoveredSources }),
        ...(options.maxRelated === undefined ? {} : { max: options.maxRelated }),
      });

  const cultivation = await cultivate(property, {
    at,
    items: gathered.items,
    term: appraisal.term,
    beat: appraisal.beat,
    ...(mode === "expand" ? { select: seedLeadSelect } : {}),
    ...(options.ask === undefined ? {} : { ask: options.ask }),
    ...(options.provider === undefined ? {} : { provider: options.provider }),
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.env === undefined ? {} : { env: options.env }),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
  });
  return Object.freeze({
    kind: "koios.news.source-submission:cultivated" as const,
    url: submitted.url,
    title: submitted.title,
    mode,
    appraisal,
    gathered: Object.freeze({
      kind: "koios.news.source-submission.gathered" as const,
      seedUrl: submitted.url,
      relatedCount: gathered.relatedCount,
      sourceUrls: Object.freeze(gathered.items.map((item) => item.url)),
      wireObstructions: gathered.obstructions,
    }),
    cultivation,
  });
}
