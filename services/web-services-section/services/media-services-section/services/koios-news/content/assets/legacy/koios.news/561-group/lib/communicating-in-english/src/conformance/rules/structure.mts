
import type { Rule, Finding } from "../types.mjs";
import { compliant, violation } from "../charge.mjs";

const INDEPENDENT = /;|,\s+(?:and|but|or|so|yet|while|whereas)\b/gi;
const EXPLETIVE = /\bthere\s+(?:is|are|was|were)\b|\bit\s+(?:is|was)\b/gi;
const CLAUSE_LIMIT = 3;

export const oneIdeaPerSentenceRule: Rule = {
  id: "one-idea-per-sentence",
  family: "concision",
  severity: "warning",
  description: "Too many independent clauses in one sentence",
  run(text: string) {
    const findings: Finding[] = [];
    const sentenceRe = /[^.!?]+[.!?]?/g;
    let m: RegExpExecArray | null;
    while ((m = sentenceRe.exec(text)) !== null) {
      const sentence = m[0].trim();
      if (sentence === "") continue;
      const clauses = (sentence.match(INDEPENDENT) ?? []).length + 1;
      if (clauses > CLAUSE_LIMIT) {
        findings.push({
          ruleId: "one-idea-per-sentence",
          severity: "warning",
          charge: violation({ sentence, clauses, start: m.index }),
          message: "This sentence carries several independent ideas — split it",
          start: m.index,
          end: m.index + m[0].length,
        });
      } else {
        findings.push({
          ruleId: "one-idea-per-sentence",
          severity: "warning",
          charge: compliant({ sentence, clauses, start: m.index }),
          message: "This sentence carries one main idea",
          start: m.index,
          end: m.index + m[0].length,
        });
      }
    }
    return findings;
  },
};

export const expletiveOpeningRule: Rule = {
  id: "expletive-opening",
  family: "directness",
  severity: "suggestion",
  description: "Expletive opening",
  run(text: string) {
    const findings: Finding[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(EXPLETIVE.source, EXPLETIVE.flags);
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: "expletive-opening",
        severity: "suggestion",
        charge: violation({ match: m[0], start: m.index }),
        message: `"${m[0]}" delays the actor or subject — start with the concrete noun`,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
    return findings;
  },
};

export const structureRules: readonly Rule[] = [oneIdeaPerSentenceRule, expletiveOpeningRule];
