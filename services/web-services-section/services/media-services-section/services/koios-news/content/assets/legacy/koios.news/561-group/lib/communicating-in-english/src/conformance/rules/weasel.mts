

import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const WEASEL_WORDS: readonly [string, string][] = [
  ["very", "cut it"],
  ["really", "cut it"],
  ["quite", "cut it"],
  ["rather", "cut it"],
  ["somewhat", "cut it"],
  ["fairly", "cut it"],
  ["pretty", "cut it (as adverb)"],
  ["basically", "cut it"],
  ["essentially", "cut it"],
  ["generally", "be specific"],
  ["usually", "be specific"],
  ["often", "how often?"],
  ["sometimes", "when?"],
  ["almost", "be precise"],
  ["nearly", "be precise"],
  ["various", "list them"],
  ["several", "how many?"],
  ["numerous", "how many?"],
  ["many", "how many?"],
  ["few", "how many?"],
  ["some", "be specific"],
  ["certain", "which ones?"],
  ["many", "how many?"],
];

export const weaselRules: readonly Rule[] = WEASEL_WORDS.map(([word, suggest]) => ({
  id: `weasel-${word}`,
  family: "weasel",
  severity: "suggestion",
  description: `Weasel word: "${word}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${word}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `weasel-${word}`,
        severity: "suggestion",
        charge: violation({ word: m[0], start: m.index }),
        message: `"${m[0]}" is a weasel word — ${suggest}`,
        start: m.index,
        end: m.index + m[0].length,
        suggest,
      });
    }
    return findings;
  },
}));
