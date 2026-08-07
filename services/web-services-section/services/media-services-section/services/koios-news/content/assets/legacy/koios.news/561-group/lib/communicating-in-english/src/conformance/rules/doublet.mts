
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const DOUBLETS: readonly [string, string][] = [
  ["free gift", "gift"],
  ["future plans", "plans"],
  ["past history", "history"],
  ["end result", "result"],
  ["final outcome", "outcome"],
  ["completely finished", "finished"],
  ["close proximity", "proximity"],
  ["added bonus", "bonus"],
  ["unexpected surprise", "surprise"],
  ["basic fundamentals", "fundamentals"],
  ["completely eliminate", "eliminate"],
  ["first and foremost", "first"],
  ["each and every", "each or every"],
  ["null and void", "void"],
  ["true and accurate", "accurate"],
  ["cease and desist", "stop"],
];

export const doubletRules: readonly Rule[] = DOUBLETS.map(([phrase, suggest]) => ({
  id: `doublet-${phrase.replaceAll(" ", "-")}`,
  family: "doublet",
  severity: "suggestion",
  description: `Redundant doublet: "${phrase}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `doublet-${phrase.replaceAll(" ", "-")}`,
        severity: "suggestion",
        charge: violation({ phrase: m[0], start: m.index }),
        message: `"${m[0]}" is a redundant doublet — use "${suggest}"`,
        start: m.index,
        end: m.index + m[0].length,
        suggest,
      });
    }
    return findings;
  },
}));
