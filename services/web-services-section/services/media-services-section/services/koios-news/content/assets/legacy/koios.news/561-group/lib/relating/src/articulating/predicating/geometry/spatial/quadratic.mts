/**
 * Exact arithmetic in a real quadratic field ℚ(√d).
 *
 * Elements are `unit + root·√d` over a fixed nonsquare radicand d ≥ 2, with
 * exact rational coefficients. This is the minimal coordinate system in
 * which a one-dimensional cut of a two-dimensional lattice has an
 * irrational slope that is still exactly decidable: signs and comparisons
 * never touch a float, and the Galois conjugation √d ↦ −√d is the algebraic
 * form of the physical/internal swap used by the cut-and-project scheme.
 * Which radicand to read a given structure at is a correspondence question,
 * not part of the structure.
 */

import {
  ratAdd,
  ratEqual,
  ratIsZero,
  ratMultiply,
  ratNegate,
  ratSign,
  ratSubtract,
  type Rational,
} from "../../../carriers.mjs";
import { fromRatio, ratFromInt, toNumber } from "../../../../codecs/index.mjs";

/**
 * An element of a real quadratic field Q(sqrt(d)): `unit` and `root` are exact
 * rational coefficients of 1 and sqrt(d), and `radicand` is the nonsquare
 * integer d labelling which field the element lives in.
 */
export interface QuadraticRational {
  readonly kind: "meme-geometry.quadratic.rational";
  
  
  
  
  
  
  
  
  readonly radicand: number;
  readonly unit: Rational;
  readonly root: Rational;
}

const isPerfectSquare = (value: number): boolean => {
  const candidate = Math.round(Math.sqrt(value));
  return candidate * candidate === value;
};









const MAX_RADICAND = 1000;

/**
 * Constructs a QuadraticRational from a radicand and rational unit/root
 * coefficients: throws if the radicand is not a nonsquare integer in [2,
 * MAX_RADICAND]. Returns a frozen element of Q(sqrt(radicand)).
 */
export const quadraticRational = (radicand: number, unit: Rational, root: Rational): QuadraticRational => {
  if (!Number.isSafeInteger(radicand) || radicand < 2 || isPerfectSquare(radicand)) {
    throw new TypeError("quadraticRational: radicand must be a nonsquare integer >= 2");
  }
  if (radicand > MAX_RADICAND) {
    throw new RangeError(
      `quadraticRational: radicand ${radicand} exceeds ${MAX_RADICAND}; ℚ(√d) labels are small because d enters arithmetic as a unary substrate magnitude`,
    );
  }
  return Object.freeze({
    kind: "meme-geometry.quadratic.rational" as const,
    radicand,
    unit,
    root,
  });
};

/**
 * Constructs a QuadraticRational from integer unit and root coefficients over
 * the given radicand: a convenience wrapper that lifts the integers to
 * rationals.
 */
export const quadraticFromInts = (radicand: number, unit: number, root: number): QuadraticRational =>
  quadraticRational(radicand, ratFromInt(unit), ratFromInt(root));

/**
 * Lifts a plain rational into Q(sqrt(radicand)) as its unit part with a zero
 * root coefficient: the embedding of Q into the quadratic field.
 */
export const quadraticFromRational = (radicand: number, value: Rational): QuadraticRational =>
  quadraticRational(radicand, value, ratFromInt(0));

/**
 * Tests whether two QuadraticRationals share the same radicand, i.e. live in
 * the same field Q(sqrt(d)).
 */
export const sameRadicand = (left: QuadraticRational, right: QuadraticRational): boolean =>
  left.radicand === right.radicand;

const requireSameRadicand = (operation: string, left: QuadraticRational, right: QuadraticRational): void => {
  if (!sameRadicand(left, right)) throw new TypeError(`${operation}: radicands differ`);
};

const carry = (source: QuadraticRational, unit: Rational, root: Rational): QuadraticRational => Object.freeze({
  kind: "meme-geometry.quadratic.rational" as const,
  radicand: source.radicand,
  unit,
  root,
});

/**
 * Adds two QuadraticRationals componentwise over a shared radicand: throws if
 * the radicands differ.
 */
export const quadraticAdd = (left: QuadraticRational, right: QuadraticRational): QuadraticRational => {
  requireSameRadicand("quadraticAdd", left, right);
  return carry(left, ratAdd(left.unit, right.unit), ratAdd(left.root, right.root));
};

/**
 * Subtracts the right QuadraticRational from the left componentwise over a
 * shared radicand: throws if the radicands differ.
 */
export const quadraticSubtract = (left: QuadraticRational, right: QuadraticRational): QuadraticRational => {
  requireSameRadicand("quadraticSubtract", left, right);
  return carry(left, ratSubtract(left.unit, right.unit), ratSubtract(left.root, right.root));
};

/**
 * Negates a QuadraticRational by negating both its unit and root coefficients.
 */
export const quadraticNegate = (value: QuadraticRational): QuadraticRational =>
  carry(value, ratNegate(value.unit), ratNegate(value.root));

/** (a + b√d)(c + e√d) = (ac + bed) + (ae + bc)√d. */
export const quadraticMultiply = (left: QuadraticRational, right: QuadraticRational): QuadraticRational => {
  requireSameRadicand("quadraticMultiply", left, right);
  const radicand = fromRatio(left.radicand, 1);
  return carry(
    left,
    ratAdd(ratMultiply(left.unit, right.unit), ratMultiply(radicand, ratMultiply(left.root, right.root))),
    ratAdd(ratMultiply(left.unit, right.root), ratMultiply(left.root, right.unit)),
  );
};

/**
 * Scales a QuadraticRational by a plain rational, multiplying both unit and
 * root coefficients: the field's scalar multiplication by Q.
 */
export const quadraticScale = (value: QuadraticRational, scalar: Rational): QuadraticRational =>
  carry(value, ratMultiply(value.unit, scalar), ratMultiply(value.root, scalar));

/** value + q for rational q, staying in value's field. */
export const quadraticAddRational = (value: QuadraticRational, scalar: Rational): QuadraticRational =>
  carry(value, ratAdd(value.unit, scalar), value.root);

/** Galois conjugation √d ↦ −√d — the physical/internal swap. */
export const quadraticConjugate = (value: QuadraticRational): QuadraticRational =>
  carry(value, value.unit, ratNegate(value.root));

/**
 * Tests exact equality of two QuadraticRationals: true when they share a
 * radicand and both unit and root coefficients are equal.
 */
export const quadraticEqual = (left: QuadraticRational, right: QuadraticRational): boolean =>
  sameRadicand(left, right) && ratEqual(left.unit, right.unit) && ratEqual(left.root, right.root);

/**
 * Tests whether a QuadraticRational is a plain rational, i.e. its root
 * coefficient is zero.
 */
export const quadraticIsRational = (value: QuadraticRational): boolean => ratIsZero(value.root);

/** Exact sign of t + s√d. Mixed-sign cases are decided by t² − ds², which
 *  cannot vanish away from zero because √d is irrational. */
export const quadraticSign = (value: QuadraticRational): -1 | 0 | 1 => {
  const unitSign = ratSign(value.unit);
  const rootSign = ratSign(value.root);
  if (rootSign === 0) return unitSign;
  if (unitSign === 0) return rootSign;
  if (unitSign === rootSign) return unitSign;
  const radicand = fromRatio(value.radicand, 1);
  const discriminant = ratSubtract(
    ratMultiply(value.unit, value.unit),
    ratMultiply(radicand, ratMultiply(value.root, value.root)),
  );
  return (unitSign * ratSign(discriminant)) as -1 | 0 | 1;
};

/**
 * Exact three-way comparison of two QuadraticRationals, returning -1, 0, or 1
 * as the left is less than, equal to, or greater than the right: computed as
 * the sign of their difference.
 */
export const quadraticCompare = (left: QuadraticRational, right: QuadraticRational): -1 | 0 | 1 =>
  quadraticSign(quadraticSubtract(left, right));

/** Tests whether the left QuadraticRational is strictly less than the right. */
export const quadraticLess = (left: QuadraticRational, right: QuadraticRational): boolean =>
  quadraticCompare(left, right) === -1;

/**
 * Tests whether the left QuadraticRational is less than or equal to the right.
 */
export const quadraticLeq = (left: QuadraticRational, right: QuadraticRational): boolean =>
  quadraticCompare(left, right) !== 1;

/** Boundary read only — exactness ends here. */
export const quadraticToNumber = (value: QuadraticRational): number =>
  toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);
