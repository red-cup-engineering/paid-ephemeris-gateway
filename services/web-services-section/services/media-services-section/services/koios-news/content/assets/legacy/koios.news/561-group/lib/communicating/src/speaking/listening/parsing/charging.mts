



import type { Word, Arc, Entry, SpecializationEdge, Question } from "./types.mjs";
import { bottom, charge as relateCharge, chargeValue } from "@emsenn/relating-experimental";

const TRUE = relateCharge(chargeValue("potential"));
const FALSE = relateCharge(chargeValue("active"));
const BOTTOM = bottom;

/** Result of charging a sentence: entries and specialization edges for descend(). */
export interface ChargingResult {
  readonly entries: readonly Entry[];
  readonly specialization: readonly SpecializationEdge[];
  readonly questions: readonly Question[];
}

/** Build kernel entries from words and arc proposals. */
export function charge(words: readonly Word[], arcs: readonly Arc[]): ChargingResult {
  const entries: Entry[] = [];
  const specialization: SpecializationEdge[] = [];
  const questions: Question[] = [];

  
  for (const w of words) {
    for (const t of w.tags) {
      entries.push({ subject: w.id, predicate: `is-${t}`, charge: TRUE });
    }
    for (const f of w.feats) {
      entries.push({ subject: w.id, predicate: `is-${f}`, charge: TRUE });
    }
  }

  const prepHeads = new Map<string, string[]>();

  for (const a of arcs) {
    entries.push({ subject: a.head, predicate: a.rel, object: a.dependent, charge: TRUE });

    if (a.rel === "prep") {
      const heads = prepHeads.get(a.dependent) ?? [];
      heads.push(a.head);
      prepHeads.set(a.dependent, heads);
    }
  }

  for (const [prepId, heads] of prepHeads) {
    if (heads.length < 2) continue;
    const hasVerb = arcs.some((a) => a.dependent === prepId && a.rel === "prep" && a.headSpan?.tier === "word");
    if (!hasVerb) continue;

    entries.push(
      { subject: prepId, predicate: "pp-high", charge: TRUE },
      { subject: prepId, predicate: "pp-low", charge: FALSE },
      { subject: prepId, predicate: "pp-attaches-high", charge: BOTTOM },
    );
    specialization.push(
      { source: "pp-high", target: "pp-attaches-high" },
      { source: "pp-low", target: "pp-attaches-high" },
    );
    questions.push({
      subject: prepId,
      predicate: "pp-attaches-high",
      label: "pp-attachment",
      on: prepId,
    });
  }

  for (const a of arcs) {
    if (a.rel !== "nsubj") continue;
    const verb = words.find((w) => w.id === a.head);
    const subj = words.find((w) => w.id === a.dependent);
    if (!verb || !subj) continue;

    const verbForms = verb.feats.filter((f) => f === "3sg" || f === "base");
    const subjNums = subj.feats.filter((f) => f === "sg" || f === "pl");

    for (const n of subjNums) {
      for (const vf of verbForms) {
        const agrees = (n === "sg" && vf === "3sg") || (n === "pl" && vf === "base");
        entries.push({
          subject: verb.id,
          predicate: `agree-${n}`,
          charge: agrees ? TRUE : FALSE,
        });
      }
    }

    if (verbForms.length > 0 && subjNums.length > 0) {
      entries.push({ subject: verb.id, predicate: "subject-verb-agrees", charge: BOTTOM });
      for (const n of subjNums) {
        specialization.push({ source: `agree-${n}`, target: "subject-verb-agrees" });
      }
      questions.push({
        subject: verb.id,
        predicate: "subject-verb-agrees",
        label: "agreement",
        on: verb.span.text,
      });
    }
  }

  const inArc = new Set<string>();
  for (const a of arcs) {
    inArc.add(a.head);
    inArc.add(a.dependent);
  }
  for (const w of words) {
    entries.push({
      subject: w.id,
      predicate: "is-connected",
      charge: inArc.has(w.id) ? TRUE : BOTTOM,
    });
    questions.push({
      subject: w.id,
      predicate: "is-connected",
      label: "connectivity",
      on: w.span.text,
    });
  }

  return { entries, specialization, questions };
}
