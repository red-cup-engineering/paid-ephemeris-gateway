
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const WORDY_PHRASES: readonly [string, string][] = [
  ["in order to", "to"],
  ["in order for", "for"],
  ["due to the fact that", "because"],
  ["owing to the fact that", "because"],
  ["for the purpose of", "to"],
  ["in the event that", "if"],
  ["at this point in time", "now"],
  ["at the present time", "now"],
  ["in the near future", "soon"],
  ["a number of", "several"],
  ["a large number of", "many"],
  ["the majority of", "most"],
  ["in spite of the fact that", "although"],
  ["regardless of the fact that", "although"],
  ["with reference to", "about"],
  ["in relation to", "about"],
  ["with regard to", "about"],
  ["make use of", "use"],
  ["in the process of", "while"],
  ["on a regular basis", "regularly"],
  ["on a daily basis", "daily"],
  ["prior to", "before"],
  ["subsequent to", "after"],
  ["in addition to", "besides"],
  ["as well as", "and"],
  ["in view of the fact that", "because"],
  ["it is important to note that", ""],
  ["it should be noted that", ""],
  ["needless to say", ""],
];

export const wordyRules: readonly Rule[] = WORDY_PHRASES.map(([phrase, suggest]) => ({
  id: `wordy-${phrase.replaceAll(" ", "-")}`,
  family: "wordy",
  severity: "warning",
  description: `Wordy phrase: "${phrase}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `wordy-${phrase.replaceAll(" ", "-")}`,
        severity: "warning",
        charge: violation({ phrase: m[0], start: m.index }),
        message: `"${m[0]}" is wordy${suggest ? ` — use "${suggest}"` : " — cut it"}`,
        start: m.index,
        end: m.index + m[0].length,
        ...(suggest ? { suggest } : {}),
      });
    }
    return findings;
  },
}));
