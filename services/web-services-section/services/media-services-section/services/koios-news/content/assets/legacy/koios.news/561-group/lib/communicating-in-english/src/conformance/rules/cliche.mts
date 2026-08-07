
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const CLICHES: readonly string[] = [
  "at the end of the day",
  "bite the bullet",
  "hit the ground running",
  "think outside the box",
  "under the bus",
  "moving the goalposts",
  "elephant in the room",
  "tip of the iceberg",
  "on the same page",
  "reinvent the wheel",
  "touch base",
  "low-hanging fruit",
  "par for the course",
  "back to basics",
  "ahead of the curve",
  "break new ground",
  "cut to the chase",
  "drop the ball",
  "in a nutshell",
  "on the fence",
];

export const clicheRules: readonly Rule[] = CLICHES.map((phrase) => ({
  id: `cliche-${phrase.replaceAll(" ", "-")}`,
  family: "cliche",
  severity: "suggestion",
  description: `Cliché: "${phrase}"`,
  run(text: string) {
    const findings: Finding[] = [];
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `cliche-${phrase.replaceAll(" ", "-")}`,
        severity: "suggestion",
        charge: violation({ phrase: m[0], start: m.index }),
        message: `"${m[0]}" is a cliché — say what you mean directly`,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
    return findings;
  },
}));
