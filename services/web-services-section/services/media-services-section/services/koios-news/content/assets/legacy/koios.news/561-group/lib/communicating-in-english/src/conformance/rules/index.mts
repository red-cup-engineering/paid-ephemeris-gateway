
import { weaselRules } from "./weasel.mjs";
import { wordyRules } from "./wordy.mjs";
import { jargonRules } from "./jargon.mjs";
import { passiveRule } from "./passive.mjs";
import { clicheRules } from "./cliche.mjs";
import { doubletRules } from "./doublet.mjs";
import { spellingRules } from "./spelling.mjs";
import { nominalizationRules } from "./nominalization.mjs";
import { structureRules } from "./structure.mjs";
import { acronymRules } from "./acronym.mjs";
import { contractionRules } from "./register.mjs";
import { abstractRules, ruleImplications } from "./implications.mjs";
import type { Rule } from "../types.mjs";

export type { Rule } from "../types.mjs";
export { weaselRules } from "./weasel.mjs";
export { wordyRules } from "./wordy.mjs";
export { jargonRules } from "./jargon.mjs";
export { passiveRule } from "./passive.mjs";
export { clicheRules } from "./cliche.mjs";
export { doubletRules } from "./doublet.mjs";
export { spellingRules } from "./spelling.mjs";
export { nominalizationRules } from "./nominalization.mjs";
export { oneIdeaPerSentenceRule, expletiveOpeningRule, structureRules } from "./structure.mjs";
export { acronymRule, acronymRules } from "./acronym.mjs";
export { preferContractionsRule, avoidContractionsRule, contractionRules } from "./register.mjs";
export { abstractRules, ruleImplications } from "./implications.mjs";

/** All rules in the default corpus. */
export const allRules: readonly Rule[] = [
  ...weaselRules,
  ...wordyRules,
  ...jargonRules,
  ...nominalizationRules,
  passiveRule,
  ...structureRules,
  ...clicheRules,
  ...doubletRules,
  ...spellingRules,
  ...acronymRules,
  contractionRules[0]!,
  ...abstractRules,
];
