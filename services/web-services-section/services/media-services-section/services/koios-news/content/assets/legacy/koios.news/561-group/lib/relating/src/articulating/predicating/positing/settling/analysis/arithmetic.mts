/**
 * Exact arithmetic for analytical consumers.
 *
 * The carrier implementation is algebraic substrate (`algebra/exact-number`),
 * but analysis packages need a public, non-topological path for exact rational
 * comparison and arithmetic. Substitution dynamics remains under topology.
 */
export {
  fromInteger,
  intIsZero,
  natCompare,
  natOne,
  ratZero,
  ratAdd,
  ratCompare,
  ratMultiply,
  ratNegate,
  ratSign,
  ratSubtract,
} from "./exact-number.mjs";
export type {
  Integer,
  Natural,
  Rational,
} from "./exact-number.mjs";
