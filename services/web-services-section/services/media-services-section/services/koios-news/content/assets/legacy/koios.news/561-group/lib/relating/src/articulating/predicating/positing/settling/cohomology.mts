import { charge, chargeValue } from "../../../../articulating/carriers.mjs";
import { predicationTermCoincidenceHolds } from "../../../../articulating/carriers.mjs";
import { charPoly, count, fromNatural, intAdd, intNegate, intOne, intSubtract, intZero, magnitude, matTranspose, matmul, monus, natEqual, natIsZero, natLess, rank, type Integer, type Matrix, type Natural } from "../../../../articulating/carriers.mjs";
import type { Valuation } from "../fiber.mjs";
import { entitySet, predicateOfClaim, predicationSite, type Cell, type PredicationTerm } from "../../../../articulating/carriers.mjs";
import type { SheafCarrier } from "./sheaf.mjs";
import { claim, mark } from "../../../../articulating/carriers.mjs";

/**
 * Witness that two natural ranks coincide: carries the equal left and right
 * ranks under the rankIdentity:witness kind.
 */
export interface RankIdentityWitness {
  readonly kind: "predication.cohomology.rankIdentity:witness";
  readonly left: Natural;
  readonly right: Natural;
}

/**
 * Obstruction recording that two natural ranks differ: carries the unequal left
 * and right ranks under the rankIdentity-obstruction kind.
 */
export interface RankIdentityObstruction {
  readonly kind: "predication.cohomology.rankIdentity-obstruction";
  readonly left: Natural;
  readonly right: Natural;
}

/**
 * The result of a rank-identity check: either a RankIdentityWitness when two
 * ranks are equal or a RankIdentityObstruction when they differ.
 */
export type RankIdentityJudgment = RankIdentityWitness | RankIdentityObstruction;

/**
 * Witness that a natural rank is zero: carries the vanishing rank under the
 * rankVanishing:witness kind.
 */
export interface RankVanishingWitness {
  readonly kind: "predication.cohomology.rankVanishing:witness";
  readonly rank: Natural;
}

/**
 * Obstruction recording that a natural rank is nonzero: carries the rank under
 * the rankVanishing-obstruction kind.
 */
export interface RankVanishingObstruction {
  readonly kind: "predication.cohomology.rankVanishing-obstruction";
  readonly rank: Natural;
}

/**
 * The result of a rank-vanishing check: a RankVanishingWitness when the rank is
 * zero or a RankVanishingObstruction when it is nonzero.
 */
export type RankVanishingJudgment = RankVanishingWitness | RankVanishingObstruction;

/**
 * Comparison recording that the left rank is strictly less than the right:
 * carries both ranks under the rankComparison.below kind.
 */
export interface BelowRankComparison {
  readonly kind: "predication.cohomology.rankComparison.below";
  readonly left: Natural;
  readonly right: Natural;
}

/**
 * Comparison recording that the left and right ranks are equal: carries both
 * ranks under the rankComparison.same kind.
 */
export interface SameRankComparison {
  readonly kind: "predication.cohomology.rankComparison.same";
  readonly left: Natural;
  readonly right: Natural;
}

/**
 * Comparison recording that the left rank is strictly greater than the right:
 * carries both ranks under the rankComparison.above kind.
 */
export interface AboveRankComparison {
  readonly kind: "predication.cohomology.rankComparison.above";
  readonly left: Natural;
  readonly right: Natural;
}

/**
 * The result of comparing two natural ranks: one of BelowRankComparison,
 * SameRankComparison, or AboveRankComparison.
 */
export type RankComparison = BelowRankComparison | SameRankComparison | AboveRankComparison;

/**
 * The zeroth coboundary operator of a predication complex: holds the entity
 * terms, the cells, and the incidence matrix whose rows are cells and columns
 * are entities, with +1 on the object and -1 on the subject of each cell.
 */
export interface ZeroCoboundaryMatrixCarrier {
  readonly kind: "predication.cohomology.zeroCoboundaryMatrix";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly matrix: Matrix;
}

/**
 * The zeroth cohomology of a predication complex: its rank counts the connected
 * components of the entity graph, and cocycleBasis is the matrix of
 * per-component indicator vectors spanning the space of locally constant
 * functions.
 */
export interface ZeroCohomologyCarrier {
  readonly kind: "predication.cohomology.zeroCohomology";
  readonly rank: Natural;
  readonly cocycleBasis: Matrix;
}

/**
 * The first cohomology of a predication complex: its rank is the cycle rank
 * (cells minus entities plus components), and vanishing is the rankVanishing
 * judgment recording whether that rank is zero.
 */
export interface FirstCohomologyCarrier {
  readonly kind: "predication.cohomology.firstCohomology";
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
}

/**
 * The full cohomology of a predication complex: bundles the entity terms,
 * cells, the zeroCoboundary incidence carrier, and the zeroth and first
 * cohomology carriers.
 */
export interface CohomologyCarrier {
  readonly kind: "predication.cohomology.carrier";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly zeroCoboundary: ZeroCoboundaryMatrixCarrier;
  readonly zeroCohomology: ZeroCohomologyCarrier;
  readonly firstCohomology: FirstCohomologyCarrier;
}

/**
 * The graph Laplacian view of a predication cohomology: holds the source
 * cohomology, the incidence matrix, the entity Laplacian (transpose of
 * incidence times incidence) and its characteristic polynomial, the incidence
 * and Laplacian ranks, and rankIdentity judgments checking that the
 * zeroth-cohomology rank equals the kernel rank and the first-cohomology rank
 * equals the cokernel rank.
 */
export interface PredicationCohomologyLaplacian {
  readonly kind: "predication.cohomology.laplacian";
  readonly cohomology: CohomologyCarrier;
  readonly incidence: Matrix;
  readonly entityLaplacian: Matrix;
  readonly characteristicPolynomial: readonly Integer[];
  readonly incidenceRank: Natural;
  readonly laplacianRank: Natural;
  readonly zeroCohomologyKernelRank: RankIdentityJudgment;
  readonly firstCohomologyCokernelRank: RankIdentityJudgment;
}

/**
 * Compares two natural ranks and returns a frozen RankIdentityWitness when they
 * are equal or a RankIdentityObstruction when they differ.
 */
export function rankIdentity(left: Natural, right: Natural): RankIdentityJudgment {
  return natEqual(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankIdentity-obstruction" as const, left, right });
}

/**
 * Tests whether a natural rank is zero and returns a frozen
 * RankVanishingWitness when it vanishes or a RankVanishingObstruction
 * otherwise.
 */
export function rankVanishing(rankValue: Natural): RankVanishingJudgment {
  return natIsZero(rankValue)
    ? Object.freeze({ kind: "predication.cohomology.rankVanishing:witness" as const, rank: rankValue })
    : Object.freeze({ kind: "predication.cohomology.rankVanishing-obstruction" as const, rank: rankValue });
}

/**
 * Orders two natural ranks and returns a frozen SameRankComparison when equal,
 * a BelowRankComparison when the left is less, or an AboveRankComparison
 * otherwise.
 */
export function rankComparison(left: Natural, right: Natural): RankComparison {
  if (natEqual(left, right)) return Object.freeze({ kind: "predication.cohomology.rankComparison.same" as const, left, right });
  return natLess(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankComparison.below" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankComparison.above" as const, left, right });
}

function uniqueBy<T>(values: readonly T[], same: (left: T, right: T) => boolean): readonly T[] {
  const out: T[] = [];
  for (const value of values) if (!out.some((item) => same(item, value))) out.push(value);
  return Object.freeze(out);
}

/**
 * Computes the CohomologyCarrier of a valuation: collects the cells from its
 * fibers, derives the entity set, builds the zeroth coboundary incidence
 * matrix, and uses a union-find over entities to count components and cycle
 * rank for the zeroth and first cohomology.
 */
export function cohomologyOfValuation(valuation: Valuation): CohomologyCarrier {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const entities = entitySet(cells.flatMap((cell) => [cell.subject, cell.object]), predicationTermCoincidenceHolds).entities;
  const entityIndex = (entity: PredicationTerm): number | undefined => {
    const index = entities.findIndex((candidate) => predicationTermCoincidenceHolds(candidate, entity));
    return index < 0 ? undefined : index;
  };
  const zeroCoboundary = cells.map((cell) => {
    const row = Array.from({ length: entities.length }, () => intZero);
    const subject = entityIndex(cell.subject);
    const object = entityIndex(cell.object);
    if (object !== undefined) row[object] = intAdd(row[object] ?? intZero, intOne);
    if (subject !== undefined) row[subject] = intAdd(row[subject] ?? intZero, intNegate(intOne));
    return Object.freeze(row);
  });

  const parent = entities.map((_, index) => index);
  const find = (value: number): number => {
    if (parent[value] === value) return value;
    parent[value] = find(parent[value]!);
    return parent[value]!;
  };
  const union = (left: number, right: number): void => {
    parent[find(left)] = find(right);
  };
  for (const cell of cells) {
    const subject = entityIndex(cell.subject);
    const object = entityIndex(cell.object);
    if (subject !== undefined && object !== undefined) union(subject, object);
  }
  const roots = uniqueBy(entities.map((_, index) => find(index)), Object.is);
  
  
  const h1RankCarrier = magnitude(intAdd(intSubtract(fromNatural(count(cells)), fromNatural(count(entities))), fromNatural(count(roots))));
  const zeroCoboundaryMatrix: Matrix = Object.freeze(zeroCoboundary);
  const zeroCocycleBasis: Matrix = Object.freeze(
    roots.map((root) => Object.freeze(entities.map((_, index) => find(index) === root ? intOne : intZero))),
  );

  return Object.freeze({
    kind: "predication.cohomology.carrier" as const,
    entities: Object.freeze([...entities]),
    cells: Object.freeze(cells),
    zeroCoboundary: Object.freeze({
      kind: "predication.cohomology.zeroCoboundaryMatrix" as const,
      entities: Object.freeze([...entities]),
      cells: Object.freeze(cells),
      matrix: zeroCoboundaryMatrix,
    }),
    zeroCohomology: Object.freeze({
      kind: "predication.cohomology.zeroCohomology" as const,
      rank: count(roots),
      cocycleBasis: zeroCocycleBasis,
    }),
    firstCohomology: Object.freeze({
      kind: "predication.cohomology.firstCohomology" as const,
      rank: h1RankCarrier,
      vanishing: rankVanishing(h1RankCarrier),
    }),
  });
}

/**
 * Computes the CohomologyCarrier of a sheaf carrier by taking the cohomology of
 * its section valuation.
 */
export function cohomology(sheaf: SheafCarrier): CohomologyCarrier {
  return cohomologyOfValuation(sheaf.section);
}

/**
 * Computes the CohomologyCarrier of a list of cells by wrapping them in a
 * single-fiber valuation with potential charges and taking its cohomology.
 */
export function cohomologyOfCells(cells: readonly Cell[]): CohomologyCarrier {
  const predication = predicationSite(cells);
  const cohomologyPredicate = predicateOfClaim(claim(mark("cohomology")));
  const valuation: Valuation = Object.freeze({
    kind: "predication.fiber.valuation" as const,
    base: predication.base,
    fibers: Object.freeze([Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate: cohomologyPredicate,
      entities: predication.cells.entities,
      assignments: Object.freeze(cells.map((cell) => Object.freeze({
        kind: "predication.fiber.meme" as const,
        cell,
        charge: charge(chargeValue("potential")),
      }))),
    })]),
  });
  return cohomologyOfValuation(valuation);
}


/**
 * Builds the PredicationCohomologyLaplacian of a cohomology carrier: forms the
 * entity Laplacian from the incidence matrix, computes its characteristic
 * polynomial and the incidence and Laplacian ranks, and checks that the zeroth-
 * and first-cohomology ranks match the kernel and cokernel ranks of the
 * incidence map.
 */
export function cohomologyLaplacian(cohomologyCarrier: CohomologyCarrier): PredicationCohomologyLaplacian {
  const incidence = cohomologyCarrier.zeroCoboundary.matrix;
  const entityLaplacian: Matrix = incidence.length === 0
    ? Object.freeze([])
    : matmul(matTranspose(incidence), incidence);
  const incidenceRank = rank(incidence);
  const laplacianRank = rank(entityLaplacian);
  const entityRank = count(cohomologyCarrier.entities);
  const cellRank = count(cohomologyCarrier.cells);
  return Object.freeze({
    kind: "predication.cohomology.laplacian" as const,
    cohomology: cohomologyCarrier,
    incidence,
    entityLaplacian,
    characteristicPolynomial: charPoly(entityLaplacian),
    incidenceRank,
    laplacianRank,
    zeroCohomologyKernelRank: rankIdentity(cohomologyCarrier.zeroCohomology.rank, monus(entityRank, incidenceRank)),
    firstCohomologyCokernelRank: rankIdentity(cohomologyCarrier.firstCohomology.rank, monus(cellRank, incidenceRank)),
  });
}

/**
 * Computes the PredicationCohomologyLaplacian of a list of cells by taking the
 * cohomology of the cells and then its Laplacian.
 */
export function cohomologyLaplacianOfCells(cells: readonly Cell[]): PredicationCohomologyLaplacian {
  return cohomologyLaplacian(cohomologyOfCells(cells));
}
