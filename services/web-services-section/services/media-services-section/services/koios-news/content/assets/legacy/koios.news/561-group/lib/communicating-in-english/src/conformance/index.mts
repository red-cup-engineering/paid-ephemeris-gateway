

export type {
  Severity, Rule, RuleContext, Finding,
  DetectCell, DetectResult, Diagnostic, Verdict, RuleImplication,
} from "./types.mjs";
export type { Charge } from "./types.mjs";

export { allRules } from "./rules/index.mjs";
export { weaselRules } from "./rules/index.mjs";
export { wordyRules } from "./rules/index.mjs";
export { jargonRules } from "./rules/index.mjs";
export { passiveRule } from "./rules/index.mjs";
export { clicheRules } from "./rules/index.mjs";
export { doubletRules } from "./rules/index.mjs";
export { spellingRules } from "./rules/index.mjs";
export { nominalizationRules } from "./rules/index.mjs";
export { oneIdeaPerSentenceRule, expletiveOpeningRule, structureRules } from "./rules/index.mjs";
export { acronymRule, acronymRules } from "./rules/index.mjs";
export { preferContractionsRule, avoidContractionsRule, contractionRules } from "./rules/index.mjs";
export { abstractRules, ruleImplications } from "./rules/index.mjs";

export { detect, stripMarkdown } from "./detect.mjs";
export { report, verdict } from "./report.mjs";

import { detect } from "./detect.mjs";
import { verdict as computeVerdict } from "./report.mjs";
import type { Verdict, Rule } from "./types.mjs";

/** Lint text and return a verdict. The primary entry point. */
export function lint(text: string, opts?: { rules?: readonly Rule[]; markdown?: boolean }): Verdict {
  const result = detect(text, opts);
  return computeVerdict(result);
}
