
import type { ParsedWord, ParseResult } from "../parsing/index.mjs";
import type { ReferenceResult, ReferenceResolution } from "./types.mjs";

const THIRD_PERSON = new Set(["he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their", "theirs"]);
const PLURAL = new Set(["they", "them", "their", "theirs"]);
const FEM = new Set(["she", "her", "hers"]);
const MASC = new Set(["he", "him", "his"]);
const NEUTER = new Set(["it", "its"]);

function isMention(word: ParsedWord): boolean {
  return word.tags.includes("noun") || word.tags.includes("pron");
}

function isThirdPersonPronoun(word: ParsedWord): boolean {
  return word.tags.includes("pron") && THIRD_PERSON.has(word.text.toLowerCase());
}

function compatible(anaphor: ParsedWord, candidate: ParsedWord): boolean {
  const a = anaphor.text.toLowerCase();
  if (PLURAL.has(a)) return candidate.feats.includes("pl") || !candidate.feats.includes("sg");
  if (FEM.has(a) || MASC.has(a) || NEUTER.has(a)) return !candidate.feats.includes("pl");
  return true;
}

export function resolveReferences(result: ParseResult): ReferenceResult {
  const mentions = result.words.filter(isMention);
  const resolutions: ReferenceResolution[] = [];
  const pairs: [string, string][] = [];

  for (const anaphor of mentions.filter(isThirdPersonPronoun)) {
    const candidates = mentions.filter((candidate) => (
      candidate.i < anaphor.i
      && !candidate.tags.includes("pron")
      && compatible(anaphor, candidate)
    ));

    const status = candidates.length === 0 ? "void" : candidates.length === 1 ? "resolved" : "ambiguous";
    const antecedent = status === "resolved" ? candidates[0]! : null;
    if (antecedent) pairs.push([anaphor.text, antecedent.text]);
    resolutions.push({
      anaphor: anaphor.text,
      status,
      antecedent: antecedent?.text ?? null,
      candidates: candidates.map((candidate) => candidate.text),
    });
  }

  return { resolutions, clusters: clusterPairs(pairs) };
}

function clusterPairs(pairs: readonly [string, string][]): readonly (readonly string[])[] {
  const clusters: string[][] = [];
  for (const [left, right] of pairs) {
    const existing = clusters.find((cluster) => cluster.includes(left) || cluster.includes(right));
    if (existing) {
      if (!existing.includes(left)) existing.push(left);
      if (!existing.includes(right)) existing.push(right);
    } else {
      clusters.push([right, left]);
    }
  }
  return clusters.filter((cluster) => cluster.length > 1);
}
