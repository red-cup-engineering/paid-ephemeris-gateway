

import type { ParseResult } from "../../parsing/index.mjs";
import type { ChargeValue } from "../../parsing/index.mjs";

export interface PolarityFrame {
  readonly verb: string;
  readonly negated: boolean;
  readonly modal: string | null;
  readonly asserted: ChargeValue;
}

const NEGATORS = new Set(["not", "n't", "never", "no", "neither", "nor"]);
const MODALS = new Set(["can", "could", "may", "might", "must", "shall", "should", "will", "would"]);

/** Extract polarity and modality from a parse result. */
export function polarity(result: ParseResult): readonly PolarityFrame[] {
  const frames: PolarityFrame[] = [];
  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {
    
    const negated = result.words.some(
      (w) => NEGATORS.has(w.text.toLowerCase()) && Math.abs(w.i - verb.i) <= 3,
    );

    
    const modalWord = result.words.find(
      (w) => MODALS.has(w.text.toLowerCase()) && Math.abs(w.i - verb.i) <= 2,
    );
    const modal = modalWord?.text.toLowerCase() ?? null;

    
    let asserted: ChargeValue;
    if (modal !== null) {
      asserted = "absurd"; 
    } else if (negated) {
      asserted = "active"; 
    } else {
      asserted = "potential"; 
    }

    frames.push({ verb: verb.text, negated, modal, asserted });
  }

  return frames;
}
