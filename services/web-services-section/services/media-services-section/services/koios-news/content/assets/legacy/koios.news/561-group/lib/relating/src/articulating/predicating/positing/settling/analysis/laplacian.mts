/**
 * Spectral geometry of the relation graph.
 *
 * The relation graph of a section — terms as vertices, weighted by how many
 * cells relate each pair — carries a combinatorial Laplacian, and everything
 * spectral that is exactly computable ships here:
 *
 * - the deviation operator: (Lf)(x) = Σ_y w(x,y)·(f(x) − f(y)) — how an
 *   observable at a term deviates from its relational neighborhood;
 * - harmonic judgment: Lf = 0 exactly — the harmonic modes of the topology's
 *   spectral geometry as a witness/obstruction, not a float threshold;
 * - the component count as a spectral fact: the multiplicity of the zero
 *   eigenvalue is the rank deficiency of L, computed exactly over ℤ;
 * - the characteristic polynomial, exact integer coefficients;
 * - the weighted spanning-tree count (a reduced-Laplacian determinant).
 *
 * Reflexive cells (a term related to itself) contribute nothing to deviation
 * and are ignored by the Laplacian. Everything is carrier-valued: weights are
 * exact Integers, observables and deviations exact Rationals — no JS number
 * crosses this surface. The rational observable is read directly; there is no
 * "clear denominators" boundary anymore.
 */

import {
  predicationTermIdentity,
  type PredicationTerm,
} from "../../../../carriers.mjs";
import {
  type SectionCarrier,
} from "../index.mjs";
import {
  charPoly,
  count,
  determinant,
  fromInteger,
  fromNatural,
  intAdd,
  intNegate,
  intOne,
  intZero,
  monus,
  rank,
  ratAdd,
  ratIsZero,
  ratMultiply,
  ratZero,
  type Integer,
  type Matrix,
  type Natural,
  type Rational,
} from "../../../../carriers.mjs";

const sameTerm = (left: PredicationTerm, right: PredicationTerm): boolean =>
  predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";

/**
 * The relation graph of a section: the distinct terms as vertices, and a
 * weighted adjacency matrix where weights[i][j] is the number of cells relating
 * terms i and j (i ≠ j) as an exact Integer. Reflexive cells are not edges.
 */
export interface RelationGraphCarrier {
  readonly kind: "meme-analysis.laplacian.graph";
  readonly terms: readonly PredicationTerm[];
  /** weights[i][j] = exact Integer count of cells relating terms i and j (i ≠ j);
   *  reflexive cells are not edges. */
  readonly weights: Matrix;
}

/** The relation graph of a section: distinct terms, weighted adjacency. */
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

/** The combinatorial Laplacian L = D − W, exact Integer entries: the diagonal
 *  holds each term's weighted degree, off-diagonals the negated weights. */
export function laplacianOf(graph: RelationGraphCarrier): Matrix {
  return Object.freeze(graph.weights.map((row, index) => Object.freeze(row.map((weight, column) =>
    column === index
      ? row.reduce((sum, value) => intAdd(sum, value), intZero)
      : intNegate(weight)))));
}

const requireObservable = (graph: RelationGraphCarrier, values: readonly Rational[]): void => {
  if (values.length !== graph.terms.length) {
    throw new TypeError("an observable assigns a value to every term of the graph");
  }
};

/** The deviation operator applied to a rational observable: how each term's
 *  value deviates from its relational neighborhood. Exact and carrier-valued —
 *  L (Integer) times f (Rational), summed in Rational. */
export function deviationOf(graph: RelationGraphCarrier, values: readonly Rational[]): readonly Rational[] {
  requireObservable(graph, values);
  const laplacian = laplacianOf(graph);
  return Object.freeze(laplacian.map((row) =>
    row.reduce((sum, entry, column) => ratAdd(sum, ratMultiply(fromInteger(entry), values[column]!)), ratZero)));
}

/**
 * The witness that an observable is a harmonic mode of a graph: its deviation
 * vanishes at every term. Carries the graph and the observable's values.
 */
export interface HarmonicWitness {
  readonly kind: "meme-analysis.laplacian.harmonic:witness";
  readonly graph: RelationGraphCarrier;
  readonly values: readonly Rational[];
}

/**
 * The obstruction to an observable being harmonic: the first term whose
 * deviation is nonzero, recorded as atTerm together with that deviation,
 * alongside the graph and the observable's values.
 */
export interface HarmonicObstruction {
  readonly kind: "meme-analysis.laplacian.harmonic-obstruction";
  readonly graph: RelationGraphCarrier;
  readonly values: readonly Rational[];
  /** The first term whose deviation is nonzero, with that deviation. */
  readonly atTerm: PredicationTerm;
  readonly deviation: Rational;
}

/**
 * The result of judging an observable for harmonicity: either a HarmonicWitness
 * when deviation vanishes everywhere, or a HarmonicObstruction naming the first
 * term where it does not.
 */
export type HarmonicJudgment = HarmonicWitness | HarmonicObstruction;

/** Harmonic judgment: the observable is a harmonic mode exactly when its
 *  deviation vanishes at every term. */
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
  return Object.freeze({
    kind: "meme-analysis.laplacian.harmonic:witness" as const,
    graph,
    values: Object.freeze([...values]),
  });
}

/** The number of connected components — the multiplicity of the zero eigenvalue
 *  of L, as a Natural: the rank deficiency count(terms) − rank(L). */
export function componentCount(graph: RelationGraphCarrier): Natural {
  return monus(count(graph.terms), rank(laplacianOf(graph)));
}

/** The characteristic polynomial of L, lowest degree first, exact integer
 *  coefficients — the entire exact content of the spectrum. Its numeric
 *  roots are the eigenvalues; reading them is a boundary question. */
export function spectrumPolynomial(graph: RelationGraphCarrier): readonly Integer[] {
  return charPoly(laplacianOf(graph));
}

/** The weighted spanning-tree count: the determinant of the Laplacian with
 *  one term struck (Matrix-Tree). Zero exactly when the graph is
 *  disconnected. A graph on one term has the empty tree: one. */
export function treeCount(graph: RelationGraphCarrier): Integer {
  if (graph.terms.length === 1) return intOne;
  const laplacian = laplacianOf(graph);
  const reduced = laplacian.slice(1).map((row) => row.slice(1));
  return determinant(reduced);
}
