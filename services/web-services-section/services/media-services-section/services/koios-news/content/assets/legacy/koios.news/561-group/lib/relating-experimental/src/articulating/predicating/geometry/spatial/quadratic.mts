/**
 * geometry/spatial/quadratic — exact arithmetic in a real quadratic field ℚ(√d).
 *
 * Elements are `unit + root·√d` over a fixed nonsquare radicand d ≥ 2, with exact
 * rational coefficients — the minimal coordinate system in which a 1-D cut of a
 * 2-D lattice has an irrational but exactly decidable slope. Signs and
 * comparisons never touch a float; Galois conjugation √d ↦ −√d is the algebraic
 * form of the cut-and-project physical/internal swap.
 */
import {
  ratAdd, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSign, ratSubtract, type Rational,
} from "../../positing/settling/analysis/exact-number.mjs";
import { fromRatio, ratFromInt, toNumber } from "../../../../codecs/index.mjs";

/** An element of ℚ(√d): exact unit and root coefficients over a nonsquare radicand. */
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

/** Construct a ℚ(√d) element; throws unless d is a nonsquare integer in [2, 1000]. */
export const quadraticRational = (radicand: number, unit: Rational, root: Rational): QuadraticRational => {
  if (!Number.isSafeInteger(radicand) || radicand < 2 || isPerfectSquare(radicand)) {
    throw new TypeError("quadraticRational: radicand must be a nonsquare integer >= 2");
  }
  if (radicand > MAX_RADICAND) {
    throw new RangeError(`quadraticRational: radicand ${radicand} exceeds ${MAX_RADICAND}; ℚ(√d) labels are small because d enters arithmetic as a unary substrate magnitude`);
  }
  return Object.freeze({ kind: "meme-geometry.quadratic.rational" as const, radicand, unit, root });
};

/** Construct from integer unit and root coefficients. */
export const quadraticFromInts = (radicand: number, unit: number, root: number): QuadraticRational =>
  quadraticRational(radicand, ratFromInt(unit), ratFromInt(root));

/** Embed a plain rational into ℚ(√d) as its unit part. */
export const quadraticFromRational = (radicand: number, value: Rational): QuadraticRational =>
  quadraticRational(radicand, value, ratFromInt(0));

/** Whether two elements live in the same field ℚ(√d). */
export const sameRadicand = (left: QuadraticRational, right: QuadraticRational): boolean => left.radicand === right.radicand;

const requireSameRadicand = (operation: string, left: QuadraticRational, right: QuadraticRational): void => {
  if (!sameRadicand(left, right)) throw new TypeError(`${operation}: radicands differ`);
};

const carry = (source: QuadraticRational, unit: Rational, root: Rational): QuadraticRational =>
  Object.freeze({ kind: "meme-geometry.quadratic.rational" as const, radicand: source.radicand, unit, root });

/** Add componentwise over a shared radicand. */
export const quadraticAdd = (left: QuadraticRational, right: QuadraticRational): QuadraticRational => {
  requireSameRadicand("quadraticAdd", left, right);
  return carry(left, ratAdd(left.unit, right.unit), ratAdd(left.root, right.root));
};

/** Subtract componentwise over a shared radicand. */
export const quadraticSubtract = (left: QuadraticRational, right: QuadraticRational): QuadraticRational => {
  requireSameRadicand("quadraticSubtract", left, right);
  return carry(left, ratSubtract(left.unit, right.unit), ratSubtract(left.root, right.root));
};

/** Negate both coefficients. */
export const quadraticNegate = (value: QuadraticRational): QuadraticRational => carry(value, ratNegate(value.unit), ratNegate(value.root));

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

/** Scale by a plain rational. */
export const quadraticScale = (value: QuadraticRational, scalar: Rational): QuadraticRational =>
  carry(value, ratMultiply(value.unit, scalar), ratMultiply(value.root, scalar));

/** value + q for rational q. */
export const quadraticAddRational = (value: QuadraticRational, scalar: Rational): QuadraticRational =>
  carry(value, ratAdd(value.unit, scalar), value.root);

/** Galois conjugation √d ↦ −√d. */
export const quadraticConjugate = (value: QuadraticRational): QuadraticRational => carry(value, value.unit, ratNegate(value.root));

/** Exact equality. */
export const quadraticEqual = (left: QuadraticRational, right: QuadraticRational): boolean =>
  sameRadicand(left, right) && ratEqual(left.unit, right.unit) && ratEqual(left.root, right.root);

/** Whether the element is a plain rational (zero root). */
export const quadraticIsRational = (value: QuadraticRational): boolean => ratIsZero(value.root);

/** Exact sign of t + s√d (mixed signs decided by t² − ds²). */
export const quadraticSign = (value: QuadraticRational): -1 | 0 | 1 => {
  const unitSign = ratSign(value.unit);
  const rootSign = ratSign(value.root);
  if (rootSign === 0) return unitSign;
  if (unitSign === 0) return rootSign;
  if (unitSign === rootSign) return unitSign;
  const radicand = fromRatio(value.radicand, 1);
  const discriminant = ratSubtract(ratMultiply(value.unit, value.unit), ratMultiply(radicand, ratMultiply(value.root, value.root)));
  return (unitSign * ratSign(discriminant)) as -1 | 0 | 1;
};

/** Exact three-way comparison. */
export const quadraticCompare = (left: QuadraticRational, right: QuadraticRational): -1 | 0 | 1 =>
  quadraticSign(quadraticSubtract(left, right));

/** Strictly less than. */
export const quadraticLess = (left: QuadraticRational, right: QuadraticRational): boolean => quadraticCompare(left, right) === -1;

/** Less than or equal. */
export const quadraticLeq = (left: QuadraticRational, right: QuadraticRational): boolean => quadraticCompare(left, right) !== 1;

/** Boundary read only — exactness ends here. */
export const quadraticToNumber = (value: QuadraticRational): number =>
  toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);
