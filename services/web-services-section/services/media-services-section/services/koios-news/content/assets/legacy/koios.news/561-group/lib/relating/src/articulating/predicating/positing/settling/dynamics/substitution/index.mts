import type { Lattice } from "../../closure.mjs";
import { gauge, sameChargeValue, type ChargeValue, type GaugeElementName } from "../../../../../../articulating/carriers.mjs";
import {
  charPoly as matrixCharPoly,
  count,
  determinant,
  fromNatural,
  intAdd,
  intEqual,
  intIsZero,
  intMultiply,
  intOne,
  intZero,
  intSubtract,
  isNegative,
  isPositive,
  magnitude,
  matTranspose,
  matEqual,
  matmul,
  natAdd,
  natEqual,
  natZero,
  quotient,
  rational,
  rank,
  smithNormalForm,
  successor,
  type Integer,
  type Matrix,
  type Natural,
  type Rational,
} from "../../../../../../articulating/carriers.mjs";
import type { Mark } from "../../../../../../articulating/carriers.mjs";

/**
 * A single letter of a substitution alphabet: a mark wrapped as a dynamics
 * symbol so the dynamics can compare the symbol carrier, not the mark.
 */
export interface SubstitutionSymbol {
  readonly kind: "substitution.dynamics.symbol";
  readonly mark: Mark;
}

/**
 * A finite word over the substitution alphabet: a readonly sequence of
 * substitution symbols.
 */
export type SubstitutionWord = readonly SubstitutionSymbol[];

/**
 * One production of a substitution rule: maps a single symbol to the word it
 * expands into.
 */
export interface SubstitutionRuleEntry {
  readonly kind: "substitution.dynamics.ruleEntry";
  readonly symbol: SubstitutionSymbol;
  readonly word: SubstitutionWord;
}

/**
 * A substitution morphism: the collection of rule entries mapping each symbol
 * to its image word.
 */
export interface SubstitutionRule {
  readonly kind: "substitution.dynamics.rule";
  readonly entries: readonly SubstitutionRuleEntry[];
}

/**
 * The incidence (abelianization) matrix of a substitution: a matrix whose
 * entries count letter occurrences in each rule image.
 */
export type SubstitutionIncidenceMatrix = Matrix;

/**
 * A word in the fixed-point closure: either a finite substitution word or the
 * distinguished infinite fixed-point element.
 */
export type InfiniteWord = { readonly kind: "substitution.dynamics.fixedPoint" } | SubstitutionWord;

/**
 * A substitution dynamical system: a rule together with the alphabet of symbols
 * it acts on.
 */
export interface SubstitutionCarrier {
  readonly kind: "substitution.dynamics.carrier";
  readonly rule: SubstitutionRule;
  readonly alphabet: readonly SubstitutionSymbol[];
}

/**
 * The fixed-point closure of a substitution: a lattice over infinite words
 * together with the substitution map phi acting on them.
 */
export interface SubstitutionClosureCarrier {
  readonly kind: "substitution.dynamics.closure";
  readonly lattice: Lattice<InfiniteWord>;
  readonly phi: (word: InfiniteWord) => InfiniteWord;
}

/**
 * Evidence that two matrices are equal: holds the left and right matrices that
 * were compared.
 */
export interface MatrixEquationWitness {
  readonly kind: "substitution.dynamics.matrixEquation:witness";
  readonly left: Matrix;
  readonly right: Matrix;
}

/**
 * Evidence that two matrices differ: holds the left and right matrices that
 * failed to coincide.
 */
export interface MatrixEquationObstruction {
  readonly kind: "substitution.dynamics.matrixEquation-obstruction";
  readonly left: Matrix;
  readonly right: Matrix;
}

/**
 * The result of comparing two matrices for equality: either a witness of
 * equality or an obstruction of inequality.
 */
export type MatrixEquationJudgment = MatrixEquationWitness | MatrixEquationObstruction;

/**
 * A gauge labeling: a list of charge values assigned to alphabet positions,
 * together with its rank (the number of values).
 */
export interface GaugeLabelingCarrier {
  readonly kind: "substitution.dynamics.gaugeLabeling";
  readonly values: readonly ChargeValue[];
  readonly rank: Natural;
}

/**
 * The image of a gauge labeling under a gauge element: the source labeling, the
 * applied gauge element name sigma, the gauged charge values, and the rank.
 */
export interface GaugeImageCarrier {
  readonly kind: "substitution.dynamics.gaugeImage";
  readonly labeling: GaugeLabelingCarrier;
  readonly sigma: GaugeElementName;
  readonly values: readonly ChargeValue[];
  readonly rank: Natural;
}

/**
 * A labeling value absent from a gauge image: a charge value in the original
 * labeling that no gauged value reproduces.
 */
export interface GaugePermutationMissingValue {
  readonly kind: "substitution.dynamics.gaugePermutationMissingValue";
  readonly value: ChargeValue;
  readonly image: GaugeImageCarrier;
}

/**
 * A gauge image value outside the labeling: a gauged charge value that no
 * original labeling value matches.
 */
export interface GaugePermutationEscapingValue {
  readonly kind: "substitution.dynamics.gaugePermutationEscapingValue";
  readonly value: ChargeValue;
  readonly image: GaugeImageCarrier;
}

/**
 * Evidence that a gauge element permutes a labeling: the labeling, its gauge
 * image, and the permutation matrix realizing the action.
 */
export interface GaugePermutationWitness {
  readonly kind: "substitution.dynamics.gaugePermutation:witness";
  readonly labeling: GaugeLabelingCarrier;
  readonly image: GaugeImageCarrier;
  readonly matrix: SubstitutionIncidenceMatrix;
}

/**
 * Evidence that a gauge element fails to permute a labeling: the labeling, its
 * image, the values missing and escaping, and the rank of the defect.
 */
export interface GaugePermutationObstruction {
  readonly kind: "substitution.dynamics.gaugePermutation-obstruction";
  readonly labeling: GaugeLabelingCarrier;
  readonly image: GaugeImageCarrier;
  readonly missing: readonly GaugePermutationMissingValue[];
  readonly escaping: readonly GaugePermutationEscapingValue[];
  readonly rank: Natural;
}

/**
 * The result of testing whether a gauge element permutes a labeling: either a
 * permutation witness or an obstruction.
 */
export type GaugePermutationJudgment = GaugePermutationWitness | GaugePermutationObstruction;

/**
 * Evidence that a substitution rule is self-dual under a gauge: the gauge
 * permutation witness, the commutation of incidence matrix with the
 * permutation, and the gauge involution check.
 */
export interface SubstitutionSelfDualityWitness {
  readonly kind: "substitution.dynamics.selfDuality:witness";
  readonly permutation: GaugePermutationWitness;
  readonly commutation: MatrixEquationJudgment;
  readonly gaugeInvolution: MatrixEquationJudgment;
}

/**
 * Evidence that a substitution rule is not self-dual: the gauge permutation
 * obstruction that prevented the duality check.
 */
export interface SubstitutionSelfDualityObstruction {
  readonly kind: "substitution.dynamics.selfDuality-obstruction";
  readonly permutation: GaugePermutationObstruction;
}

/**
 * The result of testing a substitution rule for gauge self-duality: either a
 * self-duality witness or an obstruction.
 */
export type SubstitutionSelfDualityJudgment = SubstitutionSelfDualityWitness | SubstitutionSelfDualityObstruction;

/**
 * The colimit invariants of a substitution matrix: the stable rank,
 * determinant, Smith normal form factors, the stable determinant, and the
 * resulting localized integer module.
 */
export interface ColimStructure {
  readonly kind: "substitution.dynamics.colim";
  readonly rank: Natural;
  readonly det: Integer;
  readonly smith: readonly Integer[];
  readonly stableDet: Integer;
  readonly module: LocalizedIntegerModule;
}

/**
 * A free integer module with certain primes inverted: its rank and the list of
 * distinct primes localized away (the prime factors of the stable determinant).
 */
export interface LocalizedIntegerModule {
  readonly kind: "substitution.dynamics.localizedIntegerModule";
  readonly rank: Natural;
  readonly invertedPrimes: readonly Integer[];
}

/**
 * Evidence that the sheaf and cosheaf colimit structures agree: holds both
 * matching colimit structures.
 */
export interface ColimitDualityWitness {
  readonly kind: "substitution.dynamics.colimDuality:witness";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
}

/**
 * Evidence that the sheaf and cosheaf colimit structures disagree: holds both
 * differing colimit structures.
 */
export interface ColimitDualityObstruction {
  readonly kind: "substitution.dynamics.colimDuality-obstruction";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
}

/**
 * The result of comparing sheaf and cosheaf colimit structures: either a
 * duality witness or an obstruction.
 */
export type ColimitDualityJudgment = ColimitDualityWitness | ColimitDualityObstruction;

/**
 * The dual of a substitution matrix: the sheaf colimit (from the transpose),
 * the cosheaf colimit (from the matrix), and the duality judgment relating
 * them.
 */
export interface SubstitutionDual {
  readonly kind: "substitution.dynamics.dual";
  readonly sheaf: ColimStructure;
  readonly cosheaf: ColimStructure;
  readonly duality: ColimitDualityJudgment;
}


/**
 * Evidence that a matrix is primitive: the matrix and the exponent at which one
 * of its powers became strictly positive.
 */
export interface PrimitiveMatrixWitness {
  readonly kind: "substitution.dynamics.primitiveMatrix:witness";
  readonly matrix: Matrix;
  readonly exponent: Natural;
}

/**
 * Why a matrix fails primitivity: either it has a negative entry or no power up
 * to the search bound is strictly positive.
 */
export type PrimitiveMatrixObstructionReason = "negative-entry" | "positive-power-not-found";

/**
 * Evidence that a matrix is not primitive: the matrix, the reason for failure,
 * and the power exponent searched through.
 */
export interface PrimitiveMatrixObstruction {
  readonly kind: "substitution.dynamics.primitiveMatrix-obstruction";
  readonly matrix: Matrix;
  readonly reason: PrimitiveMatrixObstructionReason;
  readonly searchedThrough: Natural;
}

/**
 * The result of testing a matrix for primitivity: either a primitivity witness
 * or an obstruction.
 */
export type PrimitiveMatrixJudgment = PrimitiveMatrixWitness | PrimitiveMatrixObstruction;

/**
 * The step-N invariant of a substitution matrix: its matrix rank and the
 * localized integer module from its colimit structure.
 */
export interface StepNInvariant {
  readonly kind: "substitution.dynamics.stepNInvariant";
  readonly rank: Natural;
  readonly module: LocalizedIntegerModule;
}

const fixedPointWord = (): InfiniteWord => Object.freeze({ kind: "substitution.dynamics.fixedPoint" as const });

const isInfinite = (word: InfiniteWord): word is { readonly kind: "substitution.dynamics.fixedPoint" } =>
  !Array.isArray(word);

const naturalFromInternalBound = (bound: number): Natural => {
  let value = natZero;
  for (let index = 0; index < bound; index += 1) value = successor(value);
  return value;
};

/**
 * Tests whether two substitution symbols are the same carrier. The symbol's
 * mark is opaque; equality is not read from mark data.
 */
export const sameSubstitutionSymbol = (left: SubstitutionSymbol, right: SubstitutionSymbol): boolean =>
  left === right;

const isPrefix = (left: SubstitutionWord, right: SubstitutionWord): boolean =>
  left.every((letter, index) => sameSubstitutionSymbol(letter, right[index]!));

const identityMatrix = (n: number): SubstitutionIncidenceMatrix =>
  Object.freeze(Array.from({ length: n }, (_, row) =>
    Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));

const matrixEquation = (left: Matrix, right: Matrix): MatrixEquationJudgment => matEqual(left, right)
  ? Object.freeze({
    kind: "substitution.dynamics.matrixEquation:witness" as const,
    left,
    right,
  })
  : Object.freeze({
    kind: "substitution.dynamics.matrixEquation-obstruction" as const,
    left,
    right,
  });

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

/**
 * Constructs a substitution symbol from a mark: returns a frozen dynamics
 * symbol wrapping that mark.
 */
export function substitutionSymbol(mark: Mark): SubstitutionSymbol {
  return Object.freeze({ kind: "substitution.dynamics.symbol" as const, mark });
}

/**
 * Constructs a rule entry pairing a symbol with its image word: returns a
 * frozen entry with a copied word.
 */
export function substitutionRuleEntry(symbol: SubstitutionSymbol, word: SubstitutionWord): SubstitutionRuleEntry {
  return Object.freeze({
    kind: "substitution.dynamics.ruleEntry" as const,
    symbol,
    word: Object.freeze([...word]),
  });
}

/**
 * Constructs a substitution rule from a list of entries: returns a frozen rule
 * with a copied entry list.
 */
export function substitutionRule(entries: readonly SubstitutionRuleEntry[]): SubstitutionRule {
  return Object.freeze({
    kind: "substitution.dynamics.rule" as const,
    entries: Object.freeze([...entries]),
  });
}

const ruleEntryFor = (rule: SubstitutionRule, symbol: SubstitutionSymbol): SubstitutionRuleEntry | undefined =>
  rule.entries.find((entry) => sameSubstitutionSymbol(entry.symbol, symbol));

/**
 * Constructs a substitution dynamical system from a rule and optional alphabet:
 * defaults the alphabet to the symbols on the left of the rule's entries.
 */
export function substitutionCarrier(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[] = rule.entries.map((entry) => entry.symbol)): SubstitutionCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.carrier" as const,
    rule,
    alphabet: Object.freeze([...alphabet]),
  });
}

/**
 * Applies a substitution rule once to a word: replaces each letter by its rule
 * image, leaving letters with no rule entry unchanged.
 */
export const substitute = (rule: SubstitutionRule, word: SubstitutionWord): SubstitutionWord => {
  return Object.freeze(word.flatMap((letter) => ruleEntryFor(rule, letter)?.word ?? [letter]));
};

/**
 * Applies a substitution rule n times to a word: returns the word after n
 * iterations of substitution.
 */
export function iterateSubstitution(rule: SubstitutionRule, word: SubstitutionWord, n: Natural): SubstitutionWord {
  let current: SubstitutionWord = word;
  for (const _member of n.members) current = substitute(rule, current);
  return Object.freeze([...current]);
}

/**
 * Generates the orbit of a seed word under a substitution rule: yields the
 * seed, then each successive substitution image, indefinitely.
 */
export function* substitutionOrbit(rule: SubstitutionRule, seed: SubstitutionWord): Generator<SubstitutionWord> {
  let word: SubstitutionWord = seed;
  for (;;) {
    yield Object.freeze([...word]);
    word = substitute(rule, word);
  }
}

/**
 * Builds the fixed-point closure of a substitution from a seed: a lattice over
 * infinite words ordered by the prefix relation, with the substitution map phi
 * and a supremum that converges to the fixed point.
 */
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

/**
 * Computes the incidence matrix of a substitution over an alphabet: entry
 * (target, source) counts occurrences of the target letter in the source
 * letter's rule image.
 */
export function abelianize(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[]): SubstitutionIncidenceMatrix {
  return Object.freeze(alphabet.map((targetLetter) =>
    Object.freeze(alphabet.map((sourceLetter) =>
      fromNatural(count((ruleEntryFor(rule, sourceLetter)?.word ?? []).filter((letter) => sameSubstitutionSymbol(letter, targetLetter))))))));
}

/**
 * Constructs a gauge labeling from charge values: returns a frozen labeling
 * carrier holding a copy of the values and their count as rank.
 */
export function gaugeLabeling(values: readonly ChargeValue[]): GaugeLabelingCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.gaugeLabeling" as const,
    values: Object.freeze([...values]),
    rank: count(values),
  });
}

/**
 * Applies a gauge element to a labeling: returns the image carrier whose values
 * are each labeling value gauged by sigma.
 */
export function gaugeImage(labeling: GaugeLabelingCarrier, sigma: GaugeElementName): GaugeImageCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.gaugeImage" as const,
    labeling,
    sigma,
    values: Object.freeze(labeling.values.map((value) => gauge(sigma, value))),
    rank: labeling.rank,
  });
}

/**
 * Tests whether a gauge element permutes a set of charge values: returns a
 * permutation witness with the realizing matrix when every value maps
 * bijectively, or an obstruction listing the missing and escaping values.
 */
export function inducedPermutation(values: readonly ChargeValue[], sigma: GaugeElementName): GaugePermutationJudgment {
  const labeling = gaugeLabeling(values);
  const image = gaugeImage(labeling, sigma);
  const missing = Object.freeze(labeling.values
    .filter((value) => !image.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({
      kind: "substitution.dynamics.gaugePermutationMissingValue" as const,
      value,
      image,
    })));
  const escaping = Object.freeze(image.values
    .filter((value) => !labeling.values.some((candidate) => sameChargeValue(candidate, value)))
    .map((value) => Object.freeze({
      kind: "substitution.dynamics.gaugePermutationEscapingValue" as const,
      value,
      image,
    })));
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
  return Object.freeze({
    kind: "substitution.dynamics.gaugePermutation:witness" as const,
    labeling,
    image,
    matrix,
  });
}

/**
 * Tests whether a substitution incidence matrix is self-dual under a gauge:
 * checks that the gauge induces a value permutation, that the permutation
 * matrix commutes with the incidence matrix, and that the permutation is an
 * involution.
 */
export function substitutionRuleSelfDual(
  matrix: SubstitutionIncidenceMatrix,
  labeling: readonly ChargeValue[],
  sigma: GaugeElementName,
): SubstitutionSelfDualityJudgment {
  const permutation = inducedPermutation(labeling, sigma);
  if (permutation.kind === "substitution.dynamics.gaugePermutation-obstruction") {
    return Object.freeze({
      kind: "substitution.dynamics.selfDuality-obstruction" as const,
      permutation,
    });
  }
  const identity = identityMatrix(permutation.matrix.length);
  return Object.freeze({
    kind: "substitution.dynamics.selfDuality:witness" as const,
    permutation,
    commutation: matrixEquation(matmul(matrix, permutation.matrix), matmul(permutation.matrix, matrix)),
    gaugeInvolution: matrixEquation(matmul(permutation.matrix, permutation.matrix), identity),
  });
}

/** Returns the transpose of a substitution incidence matrix. */
export function transposeSubstitutionMatrix(matrix: SubstitutionIncidenceMatrix): SubstitutionIncidenceMatrix {
  return matTranspose(matrix);
}

/**
 * Returns the characteristic polynomial of a matrix as its coefficient list.
 */
export const charPolyOver = (matrix: Matrix): readonly Integer[] => matrixCharPoly(matrix);

/**
 * Tests whether a matrix is primitive: returns a witness with the exponent of
 * the first strictly positive power, or an obstruction when an entry is
 * negative or no power within the (n-1)^2+1 bound is strictly positive.
 */
export function primitiveMatrix(matrix: Matrix): PrimitiveMatrixJudgment {
  const n = matrix.length;
  const searchedThrough = naturalFromInternalBound((n - 1) * (n - 1) + 2);
  if (matrix.some((row) => row.some(isNegative))) {
    return Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix-obstruction" as const,
      matrix,
      reason: "negative-entry" as const,
      searchedThrough: natZero,
    });
  }
  const allPositive = (candidate: Matrix): boolean => candidate.every((row) => row.every(isPositive));
  let power = matrix;
  let exponent = natZero;
  for (let index = 1; index <= (n - 1) * (n - 1) + 1; index += 1) {
    exponent = successor(exponent);
    if (allPositive(power)) {
      return Object.freeze({
        kind: "substitution.dynamics.primitiveMatrix:witness" as const,
        matrix,
        exponent,
      });
    }
    power = matmul(power, matrix);
  }
  return allPositive(power)
    ? Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix:witness" as const,
      matrix,
      exponent: searchedThrough,
    })
    : Object.freeze({
      kind: "substitution.dynamics.primitiveMatrix-obstruction" as const,
      matrix,
      reason: "positive-power-not-found" as const,
      searchedThrough,
    });
}

/**
 * Approximates the Perron eigenvalue of a matrix by power iteration from the
 * all-ones vector: returns the ratio of total component sums after the given
 * number of iterations.
 */
export function perronConvergent(matrix: Matrix, iterations = 4): Rational {
  const n = matrix.length;
  let vector: readonly Integer[] = Object.freeze(Array.from({ length: n }, () => intOne));
  const total = (items: readonly Integer[]): Integer => items.reduce((sum, item) => intAdd(sum, item), intZero);
  for (let index = 0; index < iterations; index += 1) {
    const next = matrix.map((row) =>
      row.reduce((sum, item, column) => intAdd(sum, intMultiply(item, vector[column]!)), intZero),
    );
    if (index === iterations - 1) return rational(fromNatural(magnitude(total(next))), fromNatural(magnitude(total(vector))));
    vector = Object.freeze(next);
  }
  return rational(intOne, intOne);
}


/**
 * Computes the colimit structure of a matrix: derives the stable rank from the
 * first nonzero characteristic-polynomial coefficient, the determinant, the
 * Smith normal form, the stable determinant, and the localized integer module.
 */
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

/**
 * Computes the dual of a substitution matrix: pairs the sheaf colimit of the
 * transpose with the cosheaf colimit of the matrix and judges whether their
 * rank, determinant, and Smith factors agree.
 */
export function substitutionDual(matrix: Matrix): SubstitutionDual {
  const sheaf = colimStructure(matTranspose(matrix));
  const cosheaf = colimStructure(matrix);
  const duality = natEqual(sheaf.rank, cosheaf.rank)
    && intEqual(sheaf.det, cosheaf.det)
    && sheaf.smith.length === cosheaf.smith.length
    && sheaf.smith.every((factor, index) => intEqual(factor, cosheaf.smith[index]!))
    ? Object.freeze({
      kind: "substitution.dynamics.colimDuality:witness" as const,
      sheaf,
      cosheaf,
    })
    : Object.freeze({
      kind: "substitution.dynamics.colimDuality-obstruction" as const,
      sheaf,
      cosheaf,
    });
  return Object.freeze({
    kind: "substitution.dynamics.dual" as const,
    sheaf,
    cosheaf,
    duality,
  });
}

/**
 * Constructs a localized integer module of a given rank: inverts the distinct
 * prime factors of the stable determinant, or none when that determinant is
 * one.
 */
export const localizedIntegerModule = (moduleRank: Natural, stableDet: Integer): LocalizedIntegerModule => Object.freeze({
  kind: "substitution.dynamics.localizedIntegerModule" as const,
  rank: moduleRank,
  invertedPrimes: intEqual(stableDet, intOne) ? Object.freeze([]) : primeFactors(stableDet),
});

/**
 * Computes the step-N invariant of a matrix: pairs its rank with the localized
 * integer module from its colimit structure.
 */
export const stepNInvariant = (matrix: Matrix): StepNInvariant => {
  const colimit = colimStructure(matrix);
  return Object.freeze({
    kind: "substitution.dynamics.stepNInvariant" as const,
    rank: rank(matrix),
    module: colimit.module,
  });
};
