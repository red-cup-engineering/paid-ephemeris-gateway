/**
 * settling/dynamics/substitution — substitution dynamical systems.
 *
 * A substitution rule maps each symbol to a word; its incidence (abelianization)
 * matrix carries the Perron/primitivity structure, and its fixed-point closure is
 * the aperiodic word it generates. Gauge labelings test self-duality (the gauge
 * permutes the alphabet and commutes with the incidence matrix); the colimit
 * structure (Smith normal form, stable determinant, localized integer module) is
 * the dynamical invariant, with sheaf/cosheaf duality. Exact throughout.
 */
import type { Lattice } from "../../closure.mjs";
import { gauge, sameChargeValue, type ChargeValue, type GaugeElementName } from "../../../bilattice-charge.mjs";
import {
  charPoly as matrixCharPoly, count, determinant, fromNatural, intAdd, intEqual, intIsZero, intMultiply,
  intOne, intZero, intSubtract, isNegative, isPositive, magnitude, matTranspose, matEqual, matmul,
  natAdd, natEqual, natZero, quotient, rational, rank, smithNormalForm, successor,
  type Integer, type Matrix, type Natural, type Rational,
} from "../../analysis/exact-number.mjs";
import type { Mark } from "../../../../../utterance.mjs";

/** A single letter: a Mark wrapped as a dynamics symbol (compared by carrier). */
export interface SubstitutionSymbol { readonly kind: "substitution.dynamics.symbol"; readonly mark: Mark; }
/** A finite word over the alphabet. */
export type SubstitutionWord = readonly SubstitutionSymbol[];
/** One production: a symbol → its image word. */
export interface SubstitutionRuleEntry { readonly kind: "substitution.dynamics.ruleEntry"; readonly symbol: SubstitutionSymbol; readonly word: SubstitutionWord; }
/** A substitution morphism: the rule entries. */
export interface SubstitutionRule { readonly kind: "substitution.dynamics.rule"; readonly entries: readonly SubstitutionRuleEntry[]; }
/** The incidence (abelianization) matrix of a substitution. */
export type SubstitutionIncidenceMatrix = Matrix;
/** A word in the fixed-point closure: finite, or the distinguished fixed point. */
export type InfiniteWord = { readonly kind: "substitution.dynamics.fixedPoint" } | SubstitutionWord;
/** A substitution dynamical system: a rule and its alphabet. */
export interface SubstitutionCarrier { readonly kind: "substitution.dynamics.carrier"; readonly rule: SubstitutionRule; readonly alphabet: readonly SubstitutionSymbol[]; }
/** The fixed-point closure: a lattice over infinite words and the map φ. */
export interface SubstitutionClosureCarrier { readonly kind: "substitution.dynamics.closure"; readonly lattice: Lattice<InfiniteWord>; readonly phi: (word: InfiniteWord) => InfiniteWord; }

/** Two matrices are equal. */
export interface MatrixEquationWitness { readonly kind: "substitution.dynamics.matrixEquation:witness"; readonly left: Matrix; readonly right: Matrix; }
/** Two matrices differ. */
export interface MatrixEquationObstruction { readonly kind: "substitution.dynamics.matrixEquation-obstruction"; readonly left: Matrix; readonly right: Matrix; }
/** The result of comparing two matrices. */
export type MatrixEquationJudgment = MatrixEquationWitness | MatrixEquationObstruction;

/** A gauge labeling: charge values over alphabet positions, with rank. */
export interface GaugeLabelingCarrier { readonly kind: "substitution.dynamics.gaugeLabeling"; readonly values: readonly ChargeValue[]; readonly rank: Natural; }
/** The image of a gauge labeling under a gauge element. */
export interface GaugeImageCarrier { readonly kind: "substitution.dynamics.gaugeImage"; readonly labeling: GaugeLabelingCarrier; readonly sigma: GaugeElementName; readonly values: readonly ChargeValue[]; readonly rank: Natural; }
/** A labeling value absent from a gauge image. */
export interface GaugePermutationMissingValue { readonly kind: "substitution.dynamics.gaugePermutationMissingValue"; readonly value: ChargeValue; readonly image: GaugeImageCarrier; }
/** A gauge image value outside the labeling. */
export interface GaugePermutationEscapingValue { readonly kind: "substitution.dynamics.gaugePermutationEscapingValue"; readonly value: ChargeValue; readonly image: GaugeImageCarrier; }
/** A gauge element permutes a labeling. */
export interface GaugePermutationWitness { readonly kind: "substitution.dynamics.gaugePermutation:witness"; readonly labeling: GaugeLabelingCarrier; readonly image: GaugeImageCarrier; readonly matrix: SubstitutionIncidenceMatrix; }
/** A gauge element fails to permute a labeling. */
export interface GaugePermutationObstruction {
  readonly kind: "substitution.dynamics.gaugePermutation-obstruction";
  readonly labeling: GaugeLabelingCarrier;
  readonly image: GaugeImageCarrier;
  readonly missing: readonly GaugePermutationMissingValue[];
  readonly escaping: readonly GaugePermutationEscapingValue[];
  readonly rank: Natural;
}
/** The result of testing a gauge permutation. */
export type GaugePermutationJudgment = GaugePermutationWitness | GaugePermutationObstruction;

/** A self-dual substitution rule under a gauge. */
export interface SubstitutionSelfDualityWitness {
  readonly kind: "substitution.dynamics.selfDuality:witness";
  readonly permutation: GaugePermutationWitness;
  readonly commutation: MatrixEquationJudgment;
  readonly gaugeInvolution: MatrixEquationJudgment;
}
/** A non-self-dual substitution rule. */
export interface SubstitutionSelfDualityObstruction { readonly kind: "substitution.dynamics.selfDuality-obstruction"; readonly permutation: GaugePermutationObstruction; }
/** The result of a substitution self-duality test. */
export type SubstitutionSelfDualityJudgment = SubstitutionSelfDualityWitness | SubstitutionSelfDualityObstruction;

/** The colimit invariants of a substitution matrix. */
export interface ColimStructure {
  readonly kind: "substitution.dynamics.colim";
  readonly rank: Natural;
  readonly det: Integer;
  readonly smith: readonly Integer[];
  readonly stableDet: Integer;
  readonly module: LocalizedIntegerModule;
}
/** A free integer module with certain primes inverted. */
export interface LocalizedIntegerModule { readonly kind: "substitution.dynamics.localizedIntegerModule"; readonly rank: Natural; readonly invertedPrimes: readonly Integer[]; }
/** Sheaf and cosheaf colimit structures agree. */
export interface ColimitDualityWitness { readonly kind: "substitution.dynamics.colimDuality:witness"; readonly sheaf: ColimStructure; readonly cosheaf: ColimStructure; }
/** Sheaf and cosheaf colimit structures disagree. */
export interface ColimitDualityObstruction { readonly kind: "substitution.dynamics.colimDuality-obstruction"; readonly sheaf: ColimStructure; readonly cosheaf: ColimStructure; }
/** The result of comparing sheaf and cosheaf colimits. */
export type ColimitDualityJudgment = ColimitDualityWitness | ColimitDualityObstruction;
/** The dual of a substitution matrix. */
export interface SubstitutionDual { readonly kind: "substitution.dynamics.dual"; readonly sheaf: ColimStructure; readonly cosheaf: ColimStructure; readonly duality: ColimitDualityJudgment; }

/** A primitive matrix (a power is strictly positive). */
export interface PrimitiveMatrixWitness { readonly kind: "substitution.dynamics.primitiveMatrix:witness"; readonly matrix: Matrix; readonly exponent: Natural; }
/** Why a matrix fails primitivity. */
export type PrimitiveMatrixObstructionReason = "negative-entry" | "positive-power-not-found";
/** A non-primitive matrix. */
export interface PrimitiveMatrixObstruction { readonly kind: "substitution.dynamics.primitiveMatrix-obstruction"; readonly matrix: Matrix; readonly reason: PrimitiveMatrixObstructionReason; readonly searchedThrough: Natural; }
/** The result of testing primitivity. */
export type PrimitiveMatrixJudgment = PrimitiveMatrixWitness | PrimitiveMatrixObstruction;
/** The step-N invariant of a substitution matrix. */
export interface StepNInvariant { readonly kind: "substitution.dynamics.stepNInvariant"; readonly rank: Natural; readonly module: LocalizedIntegerModule; }

const fixedPointWord = (): InfiniteWord => Object.freeze({ kind: "substitution.dynamics.fixedPoint" as const });
const isInfinite = (word: InfiniteWord): word is { readonly kind: "substitution.dynamics.fixedPoint" } => !Array.isArray(word);

const naturalFromInternalBound = (bound: number): Natural => {
  let value = natZero;
  for (let index = 0; index < bound; index += 1) value = successor(value);
  return value;
};

/** Whether two substitution symbols are the same carrier (the mark is opaque). */
export const sameSubstitutionSymbol = (left: SubstitutionSymbol, right: SubstitutionSymbol): boolean => left === right;

const isPrefix = (left: SubstitutionWord, right: SubstitutionWord): boolean =>
  left.every((letter, index) => sameSubstitutionSymbol(letter, right[index]!));

const identityMatrix = (n: number): SubstitutionIncidenceMatrix =>
  Object.freeze(Array.from({ length: n }, (_, row) => Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));

const matrixEquation = (left: Matrix, right: Matrix): MatrixEquationJudgment => matEqual(left, right)
  ? Object.freeze({ kind: "substitution.dynamics.matrixEquation:witness" as const, left, right })
  : Object.freeze({ kind: "substitution.dynamics.matrixEquation-obstruction" as const, left, right });

const primeFactors = (value: Integer): readonly Integer[] => {
  const factors: Integer[] = [];
  let remaining = value;
  let prime = intAdd(intOne, intOne);
  while (!isNegative(intSubtract(remaining, intMultiply(prime, prime)))) {
    while (!intIsZero(remaining) && intIsZero(intSubtract(remaining, intMultiply(quotient(remaining, prime), prime)))) {
      if (!factors.some((item) => intEqual(item, prime))) factors.push(prime);
      remaining = quotient(remaining, prime);
    }
    prime = intAdd(prime, intOne);
  }
  if (!intEqual(remaining, intOne)) factors.push(remaining);
  return Object.freeze(factors);
};

/** A substitution symbol wrapping a mark. */
export function substitutionSymbol(mark: Mark): SubstitutionSymbol {
  return Object.freeze({ kind: "substitution.dynamics.symbol" as const, mark });
}

/** A rule entry pairing a symbol with its image word. */
export function substitutionRuleEntry(symbol: SubstitutionSymbol, word: SubstitutionWord): SubstitutionRuleEntry {
  return Object.freeze({ kind: "substitution.dynamics.ruleEntry" as const, symbol, word: Object.freeze([...word]) });
}

/** A substitution rule from entries. */
export function substitutionRule(entries: readonly SubstitutionRuleEntry[]): SubstitutionRule {
  return Object.freeze({ kind: "substitution.dynamics.rule" as const, entries: Object.freeze([...entries]) });
}

const ruleEntryFor = (rule: SubstitutionRule, symbol: SubstitutionSymbol): SubstitutionRuleEntry | undefined =>
  rule.entries.find((entry) => sameSubstitutionSymbol(entry.symbol, symbol));

/** A substitution carrier from a rule and (default) alphabet. */
export function substitutionCarrier(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[] = rule.entries.map((entry) => entry.symbol)): SubstitutionCarrier {
  return Object.freeze({ kind: "substitution.dynamics.carrier" as const, rule, alphabet: Object.freeze([...alphabet]) });
}

/** Apply a substitution once to a word. */
export const substitute = (rule: SubstitutionRule, word: SubstitutionWord): SubstitutionWord =>
  Object.freeze(word.flatMap((letter) => ruleEntryFor(rule, letter)?.word ?? [letter]));

/** Apply a substitution n times. */
export function iterateSubstitution(rule: SubstitutionRule, word: SubstitutionWord, n: Natural): SubstitutionWord {
  let current: SubstitutionWord = word;
  for (const _member of n.members) current = substitute(rule, current);
  return Object.freeze([...current]);
}

/** The orbit of a seed under a substitution. */
export function* substitutionOrbit(rule: SubstitutionRule, seed: SubstitutionWord): Generator<SubstitutionWord> {
  let word: SubstitutionWord = seed;
  for (;;) {
    yield Object.freeze([...word]);
    word = substitute(rule, word);
  }
}

/** The fixed-point closure of a substitution from a seed (prefix-ordered lattice). */
export function fixedPointClosure(rule: SubstitutionRule, seed: SubstitutionWord): SubstitutionClosureCarrier {
  const eq = (left: InfiniteWord, right: InfiniteWord): boolean =>
    isInfinite(left) ? isInfinite(right) : !isInfinite(right) && left.length === right.length && isPrefix(left, right);
  const lattice: Lattice<InfiniteWord> = Object.freeze({
    bottom: Object.freeze([...seed]),
    eq,
    leq: (left: InfiniteWord, right: InfiniteWord) =>
      isInfinite(right) || (!isInfinite(left) && !isInfinite(right) && left.length <= right.length && isPrefix(left, right)),
    join: (left: InfiniteWord, right: InfiniteWord) => {
      if (isInfinite(left) || isInfinite(right)) return fixedPointWord();
      return left.length >= right.length ? left : right;
    },
    sup: (sequence: (n: Natural) => InfiniteWord) => {
      let previous = sequence(natZero);
      let stage = natZero;
      for (let index = 1; index <= 32; index += 1) {
        stage = successor(stage);
        const current = sequence(stage);
        if (eq(current, previous)) return current;
        if (!isInfinite(current) && !isInfinite(previous) && current.length > previous.length) return fixedPointWord();
        previous = current;
      }
      return fixedPointWord();
    },
  });
  return Object.freeze({
    kind: "substitution.dynamics.closure" as const,
    lattice,
    phi: (word: InfiniteWord) => isInfinite(word) ? fixedPointWord() : substitute(rule, word),
  });
}

/** The incidence matrix of a substitution over an alphabet. */
export function abelianize(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[]): SubstitutionIncidenceMatrix {
  return Object.freeze(alphabet.map((targetLetter) =>
    Object.freeze(alphabet.map((sourceLetter) =>
      fromNatural(count((ruleEntryFor(rule, sourceLetter)?.word ?? []).filter((letter) => sameSubstitutionSymbol(letter, targetLetter))))))));
}

/** A gauge labeling from charge values. */
export function gaugeLabeling(values: readonly ChargeValue[]): GaugeLabelingCarrier {
  return Object.freeze({ kind: "substitution.dynamics.gaugeLabeling" as const, values: Object.freeze([...values]), rank: count(values) });
}

/** Apply a gauge element to a labeling. */
export function gaugeImage(labeling: GaugeLabelingCarrier, sigma: GaugeElementName): GaugeImageCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.gaugeImage" as const,
    labeling,
    sigma,
    values: Object.freeze(labeling.values.map((value) => gauge(sigma, value))),
    rank: labeling.rank,
  });
}

/** Whether a gauge element permutes a set of charge values. */
export function inducedPermutation(values: readonly ChargeValue[], sigma: GaugeElementName): GaugePermutationJudgment {
  const labeling = gaugeLabeling(values);
  const image = gaugeImage(labeling, sigma);
  const missing = Object.freeze(labeling.values
    .filter((value) => !image.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({ kind: "substitution.dynamics.gaugePermutationMissingValue" as const, value, image })));
  const escaping = Object.freeze(image.values
    .filter((value) => !labeling.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({ kind: "substitution.dynamics.gaugePermutationEscapingValue" as const, value, image })));
  if (missing.length > 0 || escaping.length > 0) {
    return Object.freeze({
      kind: "substitution.dynamics.gaugePermutation-obstruction" as const,
      labeling,
      image,
      missing,
      escaping,
      rank: natAdd(count(missing), count(escaping)),
    });
  }
  const permutation = identityMatrix(labeling.values.length).map((row) => [...row]);
  for (const row of permutation) row.fill(intZero);
  for (let index = 0; index < labeling.values.length; index += 1) {
    const target = gauge(sigma, labeling.values[index]!);
    const targetIndex = labeling.values.findIndex((value) => sameChargeValue(value, target));
    permutation[targetIndex]![index] = intOne;
  }
  const matrix = Object.freeze(permutation.map((row) => Object.freeze(row)));
  return Object.freeze({ kind: "substitution.dynamics.gaugePermutation:witness" as const, labeling, image, matrix });
}

/** Whether a substitution incidence matrix is self-dual under a gauge. */
export function substitutionRuleSelfDual(matrix: SubstitutionIncidenceMatrix, labeling: readonly ChargeValue[], sigma: GaugeElementName): SubstitutionSelfDualityJudgment {
  const permutation = inducedPermutation(labeling, sigma);
  if (permutation.kind === "substitution.dynamics.gaugePermutation-obstruction") {
    return Object.freeze({ kind: "substitution.dynamics.selfDuality-obstruction" as const, permutation });
  }
  const identity = identityMatrix(permutation.matrix.length);
  return Object.freeze({
    kind: "substitution.dynamics.selfDuality:witness" as const,
    permutation,
    commutation: matrixEquation(matmul(matrix, permutation.matrix), matmul(permutation.matrix, matrix)),
    gaugeInvolution: matrixEquation(matmul(permutation.matrix, permutation.matrix), identity),
  });
}

/** The transpose of a substitution incidence matrix. */
export function transposeSubstitutionMatrix(matrix: SubstitutionIncidenceMatrix): SubstitutionIncidenceMatrix {
  return matTranspose(matrix);
}

/** The characteristic polynomial of a matrix. */
export const charPolyOver = (matrix: Matrix): readonly Integer[] => matrixCharPoly(matrix);

/** Whether a matrix is primitive (a power is strictly positive). */
export function primitiveMatrix(matrix: Matrix): PrimitiveMatrixJudgment {
  const n = matrix.length;
  const searchedThrough = naturalFromInternalBound((n - 1) * (n - 1) + 2);
  if (matrix.some((row) => row.some(isNegative))) {
    return Object.freeze({ kind: "substitution.dynamics.primitiveMatrix-obstruction" as const, matrix, reason: "negative-entry" as const, searchedThrough: natZero });
  }
  const allPositive = (candidate: Matrix): boolean => candidate.every((row) => row.every(isPositive));
  let power = matrix;
  let exponent = natZero;
  for (let index = 1; index <= (n - 1) * (n - 1) + 1; index += 1) {
    exponent = successor(exponent);
    if (allPositive(power)) return Object.freeze({ kind: "substitution.dynamics.primitiveMatrix:witness" as const, matrix, exponent });
    power = matmul(power, matrix);
  }
  return allPositive(power)
    ? Object.freeze({ kind: "substitution.dynamics.primitiveMatrix:witness" as const, matrix, exponent: searchedThrough })
    : Object.freeze({ kind: "substitution.dynamics.primitiveMatrix-obstruction" as const, matrix, reason: "positive-power-not-found" as const, searchedThrough });
}

/** Approximate the Perron eigenvalue by power iteration from the all-ones vector. */
export function perronConvergent(matrix: Matrix, iterations = 4): Rational {
  const n = matrix.length;
  let vector: readonly Integer[] = Object.freeze(Array.from({ length: n }, () => intOne));
  const total = (items: readonly Integer[]): Integer => items.reduce((sum, item) => intAdd(sum, item), intZero);
  for (let index = 0; index < iterations; index += 1) {
    const next = matrix.map((row) => row.reduce((sum, item, column) => intAdd(sum, intMultiply(item, vector[column]!)), intZero));
    if (index === iterations - 1) return rational(fromNatural(magnitude(total(next))), fromNatural(magnitude(total(vector))));
    vector = Object.freeze(next);
  }
  return rational(intOne, intOne);
}

/** The colimit structure of a matrix (Smith normal form, stable det, localized module). */
export function colimStructure(matrix: Matrix): ColimStructure {
  const polynomial = matrixCharPoly(matrix);
  const firstNonzero = polynomial.findIndex((coefficient) => !intIsZero(coefficient));
  const firstIndex = firstNonzero < 0 ? polynomial.length - 1 : firstNonzero;
  const moduleRank = count(matrix.slice(firstIndex));
  const stableDet = fromNatural(magnitude(polynomial[firstIndex]!));
  const module = localizedIntegerModule(moduleRank, stableDet);
  return Object.freeze({
    kind: "substitution.dynamics.colim" as const,
    rank: moduleRank,
    det: determinant(matrix),
    smith: smithNormalForm(matrix),
    stableDet,
    module,
  });
}

/** The dual of a substitution matrix (sheaf of the transpose, cosheaf of the matrix). */
export function substitutionDual(matrix: Matrix): SubstitutionDual {
  const sheaf = colimStructure(matTranspose(matrix));
  const cosheaf = colimStructure(matrix);
  const duality = natEqual(sheaf.rank, cosheaf.rank)
    && intEqual(sheaf.det, cosheaf.det)
    && sheaf.smith.length === cosheaf.smith.length
    && sheaf.smith.every((factor, index) => intEqual(factor, cosheaf.smith[index]!))
    ? Object.freeze({ kind: "substitution.dynamics.colimDuality:witness" as const, sheaf, cosheaf })
    : Object.freeze({ kind: "substitution.dynamics.colimDuality-obstruction" as const, sheaf, cosheaf });
  return Object.freeze({ kind: "substitution.dynamics.dual" as const, sheaf, cosheaf, duality });
}

/** A localized integer module: invert the distinct prime factors of the stable determinant. */
export const localizedIntegerModule = (moduleRank: Natural, stableDet: Integer): LocalizedIntegerModule => Object.freeze({
  kind: "substitution.dynamics.localizedIntegerModule" as const,
  rank: moduleRank,
  invertedPrimes: intEqual(stableDet, intOne) ? Object.freeze([]) : primeFactors(stableDet),
});

/** The step-N invariant of a matrix (its rank and localized module). */
export const stepNInvariant = (matrix: Matrix): StepNInvariant => {
  const colimit = colimStructure(matrix);
  return Object.freeze({ kind: "substitution.dynamics.stepNInvariant" as const, rank: rank(matrix), module: colimit.module });
};
