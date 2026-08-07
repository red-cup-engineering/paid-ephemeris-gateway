



import type { Rule, Finding } from "../types.mjs";
import { violation } from "../charge.mjs";

const PASSIVE_RE = /\b(is|are|was|were|be|been|being)\s+(\w+ed|worn|broken|chosen|eaten|frozen|given|known|seen|taken|written|driven|fallen|flown|grown|hidden|ridden|risen|stolen|thrown|spoken|woken)\b(?:\s+by\s+([A-Za-z][A-Za-z'’\-]*))?/gi;

export const passiveRule: Rule = {
  id: "passive-voice",
  family: "directness",
  severity: "suggestion",
  description: "Passive voice construction",
  run(text: string) {
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(PASSIVE_RE.source, PASSIVE_RE.flags);
    while ((m = re.exec(text)) !== null) {
      const actor = m[3];
      const participle = m[2] ?? "";
      findings.push({
        ruleId: "passive-voice",
        severity: "suggestion",
        charge: violation({ match: m[0], start: m.index }),
        message: actor
          ? `"${m[0]}" is passive voice — name the actor directly`
          : `"${m[0]}" is passive voice — consider rewriting with an active subject`,
        start: m.index,
        end: m.index + m[0].length,
        ...(actor ? { suggest: `${actor} ${participle}` } : {}),
      });
    }
    return findings;
  },
};
