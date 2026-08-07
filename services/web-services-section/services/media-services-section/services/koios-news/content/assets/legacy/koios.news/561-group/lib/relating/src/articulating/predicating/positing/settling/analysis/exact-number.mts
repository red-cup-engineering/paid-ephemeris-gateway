import { relationFromMatrix, relationMatrix, stateExtension, type RelationCarrier, type StateExtensionCarrier } from "../../../bilattice-relation.mjs";
import { entitySet, predicateSet } from "../../../predication.mjs";
import { chargeValue, type ChargeValue } from "../../bilattice-charge.mjs";

/**
 * The single membership predicate used to express a natural number's von
 * Neumann extension: a tagged marker with no payload, distinguished only by its
 * kind.
 */
export interface MembershipPredicate {
  readonly kind: "exactNumber.membershipPredicate";
}

/**
 * Constructs the membership predicate: a frozen marker carrying only its kind
 * tag.
 */
export const membershipPredicate = (): MembershipPredicate =>
  Object.freeze({ kind: "exactNumber.membershipPredicate" as const });

/**
 * Equality on membership predicates: true when the two share the same kind tag.
 */
export const sameMembershipPredicate = (left: MembershipPredicate, right: MembershipPredicate): boolean =>
  left.kind === right.kind;

/**
 * A natural number encoded as a von Neumann ordinal: a frozen set whose members
 * are the canonical (deduped, length-sorted) naturals strictly less than it, so
 * its count is its value.
 */
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
/** Equality on naturals: neither member set runs out before the other. */
export function natEqual(left: Natural, right: Natural): boolean {
  return !membersExhaustFirst(left, right) && !membersExhaustFirst(right, left);
}
/** Set membership: member is one of n's von Neumann elements, i.e. member < n. */
export const isMember = (member: Natural, n: Natural): boolean => natLess(member, n);
/** Less-than-or-equal: left is not strictly greater than right. */
export const natLeq = (left: Natural, right: Natural): boolean => !membersExhaustFirst(right, left);

function internNatural(memberList: readonly Natural[]): Natural {
  const uniqueMembers: Natural[] = [];
  for (const member of memberList) {
    if (!uniqueMembers.some((item) => natEqual(item, member))) {
      uniqueMembers.push(member);
    }
  }
  uniqueMembers.sort((left, right) => (natLess(left, right) ? -1 : natLess(right, left) ? 1 : 0));
  return Object.freeze({
    kind: "exactNumber.natural" as const,
    members: Object.freeze(uniqueMembers),
  });
}

/** The natural number zero: the von Neumann ordinal with no members. */
export const natZero: Natural = internNatural([]);





/**
 * The von Neumann successor n union {n}: returns the natural whose members are
 * n's members plus n itself, building the canonical set directly without
 * re-dedup or re-sort.
 */
export const successor = (n: Natural): Natural =>
  Object.freeze({ kind: "exactNumber.natural" as const, members: Object.freeze([...n.members, n]) });
/** The natural number one: the successor of zero. */
export const natOne: Natural = successor(natZero);
/**
 * The members of a natural: a frozen copy of the naturals strictly less than n.
 */
export const members = (n: Natural): readonly Natural[] => Object.freeze([...n.members]);
/** Tests whether a natural is zero: true when its member set is empty. */
export const natIsZero = (n: Natural): boolean => natEqual(n, natZero);
/**
 * Three-way comparison of naturals: returns -1, 0, or 1 as left is less than,
 * equal to, or greater than right.
 */
export const natCompare = (left: Natural, right: Natural): -1 | 0 | 1 =>
  natLess(left, right) ? -1 : natLess(right, left) ? 1 : 0;

/**
 * The predecessor of a natural: zero when n is zero, otherwise its largest
 * member — the last in canonical (ascending) order.
 */
export const predecessor = (n: Natural): Natural => {
  let largest = natZero;
  for (const member of n.members) largest = member;
  return largest;
};





/**
 * Addition of naturals by primitive recursion: peels successors off right and
 * applies them to left, staying within the set construction.
 */
export function natAdd(left: Natural, right: Natural): Natural {
  let sum = left;
  let remaining = right;
  while (!natIsZero(remaining)) {
    sum = successor(sum);
    remaining = predecessor(remaining);
  }
  return sum;
}









/**
 * Multiplication of naturals by primitive recursion: accumulates left once per
 * successor of right, staying within the set construction.
 */
export function natMultiply(left: Natural, right: Natural): Natural {
  let product = natZero;
  let remaining = right;
  while (!natIsZero(remaining)) {
    product = natAdd(product, left);
    remaining = predecessor(remaining);
  }
  return product;
}



/**
 * Truncated subtraction of naturals: peels both down together, yielding zero
 * when left empties first, so the result never goes negative.
 */
export function monus(left: Natural, right: Natural): Natural {
  let difference = left;
  let remaining = right;
  while (!natIsZero(remaining) && !natIsZero(difference)) {
    difference = predecessor(difference);
    remaining = predecessor(remaining);
  }
  return difference;
}



/**
 * Euclidean division of naturals by repeated subtraction: returns the quotient
 * and remainder of n divided by d, throwing RangeError when d is zero.
 */
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

/**
 * Greatest common divisor of two naturals by the Euclidean algorithm, iterating
 * on remainders until one operand is zero.
 */
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

/**
 * Builds the relation carrier for a natural's von Neumann extension: a single
 * membership predicate charges each member "potential" and n itself "absurd",
 * over the universe of n's members plus n.
 */
export function asExtension(n: Natural): RelationCarrier<Natural, MembershipPredicate> {
  const membership = membershipPredicate();
  const universe = [...n.members, n];
  const points = entitySet(universe, natEqual);
  const states = predicateSet([membership], sameMembershipPredicate);
  const entries: Array<readonly [Natural, MembershipPredicate, ChargeValue]> = n.members.map((member) => [member, membership, chargeValue("potential")] as const);
  entries.push([n, membership, chargeValue("absurd")] as const);
  return relationFromMatrix(relationMatrix(points, states, entries, { samePoint: natEqual, sameState: sameMembershipPredicate }));
}

/**
 * The state extension of a natural under its single membership predicate: the
 * points charged by membership in n's von Neumann extension.
 */
export const extensionOf = (n: Natural): StateExtensionCarrier<Natural, MembershipPredicate> => {
  const extension = asExtension(n);
  return stateExtension(extension, extension.states.predicates[0]!);
};

/**
 * The carrier-native cardinality of a collection: a Natural built by folding
 * successor over its elements — counting the carriers themselves rather than
 * reading a JS length. The relational-number ↔ JS-number doors (toCount,
 * fromCount, …) live in codecs/exact-number; core code counts with this.
 */
export const count = <Item,>(items: Iterable<Item>): Natural => {
  let value = natZero;
  for (const _item of items) value = successor(value);
  return value;
};

/**
 * An integer modeled as a difference of two naturals: its value is pos minus
 * neg, kept in balanced form where one of the two parts is zero.
 */
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

/**
 * Constructs an integer from a positive and negative natural part, balanced so
 * that one part is zero and the other holds the magnitude.
 */
export const integer = (pos: Natural, neg: Natural): Integer => balance(pos, neg);
/**
 * Embeds a natural as a non-negative integer, with the natural as the positive
 * part and zero as the negative part.
 */
export const fromNatural = (n: Natural): Integer => Object.freeze({ kind: "exactNumber.integer" as const, pos: n, neg: natZero });
/** The integer zero. */
export const intZero: Integer = fromNatural(natZero);
/** The integer one. */
export const intOne: Integer = fromNatural(natOne);
/** Negation of an integer: swaps its positive and negative parts. */
export const intNegate = (z: Integer): Integer => Object.freeze({ kind: "exactNumber.integer" as const, pos: z.neg, neg: z.pos });
/**
 * Addition of integers: sums the positive parts and the negative parts, then
 * rebalances.
 */
export const intAdd = (left: Integer, right: Integer): Integer =>
  balance(natAdd(left.pos, right.pos), natAdd(left.neg, right.neg));
/** Subtraction of integers: adds left to the negation of right. */
export const intSubtract = (left: Integer, right: Integer): Integer => intAdd(left, intNegate(right));
/**
 * Multiplication of integers via the difference-of-naturals encoding: combines
 * cross products of positive and negative parts, then rebalances.
 */
export const intMultiply = (left: Integer, right: Integer): Integer =>
  balance(
    natAdd(natMultiply(left.pos, right.pos), natMultiply(left.neg, right.neg)),
    natAdd(natMultiply(left.pos, right.neg), natMultiply(left.neg, right.pos)),
  );
/**
 * Equality on integers in balanced form: true when both positive parts and both
 * negative parts are equal.
 */
export const intEqual = (left: Integer, right: Integer): boolean => natEqual(left.pos, right.pos) && natEqual(left.neg, right.neg);
/**
 * Value equivalence of integers regardless of balance: true when left.pos +
 * right.neg equals right.pos + left.neg.
 */
export const equivalent = (left: Integer, right: Integer): boolean =>
  natEqual(natAdd(left.pos, right.neg), natAdd(right.pos, left.neg));
/** Tests whether an integer is zero: true when both its parts are zero. */
export const intIsZero = (z: Integer): boolean => natIsZero(z.pos) && natIsZero(z.neg);
/**
 * Tests whether an integer is positive: true when its positive part is nonzero.
 */
export const isPositive = (z: Integer): boolean => !natIsZero(z.pos);
/**
 * Tests whether an integer is negative: true when its negative part is nonzero.
 */
export const isNegative = (z: Integer): boolean => !natIsZero(z.neg);
/** The sign of an integer: 1 if positive, -1 if negative, 0 if zero. */
export const sign = (z: Integer): -1 | 0 | 1 => isPositive(z) ? 1 : isNegative(z) ? -1 : 0;
/**
 * The absolute value of an integer as a natural: the positive part when
 * non-negative, otherwise the negative part.
 */
export const magnitude = (z: Integer): Natural => intIsZero(z) ? z.pos : isPositive(z) ? z.pos : z.neg;

/**
 * Division of integers: returns quotient and remainder, deriving the quotient
 * sign from the operands and computing the remainder as left minus quotient
 * times right; throws RangeError when right is zero.
 */
export function intDivmod(left: Integer, right: Integer): { readonly quotient: Integer; readonly remainder: Integer } {
  if (intIsZero(right)) throw new RangeError("integer divmod: division by zero");
  const quotientMagnitude = natDivmod(magnitude(left), magnitude(right)).quotient;
  const quotient = sign(left) * sign(right) < 0 ? intNegate(fromNatural(quotientMagnitude)) : fromNatural(quotientMagnitude);
  return Object.freeze({ quotient, remainder: intSubtract(left, intMultiply(quotient, right)) });
}

/** The quotient of dividing two integers, discarding the remainder. */
export const quotient = (left: Integer, right: Integer): Integer => intDivmod(left, right).quotient;
/**
 * Tests whether divisor divides value exactly: true when the remainder of value
 * divided by divisor is zero.
 */
export const divides = (divisor: Integer, value: Integer): boolean => intIsZero(intDivmod(value, divisor).remainder);
/**
 * Three-way comparison of integers: the sign of left minus right, returning -1,
 * 0, or 1.
 */
export const intCompare = (left: Integer, right: Integer): -1 | 0 | 1 => sign(intSubtract(left, right));

/**
 * A rational number as a pair of integers: num over den, kept in canonical form
 * (reduced by gcd, sign carried on the numerator, positive denominator).
 */
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

/**
 * Constructs a rational from numerator and denominator integers, reduced to
 * canonical form; throws RangeError on a zero denominator.
 */
export const rational = (num: Integer, den: Integer): Rational => canonicalRational(num, den);
/** Embeds an integer as a rational with denominator one. */
export const fromInteger = (z: Integer): Rational => Object.freeze({ kind: "exactNumber.rational" as const, num: z, den: intOne });
/** The rational zero. */
export const ratZero: Rational = fromInteger(intZero);
/** The rational one. */
export const ratOne: Rational = fromInteger(intOne);
/**
 * Negation of a rational: negates the numerator, leaving the denominator
 * unchanged.
 */
export const ratNegate = (q: Rational): Rational => Object.freeze({ kind: "exactNumber.rational" as const, num: intNegate(q.num), den: q.den });
/**
 * The reciprocal of a rational: swaps numerator and denominator,
 * re-canonicalized.
 */
export const reciprocal = (q: Rational): Rational => canonicalRational(q.den, q.num);
/**
 * Addition of rationals over a common denominator, returned in canonical form.
 */
export const ratAdd = (left: Rational, right: Rational): Rational =>
  canonicalRational(intAdd(intMultiply(left.num, right.den), intMultiply(right.num, left.den)), intMultiply(left.den, right.den));
/** Subtraction of rationals: adds left to the negation of right. */
export const ratSubtract = (left: Rational, right: Rational): Rational => ratAdd(left, ratNegate(right));
/**
 * Multiplication of rationals: multiplies numerators and denominators, returned
 * in canonical form.
 */
export const ratMultiply = (left: Rational, right: Rational): Rational =>
  canonicalRational(intMultiply(left.num, right.num), intMultiply(left.den, right.den));
/** Division of rationals: multiplies left by the reciprocal of right. */
export const divide = (left: Rational, right: Rational): Rational => ratMultiply(left, reciprocal(right));
/**
 * Equality on rationals in canonical form: true when numerators and
 * denominators are respectively equal.
 */
export const ratEqual = (left: Rational, right: Rational): boolean =>
  intEqual(left.num, right.num) && intEqual(left.den, right.den);
/** Tests whether a rational is zero: true when its numerator is zero. */
export const ratIsZero = (q: Rational): boolean => intIsZero(q.num);
/**
 * The sign of a rational: the sign of its numerator, since the denominator is
 * always positive.
 */
export const ratSign = (q: Rational): -1 | 0 | 1 => sign(q.num);
/**
 * Three-way comparison of rationals: the sign of left minus right, returning
 * -1, 0, or 1.
 */
export const ratCompare = (left: Rational, right: Rational): -1 | 0 | 1 => ratSign(ratSubtract(left, right));

/** A matrix of exact integers: a read-only array of read-only rows. */
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

const integerRing: Ring<Integer> = Object.freeze({ zero: intZero, add: intAdd, sub: intSubtract, mul: intMultiply });
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

/** The transpose of a matrix: rows become columns and vice versa. */
export const matTranspose = (matrix: Matrix): Matrix =>
  Object.freeze(matrix[0]!.map((_, column) => Object.freeze(matrix.map((row) => row[column]!))));

/**
 * The product of two matrices, computed with exact integer addition and
 * multiplication.
 */
export const matmul = (left: Matrix, right: Matrix): Matrix =>
  Object.freeze(left.map((row) => Object.freeze(right[0]!.map((_, column) =>
    row.reduce((sum, item, index) => intAdd(sum, intMultiply(item, right[index]![column]!)), intZero)))));

/**
 * Equality on matrices: true when they have the same shape and equal integer
 * entries.
 */
export const matEqual = (left: Matrix, right: Matrix): boolean =>
  left.length === right.length
  && left.every((row, rowIndex) =>
    row.length === right[rowIndex]!.length && row.every((item, columnIndex) => intEqual(item, right[rowIndex]![columnIndex]!)));

/**
 * The exact integer determinant of a matrix, computed by fraction-free Bareiss
 * elimination.
 */
export const determinant = (matrix: Matrix): Integer => integerDeterminant(matrix);

/**
 * The characteristic polynomial of a matrix as integer coefficients in
 * ascending degree: the determinant of (lambda I minus M) expanded over the
 * polynomial ring.
 */
export function charPoly(matrix: Matrix): readonly Integer[] {
  const lambdaIMinusM: readonly (readonly (readonly Integer[])[])[] = matrix.map((row, rowIndex) =>
    Object.freeze(row.map((item, columnIndex) =>
      columnIndex === rowIndex ? Object.freeze([intNegate(item), intOne]) : Object.freeze([intNegate(item)]))));
  return det(lambdaIMinusM, polyRing);
}

/**
 * The invariant factors of a matrix from its Smith normal form: the diagonal
 * magnitudes produced by integer row and column reduction.
 */
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

/**
 * The rank of a matrix as a natural: the count of nonzero invariant factors in
 * its Smith normal form.
 */
export const rank = (matrix: Matrix): Natural => count(smithNormalForm(matrix).filter((factor) => !intIsZero(factor)));
