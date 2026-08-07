

export type {
  RoleFrame, ObliquePP, ClauseSpec, RealizationResult, TextPlan,
  SectionCell, SectionSpec, SectionClause, SectionDrop, SectionAudit, SectionRealization,
  CorpusAssertion, Corpus, SettledToken, SettlingModel,
} from "./types.mjs";
export type { Charge } from "./types.mjs";

export { realizeClause, frameToClause } from "./realize.mjs";
export { plan, planToText } from "./plan.mjs";
export { realizeSection, default as realize } from "./section.mjs";
export { sectionFromText } from "./section-from-text.mjs";
export {
  model, emptyCorpus, ingest, recall, predict, settleNext,
  PRECEDES, DENIES,
} from "./model.mjs";

import { realizeClause } from "./realize.mjs";
import { plan, planToText } from "./plan.mjs";
import type { RoleFrame } from "./types.mjs";

/** Generate prose from a sequence of role frames. The primary high-level entry point.
 * @example
 *   generate([{verb: "chase", agent: "the dog", patient: "the cat"}])
 */
export function generate(
  frames: readonly RoleFrame[],
  opts?: { tense?: "past" | "present" | "future" },
): string {
  const textPlan = plan(frames, opts);
  return planToText(textPlan, (spec) => realizeClause(spec).text);
}
