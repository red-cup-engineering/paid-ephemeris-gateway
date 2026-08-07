// admission.mts — learning judgments and their settlement.
//
// An admission judgment is a named, charged verdict with a reason and a
// path — the shape admission layers (HTTP auth, validation, routing,
// publication gates) project their decisions into. The verdict values are
// bilattice charge names used as data at the learning layer: they are joined
// exactly with the knowledge join, and they never re-enter bedrock
// admission — re-admitting a charge would be seeding. The settled value is
// its own reading: the section-partition vocabulary IS the four charge
// value names (potential / active / stable / absurd). Judging is two-place
// (a subject against a policy); the only doing here is admitting the
// judgment records themselves.

import type { ChargeValueName } from "@emsenn/relating";

import { joinKnowledgeNames } from "../../../algebra/index.mjs";

/**
 * A named, charged verdict from an admission layer: name identifies the check,
 * value is the bilattice charge value carried as learning data, reason explains
 * the verdict, and path locates the subject that was judged.
 */
export interface LessonJudgment {
  readonly name: string;
  readonly value: ChargeValueName;
  readonly reason: string;
  readonly path: string;
}

/**
 * The settled reading of a set of admission judgments: value is the knowledge
 * join of every judgment's charge value, judgments holds the inputs, and
 * stableJudgments holds those whose value is "stable" - held contradictions
 * rendered rather than thrown.
 */
export interface LessonSettlement {
  readonly kind: "animating.learning.lesson-settlement";
  /** Knowledge join of every judgment's charge value — the reading is the value name itself. */
  readonly value: ChargeValueName;
  readonly judgments: readonly LessonJudgment[];
  /** Judgments individually "stable" — held contradictions, rendered, never thrown. */
  readonly stableJudgments: readonly LessonJudgment[];
}

/**
 * Settles a list of learning judgments into a frozen LessonSettlement: joins
 * their charge values with the knowledge join, preserves the judgments, and
 * collects the "stable" ones separately.
 */
export function settleLessonJudgments(judgments: readonly LessonJudgment[]): LessonSettlement {
  return Object.freeze({
    kind: "animating.learning.lesson-settlement" as const,
    value: joinKnowledgeNames(judgments.map((judgment) => judgment.value)),
    judgments: Object.freeze([...judgments]),
    stableJudgments: Object.freeze(judgments.filter((judgment) => judgment.value === "stable")),
  });
}
