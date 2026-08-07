





import type { ParseResult, ParsedWord } from "../../parsing/index.mjs";

/** A single well-formedness failure: a constraint a grammatical string broke. */
export interface GrammaticalityViolation {
  readonly kind: string;
  readonly detail: string;
  readonly relation?: string;
  readonly head?: string;
  readonly dependent?: string;
}

/** The grammaticality verdict over a parse: a status and the violations found. */
export interface GrammaticalityResult {
  readonly status: "grammatical" | "ungrammatical" | "unknown";
  readonly violations: readonly GrammaticalityViolation[];
}

const LICENSED_HEADS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  det: ["noun", "pron"],
  amod: ["noun", "pron"],
  advmod: ["verb"],
  nsubj: ["verb", "aux"],
  dobj: ["verb", "aux"],
  pobj: ["prep"],
  prep: ["verb", "noun"],
});

export function grammaticality(result: ParseResult): GrammaticalityResult {
  if (result.words.length === 0) return { status: "unknown", violations: [] };

  const wordsById = new Map(result.words.map((word) => [word.id, word]));
  const violations: GrammaticalityViolation[] = [];

  for (const arc of result.arcs) {
    const head = wordsById.get(arc.head);
    const licensed = LICENSED_HEADS[arc.rel];
    if (head === undefined || licensed === undefined) continue;
    if (!head.tags.some((tag) => licensed.includes(tag))) {
      violations.push({
        kind: "forbidden-head",
        relation: arc.rel,
        head: arc.headText,
        dependent: arc.depText,
        detail: `${arc.rel} cannot be headed by ${head.tags.join("/") || "untagged"}`,
      });
    }
  }

  const detHeads = new Map<string, number>();
  for (const arc of result.arcs.filter((arc) => arc.rel === "det")) {
    detHeads.set(arc.head, (detHeads.get(arc.head) ?? 0) + 1);
  }
  for (const [head, count] of detHeads) {
    if (count <= 1) continue;
    violations.push({
      kind: "double-determiner",
      head: wordsById.get(head)?.text ?? head,
      detail: `one noun heads ${count} determiners`,
    });
  }

  for (const word of result.words.filter((word) => word.tags.includes("prep"))) {
    const hasObject = result.words.some((candidate) => (
      candidate.i > word.i && isNounish(candidate)
    ));
    if (!hasObject) {
      violations.push({
        kind: "stranded-preposition",
        head: word.text,
        detail: `the preposition "${word.text}" has no following nounish object`,
      });
    }
  }

  const hasVerb = result.words.some((word) => word.tags.includes("verb") || word.tags.includes("aux"));
  const hasNounish = result.words.some(isNounish);
  if (hasVerb && !hasNounish) {
    violations.push({
      kind: "no-clause-argument",
      detail: "a verb is present but no nounish subject or object is available",
    });
  }
  if (!hasVerb && !hasNounish) {
    violations.push({
      kind: "no-clause-root",
      detail: "no verb or nounish word can anchor a clause",
    });
  }

  return {
    status: violations.length === 0 ? "grammatical" : "ungrammatical",
    violations,
  };
}

function isNounish(word: ParsedWord): boolean {
  return word.tags.includes("noun") || word.tags.includes("pron");
}
