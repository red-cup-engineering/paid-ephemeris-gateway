/**
 * analysis/laplacian — spectral geometry of the relation graph.
 *
 * The relation graph of a section (terms as vertices, weighted by how many cells
 * relate each pair) carries the combinatorial Laplacian L = D − W. From it,
 * exactly over ℤ: the deviation operator (Lf)(x) = Σ_y w(x,y)(f(x)−f(y)); the
 * harmonic judgment Lf = 0 (witness/obstruction, not a float threshold); the
 * component count as the zero-eigenvalue multiplicity (rank deficiency); the
 * characteristic polynomial; and the weighted spanning-tree count (Matrix-Tree).
 * Reflexive cells contribute nothing. Carrier-valued throughout.
 */
import { termCoincides, type PredicationTerm } from "../../../predication.mjs";
import { type SectionCarrier } from "../section.mjs";
import {
  charPoly, count, determinant, fromInteger, fromNatural, intAdd, intNegate, intOne, intZero,
  monus, rank, ratAdd, ratIsZero, ratMultiply, ratZero,
  type Integer, type Matrix, type Natural, type Rational,
} from "./exact-number.mjs";

const sameTerm = (left: PredicationTerm, right: PredicationTerm): boolean => termCoincides(left, right);

/** The relation graph of a section: distinct terms, weighted adjacency (exact). */
export interface RelationGraphCarrier {
  readonly kind: "meme-analysis.laplacian.graph";
  readonly terms: readonly PredicationTerm[];
  readonly weights: Matrix;
}

/** The relation graph of a section. */
export function relationGraph(section: SectionCarrier): RelationGraphCarrier {
  if (section.entries.length === 0) throw new TypeError("an empty section presents no relation graph");
  const terms: PredicationTerm[] = [];
  const indexOf = (term: PredicationTerm): number => {
    const found = terms.findIndex((candidate) => sameTerm(candidate, term));
    if (found !== -1) return found;
    terms.push(term);
    return terms.length - 1;
  };
  const pairs: (readonly [number, number])[] = [];
  for (const entry of section.entries) {
    const subject = indexOf(entry.cell.subject);
    const object = indexOf(entry.cell.object);
    if (subject !== object) pairs.push([subject, object]);
  }
  const weights: readonly (readonly Integer[])[] = terms.map((_term, row) => terms.map((__term, column) =>
    fromNatural(count(pairs.filter(([a, b]) => (a === row && b === column) || (a === column && b === row))))));
  return Object.freeze({
    kind: "meme-analysis.laplacian.graph" as const,
    terms: Object.freeze(terms),
    weights: Object.freeze(weights.map((row) => Object.freeze(row))),
  });
}

/** The combinatorial Laplacian L = D − W, exact integer entries. */
export function laplacianOf(graph: RelationGraphCarrier): Matrix {
  return Object.freeze(graph.weights.map((row, index) => Object.freeze(row.map((weight, column) =>
    column === index ? row.reduce((sum, value) => intAdd(sum, value), intZero) : intNegate(weight)))));
}

const requireObservable = (graph: RelationGraphCarrier, values: readonly Rational[]): void => {
  if (values.length !== graph.terms.length) throw new TypeError("an observable assigns a value to every term of the graph");
};

/** The deviation operator on a rational observable (exact, carrier-valued). */
export function deviationOf(graph: RelationGraphCarrier, values: readonly Rational[]): readonly Rational[] {
  requireObservable(graph, values);
  const laplacian = laplacianOf(graph);
  return Object.freeze(laplacian.map((row) =>
    row.reduce((sum, entry, column) => ratAdd(sum, ratMultiply(fromInteger(entry), values[column]!)), ratZero)));
}

/** An observable that is a harmonic mode (deviation vanishes everywhere). */
export interface HarmonicWitness {
  readonly kind: "meme-analysis.laplacian.harmonic:witness";
  readonly graph: RelationGraphCarrier;
  readonly values: readonly Rational[];
}

/** An observable that is not harmonic (the first nonzero deviation). */
export interface HarmonicObstruction {
  readonly kind: "meme-analysis.laplacian.harmonic-obstruction";
  readonly graph: RelationGraphCarrier;
  readonly values: readonly Rational[];
  readonly atTerm: PredicationTerm;
  readonly deviation: Rational;
}

/** The result of judging an observable for harmonicity. */
export type HarmonicJudgment = HarmonicWitness | HarmonicObstruction;

/** Whether an observable is a harmonic mode. */
export function harmonic(graph: RelationGraphCarrier, values: readonly Rational[]): HarmonicJudgment {
  const deviations = deviationOf(graph, values);
  const failing = deviations.findIndex((value) => !ratIsZero(value));
  if (failing !== -1) {
    return Object.freeze({
      kind: "meme-analysis.laplacian.harmonic-obstruction" as const,
      graph,
      values: Object.freeze([...values]),
      atTerm: graph.terms[failing]!,
      deviation: deviations[failing]!,
    });
  }
  return Object.freeze({ kind: "meme-analysis.laplacian.harmonic:witness" as const, graph, values: Object.freeze([...values]) });
}

/** The connected-component count (zero-eigenvalue multiplicity = rank deficiency). */
export function componentCount(graph: RelationGraphCarrier): Natural {
  return monus(count(graph.terms), rank(laplacianOf(graph)));
}

/** The characteristic polynomial of L (the exact spectrum). */
export function spectrumPolynomial(graph: RelationGraphCarrier): readonly Integer[] {
  return charPoly(laplacianOf(graph));
}

/** The weighted spanning-tree count (a reduced-Laplacian determinant; Matrix-Tree). */
export function treeCount(graph: RelationGraphCarrier): Integer {
  if (graph.terms.length === 1) return intOne;
  const laplacian = laplacianOf(graph);
  const reduced = laplacian.slice(1).map((row) => row.slice(1));
  return determinant(reduced);
}
