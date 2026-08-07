
import type { Rule, RuleImplication } from "../types.mjs";

export const abstractRules: readonly Rule[] = [
  abstractRule("reads-clearly", "This prose could read more clearly.", "suggestion"),
  abstractRule("is-concise", "Tighten this prose.", "warning"),
  abstractRule("is-direct", "Say who does what directly.", "suggestion"),
  abstractRule("is-precise", "Use a more precise expression.", "suggestion"),
  abstractRule("is-consistent", "Keep forms consistent across the document.", "warning"),
  abstractRule("register-consistent", "Pick one register and hold it.", "warning"),
];

const PARENTS: readonly [string, string][] = [
  ["weasel-", "is-concise"],
  ["wordy-", "is-concise"],
  ["nominalization-", "is-concise"],
  ["doublet-", "is-concise"],
  ["one-idea-per-sentence", "is-concise"],
  ["passive-voice", "is-direct"],
  ["expletive-opening", "is-direct"],
  ["cliche-", "is-precise"],
  ["jargon-", "is-precise"],
  ["spelling-", "is-consistent"],
  ["undefined-acronym", "is-consistent"],
  ["prefer-contractions", "register-consistent"],
  ["avoid-contractions", "register-consistent"],
];

const MID = ["is-concise", "is-direct", "is-precise", "is-consistent", "register-consistent"];

export function ruleImplications(rules: readonly Rule[]): readonly RuleImplication[] {
  const edges: RuleImplication[] = [];
  for (const rule of rules) {
    if (rule.abstract) continue;
    const parent = PARENTS.find(([prefix]) => rule.id === prefix || rule.id.startsWith(prefix));
    if (parent) edges.push({ source: rule.id, target: parent[1] });
  }
  for (const source of MID) edges.push({ source, target: "reads-clearly" });
  return closeImplications(edges);
}

function abstractRule(id: string, description: string, severity: Rule["severity"]): Rule {
  return {
    id,
    family: "abstract",
    severity,
    description,
    abstract: true,
    run: () => [],
  };
}

function closeImplications(edges: readonly RuleImplication[]): readonly RuleImplication[] {
  const result: RuleImplication[] = [...edges];
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of [...result]) {
      for (const b of [...result]) {
        if (a.target !== b.source) continue;
        if (result.some((e) => e.source === a.source && e.target === b.target)) continue;
        result.push({ source: a.source, target: b.target });
        changed = true;
      }
    }
  }
  return result;
}
