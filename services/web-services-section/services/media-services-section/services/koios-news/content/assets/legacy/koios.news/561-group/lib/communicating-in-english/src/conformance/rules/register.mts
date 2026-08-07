
import type { Rule, Finding } from "../types.mjs";
import { compliant, violation } from "../charge.mjs";

const CONTRACTION = /\b\w+(?:n't|'re|'ve|'ll|'d|'m|'s)\b/gi;
const SPELLED = /\b(?:cannot|do not|does not|did not|will not|would not|I am|you are|they are|we are)\b/g;

export const preferContractionsRule: Rule = {
  id: "prefer-contractions",
  family: "register",
  severity: "suggestion",
  description: "Prefer contractions in informal prose",
  run(text: string) {
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = CONTRACTION.exec(text)) !== null) {
      findings.push({
        ruleId: "prefer-contractions",
        severity: "suggestion",
        charge: compliant({ match: m[0], start: m.index }),
        message: `"${m[0]}" matches informal register`,
        start: 0,
        end: text.length,
      });
    }
    while ((m = SPELLED.exec(text)) !== null) {
      findings.push({
        ruleId: "prefer-contractions",
        severity: "suggestion",
        charge: violation({ match: m[0], start: m.index }),
        message: `"${m[0]}" is formal for this register`,
        start: 0,
        end: text.length,
      });
    }
    return findings;
  },
};

export const avoidContractionsRule: Rule = {
  id: "avoid-contractions",
  family: "register",
  severity: "suggestion",
  description: "Avoid contractions in formal prose",
  run(text: string) {
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    while ((m = CONTRACTION.exec(text)) !== null) {
      findings.push({
        ruleId: "avoid-contractions",
        severity: "suggestion",
        charge: violation({ match: m[0], start: m.index }),
        message: `"${m[0]}" is informal for this register`,
        start: 0,
        end: text.length,
      });
    }
    while ((m = SPELLED.exec(text)) !== null) {
      findings.push({
        ruleId: "avoid-contractions",
        severity: "suggestion",
        charge: compliant({ match: m[0], start: m.index }),
        message: `"${m[0]}" matches formal register`,
        start: 0,
        end: text.length,
      });
    }
    return findings;
  },
};

export const contractionRules: readonly Rule[] = [preferContractionsRule, avoidContractionsRule];
