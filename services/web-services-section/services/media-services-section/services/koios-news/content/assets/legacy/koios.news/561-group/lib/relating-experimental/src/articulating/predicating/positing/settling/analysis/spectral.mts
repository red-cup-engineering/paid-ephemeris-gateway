/**
 * analysis/spectral — exact spectral reads of integer polynomials and matrices.
 *
 * Root location relative to the unit circle (Möbius x↦(1+x)/(1−x) then the
 * Routh–Hurwitz array over the rationals), the Pisot test (one expanding root,
 * none neutral), the resultant via the Sylvester determinant, dominant-root
 * power iteration, and the Mahler measure. Exact throughout over the integer/
 * rational carriers — a pure leaf over exact-number.
 */
import {
  charPoly, count, determinant, divide, fromInteger, predecessor,
  intAdd, intEqual, intIsZero, intMultiply, intNegate, intOne, intSubtract, intZero,
  natEqual, natIsZero, natOne, natZero, ratOne, ratIsZero, ratMultiply, ratSign, ratSubtract, ratZero, successor,
  type Integer, type Matrix, type Natural, type Rational,
} from "./exact-number.mjs";

/** A polynomial over the integers: ascending-degree coefficients. */
export type IntegerPolynomial = readonly Integer[];
/** A polynomial over the rationals: ascending-degree coefficients. */
export type RationalPolynomial = readonly Rational[];

/** Root counts relative to the unit circle: outside / inside / on. */
export interface RootLocationWitness {
  readonly kind: "spectral.rootLocation:witness";
  readonly polynomial: IntegerPolynomial;
  readonly expanding: Natural;
  readonly contracting: Natural;
  readonly neutral: Natural;
}

/** Obstruction to locating roots, carrying the Routh-test reason. */
export interface RootLocationObstruction {
  readonly kind: "spectral.rootLocation-obstruction";
  readonly polynomial: IntegerPolynomial;
  readonly reason: RightHalfPlaneRootObstructionReason;
  readonly obstruction: RightHalfPlaneRootObstruction;
}

/** The result of locating roots relative to the unit circle. */
export type RootLocationJudgment = RootLocationWitness | RootLocationObstruction;

/** Why a Routh–Hurwitz right-half-plane count failed. */
export type RightHalfPlaneRootObstructionReason = "routh-row-has-zero-pivot" | "routh-first-column-has-zero-entry";

/** The count of right-half-plane roots (Routh first-column sign changes). */
export interface RightHalfPlaneRootWitness {
  readonly kind: "spectral.rightHalfPlaneRoot:witness";
  readonly rhp: Natural;
}

/** Obstruction to counting right-half-plane roots. */
export interface RightHalfPlaneRootObstruction {
  readonly kind: "spectral.rightHalfPlaneRoot-obstruction";
  readonly reason: RightHalfPlaneRootObstructionReason;
}

/** The result of counting right-half-plane roots. */
export type RightHalfPlaneRootJudgment = RightHalfPlaneRootWitness | RightHalfPlaneRootObstruction;

/** A polynomial with Pisot-style root structure. */
export interface PisotRootWitness {
  readonly kind: "spectral.pisotRoot:witness";
  readonly polynomial: IntegerPolynomial;
  readonly location: RootLocationWitness;
}

/** Obstruction to Pisot-style root structure. */
export interface PisotRootObstruction {
  readonly kind: "spectral.pisotRoot-obstruction";
  readonly polynomial: IntegerPolynomial;
  readonly location: RootLocationJudgment;
}

/** The result of the Pisot test. */
export type PisotRootJudgment = PisotRootWitness | PisotRootObstruction;

/** Two polynomials equal after normalization. */
export interface PolynomialIdentityWitness {
  readonly kind: "spectral.polynomialIdentity:witness";
  readonly left: IntegerPolynomial;
  readonly right: IntegerPolynomial;
}

/** Two polynomials that differ after normalization. */
export interface PolynomialIdentityObstruction {
  readonly kind: "spectral.polynomialIdentity-obstruction";
  readonly left: IntegerPolynomial;
  readonly right: IntegerPolynomial;
}

/** The result of comparing two polynomials. */
export type PolynomialIdentityJudgment = PolynomialIdentityWitness | PolynomialIdentityObstruction;

/** Two polynomials sharing a common root (resultant zero). */
export interface PolynomialRootIntersectionWitness {
  readonly kind: "spectral.polynomialRootIntersection:witness";
  readonly left: IntegerPolynomial;
  readonly right: IntegerPolynomial;
  readonly resultant: Integer;
}

/** Two polynomials with no common root (resultant nonzero). */
export interface PolynomialRootIntersectionObstruction {
  readonly kind: "spectral.polynomialRootIntersection-obstruction";
  readonly left: IntegerPolynomial;
  readonly right: IntegerPolynomial;
  readonly resultant: Integer;
}

/** The result of the resultant root-intersection test. */
export type PolynomialRootIntersectionJudgment = PolynomialRootIntersectionWitness | PolynomialRootIntersectionObstruction;

/** A polynomial paired with its reciprocal and their root intersection. */
export interface PolynomialInversionSymmetry {
  readonly kind: "spectral.polynomialInversionSymmetry";
  readonly polynomial: IntegerPolynomial;
  readonly reciprocal: IntegerPolynomial;
  readonly rootIntersection: PolynomialRootIntersectionJudgment;
}

/** A power-iteration estimate of a monic polynomial's dominant root. */
export interface DominantRootConvergenceWitness {
  readonly kind: "spectral.dominantRootConvergence:witness";
  readonly polynomial: IntegerPolynomial;
  readonly iterations: Natural;
  readonly value: Rational;
}

/** Why dominant-root power iteration could not produce an estimate. */
export type DominantRootConvergenceObstructionReason = "non-positive-degree" | "non-monic-polynomial" | "zero-denominator";

/** Obstruction to estimating a dominant root. */
export interface DominantRootConvergenceObstruction {
  readonly kind: "spectral.dominantRootConvergence-obstruction";
  readonly polynomial: IntegerPolynomial;
  readonly iterations: Natural;
  readonly reason: DominantRootConvergenceObstructionReason;
}

/** The result of dominant-root power iteration. */
export type DominantRootConvergenceJudgment = DominantRootConvergenceWitness | DominantRootConvergenceObstruction;

/** A polynomial of Mahler measure one (self-reciprocal, all roots on the circle). */
export interface UnitMahlerMeasureWitness {
  readonly kind: "spectral.mahlerMeasure.unit:witness";
  readonly polynomial: IntegerPolynomial;
  readonly selfReciprocity: PolynomialIdentityWitness;
  readonly location: RootLocationObstruction;
  readonly value: Rational;
}

/** A Mahler measure equal to the dominant (Pisot) root. */
export interface DominantRootMahlerMeasureWitness {
  readonly kind: "spectral.mahlerMeasure.dominantRoot:witness";
  readonly polynomial: IntegerPolynomial;
  readonly pisot: PisotRootWitness;
  readonly convergence: DominantRootConvergenceWitness;
  readonly value: Rational;
}

/** Obstruction: not Pisot. */
export interface PisotMahlerMeasureObstruction {
  readonly kind: "spectral.mahlerMeasure.pisot-obstruction";
  readonly polynomial: IntegerPolynomial;
  readonly pisot: PisotRootObstruction;
}

/** Obstruction: Pisot but power iteration failed. */
export interface ConvergenceMahlerMeasureObstruction {
  readonly kind: "spectral.mahlerMeasure.convergence-obstruction";
  readonly polynomial: IntegerPolynomial;
  readonly pisot: PisotRootWitness;
  readonly convergence: DominantRootConvergenceObstruction;
}

/** The result of computing a Mahler measure. */
export type MahlerMeasureJudgment = UnitMahlerMeasureWitness | DominantRootMahlerMeasureWitness | PisotMahlerMeasureObstruction | ConvergenceMahlerMeasureObstruction;

/** A matrix's characteristic polynomial with the Pisot judgment on it. */
export interface MatrixPisotCarrier {
  readonly kind: "spectral.matrixPisot.carrier";
  readonly polynomial: IntegerPolynomial;
  readonly roots: PisotRootJudgment;
}

const normalize = (poly: readonly Integer[]): IntegerPolynomial => {
  let high = poly.length - 1;
  while (high > 0 && intIsZero(poly[high]!)) high -= 1;
  return Object.freeze(poly.slice(0, high + 1));
};

/** Admit integer coefficients as a normalized polynomial. */
export const integerPolynomial = (coefficients: readonly Integer[]): IntegerPolynomial => normalize(coefficients);

const naturalFromFiniteCount = (value: number): Natural => {
  if (!Number.isInteger(value) || value < 0) throw new RangeError("expected a non-negative finite count");
  let result = natZero;
  for (let index = 0; index < value; index += 1) result = successor(result);
  return result;
};

const finiteCountOfNatural = (value: Natural): number => {
  let countValue = 0;
  let remaining = value;
  while (!natIsZero(remaining)) {
    countValue += 1;
    remaining = predecessor(remaining);
  }
  return countValue;
};

const degreeOf = (poly: readonly Integer[]): number => normalize(poly).length - 1;

const zadd = (left: readonly Integer[], right: readonly Integer[]): IntegerPolynomial => {
  const length = Math.max(left.length, right.length);
  return normalize(Array.from({ length }, (_, index) => intAdd(left[index] ?? intZero, right[index] ?? intZero)));
};

const zmul = (left: readonly Integer[], right: readonly Integer[]): IntegerPolynomial => {
  const result: Integer[] = Array.from({ length: left.length + right.length - 1 }, () => intZero);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] = intAdd(result[leftIndex + rightIndex]!, intMultiply(left[leftIndex]!, right[rightIndex]!));
    }
  }
  return normalize(result);
};

const zscale = (scale: Integer, poly: readonly Integer[]): IntegerPolynomial =>
  normalize(poly.map((coefficient) => intMultiply(scale, coefficient)));

const zpow = (base: readonly Integer[], exponent: number): IntegerPolynomial => {
  let result: IntegerPolynomial = Object.freeze([intOne]);
  for (let index = 0; index < exponent; index += 1) result = zmul(result, base);
  return result;
};

function sylvester(left: readonly Integer[], right: readonly Integer[]): Matrix {
  const p = normalize(left);
  const q = normalize(right);
  const n = p.length - 1;
  const m = q.length - 1;
  const pHighFirst = [...p].reverse();
  const qHighFirst = [...q].reverse();
  const size = n + m;
  const matrix: Integer[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
  for (let row = 0; row < m; row += 1) {
    for (let column = 0; column <= n; column += 1) matrix[row]![row + column] = pHighFirst[column]!;
  }
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column <= m; column += 1) matrix[m + row]![row + column] = qHighFirst[column]!;
  }
  return Object.freeze(matrix.map((row) => Object.freeze(row)));
}

/** The degree of a polynomial, as a Natural. */
export const polyDegree = (poly: readonly Integer[]): Natural => predecessor(count(normalize(poly)));

function polynomialEqual(left: readonly Integer[], right: readonly Integer[]): boolean {
  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((coefficient, index) => intEqual(coefficient, b[index]!));
}

/** Compare two polynomials for equality after normalization. */
export function polynomialIdentity(left: readonly Integer[], right: readonly Integer[]): PolynomialIdentityJudgment {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return polynomialEqual(normalizedLeft, normalizedRight)
    ? Object.freeze({ kind: "spectral.polynomialIdentity:witness" as const, left: normalizedLeft, right: normalizedRight })
    : Object.freeze({ kind: "spectral.polynomialIdentity-obstruction" as const, left: normalizedLeft, right: normalizedRight });
}

/** The reciprocal of a polynomial (coefficients reversed). */
export const polyReciprocal = (poly: readonly Integer[]): IntegerPolynomial => normalize([...normalize(poly)].reverse());
/** The resultant of two polynomials (Sylvester determinant). */
export const resultant = (left: readonly Integer[], right: readonly Integer[]): Integer => determinant(sylvester(left, right));

/** Whether a polynomial equals its own reciprocal. */
export const selfReciprocity = (poly: readonly Integer[]): PolynomialIdentityJudgment => polynomialIdentity(poly, polyReciprocal(poly));

/** Whether two polynomials share a common root (via the resultant). */
export function rootIntersection(left: readonly Integer[], right: readonly Integer[]): PolynomialRootIntersectionJudgment {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  const value = resultant(normalizedLeft, normalizedRight);
  return intIsZero(value)
    ? Object.freeze({ kind: "spectral.polynomialRootIntersection:witness" as const, left: normalizedLeft, right: normalizedRight, resultant: value })
    : Object.freeze({ kind: "spectral.polynomialRootIntersection-obstruction" as const, left: normalizedLeft, right: normalizedRight, resultant: value });
}

/** A polynomial with its reciprocal and their root intersection. */
export function inversionSymmetry(poly: readonly Integer[]): PolynomialInversionSymmetry {
  const polynomial = normalize(poly);
  const reciprocal = polyReciprocal(polynomial);
  return Object.freeze({
    kind: "spectral.polynomialInversionSymmetry" as const,
    polynomial,
    reciprocal,
    rootIntersection: rootIntersection(polynomial, reciprocal),
  });
}

const onePlusPolynomial = (): IntegerPolynomial => Object.freeze([intOne, intOne]);
const oneMinusPolynomial = (): IntegerPolynomial => Object.freeze([intOne, intNegate(intOne)]);

/** The Möbius transform x ↦ (1+x)/(1−x) applied to a polynomial. */
export function mobius(poly: readonly Integer[]): IntegerPolynomial {
  const normalized = normalize(poly);
  const n = normalized.length - 1;
  let out: IntegerPolynomial = Object.freeze([intZero]);
  for (let index = 0; index <= n; index += 1) {
    out = zadd(out, zscale(normalized[index]!, zmul(zpow(onePlusPolynomial(), index), zpow(oneMinusPolynomial(), n - index))));
  }
  return normalize(out);
}

/** Count a rational polynomial's right-half-plane roots (Routh–Hurwitz). */
export function rightHalfPlaneRoots(poly: RationalPolynomial): RightHalfPlaneRootJudgment {
  const degree = poly.length - 1;
  const highFirst = [...poly].reverse();
  const rows: Rational[][] = [[], []];
  for (let index = 0; 2 * index <= degree; index += 1) rows[0]!.push(highFirst[2 * index]!);
  for (let index = 0; 2 * index + 1 <= degree; index += 1) rows[1]!.push(highFirst[2 * index + 1]!);
  for (let rowIndex = 2; rowIndex <= degree; rowIndex += 1) {
    const previous = rows[rowIndex - 1]!;
    const above = rows[rowIndex - 2]!;
    if (!previous.length || ratIsZero(previous[0]!)) {
      return Object.freeze({ kind: "spectral.rightHalfPlaneRoot-obstruction" as const, reason: "routh-row-has-zero-pivot" as const });
    }
    const row: Rational[] = [];
    for (let column = 0; column + 1 < above.length; column += 1) {
      const term = ratSubtract(ratMultiply(previous[0]!, above[column + 1]!), ratMultiply(above[0]!, previous[column + 1] ?? ratZero));
      row.push(divide(term, previous[0]!));
    }
    rows.push(row.length ? row : [ratZero]);
  }
  const column = rows.map((row) => row[0] ?? ratZero);
  if (column.some(ratIsZero)) {
    return Object.freeze({ kind: "spectral.rightHalfPlaneRoot-obstruction" as const, reason: "routh-first-column-has-zero-entry" as const });
  }
  let changes = 0;
  for (let index = 1; index < column.length; index += 1) {
    if (ratSign(column[index - 1]!) !== ratSign(column[index]!)) changes += 1;
  }
  return Object.freeze({ kind: "spectral.rightHalfPlaneRoot:witness" as const, rhp: naturalFromFiniteCount(changes) });
}

/** Locate a polynomial's roots relative to the unit circle. */
export function rootLocation(poly: readonly Integer[]): RootLocationJudgment {
  const normalized = normalize(poly);
  const degree = degreeOf(poly);
  const mapped = mobius(poly);
  const mappedDegree = degreeOf(mapped);
  const dropped = degree - mappedDegree;
  const result = rightHalfPlaneRoots(mapped.map(fromInteger));
  if (result.kind === "spectral.rightHalfPlaneRoot-obstruction") {
    return Object.freeze({ kind: "spectral.rootLocation-obstruction" as const, polynomial: normalized, reason: result.reason, obstruction: result });
  }
  const expanding = result.rhp!;
  return Object.freeze({
    kind: "spectral.rootLocation:witness" as const,
    polynomial: normalized,
    expanding,
    contracting: naturalFromFiniteCount(mappedDegree - finiteCountOfNatural(expanding)),
    neutral: naturalFromFiniteCount(dropped),
  });
}

/** Whether a polynomial has Pisot-style root structure. */
export function pisotRoot(poly: readonly Integer[]): PisotRootJudgment {
  const polynomial = normalize(poly);
  const location = rootLocation(poly);
  if (location.kind === "spectral.rootLocation:witness" && natEqual(location.expanding, natOne) && natEqual(location.neutral, natZero)) {
    return Object.freeze({ kind: "spectral.pisotRoot:witness" as const, polynomial, location });
  }
  return Object.freeze({ kind: "spectral.pisotRoot-obstruction" as const, polynomial, location });
}

/** Estimate a monic polynomial's dominant root by power iteration. */
export function dominantRootConvergence(poly: readonly Integer[], iterations: Natural = naturalFromFiniteCount(12)): DominantRootConvergenceJudgment {
  const normalized = normalize(poly);
  const degree = degreeOf(normalized);
  if (degree < 1) {
    return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction" as const, polynomial: normalized, iterations, reason: "non-positive-degree" as const });
  }
  const leading = normalized[degree]!;
  if (!intEqual(leading, intOne)) {
    return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction" as const, polynomial: normalized, iterations, reason: "non-monic-polynomial" as const });
  }
  let state: Rational[] = Array.from({ length: degree }, (_, index) => index === degree - 1 ? ratOne : ratZero);
  for (let step = 0; step < finiteCountOfNatural(iterations); step += 1) {
    let next = ratZero;
    for (let index = 0; index < degree; index += 1) {
      next = ratSubtract(next, ratMultiply(fromInteger(normalized[index] ?? intZero), state[index] ?? ratZero));
    }
    state = [...state.slice(1), next];
  }
  const numerator = state[degree - 1];
  const denominator = state[degree - 2];
  if (numerator === undefined || denominator === undefined || ratIsZero(denominator)) {
    return Object.freeze({ kind: "spectral.dominantRootConvergence-obstruction" as const, polynomial: normalized, iterations, reason: "zero-denominator" as const });
  }
  return Object.freeze({ kind: "spectral.dominantRootConvergence:witness" as const, polynomial: normalized, iterations, value: divide(numerator, denominator) });
}

/** Compute a polynomial's Mahler measure. */
export function mahlerMeasure(poly: readonly Integer[], iterations: Natural = naturalFromFiniteCount(12)): MahlerMeasureJudgment {
  const normalized = normalize(poly);
  const reciprocity = selfReciprocity(normalized);
  const location = rootLocation(normalized);
  switch (reciprocity.kind) {
    case "spectral.polynomialIdentity:witness":
      switch (location.kind) {
        case "spectral.rootLocation-obstruction":
          return Object.freeze({ kind: "spectral.mahlerMeasure.unit:witness" as const, polynomial: normalized, selfReciprocity: reciprocity, location, value: ratOne });
      }
  }
  const pisot = pisotRoot(normalized);
  switch (pisot.kind) {
    case "spectral.pisotRoot-obstruction":
      return Object.freeze({ kind: "spectral.mahlerMeasure.pisot-obstruction" as const, polynomial: normalized, pisot });
  }
  const convergence = dominantRootConvergence(normalized, iterations);
  switch (convergence.kind) {
    case "spectral.dominantRootConvergence-obstruction":
      return Object.freeze({ kind: "spectral.mahlerMeasure.convergence-obstruction" as const, polynomial: normalized, pisot, convergence });
  }
  return Object.freeze({ kind: "spectral.mahlerMeasure.dominantRoot:witness" as const, polynomial: normalized, pisot, convergence, value: convergence.value });
}

/** A matrix's characteristic polynomial with the Pisot judgment on its spectrum. */
export function matrixPisot(matrix: Matrix): MatrixPisotCarrier {
  const polynomial = charPoly(matrix);
  return Object.freeze({ kind: "spectral.matrixPisot.carrier" as const, polynomial, roots: pisotRoot(polynomial) });
}
