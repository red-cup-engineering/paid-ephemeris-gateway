

import type { Span, ParseResult, ParsedWord, ParsedArc, ParsedAnswer } from "./types.mjs";
import type { ArticulateResult, CompiledBundle } from "./types.mjs";
import type { CommunicatingCarrier } from "./carrier.mjs";
import { valueOf } from "@emsenn/relating-experimental";
import { articulateCommunication } from "./articulating.mjs";
import { construe, wordsInSentence } from "./construing.mjs";
import { descend } from "./descending.mjs";
import { fold } from "./folding.mjs";
import { chargeStatus } from "../algebra/index.mjs";

/** Parse a sentence span and return the full ParseResult. */
export function parse(
  sentenceSpan: Span,
  base: ArticulateResult,
  bundle: CompiledBundle,
): ParseResult {
  const wordSpans = wordsInSentence(sentenceSpan, base.spans);
  const constrained = construe(sentenceSpan, wordSpans, bundle);
  const { words, arcs, entries, specialization, questions } = constrained;

  const settled = descend(entries, specialization);

  
  const parsedWords: ParsedWord[] = words.map((w) => {
    const connCharge = settled.settledCharge(w.id, "is-connected");
    
    const roles: string[] = [];
    const relNames = ["nsubj", "dobj", "prep", "pobj", "det", "amod", "advmod"];
    for (const r of relNames) {
      const rc = settled.settledCharge(w.id, `is-${r}`);
      if (valueOf(rc).name !== "absurd") roles.push(`is-${r}`);
    }
    return {
      i: w.i,
      id: w.id,
      text: w.span.text,
      tags: w.tags,
      feats: w.feats,
      connected: chargeStatus(connCharge),
      roles,
    };
  });

  const arcSeen = new Set<string>();
  const parsedArcs: ParsedArc[] = [];
  for (const a of arcs) {
    const k = `${a.head}\x00${a.rel}\x00${a.dependent}`;
    if (arcSeen.has(k)) continue;
    arcSeen.add(k);
    const headWord = words.find((w) => w.id === a.head);
    const depWord = words.find((w) => w.id === a.dependent);
    const arcCharge = settled.settledArc(a.head, a.rel, a.dependent);
    const arcValue = valueOf(arcCharge).name;
    parsedArcs.push({
      rel: a.rel,
      head: a.head,
      dependent: a.dependent,
      headText: headWord?.span.text ?? a.head,
      depText: depWord?.span.text ?? a.dependent,
      status: chargeStatus(arcCharge),
      value: arcValue,
    });
  }

  const parsedAnswers: ParsedAnswer[] = questions.map((q) => {
    const c = settled.settledCharge(q.subject, q.predicate);
    return {
      question: q.label,
      on: q.on,
      status: chargeStatus(c),
      value: valueOf(c).name,
    };
  });

  const { paths: compositions, tower } = fold(arcs);

  const conflicts = parsedAnswers.filter((a) => a.status === "ambiguous");
  const voids = parsedAnswers.filter((a) => a.status === "void");

  return {
    words: parsedWords,
    arcs: parsedArcs,
    answers: parsedAnswers,
    compositions,
    tower,
    conflicts,
    voids,
  };
}

/** Parse the first sentence of an admitted communicating document. */
export function parseCommunication(
  carrier: CommunicatingCarrier,
  bundle: CompiledBundle,
): ParseResult {
  const base = articulateCommunication(carrier, bundle);
  const sentence = base.spans.find((span) => span.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}
