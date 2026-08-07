/**
 * settling/analysis/exact-number — the exact-arithmetic carrier.
 *
 * The core numeric carriers, built bottom-up and exact throughout: a `Natural`
 * is a von Neumann ordinal (a set of the naturals below it, so its count is its
 * value); an `Integer` is a balanced difference of naturals; a `Rational` is a
 * reduced pair of integers; a `Matrix` is rows of integers, with a fraction-free
 * (Bareiss) determinant, characteristic polynomial, Smith normal form, and rank.
 *
 * Pure arithmetic with NO external dependency — a true leaf. (The relation-valued
 * reading of a natural's von Neumann extension, `asExtension`/`extensionOf`,
 * lives with bilattice-relation, where it belongs; it is not arithmetic.) The
 * carrier↔native-number doors live in the codecs, never here.
 */

/** A natural number as a von Neumann ordinal: the set of naturals below it. */
export interface Natural {
  readonly kind: "exactNumber.natural";
  readonly members: readonly Natural[];
}

function membersExhaustFirst(left: Natural, right: Natural): boolean {
  const leftMembers = left.members[Symbol.iterator]();
  const rightMembers = right.members[Symbol.iterator]();
  for (;;) {
    const l = leftMembers.next();
    const r = rightMembers.next();
    if (r.done) return false;
    if (l.done) return true;
  }
}

/** Strict less-than on naturals: left's member set runs out before right's. */
export const natLess = (left: Natural, right: Natural): boolean => membersExhaustFirst(left, right);
/** Equality on naturals. */
export function natEqual(left: Natural, right: Natural): boolean {
  return !membersExhaustFirst(left, right) && !membersExhaustFirst(right, left);
}
/** Set membership: member < n. */
export const isMember = (member: Natural, n: Natural): boolean => natLess(member, n);
/** Less-than-or-equal on naturals. */
export const natLeq = (left: Natural, right: Natural): boolean => !membersExhaustFirst(right, left);

/** The natural zero: the von Neumann ordinal with no members. */
export const natZero: Natural = Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([]) });

/** The von Neumann successor n ∪ {n}. */
export const successor = (n: Natural): Natural =>
  Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([...n.members, n]) });
/** The natural one. */
export const natOne: Natural = successor(natZero);
/** The members of a natural (the naturals below it). */
export const members = (n: Natural): readonly Natural[] => Object.freeze([...n.members]);
/** Whether a natural is zero. */
export const natIsZero = (n: Natural): boolean => natEqual(n, natZero);
/** Three-way comparison of naturals. */
export const natCompare = (left: Natural, right: Natural): -1 | 0 | 1 =>
  natLess(left, right) ? -1 : natLess(right, left) ? 1 : 0;

/** The predecessor of a natural: zero, or its largest member. */
export const predecessor = (n: Natural): Natural => {
  let largest = natZero;
  for (const member of n.members) largest = member;
  return largest;
};

/** Addition of naturals by primitive recursion. */
export function natAdd(left: Natural, right: Natural): Natural {
  let sum = left;
  let remaining = right;
  while (!natIsZero(remaining)) {
    sum = successor(sum);
    remaining = predecessor(remaining);
  }
  return sum;
}

/** Multiplication of naturals by primitive recursion. */
export function natMultiply(left: Natural, right: Natural): Natural {
  let product = natZero;
  let remaining = right;
  while (!natIsZero(remaining)) {
    product = natAdd(product, left);
    remaining = predecessor(remaining);
  }
  return product;
}

/** Truncated subtraction of naturals (never negative). */
export function monus(left: Natural, right: Natural): Natural {
  let difference = left;
  let remaining = right;
  while (!natIsZero(remaining) && !natIsZero(difference)) {
    difference = predecessor(difference);
    remaining = predecessor(remaining);
  }
  return difference;
}

/** Euclidean division of naturals; throws on division by zero. */
export function natDivmod(n: Natural, d: Natural): { readonly quotient: Natural; readonly remainder: Natural } {
  if (natIsZero(d)) throw new RangeError("natural divmod: division by zero");
  let quotientValue = natZero;
  let remainder = n;
  while (natLeq(d, remainder)) {
    remainder = monus(remainder, d);
    quotientValue = successor(quotientValue);
  }
  return Object.freeze({ quotient: quotientValue, remainder });
}

/** Greatest common divisor of two naturals (Euclid). */
export function gcd(left: Natural, right: Natural): Natural {
  let a = left;
  let b = right;
  while (!natIsZero(b)) {
    const remainder = natDivmod(a, b).remainder;
    a = b;
    b = remainder;
  }
  return a;
}

/** The carrier-native cardinality of a collection, as a Natural. */
export const count = <Item,>(items: Iterable<Item>): Natural => {
  let value = natZero;
  for (const _item of items) value = successor(value);
  return value;
};

/** An integer as a balanced difference of naturals (one part zero). */
export interface Integer {
  readonly kind: "exactNumber.integer";
  readonly pos: Natural;
  readonly neg: Natural;
}

function balance(pos: Natural, neg: Natural): Integer {
  return Object.freeze(natLeq(neg, pos)
    ? { kind: "exactNumber.integer" as const, pos: monus(pos, neg), neg: natZero }
    : { kind: "exactNumber.integer" as const, pos: natZero, neg: monus(neg, pos) });
}

/** Construct a balanced integer from positive and negative parts. */
export const integer = (pos: Natural, neg: Natural): Integer => balance(pos, neg);
/** Embed a natural as a non-negative integer. */
export const fromNatural = (n: Natural): Integer => Object.freeze({ kind: "exactNumber.integer" as const, pos: n, neg: natZero });
/** The integer zero. */
export const intZero: Integer = fromNatural(natZero);
/** The integer one. */
export const intOne: Integer = fromNatural(natOne);
/** Negation of an integer. */
export const intNegate = (z: Integer): Integer => Object.freeze({ kind: "exactNumber.integer" as const, pos: z.neg, neg: z.pos });
/** Addition of integers. */
export const intAdd = (left: Integer, right: Integer): Integer => balance(natAdd(left.pos, right.pos), natAdd(left.neg, right.neg));
/** Subtraction of integers. */
export const intSubtract = (left: Integer, right: Integer): Integer => intAdd(left, intNegate(right));
/** Multiplication of integers. */
export const intMultiply = (left: Integer, right: Integer): Integer =>
  balance(
    natAdd(natMultiply(left.pos, right.pos), natMultiply(left.neg, right.neg)),
    natAdd(natMultiply(left.pos, right.neg), natMultiply(left.neg, right.pos)),
  );
/** Equality on integers in balanced form. */
export const intEqual = (left: Integer, right: Integer): boolean => natEqual(left.pos, right.pos) && natEqual(left.neg, right.neg);
/** Value equivalence of integers regardless of balance. */
export const equivalent = (left: Integer, right: Integer): boolean =>
  natEqual(natAdd(left.pos, right.neg), natAdd(right.pos, left.neg));
/** Whether an integer is zero. */
export const intIsZero = (z: Integer): boolean => natIsZero(z.pos) && natIsZero(z.neg);
/** Whether an integer is positive. */
export const isPositive = (z: Integer): boolean => !natIsZero(z.pos);
/** Whether an integer is negative. */
export const isNegative = (z: Integer): boolean => !natIsZero(z.neg);
/** The sign of an integer. */
export const sign = (z: Integer): -1 | 0 | 1 => isPositive(z) ? 1 : isNegative(z) ? -1 : 0;
/** The absolute value of an integer, as a natural. */
export const magnitude = (z: Integer): Natural => intIsZero(z) ? z.pos : isPositive(z) ? z.pos : z.neg;

/** Division of integers; throws on division by zero. */
export function intDivmod(left: Integer, right: Integer): { readonly quotient: Integer; readonly remainder: Integer } {
  if (intIsZero(right)) throw new RangeError("integer divmod: division by zero");
  const quotientMagnitude = natDivmod(magnitude(left), magnitude(right)).quotient;
  const quotient = sign(left) * sign(right) < 0 ? intNegate(fromNatural(quotientMagnitude)) : fromNatural(quotientMagnitude);
  return Object.freeze({ quotient, remainder: intSubtract(left, intMultiply(quotient, right)) });
}

/** The quotient of dividing two integers. */
export const quotient = (left: Integer, right: Integer): Integer => intDivmod(left, right).quotient;
/** Whether divisor divides value exactly. */
export const divides = (divisor: Integer, value: Integer): boolean => intIsZero(intDivmod(value, divisor).remainder);
/** Three-way comparison of integers. */
export const intCompare = (left: Integer, right: Integer): -1 | 0 | 1 => sign(intSubtract(left, right));

/** A rational as a canonical (reduced, positive-denominator) pair of integers. */
export interface Rational {
  readonly kind: "exactNumber.rational";
  readonly num: Integer;
  readonly den: Integer;
}

function canonicalRational(num: Integer, den: Integer): Rational {
  if (intIsZero(den)) throw new RangeError("rational: zero denominator");
  const s = sign(num) * sign(den);
  const mNum = magnitude(num);
  const mDen = magnitude(den);
  if (natIsZero(mNum)) return Object.freeze({ kind: "exactNumber.rational" as const, num: intZero, den: intOne });
  const factor = gcd(mNum, mDen);
  const normalizedNum = fromNatural(natDivmod(mNum, factor).quotient);
  return Object.freeze({
    kind: "exactNumber.rational" as const,
    num: s < 0 ? intNegate(normalizedNum) : normalizedNum,
    den: fromNatural(natDivmod(mDen, factor).quotient),
  });
}

/** Construct a canonical rational; throws on a zero denominator. */
export const rational = (num: Integer, den: Integer): Rational => canonicalRational(num, den);
/** Embed an integer as a rational. */
export const fromInteger = (z: Integer): Rational => Object.freeze({ kind: "exactNumber.rational" as const, num: z, den: intOne });
/** The rational zero. */
export const ratZero: Rational = fromInteger(intZero);
/** The rational one. */
export const ratOne: Rational = fromInteger(intOne);
/** Negation of a rational. */
export const ratNegate = (q: Rational): Rational => Object.freeze({ kind: "exactNumber.rational" as const, num: intNegate(q.num), den: q.den });
/** The reciprocal of a rational. */
export const reciprocal = (q: Rational): Rational => canonicalRational(q.den, q.num);
/** Addition of rationals. */
export const ratAdd = (left: Rational, right: Rational): Rational =>
  canonicalRational(intAdd(intMultiply(left.num, right.den), intMultiply(right.num, left.den)), intMultiply(left.den, right.den));
/** Subtraction of rationals. */
export const ratSubtract = (left: Rational, right: Rational): Rational => ratAdd(left, ratNegate(right));
/** Multiplication of rationals. */
export const ratMultiply = (left: Rational, right: Rational): Rational =>
  canonicalRational(intMultiply(left.num, right.num), intMultiply(left.den, right.den));
/** Division of rationals. */
export const divide = (left: Rational, right: Rational): Rational => ratMultiply(left, reciprocal(right));
/** Equality on rationals in canonical form. */
export const ratEqual = (left: Rational, right: Rational): boolean => intEqual(left.num, right.num) && intEqual(left.den, right.den);
/** Whether a rational is zero. */
export const ratIsZero = (q: Rational): boolean => intIsZero(q.num);
/** The sign of a rational. */
export const ratSign = (q: Rational): -1 | 0 | 1 => sign(q.num);
/** Three-way comparison of rationals. */
export const ratCompare = (left: Rational, right: Rational): -1 | 0 | 1 => ratSign(ratSubtract(left, right));

/** A matrix of exact integers. */
export type Matrix = readonly (readonly Integer[])[];

const polyNormalize = (poly: readonly Integer[]): readonly Integer[] => {
  let high = poly.length - 1;
  while (high > 0 && intIsZero(poly[high]!)) high -= 1;
  return Object.freeze(poly.slice(0, high + 1));
};

const polyPad = (left: readonly Integer[], right: readonly Integer[], op: (a: Integer, b: Integer) => Integer): readonly Integer[] => {
  const length = Math.max(left.length, right.length);
  return polyNormalize(Array.from({ length }, (_, index) => op(left[index] ?? intZero, right[index] ?? intZero)));
};

const polyAdd = (left: readonly Integer[], right: readonly Integer[]): readonly Integer[] => polyPad(left, right, intAdd);
const polySub = (left: readonly Integer[], right: readonly Integer[]): readonly Integer[] => polyPad(left, right, intSubtract);
const polyMul = (left: readonly Integer[], right: readonly Integer[]): readonly Integer[] => {
  const result: Integer[] = Array.from({ length: left.length + right.length - 1 }, () => intZero);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] = intAdd(result[leftIndex + rightIndex]!, intMultiply(left[leftIndex]!, right[rightIndex]!));
    }
  }
  return polyNormalize(result);
};

interface Ring<T> {
  readonly zero: T;
  readonly add: (left: T, right: T) => T;
  readonly sub: (left: T, right: T) => T;
  readonly mul: (left: T, right: T) => T;
}

const polyRing: Ring<readonly Integer[]> = Object.freeze({ zero: Object.freeze([intZero]), add: polyAdd, sub: polySub, mul: polyMul });

function det<T>(matrix: readonly (readonly T[])[], ring: Ring<T>): T {
  const n = matrix.length;
  if (n === 1) return matrix[0]![0]!;
  let acc = ring.zero;
  for (let column = 0; column < n; column += 1) {
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    const term = ring.mul(matrix[0]![column]!, det(minor, ring));
    acc = column % 2 === 0 ? ring.add(acc, term) : ring.sub(acc, term);
  }
  return acc;
}

function integerDeterminant(matrix: Matrix): Integer {
  const n = matrix.length;
  if (n === 0) return intOne;
  if (n === 1) return matrix[0]![0]!;
  const work: Integer[][] = matrix.map((row) => [...row]);
  let signValue = intOne;
  let previousPivot = intOne;

  for (let pivotIndex = 0; pivotIndex < n - 1; pivotIndex += 1) {
    let pivotRow = pivotIndex;
    while (pivotRow < n && intIsZero(work[pivotRow]![pivotIndex]!)) pivotRow += 1;
    if (pivotRow === n) return intZero;
    if (pivotRow !== pivotIndex) {
      [work[pivotIndex], work[pivotRow]] = [work[pivotRow]!, work[pivotIndex]!];
      signValue = intNegate(signValue);
    }

    const pivot = work[pivotIndex]![pivotIndex]!;
    for (let row = pivotIndex + 1; row < n; row += 1) {
      for (let column = pivotIndex + 1; column < n; column += 1) {
        const numerator = intSubtract(
          intMultiply(work[row]![column]!, pivot),
          intMultiply(work[row]![pivotIndex]!, work[pivotIndex]![column]!),
        );
        work[row]![column] = quotient(numerator, previousPivot);
      }
      work[row]![pivotIndex] = intZero;
    }
    previousPivot = pivot;
  }

  return intMultiply(signValue, work[n - 1]![n - 1]!);
}

/** The transpose of a matrix. */
export const matTranspose = (matrix: Matrix): Matrix =>
  Object.freeze(matrix[0]!.map((_, column) => Object.freeze(matrix.map((row) => row[column]!))));

/** The product of two matrices, exact. */
export const matmul = (left: Matrix, right: Matrix): Matrix =>
  Object.freeze(left.map((row) => Object.freeze(right[0]!.map((_, column) =>
    row.reduce((sum, item, index) => intAdd(sum, intMultiply(item, right[index]![column]!)), intZero)))));

/** Equality on matrices. */
export const matEqual = (left: Matrix, right: Matrix): boolean =>
  left.length === right.length
  && left.every((row, rowIndex) =>
    row.length === right[rowIndex]!.length && row.every((item, columnIndex) => intEqual(item, right[rowIndex]![columnIndex]!)));

/** The exact integer determinant (fraction-free Bareiss elimination). */
export const determinant = (matrix: Matrix): Integer => integerDeterminant(matrix);

/** The characteristic polynomial of a matrix (ascending-degree integer coefficients). */
export function charPoly(matrix: Matrix): readonly Integer[] {
  const lambdaIMinusM: readonly (readonly (readonly Integer[])[])[] = matrix.map((row, rowIndex) =>
    Object.freeze(row.map((item, columnIndex) =>
      columnIndex === rowIndex ? Object.freeze([intNegate(item), intOne]) : Object.freeze([intNegate(item)]))));
  return det(lambdaIMinusM, polyRing);
}

/** The invariant factors of a matrix from its Smith normal form. */
export function smithNormalForm(matrix: Matrix): readonly Integer[] {
  const work: Integer[][] = matrix.map((row) => [...row]);
  const rows = work.length;
  const columns = work[0]?.length ?? 0;
  const swapRows = (left: number, right: number): void => {
    [work[left], work[right]] = [work[right]!, work[left]!];
  };
  const swapColumns = (left: number, right: number): void => {
    for (const row of work) [row[left], row[right]] = [row[right]!, row[left]!];
  };
  const addRow = (destination: number, source: number, quotientValue: Integer): void => {
    for (let column = 0; column < columns; column += 1) {
      work[destination]![column] = intSubtract(work[destination]![column]!, intMultiply(quotientValue, work[source]![column]!));
    }
  };
  const addColumn = (destination: number, source: number, quotientValue: Integer): void => {
    for (let row = 0; row < rows; row += 1) {
      work[row]![destination] = intSubtract(work[row]![destination]!, intMultiply(quotientValue, work[row]![source]!));
    }
  };

  const limit = Math.min(rows, columns);
  for (let t = 0; t < limit; t += 1) {
    let found = false;
    outer: for (let row = t; row < rows; row += 1) {
      for (let column = t; column < columns; column += 1) {
        if (!intIsZero(work[row]![column]!)) {
          swapRows(t, row);
          swapColumns(t, column);
          found = true;
          break outer;
        }
      }
    }
    if (!found) break;

    for (;;) {
      let changed = false;
      for (let row = t + 1; row < rows; row += 1) {
        if (intIsZero(work[row]![t]!)) continue;
        addRow(row, t, quotient(work[row]![t]!, work[t]![t]!));
        if (!intIsZero(work[row]![t]!)) {
          swapRows(t, row);
          changed = true;
        }
      }
      for (let column = t + 1; column < columns; column += 1) {
        if (intIsZero(work[t]![column]!)) continue;
        addColumn(column, t, quotient(work[t]![column]!, work[t]![t]!));
        if (!intIsZero(work[t]![column]!)) {
          swapColumns(t, column);
          changed = true;
        }
      }
      if (!changed) break;
    }

    let fixed = false;
    outer2: for (let row = t + 1; row < rows; row += 1) {
      for (let column = t + 1; column < columns; column += 1) {
        if (!divides(work[t]![t]!, work[row]![column]!)) {
          addRow(t, row, intNegate(intOne));
          fixed = true;
          break outer2;
        }
      }
    }
    if (fixed) t -= 1;
  }

  const factors: Integer[] = [];
  for (let index = 0; index < limit; index += 1) factors.push(fromNatural(magnitude(work[index]?.[index] ?? intZero)));
  return Object.freeze(factors);
}

/** The rank of a matrix: the count of nonzero invariant factors. */
export const rank = (matrix: Matrix): Natural => count(smithNormalForm(matrix).filter((factor) => !intIsZero(factor)));
