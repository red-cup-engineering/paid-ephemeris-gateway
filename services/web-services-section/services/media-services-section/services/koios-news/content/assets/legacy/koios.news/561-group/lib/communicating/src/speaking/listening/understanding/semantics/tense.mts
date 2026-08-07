

import type { ParseResult } from "../../parsing/index.mjs";
import type { ChargeValue } from "../../parsing/index.mjs";

export type TenseValue = "past" | "present" | "future";
export type AspectValue = "simple" | "progressive" | "perfect";
export type EvidentialValue = "firsthand" | "reported" | null;

export interface TemporalFrame {
  readonly verb: string;
  readonly tense: TenseValue;
  readonly aspect: AspectValue;
  readonly evidential: EvidentialValue;
  readonly epistemicStatus: ChargeValue;
}

const REPORT_VERBS = new Set(["say", "said", "claim", "claimed", "allege", "alleged", "report", "reported"]);
const FUTURE_AUX = new Set(["will", "shall", "going"]);
const HAVE_FORMS = new Set(["have", "has", "had"]);
const BE_FORMS = new Set(["is", "are", "was", "were", "be", "been", "being"]);

/** Extract temporal information from a parse result. */
export function temporal(result: ParseResult): readonly TemporalFrame[] {
  const frames: TemporalFrame[] = [];
  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {
    
    let tense: TenseValue;
    if (verb.feats.includes("past")) {
      tense = "past";
    } else if (FUTURE_AUX.has(verb.text.toLowerCase())) {
      tense = "future";
    } else {
      tense = "present";
    }

    
    let aspect: AspectValue = "simple";
    const prevWords = result.words.slice(0, verb.i);
    const hasHave = prevWords.some((w) => HAVE_FORMS.has(w.text.toLowerCase()));
    const hasBe = prevWords.some((w) => BE_FORMS.has(w.text.toLowerCase()));
    if (verb.feats.includes("nonfin")) {
      if (hasBe) aspect = "progressive";
      else if (hasHave) aspect = "perfect";
    } else if (hasHave) {
      aspect = "perfect";
    }

    
    let evidential: EvidentialValue = "firsthand";
    if (REPORT_VERBS.has(verb.text.toLowerCase())) {
      evidential = "reported";
    } else {
      
      const depArc = result.arcs.find(
        (a) => a.dependent === verb.id && a.rel === "dobj",
      );
      if (depArc) {
        const headWord = result.words.find((w) => w.id === depArc.head);
        if (headWord && REPORT_VERBS.has(headWord.text.toLowerCase())) {
          evidential = "reported";
        }
      }
    }

    
    let epistemicStatus: ChargeValue;
    if (tense === "future" || evidential === "reported") {
      epistemicStatus = "absurd"; 
    } else {
      epistemicStatus = "potential"; 
    }

    frames.push({ verb: verb.text, tense, aspect, evidential, epistemicStatus });
  }

  return frames;
}
