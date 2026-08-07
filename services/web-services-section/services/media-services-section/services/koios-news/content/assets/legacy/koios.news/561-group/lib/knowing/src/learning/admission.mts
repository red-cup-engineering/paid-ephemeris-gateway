// admission.mts — learning judgments and their settlement, read at ≤_k.
//
// Learning is the INSIDE face: knowing transforms the agent's interior state by
// settling what it has come to hold. An admission judgment is a named, charged
// verdict (a check's decision projected as bilattice data); the lesson it settles
// to is the KNOWLEDGE-JOIN of those verdicts — knowing's comonad working the
// knowledge order ≤_k (absurd ⊥ is the unit, stable ⊤ the top; a held
// contradiction join(potential, active) = stable is kept first-class, never
// thrown). The verdict values are the four charge value names used AS DATA at the
// learning layer; they never re-enter bedrock admission (re-admitting a charge
// would be seeding).
//
// This is the surface the fresh Gen-1 animating dropped on purpose: learning is
// the knowing faculty, not the agent's descent. It is derived directly on
// @emsenn/relating's charge join — knowing imports only relating.

import type { ChargeValueName } from "@emsenn/relating";

/** Truth/falsity presence of each charge value name, the bilattice's ≤_k coordinates:
 *  absurd ⊥ = [f,f], potential t = [t,f], active f = [f,t], stable ⊤ = [t,t]. */
const PRESENCE: Readonly<Record<ChargeValueName, readonly [positive: boolean, negative: boolean]>> = Object.freeze({
  absurd: [false, false],
  potential: [true, false],
  active: [false, true],
  stable: [true, true],
});

/**
 * The knowledge-join (≤_k supremum) of a set of charge value NAMES: `absurd` (⊥)
 * is the unit, `stable` (⊤) the top, and `join(potential, active) = stable` (a held
 * contradiction). The join is the componentwise OR of the truth/falsity presence —
 * exactly relating's `joinKnowledge` read at the value-name level.
 */
export function joinKnowledgeNames(names: Iterable<ChargeValueName>): ChargeValueName {
  let positive = false;
  let negative = false;
  for (const name of names) {
    const [p, q] = PRESENCE[name];
    positive = positive || p;
    negative = negative || q;
  }
  return positive ? (negative ? "stable" : "potential") : (negative ? "active" : "absurd");
}

/**
 * A named, charged verdict from an admission layer: `name` identifies the check,
 * `value` is the bilattice charge value carried as learning data, `reason` explains
 * the verdict, and `path` locates the subject that was judged.
 */
export interface LessonJudgment {
  readonly name: string;
  readonly value: ChargeValueName;
  readonly reason: string;
  readonly path: string;
}

/**
 * The settled reading of a set of admission judgments: `value` is the knowledge
 * join of every judgment's charge value, `judgments` holds the inputs, and
 * `stableJudgments` holds those whose value is `stable` — held contradictions
 * rendered rather than thrown.
 */
export interface LessonSettlement {
  readonly kind: "knowing.learning.lesson-settlement";
  /** Knowledge join of every judgment's charge value — the reading is the value name itself. */
  readonly value: ChargeValueName;
  readonly judgments: readonly LessonJudgment[];
  /** Judgments individually `stable` — held contradictions, rendered, never thrown. */
  readonly stableJudgments: readonly LessonJudgment[];
}

/**
 * Settle a list of learning judgments into a frozen `LessonSettlement`: join their
 * charge values with the knowledge join, preserve the judgments, and collect the
 * `stable` ones separately.
 */
export function settleLessonJudgments(judgments: readonly LessonJudgment[]): LessonSettlement {
  return Object.freeze({
    kind: "knowing.learning.lesson-settlement" as const,
    value: joinKnowledgeNames(judgments.map((judgment) => judgment.value)),
    judgments: Object.freeze([...judgments]),
    stableJudgments: Object.freeze(judgments.filter((judgment) => judgment.value === "stable")),
  });
}
