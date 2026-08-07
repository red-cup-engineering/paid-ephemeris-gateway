/**
 * algebra/graded — a Rational carried in a sector.
 *
 * A graded rational is an exact Rational together with an opaque grade: the
 * SECTOR — species, dimension, conserved-quantity type — the quantity belongs
 * to. Its one law is that addition is defined only WITHIN a sector: you cannot
 * add a charge to a spin, a length to a time. That grade-check is the entire
 * content of "graded", and it is superselection — distinct sectors never
 * superpose, and each is conserved on its own.
 *
 * Scalar multiplication by an ungraded Rational rescales within a sector. The
 * graded product pairs two sectors into a third, the way dimensional
 * multiplication does (a rate times a duration is a total). The value is always
 * a carrier Rational — exact, closed, no JS number and no bigint. Reading a
 * sectored quantity out as a decimal or an audit string is a boundary concern
 * and lives in codecs, not here.
 *
 * Any conserved quantity graded by type lands here: charge by species, flux by
 * channel, probability mass by outcome. The substrate knows only the grade and
 * the conservation it forces; whatever a sector stands for is a reading taken
 * downstream, never a concern of this layer.
 */

import {
  ratAdd,
  ratCompare,
  ratEqual,
  ratIsZero,
  ratMultiply,
  ratNegate,
  ratSign,
  ratSubtract,
  ratZero,
  type Rational,
} from "./exact-number.mjs";

/**
 * A graded rational: an exact Rational value carried under an opaque grade
 * label. Two graded rationals combine additively only when their grades agree.
 */
export interface GradedRational {
  readonly kind: "exactNumber.gradedRational";
  readonly value: Rational;
  readonly grade: string;
}

/** Constructs a graded rational from a Rational value and its grade label. */
export const graded = (value: Rational, grade: string): GradedRational =>
  Object.freeze({ kind: "exactNumber.gradedRational" as const, value, grade });

/** The grade label of a graded rational. */
export const gradeOf = (g: GradedRational): string => g.grade;
/** The Rational value of a graded rational, stripped of its grade. */
export const gradedValue = (g: GradedRational): Rational => g.value;
/** The zero of a grade: the rational zero carried under that grade. */
export const gradedZero = (grade: string): GradedRational => graded(ratZero, grade);

/** Tests whether a value is a graded rational by its kind tag. */
export const isGradedRational = (x: object): x is GradedRational =>
  "kind" in x && x.kind === "exactNumber.gradedRational";

/** Whether two graded rationals share a grade. */
export const sameGrade = (left: GradedRational, right: GradedRational): boolean => left.grade === right.grade;

const requireSameGrade = (left: GradedRational, right: GradedRational): void => {
  if (left.grade !== right.grade) throw new TypeError(`grade mismatch: ${left.grade} vs ${right.grade}`);
};

/** Addition within a grade: sums the values, throwing on a grade mismatch. */
export const gradedAdd = (left: GradedRational, right: GradedRational): GradedRational => {
  requireSameGrade(left, right);
  return graded(ratAdd(left.value, right.value), left.grade);
};

/** Subtraction within a grade: differences the values, throwing on a grade mismatch. */
export const gradedSubtract = (left: GradedRational, right: GradedRational): GradedRational => {
  requireSameGrade(left, right);
  return graded(ratSubtract(left.value, right.value), left.grade);
};

/** Negation: negates the value, keeping the grade. */
export const gradedNegate = (g: GradedRational): GradedRational => graded(ratNegate(g.value), g.grade);

/** Tests whether a graded rational is zero: true when its value is zero. */
export const gradedIsZero = (g: GradedRational): boolean => ratIsZero(g.value);

/** The sign of a graded rational: the sign of its value. */
export const gradedSign = (g: GradedRational): -1 | 0 | 1 => ratSign(g.value);

/** The absolute value of a graded rational: the magnitude of its value, same grade. */
export const gradedAbs = (g: GradedRational): GradedRational =>
  graded(ratSign(g.value) < 0 ? ratNegate(g.value) : g.value, g.grade);

/** Three-way comparison within a grade: compares values, throwing on a grade mismatch. */
export const gradedCompare = (left: GradedRational, right: GradedRational): -1 | 0 | 1 => {
  requireSameGrade(left, right);
  return ratCompare(left.value, right.value);
};

/** Equality: true when grades agree and values are equal. */
export const gradedEqual = (left: GradedRational, right: GradedRational): boolean =>
  left.grade === right.grade && ratEqual(left.value, right.value);

/** Whether a graded rational's magnitude is within a tolerance of the same grade. */
export const withinGradedTolerance = (g: GradedRational, tolerance: GradedRational): boolean =>
  gradedCompare(gradedAbs(g), gradedAbs(tolerance)) <= 0;

/** Scalar multiplication by an ungraded Rational: scales the value, keeps the grade. */
export const gradedScale = (g: GradedRational, scalar: Rational): GradedRational =>
  graded(ratMultiply(g.value, scalar), g.grade);

/**
 * The graded product into a result sector: multiplies the two values and carries
 * the product under the named sector — dimensional multiplication, where a
 * quantity in one sector and a quantity in another pair into a third (a velocity
 * times a duration is a distance).
 */
export const gradedTimes = (left: GradedRational, right: GradedRational, grade: string): GradedRational =>
  graded(ratMultiply(left.value, right.value), grade);
