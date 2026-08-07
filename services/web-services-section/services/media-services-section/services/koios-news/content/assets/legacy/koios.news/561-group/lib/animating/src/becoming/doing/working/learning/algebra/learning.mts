import type { CellSet, SettlingIncrement } from "@emsenn/relating";
import type { AgentSite } from "../../../algebra/doing.mjs";

/**
 * A lesson is the restriction an agent derives from one non-empty point of its
 * settling trace.
 */
export interface Lesson {
  readonly kind: "animating.learning.lesson";
  readonly increment: SettlingIncrement;
  readonly restriction: CellSet;
}

/**
 * The learning carrier: an agent site read through the lessons derivable from
 * its trace.
 */
export interface AgentLearning {
  readonly kind: "animating.agent.learning";
  readonly site: AgentSite;
  readonly lessons: readonly Lesson[];
}

/** Derive a lesson from a settling increment. */
export function lesson(increment: SettlingIncrement): Lesson {
  return Object.freeze({
    kind: "animating.learning.lesson" as const,
    increment,
    restriction: increment.added,
  });
}

/**
 * Learn from an agent site's trace: every increment that adds cells yields one
 * lesson, and empty increments yield no retained lesson.
 *
 * Domain: `AgentSite`.
 * Codomain: `AgentLearning`.
 */
export function learning(site: AgentSite): AgentLearning {
  return Object.freeze({
    kind: "animating.agent.learning" as const,
    site,
    lessons: Object.freeze(site.trace.filter((increment) => increment.added.cells.length > 0).map(lesson)),
  });
}
