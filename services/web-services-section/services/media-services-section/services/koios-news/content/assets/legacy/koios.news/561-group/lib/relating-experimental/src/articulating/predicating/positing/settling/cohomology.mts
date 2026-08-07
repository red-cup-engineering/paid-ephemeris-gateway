/**
 * settling/cohomology — the cohomology of a predication complex.
 *
 * Cells are 1-cells over the entity 0-cells; the zeroth coboundary is the
 * incidence matrix (+1 on object, −1 on subject). H⁰ counts connected components
 * (union-find over entities); H¹ is the cycle rank (cells − entities +
 * components). The Laplacian view (incidenceᵀ·incidence) and its rank/char-poly
 * confirm H⁰ = ker rank and H¹ = coker rank via Smith normal form. Exact
 * throughout over the integer matrix carrier.
 */
import { charge, chargeValue } from "../bilattice-charge.mjs";
import { entitySet, predicateOfClaim, predicationSite, termCoincides, type Cell, type PredicationTerm } from "../../predication.mjs";
import {
  charPoly, count, fromNatural, intAdd, intNegate, intOne, intSubtract, intZero,
  magnitude, matTranspose, matmul, monus, natEqual, natIsZero, natLess, rank,
  type Integer, type Matrix, type Natural,
} from "./analysis/exact-number.mjs";
import type { Valuation } from "../fiber.mjs";
import type { SheafCarrier } from "./sheaf.mjs";
import { claim, mark } from "../../../utterance.mjs";

/** Witness that two natural ranks coincide. */
export interface RankIdentityWitness {
  readonly kind: "predication.cohomology.rankIdentity:witness";
  readonly left: Natural;
  readonly right: Natural;
}

/** Obstruction recording that two natural ranks differ. */
export interface RankIdentityObstruction {
  readonly kind: "predication.cohomology.rankIdentity-obstruction";
  readonly left: Natural;
  readonly right: Natural;
}

/** The result of a rank-identity check. */
export type RankIdentityJudgment = RankIdentityWitness | RankIdentityObstruction;

/** Witness that a natural rank is zero. */
export interface RankVanishingWitness {
  readonly kind: "predication.cohomology.rankVanishing:witness";
  readonly rank: Natural;
}

/** Obstruction recording that a natural rank is nonzero. */
export interface RankVanishingObstruction {
  readonly kind: "predication.cohomology.rankVanishing-obstruction";
  readonly rank: Natural;
}

/** The result of a rank-vanishing check. */
export type RankVanishingJudgment = RankVanishingWitness | RankVanishingObstruction;

/** The left rank is strictly less than the right. */
export interface BelowRankComparison { readonly kind: "predication.cohomology.rankComparison.below"; readonly left: Natural; readonly right: Natural; }
/** The left and right ranks are equal. */
export interface SameRankComparison { readonly kind: "predication.cohomology.rankComparison.same"; readonly left: Natural; readonly right: Natural; }
/** The left rank is strictly greater than the right. */
export interface AboveRankComparison { readonly kind: "predication.cohomology.rankComparison.above"; readonly left: Natural; readonly right: Natural; }

/** The result of comparing two natural ranks. */
export type RankComparison = BelowRankComparison | SameRankComparison | AboveRankComparison;

/** The zeroth coboundary operator: entities, cells, and the incidence matrix. */
export interface ZeroCoboundaryMatrixCarrier {
  readonly kind: "predication.cohomology.zeroCoboundaryMatrix";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly matrix: Matrix;
}

/** The zeroth cohomology: component count and the indicator cocycle basis. */
export interface ZeroCohomologyCarrier {
  readonly kind: "predication.cohomology.zeroCohomology";
  readonly rank: Natural;
  readonly cocycleBasis: Matrix;
}

/** The first cohomology: the cycle rank and its vanishing judgment. */
export interface FirstCohomologyCarrier {
  readonly kind: "predication.cohomology.firstCohomology";
  readonly rank: Natural;
  readonly vanishing: RankVanishingJudgment;
}

/** The full cohomology of a predication complex. */
export interface CohomologyCarrier {
  readonly kind: "predication.cohomology.carrier";
  readonly entities: readonly PredicationTerm[];
  readonly cells: readonly Cell[];
  readonly zeroCoboundary: ZeroCoboundaryMatrixCarrier;
  readonly zeroCohomology: ZeroCohomologyCarrier;
  readonly firstCohomology: FirstCohomologyCarrier;
}

/** The graph-Laplacian view of a predication cohomology. */
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

/** Compare two natural ranks for identity. */
export function rankIdentity(left: Natural, right: Natural): RankIdentityJudgment {
  return natEqual(left, right)
    ? Object.freeze({ kind: "predication.cohomology.rankIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.cohomology.rankIdentity-obstruction" as const, left, right });
}

/** Whether a natural rank vanishes. */
export function rankVanishing(rankValue: Natural): RankVanishingJudgment {
  return natIsZero(rankValue)
    ? Object.freeze({ kind: "predication.cohomology.rankVanishing:witness" as const, rank: rankValue })
    : Object.freeze({ kind: "predication.cohomology.rankVanishing-obstruction" as const, rank: rankValue });
}

/** Order two natural ranks. */
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

/** The cohomology of a valuation: incidence, components (union-find), and cycle rank. */
export function cohomologyOfValuation(valuation: Valuation): CohomologyCarrier {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const entities = entitySet(cells.flatMap((cell) => [cell.subject, cell.object]), termCoincides).entities;
  const entityIndex = (entity: PredicationTerm): number | undefined => {
    const index = entities.findIndex((candidate) => termCoincides(candidate, entity));
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

/** The cohomology of a sheaf carrier (its section valuation). */
export function cohomology(sheaf: SheafCarrier): CohomologyCarrier {
  return cohomologyOfValuation(sheaf.section);
}

/** The cohomology of a list of cells (wrapped in a single potential-charged fiber). */
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

/** The Laplacian view of a cohomology carrier, with kernel/cokernel rank identities. */
export function cohomologyLaplacian(cohomologyCarrier: CohomologyCarrier): PredicationCohomologyLaplacian {
  const incidence = cohomologyCarrier.zeroCoboundary.matrix;
  const entityLaplacian: Matrix = incidence.length === 0 ? Object.freeze([]) : matmul(matTranspose(incidence), incidence);
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

/** The Laplacian of a list of cells. */
export function cohomologyLaplacianOfCells(cells: readonly Cell[]): PredicationCohomologyLaplacian {
  return cohomologyLaplacian(cohomologyOfCells(cells));
}
