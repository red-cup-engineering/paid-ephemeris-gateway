/**
 * teaching — KnowingLessons → Curriculum: a leaf under learning.
 *
 * Fourth derivative (a leaf). Teaching takes the lessons learning distilled and
 * presents them as a course — the ordered sequence of lessons to deliver. learning
 * answers "what is learned"; teaching answers "in what order is it delivered". The
 * codomain holds the live upstream lessons (composable) in delivery order. Reads only
 * @emsenn/relating (through the knowing learning carrier).
 */
import type { KnowingLessons, KnowingLesson } from "../learning.mjs";

/** The curriculum carrier: a research act's lessons ordered for delivery. */
export interface Curriculum {
  readonly kind: "knowing.curriculum";
  readonly learning: KnowingLessons;
  readonly lessons: readonly KnowingLesson[];
}

/** teach : KnowingLessons → Curriculum. */
export function teaching(learning: KnowingLessons): Curriculum {
  return Object.freeze({
    kind: "knowing.curriculum" as const,
    learning,
    lessons: Object.freeze([...learning.lessons]),
  });
}
