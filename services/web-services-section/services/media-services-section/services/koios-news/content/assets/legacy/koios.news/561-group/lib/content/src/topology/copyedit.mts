/**
 * copyedit — local editorial closure operators: provenance-preserving
 * endomorphisms on a draft body that REMOVE form defects without an LLM.
 *
 * Each operator is the deterministic DUAL of a detection primitive in
 * gates.mts. Where `prophecyFindings` LOCATES a certainty-about-the-future
 * sentence, `deprophesy` REWRITES its modal into the hedged form the craft
 * law requires. Where `repetitionFindings` LOCATES a repeated sentence,
 * `dedupe` DROPS the later copies. Where `lint()` LOCATES a wordy/passive
 * span carrying a concrete `suggest`, `applyLintSuggestions` SPLICES it in.
 * Where a quoted title was altered, `restoreTitles` RESTORES the witnessed
 * source title exactly. A detector finds the defect; its dual removes it.
 *
 * The operators are confined to the publishable INTERIOR — open prose —
 * and never touch the protected substrate: quoted source titles (link
 * text), URLs, headings, code, or front matter (see `protectedSpans`).
 * That confinement is what makes the closure faithfulness-safe: it can
 * only undo defects the writer introduced, never invent evidence, numbers,
 * or sources. Length-reducing operators (`dedupe`) are GUARDED by a word
 * floor, so the closure is gate-monotone: it never flips a passing length
 * gate to failing.
 *
 * Composed to a fixpoint, they are `copyedit`: a closure operator on a
 * draft's form-defect set. The closure laws — idempotence, defect-
 * monotonicity, faithfulness — are not asserted here; they are TESTED in
 * copyedit.test.mts, per the topology-law discipline: a process is not
 * called topological unless the laws actually hold on real input.
 *
 * This is the first editorial endomorphism of the fiber algebra of
 * production: `copyEdit` as an idempotent, provenance-preserving
 * endomorphism (fiber-algebra-editorial-production memo, §6). Its named
 * successors are `settlement` (a contested claim published as attributed/
 * disputed rather than dropped) and `publicationInterior` (the surface
 * projection that lets a publication be a thin config over the mill) —
 * the other operators the same algebra is meant to carry.
 */

import { lint } from "@emsenn/communicating-in-english";

import { normalizeTerm, wordCount } from "./gates.mjs";

// ---------- the edit carrier ----------

/** One applied edit: which operator acted, the removed text, and what
 * replaced it (empty for a deletion). The audit substrate — recording
 * these on the run trace keeps provenance growing monotonically. */
export type CopyEdit = Readonly<{
  kind: "content.copyedit.edit";
  /** The operator: "deprophesy" | "restore-title" | "dedupe" | `lint:${ruleId}`. */
  op: string;
  before: string;
  after: string;
}>;

function edit(op: string, before: string, after: string): CopyEdit {
  return Object.freeze({ kind: "content.copyedit.edit" as const, op, before, after });
}

/**
 * The result of an editorial operator: the rewritten body and the ordered list
 * of edits it applied (empty when the operator made no change).
 */
export type OperatorResult = Readonly<{ body: string; edits: readonly CopyEdit[] }>;

// ---------- the protected substrate ----------

/**
 * A half-open character range over a body: [start, end). Used to mark the
 * protected substrate the copyedit operators must not touch.
 */
export type Span = Readonly<{ start: number; end: number }>;

const LINK_RE = /\[[^\]]*\]\([^)\s]+\)/g;
const INLINE_CODE_RE = /`[^`]+`/g;
const FENCE_RE = /^```[\s\S]*?```/gm;
const HEADING_RE = /^#{1,6}\s[^\n]*$/gm;
const FRONTMATTER_RE = /^---\n[\s\S]*?\n---/;

/** Merge an unsorted span list into a disjoint, ascending cover. */
function mergeSpans(spans: readonly Span[]): readonly Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last !== undefined && span.start <= last.end) {
      if (span.end > last.end) out[out.length - 1] = { start: last.start, end: span.end };
    } else {
      out.push({ start: span.start, end: span.end });
    }
  }
  return Object.freeze(out);
}

/** The protected substrate of a body: the spans a copyedit must never edit
 * — markdown links (quoted titles AND their URLs), heading lines, fenced
 * and inline code, and any leading front matter. Offsets are over the
 * source, so they align with `lint()` diagnostic spans. */
export function protectedSpans(body: string): readonly Span[] {
  const spans: Span[] = [];
  const collect = (re: RegExp): void => {
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (let m = r.exec(body); m !== null; m = r.exec(body)) {
      spans.push({ start: m.index, end: m.index + m[0].length });
      if (m[0].length === 0) r.lastIndex += 1;
    }
  };
  const fm = FRONTMATTER_RE.exec(body);
  if (fm !== null && fm.index === 0) spans.push({ start: 0, end: fm[0].length });
  collect(FENCE_RE);
  collect(INLINE_CODE_RE);
  collect(LINK_RE);
  collect(HEADING_RE);
  return mergeSpans(spans);
}

/** Whether [start, end) touches any protected span. */
function intersectsProtected(start: number, end: number, spans: readonly Span[]): boolean {
  return spans.some((span) => start < span.end && end > span.start);
}

/** Apply a transform to the OPEN regions of the body only; the protected
 * substrate passes through verbatim. The transform reports its own edits;
 * this rebuilds the body and forwards them. */
function rewriteOpen(body: string, transform: (open: string) => OperatorResult): OperatorResult {
  const spans = protectedSpans(body);
  const edits: CopyEdit[] = [];
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    const open = transform(body.slice(cursor, span.start));
    out += open.body;
    edits.push(...open.edits);
    out += body.slice(span.start, span.end);
    cursor = span.end;
  }
  const tail = transform(body.slice(cursor));
  out += tail.body;
  edits.push(...tail.edits);
  return Object.freeze({ body: out, edits: Object.freeze(edits) });
}

// ---------- deprophesy: the dual of prophecyFindings ----------

/** Match the casing of `sample` onto `repl` (sentence-initial capital only). */
function caseLike(sample: string, repl: string): string {
  return /^[A-Z]/.test(sample) ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl;
}

/** The future-certainty rewrites. Mirrors prophecyFindings exactly: the
 * trigger set is `will | inevitabl* | guaranteed? | certain to`, with the
 * same exclusions — "political/public/... will" and "will of/to" are
 * resolve-uses, not prophecy, and are left alone. */
const PROPHECY_RULES: ReadonlyArray<Readonly<{ re: RegExp; to: (match: string) => string }>> = Object.freeze([
  {
    re: /\b(?<!(?:political|public|collective|popular|free|national|human)\s)will\b(?!\s+(?:of|to)\b)/gi,
    to: (m) => caseLike(m, "could"),
  },
  { re: /\binevitably\b/gi, to: (m) => caseLike(m, "probably") },
  { re: /\binevitabilit(?:y|ies)\b/gi, to: (m) => caseLike(m, m.toLowerCase().endsWith("ies") ? "likelihoods" : "likelihood") },
  { re: /\binevitable\b/gi, to: (m) => caseLike(m, "likely") },
  { re: /\bguaranteed\b/gi, to: (m) => caseLike(m, "likely") },
  { re: /\bcertain\s+to\b/gi, to: (m) => caseLike(m, "likely to") },
]);

/** Rewrite future-certainty modals in open prose into the hedged forms the
 * no-prophecy craft law requires. A vision is never a prophecy. */
export function deprophesy(body: string): OperatorResult {
  return rewriteOpen(body, (open) => {
    const edits: CopyEdit[] = [];
    let text = open;
    for (const rule of PROPHECY_RULES) {
      const re = new RegExp(rule.re.source, rule.re.flags);
      text = text.replace(re, (match) => {
        const after = rule.to(match);
        if (after !== match) edits.push(edit("deprophesy", match, after));
        return after;
      });
    }
    return Object.freeze({ body: text, edits: Object.freeze(edits) });
  });
}

// ---------- restoreTitles: the dual of titleFidelityFindings ----------

function tidyTitle(value: string): string {
  return value.trim().replace(/[.!?…]+$/, "");
}

/** Restore an altered quoted title to the witnessed source. A link whose
 * text reads as one of the intake titles (≥ 0.6 word overlap) but does not
 * match it exactly has its text replaced with the title verbatim — the
 * "will likely" → "could likely" alteration class, repaired. Mirrors
 * titleFidelityFindings' similarity and tokenization. */
export function restoreTitles(body: string, intakeTitles: readonly string[]): OperatorResult {
  if (intakeTitles.length === 0) return Object.freeze({ body, edits: Object.freeze([]) });
  const edits: CopyEdit[] = [];
  const out = body.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, text: string, url: string) => {
    if (intakeTitles.some((title) => tidyTitle(title) === tidyTitle(text))) return whole;
    const textWords = new Set(normalizeTerm(text).split(" ").filter(Boolean));
    for (const title of intakeTitles) {
      const titleWords = normalizeTerm(title).split(" ").filter(Boolean);
      if (titleWords.length < 4) continue;
      const shared = titleWords.filter((word) => textWords.has(word)).length;
      const similarity = shared / Math.max(titleWords.length, textWords.size);
      if (similarity >= 0.6) {
        edits.push(edit("restore-title", text, title));
        return `[${title}](${url})`;
      }
    }
    return whole;
  });
  return Object.freeze({ body: out, edits: Object.freeze(edits) });
}

// ---------- linkSources: the dual of the citations gate ----------

/** One witnessed intake source the body may cite: its exact title and URL. */
export type IntakeSource = Readonly<{ title: string; url: string }>;

/** Link an unlinked plain-text mention of a witnessed source to its URL. The
 * citations gate fails a draft that names a source in prose but never links it;
 * this is its faithfulness-safe dual. For each source whose EXACT title (≥ 4
 * words, to avoid short-phrase false positives) appears verbatim in open prose
 * — not already inside a link, heading, or code — the FIRST such occurrence is
 * wrapped as `[title](url)`, using the witnessed title verbatim so it also
 * satisfies the title-fidelity gate. It invents nothing: it only links text the
 * writer already wrote to the witnessed URL it already belongs to. Idempotent
 * by construction — once wrapped, the text is a protected link span and cannot
 * re-fire. The story (sources[0]) is always linked when present; at most two
 * supporting sources are linked, mirroring the gate's "at most 2 supporting"
 * rule, so the closure never over-cites. */
export function linkSources(body: string, sources: readonly IntakeSource[]): OperatorResult {
  if (sources.length === 0) return Object.freeze({ body, edits: Object.freeze([]) });
  const edits: CopyEdit[] = [];
  let out = body;
  let supportingLinked = 0;
  sources.forEach((source, index) => {
    const title = source.title.trim();
    if (title.split(/\s+/).filter(Boolean).length < 4) return; // too short to match safely
    if (!/^https?:\/\//i.test(source.url)) return;
    const isStory = index === 0;
    if (!isStory && supportingLinked >= 2) return; // gate allows at most 2 supporting
    // Already cited anywhere (by URL)? Then nothing to do for this source.
    const linkRe = new RegExp(`\\]\\(${source.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`);
    if (linkRe.test(out)) { if (!isStory) supportingLinked += 1; return; }
    const haystack = out.toLowerCase();
    const needle = title.toLowerCase();
    let from = 0;
    for (let at = haystack.indexOf(needle, from); at !== -1; at = haystack.indexOf(needle, from)) {
      const end = at + title.length;
      if (!intersectsProtected(at, end, protectedSpans(out))) {
        const matched = out.slice(at, end);
        out = `${out.slice(0, at)}[${title}](${source.url})${out.slice(end)}`;
        edits.push(edit("link-source", matched, `[${title}](${source.url})`));
        if (!isStory) supportingLinked += 1;
        return;
      }
      from = at + 1;
    }
  });
  return Object.freeze({ body: out, edits: Object.freeze(edits) });
}

// ---------- applyLintSuggestions: the dual of lint() ----------

/** The rule families whose `suggest` is a SPLICE-SAFE substitution: a
 * drop-in that keeps both grammar AND meaning. Only `wordy` (phrase→shorter-
 * phrase concision: "in order to"→"to", "as well as"→"and") and `doublet`
 * (redundancy removal: "free gift"→"gift") qualify — removing padding or a
 * pleonasm is meaning-preserving by construction. EXCLUDED on purpose:
 * `passive` (its suggest reorders subject and object — "was dispersed by
 * police"→"police dispersed" — yielding "the protest police dispersed");
 * `nominalization` (noun→verb, "decision"→"decide", yielding "the decide
 * to"); `jargon` (a synonym swap is not context-free — "a source of export
 * leverage"→"export use" is grammatical but changes the meaning); and the
 * Socratic families (`weasel` suggests "how many?"). Those are real edits a
 * human or the LLM must make; the closure does not fake them with a splice. */
const SPLICE_SAFE_FAMILIES: readonly string[] = Object.freeze(["wordy-", "doublet-"]);

/** A suggestion is a SUBSTITUTION the closure may splice only if it is a
 * drop-in: its rule family is splice-safe, it actually removes the flagged
 * text (an annotation like "how many?" re-contains "many" and would re-fire
 * forever — the idempotence law), it offers one rewrite rather than a gloss
 * of options ("strong or reliable"), and it is not a bare deletion (which
 * would strand capitalization). */
function isSpliceSafe(ruleId: string, text: string, suggest: string): boolean {
  if (!SPLICE_SAFE_FAMILIES.some((family) => ruleId.startsWith(family))) return false;
  const replacement = suggest.trim();
  if (replacement === "") return false; // a deletion needs re-capitalization
  if (/\bor\b/.test(replacement) && replacement.split(/\s+/).length <= 4) return false; // a gloss of options
  return !replacement.toLowerCase().includes(text.trim().toLowerCase()); // removes its own defect
}

/** Splice in language-editing's concrete suggestions. Only splice-safe
 * substitutions (see isSpliceSafe) are applied, only where the span lies in
 * open prose (a suggestion inside a quoted title or URL is left for the
 * human), and only where the recorded `text` still matches the source at its
 * offset (stripMarkdown is length-preserving, so offsets are source-true).
 * Applied right-to-left and non-overlapping so earlier offsets stay valid,
 * and floor-guarded so a length-reducing splice never crosses `floor` words
 * (keeping the length gate from flipping). */
export function applyLintSuggestions(body: string, floor = 0): OperatorResult {
  const spans = protectedSpans(body);
  const picks = lint(body, { markdown: true }).diagnostics
    .filter((d) => d.suggest !== undefined && d.severity !== "conflict")
    .filter((d) => isSpliceSafe(d.ruleId, d.text, d.suggest ?? ""))
    .filter((d) => !intersectsProtected(d.start, d.end, spans))
    .filter((d) => body.slice(d.start, d.end) === d.text)
    .sort((a, b) => b.start - a.start);
  const edits: CopyEdit[] = [];
  let out = body;
  let minApplied = body.length;
  let running = wordCount(body);
  for (const d of picks) {
    if (d.end > minApplied) continue; // overlaps an already-applied edit
    const delta = wordCount(d.text) - wordCount(d.suggest ?? "");
    if (delta > 0 && running - delta < floor) continue; // would cross the length floor
    out = out.slice(0, d.start) + d.suggest + out.slice(d.end);
    edits.push(edit(`lint:${d.ruleId}`, d.text, d.suggest ?? ""));
    minApplied = d.start;
    running -= delta;
  }
  return Object.freeze({ body: out, edits: Object.freeze(edits) });
}

// ---------- dedupe: the guarded dual of repetitionFindings ----------

/** The dedup key for a sentence: links collapsed to "(cited)", lowercased,
 * whitespace flattened — identical to repetitionFindings' sentence key, so
 * dedupe removes exactly the sentences that gate flags. */
function dedupeKey(sentence: string): string {
  return sentence.replace(/\[[^\]]*\]\([^)\s]+\)/g, "(cited)").toLowerCase().replace(/\s+/g, " ").trim();
}

function isSentenceLike(key: string): boolean {
  return key.split(" ").filter((word) => /[a-z0-9]/.test(word)).length >= 4;
}

/** Drop repeated sentences (a sentence that already appeared earlier in the
 * body). GUARDED two ways so the closure stays gate-monotone and citation-
 * safe: a duplicate that carries a markdown link is kept (its citation is
 * structure, not repetition), and no drop is made that would pull the body
 * below `floor` words (so a passing length gate never flips). Operates line
 * by line; headings and blank lines pass through untouched. */
export function dedupe(body: string, floor = 0): OperatorResult {
  const seen = new Set<string>();
  const edits: CopyEdit[] = [];
  let running = wordCount(body);
  const out = body.split("\n").map((line) => {
    if (line.trim() === "" || /^#{1,6}\s/.test(line)) return line;
    const parts = line.match(/[^.!?]*[.!?]+(?:["'’)\]]+)?\s*|[^.!?]+$/g) ?? [line];
    const kept: string[] = [];
    for (const part of parts) {
      const key = dedupeKey(part);
      if (!isSentenceLike(key)) {
        kept.push(part);
        continue;
      }
      const hasLink = /\[[^\]]*\]\([^)\s]+\)/.test(part);
      const words = wordCount(part);
      if (seen.has(key) && !hasLink && running - words >= floor) {
        edits.push(edit("dedupe", part.trim(), ""));
        running -= words;
        continue;
      }
      seen.add(key);
      kept.push(part);
    }
    return kept.join("");
  }).join("\n");
  return Object.freeze({ body: out, edits: Object.freeze(edits) });
}

// ---------- the closure ----------

/**
 * The inputs that parameterize a copyedit run: the witnessed intake titles
 * restoreTitles repairs against, the word floor that guards length-reducing
 * operators from flipping a length gate, and the fixpoint pass bound.
 */
export type CopyEditContext = Readonly<{
  /** Witnessed intake titles, for restoreTitles. */
  intakeTitles?: readonly string[];
  /** Witnessed intake sources (title + url), for linkSources. The first is the
   * subject story (always linked when its title appears unlinked in prose);
   * the rest are supporting context (at most two linked). */
  intakeSources?: readonly IntakeSource[];
  /** Word floor for length-reducing operators (default 0: unguarded). The
   * farm passes its length-gate threshold so dedupe never flips that gate. */
  floor?: number;
  /** Fixpoint bound (default 4). Reaching it without stabilizing is a
   * reported non-convergence, not a silent truncation. */
  maxPasses?: number;
}>;

/** The witnessed copyedit of a body: the refined text, every applied edit
 * (in order), the passes taken, and whether a fixpoint was reached. */
export type CopyEditWitness = Readonly<{
  kind: "content.copyedit:witness";
  body: string;
  edits: readonly CopyEdit[];
  passes: number;
  /** A fixpoint was reached: the final pass made no edits (idempotence). */
  stable: boolean;
}>;

/** The closure: compose the operators (restore titles → link sources → apply
 * lint → deprophesy → dedupe) and iterate to a fixpoint. The order runs the
 * faithfulness-restoring and substance-neutral operators first and the
 * length-reducing one last. Re-running on a stable result is a no-op. */
export function copyedit(body: string, context: CopyEditContext = {}): CopyEditWitness {
  const floor = context.floor ?? 0;
  const maxPasses = context.maxPasses ?? 4;
  const titles = context.intakeTitles ?? [];
  const sources = context.intakeSources ?? [];
  const edits: CopyEdit[] = [];
  let current = body;
  let passes = 0;
  let stable = false;
  while (passes < maxPasses) {
    passes += 1;
    const passEdits: CopyEdit[] = [];
    for (const step of [
      () => restoreTitles(current, titles),
      () => linkSources(current, sources),
      () => applyLintSuggestions(current, floor),
      () => deprophesy(current),
      () => dedupe(current, floor),
    ]) {
      const result = step();
      current = result.body;
      passEdits.push(...result.edits);
    }
    edits.push(...passEdits);
    if (passEdits.length === 0) {
      stable = true;
      break;
    }
  }
  return Object.freeze({
    kind: "content.copyedit:witness" as const,
    body: current,
    edits: Object.freeze(edits),
    passes,
    stable,
  });
}
