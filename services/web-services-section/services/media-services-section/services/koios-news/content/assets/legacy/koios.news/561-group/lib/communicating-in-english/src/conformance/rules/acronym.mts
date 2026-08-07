
import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const ACRONYM = /\b[A-Z]{2,}\b/g;

export const acronymRule: Rule = {
  id: "undefined-acronym",
  family: "consistency",
  severity: "warning",
  description: "Acronym used without a nearby expansion",
  run(text: string) {
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = ACRONYM.exec(text)) !== null) {
      const acro = m[0];
      const expansionPattern = acro.split("").map((ch) => `${ch}[a-z]+`).join("\\s+");
      const before = text.slice(Math.max(0, m.index - 160), m.index);
      if (new RegExp(`${expansionPattern}\\s*\\(${acro}\\)`).test(before)) continue;
      findings.push({
        ruleId: "undefined-acronym",
        severity: "warning",
        charge: violation({ acronym: acro, start: m.index }),
        message: `"${acro}" appears before it is expanded`,
        start: m.index,
        end: m.index + acro.length,
      });
    }
    return findings;
  },
};

export const acronymRules: readonly Rule[] = [acronymRule];
