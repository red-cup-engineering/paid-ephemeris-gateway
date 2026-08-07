


import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const VARIANTS: readonly [string, string][] = [
  ["colour", "color"],
  ["behaviour", "behavior"],
  ["honour", "honor"],
  ["labour", "labour"],
  ["neighbour", "neighbor"],
  ["recognise", "recognize"],
  ["organisation", "organization"],
  ["analyse", "analyze"],
];

function makeSpellingRule(british: string, american: string): Rule {
  return {
    id: `spelling-${british}-vs-${american}`,
    family: "spelling",
    severity: "warning",
    description: `Consistent spelling: ${british} vs ${american}`,
    run(text: string) {
      const findings: Finding[] = [];
      const bRe = new RegExp(`\\b${british}\\b`, "gi");
      const aRe = new RegExp(`\\b${american}\\b`, "gi");
      const bMatches = [...text.matchAll(bRe)];
      const aMatches = [...text.matchAll(aRe)];

      if (bMatches.length === 0 || aMatches.length === 0) return findings;

      const minority = bMatches.length < aMatches.length ? bMatches : aMatches;
      const suggest = bMatches.length < aMatches.length ? american : british;

      for (const m of minority) {
        if (m.index === undefined) continue;
        findings.push({
          ruleId: `spelling-${british}-vs-${american}`,
          severity: "warning",
          charge: violation({ word: m[0], start: m.index }),
          message: `Inconsistent spelling: "${m[0]}" — use "${suggest}" consistently`,
          start: m.index,
          end: m.index + m[0].length,
          suggest,
        });
      }
      return findings;
    },
  };
}

export const spellingRules: readonly Rule[] = VARIANTS.map(([b, a]) => makeSpellingRule(b, a));
