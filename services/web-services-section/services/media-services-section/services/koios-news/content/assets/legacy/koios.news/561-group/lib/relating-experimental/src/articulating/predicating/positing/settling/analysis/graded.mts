/**
 * settling/analysis/graded — a Rational carried in a superselection sector.
 *
 * A graded rational is an exact Rational under an opaque grade (the sector:
 * species, dimension, conserved-quantity type). Its one law is that addition is
 * defined only WITHIN a sector — you cannot add a charge to a spin. Scalar
 * multiplication by an ungraded Rational rescales within a sector; the graded
 * product pairs two sectors into a third (dimensional multiplication). The value
 * is always an exact carrier Rational; reading it out is a codec concern.
 */
import {
  ratAdd, ratCompare, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSign, ratSubtract, ratZero,
  type Rational,
} from "./exact-number.mjs";

/** A graded rational: an exact value under an opaque grade. */
export interface GradedRational {
  readonly kind: "exactNumber.gradedRational";
  readonly value: Rational;
  readonly grade: string;
}

/** Construct a graded rational. */
export const graded = (value: Rational, grade: string): GradedRational =>
  Object.freeze({ kind: "exactNumber.gradedRational" as const, value, grade });

/** The grade label. */
export const gradeOf = (g: GradedRational): string => g.grade;
/** The value, stripped of its grade. */
export const gradedValue = (g: GradedRational): Rational => g.value;
/** The zero of a grade. */
export const gradedZero = (grade: string): GradedRational => graded(ratZero, grade);

/** Whether a value is a graded rational. */
export const isGradedRational = (x: object): x is GradedRational => "kind" in x && x.kind === "exactNumber.gradedRational";

/** Whether two graded rationals share a grade. */
export const sameGrade = (left: GradedRational, right: GradedRational): boolean => left.grade === right.grade;

const requireSameGrade = (left: GradedRational, right: GradedRational): void => {
  if (left.grade !== right.grade) throw new TypeError(`grade mismatch: ${left.grade} vs ${right.grade}`);
};

/** Addition within a grade. */
export const gradedAdd = (left: GradedRational, right: GradedRational): GradedRational => {
  requireSameGrade(left, right);
  return graded(ratAdd(left.value, right.value), left.grade);
};

/** Subtraction within a grade. */
export const gradedSubtract = (left: GradedRational, right: GradedRational): GradedRational => {
  requireSameGrade(left, right);
  return graded(ratSubtract(left.value, right.value), left.grade);
};

/** Negation, keeping the grade. */
export const gradedNegate = (g: GradedRational): GradedRational => graded(ratNegate(g.value), g.grade);

/** Whether a graded rational is zero. */
export const gradedIsZero = (g: GradedRational): boolean => ratIsZero(g.value);

/** The sign of a graded rational. */
export const gradedSign = (g: GradedRational): -1 | 0 | 1 => ratSign(g.value);

/** The absolute value, same grade. */
export const gradedAbs = (g: GradedRational): GradedRational =>
  graded(ratSign(g.value) < 0 ? ratNegate(g.value) : g.value, g.grade);

/** Three-way comparison within a grade. */
export const gradedCompare = (left: GradedRational, right: GradedRational): -1 | 0 | 1 => {
  requireSameGrade(left, right);
  return ratCompare(left.value, right.value);
};

/** Equality (grades agree and values equal). */
export const gradedEqual = (left: GradedRational, right: GradedRational): boolean =>
  left.grade === right.grade && ratEqual(left.value, right.value);

/** Whether a graded rational's magnitude is within a tolerance of the same grade. */
export const withinGradedTolerance = (g: GradedRational, tolerance: GradedRational): boolean =>
  gradedCompare(gradedAbs(g), gradedAbs(tolerance)) <= 0;

/** Scalar multiplication by an ungraded Rational. */
export const gradedScale = (g: GradedRational, scalar: Rational): GradedRational =>
  graded(ratMultiply(g.value, scalar), g.grade);

/** The graded product into a result sector (dimensional multiplication). */
export const gradedTimes = (left: GradedRational, right: GradedRational, grade: string): GradedRational =>
  graded(ratMultiply(left.value, right.value), grade);
