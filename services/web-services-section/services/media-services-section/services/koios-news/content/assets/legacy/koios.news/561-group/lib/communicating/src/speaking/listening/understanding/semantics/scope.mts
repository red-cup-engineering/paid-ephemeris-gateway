

import type { ParseResult } from "../../parsing/index.mjs";
import type { ChargeStatus } from "../../parsing/index.mjs";

export interface Quantifier {
  readonly text: string;
  readonly type: "universal" | "existential";
  readonly position: "subject" | "object" | "unknown";
}

export interface ScopeReading {
  readonly label: "∀∃" | "∃∀";
  readonly description: string;
  readonly wide: "universal" | "existential";
}

export interface ScopeResult {
  readonly quantifiers: readonly Quantifier[];
  readonly scopeAmbiguous: boolean;
  readonly status: ChargeStatus;
  readonly readings: readonly ScopeReading[];
}

const UNIVERSALS = new Set(["every", "each", "all", "any"]);
const EXISTENTIALS = new Set(["a", "an", "some", "certain"]);

/** Extract quantifier scope from a parse result. */
export function scope(result: ParseResult): ScopeResult {
  const quantifiers: Quantifier[] = [];

  for (const w of result.words) {
    const lower = w.text.toLowerCase();
    if (UNIVERSALS.has(lower)) {
      
      const det_arc = result.arcs.find((a) => a.dependent === `word@${w.i}` && a.rel === "det");
      const headWord = det_arc
        ? result.words.find((hw) => `word@${hw.i}` === det_arc.head)
        : null;
      const isSubject = headWord
        ? result.arcs.some((a) => a.dependent === `word@${headWord.i}` && a.rel === "nsubj")
        : false;
      const isObject = headWord
        ? result.arcs.some((a) => a.dependent === `word@${headWord.i}` && a.rel === "dobj")
        : false;
      quantifiers.push({
        text: w.text,
        type: "universal",
        position: isSubject ? "subject" : isObject ? "object" : "unknown",
      });
    } else if (EXISTENTIALS.has(lower)) {
      const det_arc = result.arcs.find((a) => a.dependent === `word@${w.i}` && a.rel === "det");
      const headWord = det_arc
        ? result.words.find((hw) => `word@${hw.i}` === det_arc.head)
        : null;
      const isSubject = headWord
        ? result.arcs.some((a) => a.dependent === `word@${headWord.i}` && a.rel === "nsubj")
        : false;
      const isObject = headWord
        ? result.arcs.some((a) => a.dependent === `word@${headWord.i}` && a.rel === "dobj")
        : false;
      quantifiers.push({
        text: w.text,
        type: "existential",
        position: isSubject ? "subject" : isObject ? "object" : "unknown",
      });
    }
  }

  const hasUniversal = quantifiers.some((q) => q.type === "universal");
  const hasExistential = quantifiers.some((q) => q.type === "existential");
  const scopeAmbiguous = hasUniversal && hasExistential;

  const readings: ScopeReading[] = scopeAmbiguous
    ? [
        { label: "∀∃", description: "universal takes wide scope", wide: "universal" },
        { label: "∃∀", description: "existential takes wide scope", wide: "existential" },
      ]
    : [];

  const status: ChargeStatus = scopeAmbiguous
    ? "ambiguous"
    : quantifiers.length > 0
      ? "decided"
      : "void";

  return { quantifiers, scopeAmbiguous, status, readings };
}
