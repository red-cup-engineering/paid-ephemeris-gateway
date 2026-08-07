/**
 * @emsenn/communicating/speaking/listening/geometry — the metric layer of language.
 *
 * Distance and shape over senses: an inspectable hypernym graph, synonym
 * sets, least-common-ancestor, and a depth-normalized similarity. No
 * embeddings, no statistics — the geometry is the sense graph itself, and
 * "distance" is path structure within it.
 */
export {
  similarity,
} from "./similarity.mjs";

/** A word-pair similarity reading at the document boundary. */
export interface SimilarPair {
  readonly a: string;
  readonly b: string;
  readonly similarity: number | null;
}

/** Parse a whitespace/tab separated word-pair document: one pair per nonblank line. */
export function similarPairsFrom(document: string): readonly (readonly [string, string])[] {
  return document
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const parts = line.split(/\t|\s+/).filter((part) => part !== "");
      if (parts.length < 2) throw new Error(`expected two words per line: ${line}`);
      return [parts[0]!, parts[1]!] as const;
    });
}
