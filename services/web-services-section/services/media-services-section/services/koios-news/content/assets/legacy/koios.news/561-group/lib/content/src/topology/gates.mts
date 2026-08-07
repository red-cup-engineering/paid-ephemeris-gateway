/**
 * gates — domain-neutral content-fitness primitives.
 *
 * Pure computations over prose text: word count, prophecy detection,
 * repetition detection, link extraction, prose-lint. These carry no
 * thresholds, no evidence strings, and no domain knowledge. Each
 * consumer (content-farm, hive-content-topology) applies its own
 * thresholds and formats its own evidence strings.
 */

import { lint } from "@emsenn/communicating-in-english";


/**
 * Canonical comparison key for a term: lowercases, collapses every run of
 * non-alphanumeric characters to a single space, and trims.
 */
export function normalizeTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Number of words in the body: counts whitespace-separated tokens that contain
 * at least one letter or digit, ignoring pure-punctuation tokens.
 */
export function wordCount(body: string): number {
  return body.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;
}

/** Prose lines only — heading lines are not sentences. */
export function proseLines(body: string): string {
  return body.split("\n").filter((line) => !/^#{1,6}\s/.test(line)).join("\n");
}

/** Sentences that make modal-certainty claims about the future. Excludes
 *  quoted link text (the source's testimony) and recognized non-prophecy
 *  uses of "will" (political will, will of/to). */
export function prophecyFindings(body: string): readonly string[] {
  const prose = body
    .replace(/\[[^\]]*\]\(([^)\s]+)\)/g, "(cited)")
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n");
  const sentences = prose.split(/(?<=[.!?])\s+/);
  return Object.freeze(sentences.filter((sentence) => {
    const judged = sentence
      .replace(/\b(political|public|collective|popular|free|national|human)\s+will\b/gi, "(resolve)")
      .replace(/\bwill\s+(of|to)\b/gi, "(resolve) $1")
      .replace(/\b(might not|may not|cannot|can't|does not|doesn't|no)\s+guarantee\w*/gi, "(hedged)");
    return /\b(will|inevitabl\w*|guaranteed?\b|certain to)\b/i.test(judged);
  }));
}

/** All Markdown link URLs found in the body. */
export function extractLinks(body: string): readonly string[] {
  return Object.freeze(
    [...body.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? "").filter(Boolean),
  );
}

/** Repeated sentences (≥2×) and repeated 8-word phrases (≥3×). Judged on
 *  the writer's own prose: link text is collapsed to "(cited)" before
 *  analysis, since exactness of quoted titles is title-fidelity's concern. */
export function repetitionFindings(body: string): readonly string[] {
  const findings: string[] = [];
  const prose = proseLines(body.replace(/\[[^\]]*\]\(([^)\s]+)\)/g, "(cited)"));
  const counts = new Map<string, number>();
  for (const raw of prose.split(/(?<=[.!?])\s+/)) {
    const sentence = raw.toLowerCase().replace(/\s+/g, " ").trim();
    if (sentence.split(" ").filter((word) => /[a-z0-9]/.test(word)).length < 4) continue;
    counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  }
  for (const [sentence, count] of counts) {
    if (count >= 2) findings.push(`sentence appears ${count}×: "${sentence.slice(0, 110)}"`);
  }
  const words = normalizeTerm(prose).split(" ").filter(Boolean);
  const grams = new Map<string, number>();
  for (let index = 0; index + 8 <= words.length; index += 1) {
    const gram = words.slice(index, index + 8).join(" ");
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  const offenders = [...grams].filter(([, count]) => count >= 3);
  for (const [gram, count] of offenders.slice(0, 3)) {
    findings.push(`8-word phrase appears ${count}×: "${gram}"`);
  }
  return Object.freeze(findings);
}

/** Prose-lint diagnostics at "error" severity, as `ruleId "text"` strings. */
export function proseLintErrors(body: string): readonly string[] {
  return Object.freeze(
    lint(body, { markdown: true })
      .diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => `${d.ruleId} "${d.text}"`),
  );
}

/** Prose-lint diagnostics at "suggestion" severity, formatted as revision
 *  directives. `max` caps the output (default 8). */
export function proseLintSuggestions(body: string, max = 8): readonly string[] {
  return Object.freeze(
    lint(body, { markdown: true })
      .diagnostics
      .filter((d) => d.suggest !== undefined)
      .slice(0, max)
      .map((d) => `prose: replace "${d.text}"${d.suggest !== undefined ? ` with "${d.suggest}"` : ""}`),
  );
}

/** All dollar amounts and percentages found in text, normalized for
 *  comparison. Used by the numbers-faithfulness gate. */
export function extractNumbers(text: string): ReadonlySet<string> {
  const results = new Set<string>();
  for (const match of text.matchAll(/\$[\d,]+(?:\.\d+)?(?:\s*(?:trillion|billion|million|thousand))?/gi)) {
    results.add(normalizeNumericExpression(match[0]));
  }
  for (const match of text.matchAll(/[\d,]+(?:\.\d+)?\s*(?:%|percent\b)/gi)) {
    results.add(normalizeNumericExpression(match[0]));
  }
  return Object.freeze(results);
}

function normalizeNumericExpression(raw: string): string {
  return raw.toLowerCase().replace(/,/g, "").replace(/\s*percent\b/gi, "%").replace(/\s+/g, " ").trim();
}

/** Numbers present in draftBody that are absent from the union of all
 *  intakeTexts numbers. Returns [] when intakeTexts is empty or when the
 *  source texts contain no extractable numbers (no false positives on
 *  number-free sources). Used by the numbers-faithfulness gate. */
export function numberFaithfulnessFindings(draftBody: string, intakeTexts: readonly string[]): readonly string[] {
  if (intakeTexts.length === 0) return Object.freeze([]);
  const sourceNumbers = new Set<string>();
  for (const text of intakeTexts) {
    for (const n of extractNumbers(text)) sourceNumbers.add(n);
  }
  if (sourceNumbers.size === 0) return Object.freeze([]);
  const findings: string[] = [];
  for (const n of extractNumbers(draftBody)) {
    if (!sourceNumbers.has(n)) findings.push(n);
  }
  return Object.freeze(findings);
}
