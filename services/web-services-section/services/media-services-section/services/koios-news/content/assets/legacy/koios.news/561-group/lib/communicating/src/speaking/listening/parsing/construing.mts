


import type { Span, Word, Arc, ConstrainedResult } from "./types.mjs";
import type { CompiledBundle } from "./types.mjs";
import { tag } from "./tagging.mjs";
import { features } from "./featuring.mjs";
import { relate } from "./relating.mjs";
import { charge } from "./charging.mjs";
import { span as makeSpan } from "./articulating.mjs";

/** Build a stable word ID from a span. */
function wordId(s: Span): string {
  return `word@${s.start ?? "?"}${s.end !== null ? `-${s.end}` : ""}`;
}

/** Construe a sentence span (and its word-spans from the articulation base) into a
 * ConstrainedResult: words with POS tags + features, arc proposals, and kernel entries. */
export function construe(
  sentenceSpan: Span,
  wordSpans: readonly Span[],
  bundle: CompiledBundle,
): ConstrainedResult {
  
  const words: Word[] = wordSpans
    .filter((s) => s.tier === "word")
    .map((s, i) => {
      const t = tag(s.text, bundle, { sentenceInitial: i === 0 });
      const f = features(s.text, t, bundle);
      return {
        i,
        id: wordId(s),
        span: s,
        tags: t,
        feats: f,
      };
    });

  
  const proposals = relate(words, bundle);
  const arcs: Arc[] = proposals.map((p) => p.arc);

  
  const { entries, specialization, questions } = charge(words, arcs);

  return { words, arcs, entries, specialization, questions };
}

/** Helper: extract word-tier spans for a sentence from the articulate base. */
export function wordsInSentence(sentenceSpan: Span, allSpans: readonly Span[]): readonly Span[] {
  
  const { start: sStart, end: sEnd } = sentenceSpan;
  if (sStart === null || sEnd === null) return [];
  return allSpans.filter((s) => {
    if (s.tier !== "word") return false;
    if (s.start === null || s.end === null) return false;
    return s.start >= sStart && s.end <= sEnd;
  });
}
