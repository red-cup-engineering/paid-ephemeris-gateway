/**
 * article — the news-document production surface: the voice-parameterized
 * article prompt, the structured-reply parser, story selection from an
 * intake, and the mechanical editorial gates.
 *
 * This is the news specialization of document production — the sibling of
 * ./documentation (documents about CODE) turned on NEWS. It is pure over
 * its inputs: the prompt is built from a voice value and a source story,
 * the reply is parsed, the draft is gated. The I/O (calling the model,
 * fetching the intake, writing the candidate, recording the run) belongs
 * to the cycle that owns it — content-farm — exactly as documentation's
 * I/O belongs to its app. News ⊂ document ⊂ content: the parse/gate
 * primitives live here in the content library, beside the doc ones, never
 * in the service.
 *
 * Following documentation.mts's discipline, the source story enters as a
 * structural subset (`SourceStory`), so this module never depends on the
 * intake transport (syndication-codecs); the cycle passes its richer items
 * in and `selectStory` returns them unchanged via the element type.
 */

import {
  normalizeTerm,
  wordCount,
  extractLinks,
  prophecyFindings,
  repetitionFindings,
  proseLintErrors,
  extractNumbers,
  numberFaithfulnessFindings,
} from "./gates.mjs";

// ---------- the source story (a structural subset of an intake item) ----------

/** The minimal shape of a source story the article surface needs — a
 * structural subset of a SyndicationItem, so this module never depends on
 * the intake transport (mirrors documentation.mts's DocumentableSymbol). */
export type SourceStory = Readonly<{
  title: string;
  url: string;
  summary?: string;
  published?: string;
}>;

// ---------- the draft and the voice ----------

/**
 * A produced news draft, parsed from a structured model reply: the headline,
 * the meta description, the summary, the share tweet, the topic tags, and the
 * markdown body.
 */
export type PostDraft = Readonly<{
  title: string;
  description: string;
  summary: string;
  tweet: string;
  tags: readonly string[];
  body: string;
}>;

/** A property's editorial voice, as a value. `persona` opens the prompt;
 * `laws` are property craft laws spliced into the universal ones;
 * `exemplar` replaces the default form exemplar. */
export type ArticleVoice = Readonly<{
  persona: readonly string[];
  exemplar?: readonly string[];
  laws?: readonly string[];
}>;

/** The default FORM exemplar: shape guidance (a lede that names the event,
 * concrete numbers, a three-sentence summary), never words to reuse. */
export const FORM_EXEMPLAR_DEFAULT: readonly string[] = Object.freeze([
  "FORM EXEMPLAR (match the SHAPE — a lede that names the event, sections that build one analysis, concrete numbers — never reuse its words):",
  "  Lede: \"In a move that's rattling global markets, Thailand has abruptly halted rice exports due to an escalating water crisis, prompting fears of a new wave of food price surges and shortages. This isn't just a Thai issue. It's a warning flare for the whole world. The Thailand rice export ban is a fracture in the illusion of a globally integrated food system.\"",
  "  Description: \"Thailand's rice export ban amid drought signals a global food system in breakdown. Here's how it affects us all.\" (113 characters)",
  "  Summary (three full sentences, 53 words — the event, the numbers, the frame): \"Thailand's rice export ban due to historic drought is triggering global price spikes and exposing the fragility of our food systems. This collapse in rice trade reflects a deeper crisis: climate volatility is unraveling global agriculture. The illusion of stable food supply chains is breaking—one drought, one policy, at a time.\"",
]);

// ---------- the prompt ----------

/**
 * The inputs to draftPrompt: the property's voice, the SEO lens term, the
 * single source story the article is about, and optional secondary stories
 * carried as supporting context.
 */
export type DraftPromptInput = Readonly<{
  voice: ArticleVoice;
  term: string;
  story: SourceStory;
  context?: readonly SourceStory[];
}>;

/** The article prompt: one story, one developed argument, judged by the
 * gates the laws below describe. The lead craft laws end at repetition;
 * the property's own laws splice in before the closing (prophecy, voice,
 * ending, no-h1) laws — matching the koios mill's original order. */
export function draftPrompt(input: DraftPromptInput): string {
  const supporting = (input.context ?? []).map((article, index) =>
    `[${index + 1}] ${article.title}\n    URL: ${article.url}\n    ${String(article.summary ?? "").slice(0, 300)}`).join("\n\n");
  const head = [
    ...input.voice.persona,
    "",
    `SEO TERM (the lens; use verbatim, roughly four occurrences across the body, HARD LIMIT five, woven into sentences, never stamped): "${input.term}"`,
    "When the lens term does not itself name the event, build ONE early bridge — the event read through the term — then let the event lead; never force the term into every section.",
    "",
    ...(input.voice.exemplar ?? FORM_EXEMPLAR_DEFAULT),
    "",
    "THE STORY (the single subject — the WHOLE article is about this one event):",
    "",
    `${input.story.title}\n    URL: ${input.story.url}\n    ${String(input.story.summary ?? "").slice(0, 900)}`,
    ...(() => {
      const nums = [...extractNumbers(`${input.story.title} ${String(input.story.summary ?? "")}`)];
      return nums.length > 0 ? [`    Factual numbers (faithfulness gate — reproduce these exactly, never invent others): ${nums.join(", ")}`] : [];
    })(),
    ...(supporting === "" ? [] : [
      "",
      "SUPPORTING CONTEXT (cite AT MOST TWO of these, only where one sharpens the story above; never give any of them a section of its own):",
      "",
      supporting,
    ]),
    "",
    "Write one article about THE STORY — one event, one developed argument, never a roundup:",
    "- aim for 1,100 words of body — long-form analysis; the editorial gate rejects anything under 800 words, so never stop early",
    "- four or five ## sections, EACH 170 to 230 words (two or three full paragraphs per section) — that is how the body clears 1,000 words",
    "- the lede (the first one or two paragraphs, 100-150 words) comes BEFORE the first ## subheader",
    "- the very first sentence names the event concretely (who, where, what) and contains the SEO term verbatim, as one exact contiguous phrase",
    "- never wrap the SEO term in the same sentence frame twice; each occurrence sits in a different kind of sentence",
    "- never repeat a noun phrase of five or more words: after its first mention, the event takes a short handle (\"the ban\", \"the hike\", \"the retreat\")",
    "- each section CONTINUES the previous one's argument; never reintroduce or restate the event — assume the reader read the lede",
    "- three to five ## sections that BUILD a single analysis of this event: what happened and why, where the faultline runs, who absorbs the damage first, what it opens onto — never one section per source",
    "- the SEO term appears verbatim in at least one ## subheader",
    "- work the concrete details from the source summaries into the prose — institutions, numbers, places, names; never invent events, numbers, quotes, or people",
    "- cite the story at least once as [Exact Story Title](its-exact-url), AND cite at least one supporting context item (the gate needs two distinct sources); at most two supporting citations; never cite anything not listed above",
    "- NEVER alter a quoted source title by even one word: link text that quotes a title reproduces it exactly, character for character",
    "- template sentences are banned: the construction \"As [X] notes/reports, ...\" may appear AT MOST twice in the whole article; vary how sources enter your prose",
    "- vary the opening sentence of every section; no two sections open with the same construction",
    "- never repeat a sentence; never reuse the same long phrase; when you need more length, add NEW concrete material from the sources — never restatements of points already made",
    ...(input.voice.laws ?? []),
    "- a vision is never a prophecy: write \"might\" or \"could\". NEVER use the word \"will\" outside a quoted source title",
    "- no rhetorical questions, anywhere; every sentence is a statement",
    "- the ending opens outward — what this event makes visible or possible — without predicting anything",
    "- do not include an h1 title line in the body",
  ];
  const format = [
    "",
    "Output EXACTLY this structure (no preamble, no commentary):",
    "TITLE: <descriptive headline about the story's event>",
    "DESCRIPTION: <aim for 125 characters of meta description (the gate window is 100-150 characters), containing the SEO term>",
    "SUMMARY: <aim for 55 words in three or four FULL sentences (the gate window is 40-70 words), containing the SEO term — match the exemplar summary's shape>",
    "TWEET: <one share sentence with one emoji, no hashtags, SEO term included>",
    "TAGS: <three to five comma-separated topic tags>",
    "BODY:",
    `<the markdown body — 1,000 words or more, and its first sentence contains "${input.term}" verbatim>`,
  ];
  return [...head, ...format].join("\n");
}

/** Parse a structured drafting reply into its five surfaces and body.
 * A reply with no TITLE (or no body at all) is a malformed shape — thrown,
 * per the substrate law that exceptions are for malformed shapes only. */
export function parseDraftReply(reply: string): PostDraft {
  const text = String(reply ?? "").replaceAll("\r\n", "\n");
  const grab = (label: string): string => {
    const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return (match?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
  };
  // The body is everything after the BODY: marker; models that skip the
  // marker get read from the line after the last header instead.
  let bodyStart = text.search(/^BODY:/im);
  if (bodyStart >= 0) {
    bodyStart = text.indexOf(":", bodyStart) + 1;
  } else {
    let lastHeaderEnd = -1;
    for (const label of ["TITLE", "DESCRIPTION", "SUMMARY", "TWEET", "TAGS"]) {
      const match = text.match(new RegExp(`^${label}:[^\\n]*\\n`, "im"));
      if (match?.index !== undefined) lastHeaderEnd = Math.max(lastHeaderEnd, match.index + match[0].length);
    }
    if (lastHeaderEnd < 0) throw new TypeError("draft reply has no BODY section");
    bodyStart = lastHeaderEnd;
  }
  let body = text.slice(bodyStart).trim();
  body = body.replace(/^#\s+[^\n]+\n+/, ""); // the page supplies the headline
  const title = grab("TITLE");
  if (!title) throw new TypeError("draft reply has no TITLE");
  return Object.freeze({
    title,
    description: grab("DESCRIPTION"),
    summary: grab("SUMMARY"),
    tweet: grab("TWEET"),
    tags: Object.freeze(grab("TAGS").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 5)),
    body,
  });
}

// ---------- story selection ----------

const NO_GENERIC_WORDS: ReadonlySet<string> = new Set();

/** The words of a term that distinguish its story from the beat at large.
 * `genericWords` are the property's beat-generic words, which prove nothing. */
export function distinctiveTermWords(term: string, genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): ReadonlySet<string> {
  return new Set(normalizeTerm(term).split(" ").filter((word) => word.length > 2 && !genericWords.has(word)));
}

/** How many intake articles support a term, judged on the term's
 * distinctive words (beat-generic words prove nothing). A term with no
 * distinctive words is supported by the whole intake. */
export function termSupportCount(term: string, articles: readonly SourceStory[], genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): number {
  const distinctive = distinctiveTermWords(term, genericWords);
  if (distinctive.size === 0) return articles.length;
  return articles.filter((article) =>
    normalizeTerm(`${article.title} ${article.summary ?? ""}`).split(" ").some((word) => distinctive.has(word))).length;
}

/**
 * Options for selectStory: contextMax caps how many secondary intake items
 * travel as supporting context (default 2), and genericWords are the property's
 * beat-generic words, against which distinctive term words count double.
 */
export type SelectStoryOptions = Readonly<{
  /** At most this many secondary items travel as supporting context. Default 2. */
  contextMax?: number;
  /** The property's beat-generic words; distinctive term words count double. */
  genericWords?: ReadonlySet<string>;
}>;

/** The assignment unit is the story, not the keyword: the demand term is the
 * lens, and it selects from the witnessed intake the SINGLE best-supporting
 * source story as the article's subject. Stories are scored by term-word
 * overlap in title+summary — distinctive term words (those that separate the
 * term's event from the beat at large) count double, because matching the
 * beat proves nothing about the event — with recency as the tiebreak. At most
 * `contextMax` other intake items travel as supporting context, secondary by
 * law. Calling with no intake is a malformed call and throws; the cultivate
 * cycle witnesses empty intake as an obstruction before ever selecting.
 *
 * Generic over the story type so the caller's richer intake item (e.g. a
 * SyndicationItem) is returned unchanged, not narrowed to SourceStory. */
export function selectStory<T extends SourceStory>(term: string, articles: readonly T[], options: SelectStoryOptions = {}): Readonly<{ story: T; context: readonly T[] }> {
  if (articles.length === 0) throw new TypeError("no witnessed intake to select a story from");
  const contextMax = options.contextMax ?? 2;
  const termWords = new Set(normalizeTerm(term).split(" ").filter(Boolean));
  const distinctive = distinctiveTermWords(term, options.genericWords ?? NO_GENERIC_WORDS);
  const support = (article: SourceStory): number => {
    const words = new Set(normalizeTerm(`${article.title} ${article.summary ?? ""}`).split(" "));
    let score = 0;
    for (const word of words) {
      if (termWords.has(word)) score += 1;
      if (distinctive.has(word)) score += 2;
    }
    return score;
  };
  const recency = (article: SourceStory): number => {
    const time = Date.parse(article.published ?? "");
    return Number.isNaN(time) ? 0 : time;
  };
  const ranked = [...articles]
    .map((article) => ({ article, score: support(article) }))
    .sort((left, right) => right.score - left.score || recency(right.article) - recency(left.article));
  return Object.freeze({
    story: ranked[0]!.article,
    // Context must bear on the term: an item sharing no term word is not
    // context, it is an unrelated story — an irrelevant link is worse than none.
    context: Object.freeze(ranked.slice(1).filter((entry) => entry.score > 0).slice(0, contextMax).map((entry) => entry.article)),
  });
}

// ---------- the gates ----------

/** One gate's reading of a draft: a charge with its evidence. */
export type FarmGate = Readonly<{ gate: string; charge: "pass" | "fail"; evidence: string }>;

function sameUrl(left: string, right: string): boolean {
  return left.replace(/\/+$/, "") === right.replace(/\/+$/, "");
}

/** Title-fidelity findings: a markdown link whose text presents itself as a
 * witnessed intake title (high word overlap) but does not match it exactly —
 * the "will likely" → "could likely" alteration class. */
export function titleFidelityFindings(body: string, intakeTitles: readonly string[]): readonly string[] {
  const findings: string[] = [];
  const tidy = (value: string): string => value.trim().replace(/[.!?…]+$/, "");
  const linkTexts = [...body.matchAll(/\[([^\]]+)\]\([^)]*\)/g)].map((match) => (match[1] ?? "").trim());
  for (const text of linkTexts) {
    if (intakeTitles.some((title) => tidy(title) === tidy(text))) continue;
    const textWords = new Set(normalizeTerm(text).split(" ").filter(Boolean));
    for (const title of intakeTitles) {
      const titleWords = normalizeTerm(title).split(" ").filter(Boolean);
      if (titleWords.length < 4) continue;
      const shared = titleWords.filter((word) => textWords.has(word)).length;
      const similarity = shared / Math.max(titleWords.length, textWords.size);
      if (similarity >= 0.6) {
        findings.push(`link text "${text}" alters the witnessed title "${title}" — quote it exactly or rephrase as plain prose`);
        break;
      }
    }
  }
  return Object.freeze(findings);
}

/** Count of the banned template construction: As [link] notes/reports/suggests/writes, … */
export function templateMonotonyCount(body: string): number {
  return [...body.matchAll(/\bAs\s+\[[^\]]+\]\([^)]*\)\s+(?:notes|reports|suggests|writes)\b/gi)].length;
}

/**
 * The witnessed-intake context that sharpens judgeDraft: storyUrl (the single
 * story that must be cited), intakeTitles (for the title-fidelity gate), and
 * intakeTexts (title plus summary per article, for the numbers-faithfulness
 * gate).
 */
export type JudgeContext = Readonly<{
  /** The single story's URL — it must be cited; other intake citations are supporting context, at most two. */
  storyUrl?: string;
  /** Witnessed intake titles, for the title-fidelity gate. */
  intakeTitles?: readonly string[];
  /** Witnessed intake texts (title + summary per article), for the numbers-faithfulness gate. */
  intakeTexts?: readonly string[];
}>;

/** The thirteen gates, judged in one pass. Every gate reports a charge with
 * evidence; the caller folds the verdict (all-pass = gates clear). */
export function judgeDraft(draft: PostDraft, term: string, citableUrls: readonly string[], context: JudgeContext = {}): readonly FarmGate[] {
  const gates: FarmGate[] = [];
  const judge = (gate: string, pass: boolean, evidence: string): void => {
    gates.push(Object.freeze({ gate, charge: pass ? "pass" : "fail", evidence }));
  };
  const words = wordCount(draft.body);
  judge("length", words >= 800, words >= 800 ? `${words} words (needs ≥ 800)` : `${words} words (needs ≥ 800) — expand every section with one more paragraph of concrete analysis: names, numbers, places from the sources`);
  const firstParagraph = draft.body
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block !== "") ?? "";
  const normalTerm = normalizeTerm(term);
  judge("seo-lede", normalizeTerm(firstParagraph).includes(normalTerm), `SEO term "${term}" in first paragraph`);
  const subheads = draft.body.split("\n").filter((line) => /^##\s/.test(line));
  judge("seo-subheader", subheads.some((line) => normalizeTerm(line).includes(normalTerm)), `SEO term "${term}" in a ## subheader (${subheads.length} subheaders)`);
  const termOccurrences = [...normalizeTerm(draft.body).matchAll(new RegExp(normalTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].length;
  judge("seo-frequency", termOccurrences <= 5, termOccurrences <= 5 ? `SEO term appears ${termOccurrences}× (≤ 5)` : `SEO term appears ${termOccurrences}× (hard limit 5) — reduce stuffing; weave it into sentences, never stamp it in every paragraph`);
  const links = extractLinks(draft.body);
  const external = links.filter((link) => /^https?:\/\//i.test(link));
  const cited = new Set(external.filter((link) => citableUrls.some((url) => sameUrl(link, url))));
  const foreign = external.filter((link) => !citableUrls.some((url) => sameUrl(link, url)));
  const storyCited = context.storyUrl === undefined || [...cited].some((link) => sameUrl(link, context.storyUrl ?? ""));
  const supportingCited = context.storyUrl === undefined ? 0 : [...cited].filter((link) => !sameUrl(link, context.storyUrl ?? "")).length;
  const citationProblems = [
    ...(foreign.length > 0 ? [`links outside the witnessed intake: ${foreign.join(", ")}`] : []),
    ...(cited.size < 2 ? [`${cited.size} distinct intake sources cited (needs ≥ 2 — add an inline link to one of the available intake URLs: ${citableUrls.filter((url) => !cited.has(url)).slice(0, 2).join(", ")})`] : []),
    ...(storyCited ? [] : [`the story itself (${context.storyUrl}) is never cited`]),
    ...(supportingCited > 2 ? [`${supportingCited} supporting citations (at most 2 besides the story)`] : []),
  ];
  judge("citations", citationProblems.length === 0,
    citationProblems.length === 0 ? `story cited, ${supportingCited} supporting citation(s), all within the witnessed intake` : citationProblems.join("; "));
  const prophecies = prophecyFindings(draft.body);
  judge("no-prophecy", prophecies.length === 0, prophecies.length === 0 ? "no certainty about the future" : `${prophecies.length} prophecy-shaped sentence(s) — rewrite each as might/could: ${prophecies.slice(0, 8).map((sentence) => sentence.slice(0, 110)).join(" | ")}`);
  const repetitions = repetitionFindings(draft.body);
  judge("repetition", repetitions.length === 0,
    repetitions.length === 0 ? "no repeated sentences or 8-word phrases" : repetitions.slice(0, 4).join(" | "));
  const summaryWords = wordCount(draft.summary);
  const descriptionChars = draft.description.length;
  judge("summary-length", summaryWords >= 40 && summaryWords <= 70 && descriptionChars >= 100 && descriptionChars <= 150,
    `summary ${summaryWords} words (needs 40-70 — three or four FULL sentences, like the exemplar, never fragments); description ${descriptionChars} chars (needs 100-150 — one full sentence plus a clause)`);
  const infidelities = titleFidelityFindings(draft.body, context.intakeTitles ?? []);
  judge("title-fidelity", infidelities.length === 0,
    infidelities.length === 0 ? "every quoted source title matches the witnessed intake exactly" : infidelities.slice(0, 3).join(" | "));
  const templated = templateMonotonyCount(draft.body);
  judge("template-monotony", templated <= 2,
    `${templated} "As [source] notes/reports/suggests/writes, …" sentence(s) (at most 2; vary how sources enter the prose)`);
  const errors = proseLintErrors(draft.body);
  judge("prose", errors.length === 0, errors.length === 0 ? "no prose-lint errors" : `${errors.length} prose-lint error(s): ${errors.slice(0, 3).join(" | ")}`);
  const numberFindings = numberFaithfulnessFindings(draft.body, context.intakeTexts ?? []);
  judge(
    "numbers-faithfulness",
    numberFindings.length === 0,
    numberFindings.length === 0
      ? "all draft numbers appear in the witnessed intake"
      : `${numberFindings.length} number(s) not in the witnessed intake: ${numberFindings.join(", ")} — only use numbers from the source summaries`,
  );
  judge("extras", draft.description.length > 0 && draft.summary.length > 0 && draft.tweet.length > 0,
    "description, summary, and tweet present");
  return Object.freeze(gates);
}
