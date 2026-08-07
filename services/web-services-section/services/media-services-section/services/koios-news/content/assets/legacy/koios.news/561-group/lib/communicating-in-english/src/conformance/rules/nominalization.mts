
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const NOMINALIZATIONS: readonly [string, string][] = [
  ["implementation", "implement"],
  ["utilization", "use"],
  ["investigation", "investigate"],
  ["consideration", "consider"],
  ["evaluation", "evaluate"],
  ["assessment", "assess"],
  ["completion", "complete"],
  ["development", "develop"],
  ["movement", "move"],
  ["discussion", "discuss"],
  ["decision", "decide"],
  ["analysis", "analyze"],
];

export const nominalizationRules: readonly Rule[] = NOMINALIZATIONS.map(([word, suggest]) => ({
  id: `nominalization-${word}`,
  family: "concision",
  severity: "warning",
  description: `Nominalization: "${word}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${word}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `nominalization-${word}`,
        severity: "warning",
        charge: violation({ word: m[0], start: m.index }),
        message: `"${m[0]}" hides a verb — use "${suggest}" where possible`,
        start: m.index,
        end: m.index + m[0].length,
        suggest,
      });
    }
    return findings;
  },
}));
