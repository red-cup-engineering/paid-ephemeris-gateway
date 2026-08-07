





import type { DetectResult, DetectCell, Rule } from "./types.mjs";
import { allRules, ruleImplications } from "./rules/index.mjs";
import { joinKnowledge } from "@emsenn/relating-experimental";
import { admitCommunication, articulateCommunication } from "@emsenn/communicating/speaking/listening/parsing";
import english from "../compiled.mjs";

/** Strip markdown scaffolding from text while preserving offsets.
 * Code fences and inline code are replaced with spaces of equal length. */
export function stripMarkdown(text: string): string {
  let result = text;
  result = result.replace(/^---[\s\S]*?---\n/, maskExceptNewlines);
  result = result.replace(/^```[\s\S]*?```/gm, maskExceptNewlines);
  result = result.replace(/`[^`]+`/g, (match) => " ".repeat(match.length));
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string) => {
    const prefix = " ";
    const suffix = " ".repeat(match.length - label.length - prefix.length);
    return `${prefix}${label}${suffix}`;
  });
  return result;
}

function maskExceptNewlines(match: string): string {
  return match.replace(/[^\n]/g, " ");
}

/** Run all rules against text and return a DetectResult. */
export function detect(
  source: string,
  opts?: { rules?: readonly Rule[]; markdown?: boolean },
): DetectResult {
  const rules = opts?.rules ?? allRules;
  const text = opts?.markdown ? stripMarkdown(source) : source;
  const base = articulateCommunication(admitCommunication(text), english);

  const allFindings: DetectCell[] = [];

  for (const rule of rules) {
    if (rule.abstract) continue;
    if (rule.family === "spelling") continue;
    if (rule.family === "consistency") continue;
    const findings = rule.run(text);
    for (const f of findings) {
      allFindings.push(f);
    }
  }

  const documentRules = rules.filter((r) => r.family === "spelling" || r.family === "consistency");
  for (const rule of documentRules) {
    if (rule.abstract) continue;
    const findings = rule.run(text);
    for (const f of findings) {
      allFindings.push(f);
    }
  }

  const implications = ruleImplications(rules);

  const merged = new Map<string, DetectCell>();
  const enqueue: DetectCell[] = [...allFindings];
  for (const f of allFindings) {
    for (const edge of implications.filter((e) => e.source === f.ruleId)) {
      const target = rules.find((r) => r.id === edge.target);
      enqueue.push({
        ...f,
        ruleId: edge.target,
        severity: target?.severity ?? f.severity,
        message: target?.description ?? f.message,
      });
    }
  }

  for (const f of enqueue) {
    const k = `${f.start}:${f.end}:${f.ruleId}`;
    const prior = merged.get(k);
    if (prior) {
      const joined = joinKnowledge(prior.charge, f.charge);
      merged.set(k, { ...prior, charge: joined });
    } else {
      merged.set(k, f);
    }
  }

  return { source, base, cells: [...merged.values()], implications };
}
