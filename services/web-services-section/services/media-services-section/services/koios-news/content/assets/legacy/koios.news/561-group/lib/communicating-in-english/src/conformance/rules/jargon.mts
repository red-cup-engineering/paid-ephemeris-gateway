
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const JARGON: readonly [string, string][] = [
  ["utilize", "use"],
  ["leverage", "use"],
  ["synergy", "cooperation"],
  ["paradigm shift", "change"],
  ["deep dive", "examine"],
  ["circle back", "return to"],
  ["touch base", "meet"],
  ["move the needle", "make progress"],
  ["bandwidth", "capacity or time"],
  ["boil the ocean", "attempt too much"],
  ["low-hanging fruit", "easy win"],
  ["going forward", "from now on"],
  ["at the end of the day", "ultimately"],
  ["think outside the box", "be creative"],
  ["disruptive", "new"],
  ["ecosystem", "environment or community"],
  ["on the same page", "in agreement"],
  ["take it offline", "discuss separately"],
  ["action item", "task"],
  ["deliverable", "result"],
  ["stakeholder", "person involved"],
  ["proactive", "anticipatory"],
  ["scalable", "expandable"],
  ["robust", "strong or reliable"],
  ["best practices", "standard methods"],
];

export const jargonRules: readonly Rule[] = JARGON.map(([word, suggest]) => ({
  id: `jargon-${word.replaceAll(" ", "-")}`,
  family: "jargon",
  severity: "warning",
  description: `Jargon: "${word}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `jargon-${word.replaceAll(" ", "-")}`,
        severity: "warning",
        charge: violation({ word: m[0], start: m.index }),
        message: `"${m[0]}" is jargon — use "${suggest}"`,
        start: m.index,
        end: m.index + m[0].length,
        suggest,
      });
    }
    return findings;
  },
}));
