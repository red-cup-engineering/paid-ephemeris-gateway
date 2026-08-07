/**
 * Evidence and information structure of charge distributions.
 *
 * The predecessor information stack (information / belief / horizon /
 * channel / rate-distortion / free-energy / boundary) measured everything
 * in float bits. The fabric content is exact and lands here:
 *
 * - a charge distribution is an exact histogram, and evidence coordinates
 *   are expectations of the bedrock charge coordinates — rational
 *   throughout;
 * - divergence finiteness is absolute continuity, a support-containment
 *   judgment whose failure is an informational horizon;
 * - the entropy order is mixedness (majorization): exactly decidable, and
 *   respected by every Schur-concave uncertainty functional at once, so
 *   one judgment settles every entropy comparison; which functional — and
 *   which logarithm base — to read at is a boundary coordinate, never
 *   fabric;
 * - dependence in a joint distribution is an exact judgment, and mutual
 *   information vanishes exactly on the independence witness;
 * - a boundary claim is screening-off: internal and external conditionally
 *   independent given the boundary, checked exactly, with no tolerance
 *   knob.
 *
 * Float figures (entropy bits, divergence bits, mutual-information bits)
 * are boundary reads, named `AtBoundary` in the spirit of `toNumber`. The
 * β-weighted objectives of the predecessors (bottleneck, expected free
 * energy, rate-distortion scalarization, equilibrium tolerance) are
 * declined: their weights are slice parameters, and a locus can combine
 * the boundary reads itself.
 */

import { chargeValues, type ChargeValue, type ChargeValueName } from "../../../../carriers.mjs";
import type { MemeTopologyInformation } from "../fixed-point-reading.mjs";
import {
  count,
  fromNatural,
  natIsZero,
  natZero,
  ratAdd,
  ratEqual,
  ratMultiply,
  ratSign,
  ratSubtract,
  rational,
  ratZero,
  successor,
  type Natural,
  type Rational,
} from "../../../../carriers.mjs";

const zero = (): Rational => ratZero;
const present = (value: ChargeValue, side: 0 | 1): boolean => value.coordinates[side].name === "present";

/**
 * One bin of a charge histogram: a charge value, the count of entries that took
 * it, and its exact probability over the distribution's total.
 */
export interface ChargeBin {
  readonly kind: "meme-analysis.evidence.bin";
  readonly value: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/**
 * An exact charge histogram: the total count and a bin per charge value in
 * canonical order, each carrying its count and rational probability.
 */
export interface ChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.distribution";
  readonly total: Natural;
  /** All four charge values in canonical order; zero counts are kept so
   *  every distribution shares the same support frame. */
  readonly bins: readonly ChargeBin[];
}

/** Exact histogram of charge values. An empty collection presents no
 *  distribution. */
export function chargeDistribution(values: readonly ChargeValue[]): ChargeDistributionCarrier {
  if (values.length === 0) throw new TypeError("an empty collection presents no distribution");
  const total = count(values);
  const bins = chargeValues.map((value) => {
    const tally = count(values.filter((candidate) => candidate.name === value.name));
    return Object.freeze({
      kind: "meme-analysis.evidence.bin" as const,
      value,
      count: tally,
      probability: rational(fromNatural(tally), fromNatural(total)),
    });
  });
  return Object.freeze({
    kind: "meme-analysis.evidence.distribution" as const,
    total,
    bins: Object.freeze(bins),
  });
}

/** The charge histogram of a fixed-point reading's information entries. */
export function informationDistribution(information: MemeTopologyInformation): ChargeDistributionCarrier {
  return chargeDistribution(information.entryCarrier.entries.map((entry) => entry.value));
}

/**
 * The expected bedrock charge coordinates of a distribution: expected
 * truth-side and falsity-side presence, their sum as expected knowledge height
 * (0 through 2), and the probability of held conflict (both sides present).
 */
export interface EvidenceCoordinatesCarrier {
  readonly kind: "meme-analysis.evidence.coordinates";
  readonly distribution: ChargeDistributionCarrier;
  /** Expected presence of the truth side. */
  readonly truth: Rational;
  /** Expected presence of the falsity side. */
  readonly falsity: Rational;
  /** truth + falsity — expected height in the knowledge order, 0 through 2. */
  readonly knowledge: Rational;
  /** Probability that both sides are present (the held contradiction). */
  readonly conflict: Rational;
}

/** Expectations of the bedrock charge coordinates, exactly. */
export function evidenceCoordinates(distribution: ChargeDistributionCarrier): EvidenceCoordinatesCarrier {
  let truth = zero();
  let falsity = zero();
  let conflict = zero();
  for (const bin of distribution.bins) {
    if (present(bin.value, 0)) truth = ratAdd(truth, bin.probability);
    if (present(bin.value, 1)) falsity = ratAdd(falsity, bin.probability);
    if (present(bin.value, 0) && present(bin.value, 1)) conflict = ratAdd(conflict, bin.probability);
  }
  return Object.freeze({
    kind: "meme-analysis.evidence.coordinates" as const,
    distribution,
    truth,
    falsity,
    knowledge: ratAdd(truth, falsity),
    conflict,
  });
}

/**
 * The exact movement of evidence coordinates from a prior to a posterior
 * distribution: both coordinate carriers and the per-coordinate differences in
 * truth, falsity, knowledge, and conflict.
 */
export interface EvidenceDeltaCarrier {
  readonly kind: "meme-analysis.evidence.coordinatesDelta";
  readonly prior: EvidenceCoordinatesCarrier;
  readonly posterior: EvidenceCoordinatesCarrier;
  readonly truthDelta: Rational;
  readonly falsityDelta: Rational;
  readonly knowledgeDelta: Rational;
  readonly conflictDelta: Rational;
}

/** Exact movement of evidence coordinates from a prior to a posterior
 *  distribution — the lawful core of a belief-update read. */
export function evidenceDelta(
  prior: ChargeDistributionCarrier,
  posterior: ChargeDistributionCarrier,
): EvidenceDeltaCarrier {
  const before = evidenceCoordinates(prior);
  const after = evidenceCoordinates(posterior);
  return Object.freeze({
    kind: "meme-analysis.evidence.coordinatesDelta" as const,
    prior: before,
    posterior: after,
    truthDelta: ratSubtract(after.truth, before.truth),
    falsityDelta: ratSubtract(after.falsity, before.falsity),
    knowledgeDelta: ratSubtract(after.knowledge, before.knowledge),
    conflictDelta: ratSubtract(after.conflict, before.conflict),
  });
}

/**
 * Evidence that `from` is supported within `to`: every charge value `from`
 * stands on is also assigned positive mass by `to`, so the divergence of `from`
 * relative to `to` is finite.
 */
export interface AbsoluteContinuityWitness {
  readonly kind: "meme-analysis.evidence.absoluteContinuity:witness";
  readonly from: ChargeDistributionCarrier;
  readonly to: ChargeDistributionCarrier;
}

/**
 * A failure of support containment: the escaping charge values are those `from`
 * stands on that `to` assigns zero, an informational horizon where the
 * divergence diverges.
 */
export interface AbsoluteContinuityObstruction {
  readonly kind: "meme-analysis.evidence.absoluteContinuity-obstruction";
  readonly from: ChargeDistributionCarrier;
  readonly to: ChargeDistributionCarrier;
  /** Charge values `from` stands on that `to` assigns zero. */
  readonly escaping: readonly ChargeValueName[];
}

/**
 * The result of an absolute-continuity check: either a witness of support
 * containment or an obstruction naming the escaping charge values.
 */
export type AbsoluteContinuityJudgment = AbsoluteContinuityWitness | AbsoluteContinuityObstruction;

/** Support containment of `from` within `to`. The divergence of `from`
 *  relative to `to` is finite exactly when the witness exists; an
 *  obstruction is an informational horizon — `to` assigns zero where
 *  `from` stands. */
export function absoluteContinuity(
  from: ChargeDistributionCarrier,
  to: ChargeDistributionCarrier,
): AbsoluteContinuityJudgment {
  const escaping = from.bins
    .filter((bin, index) => !natIsZero(bin.count) && natIsZero(to.bins[index]!.count))
    .map((bin) => bin.value.name);
  if (escaping.length > 0) {
    return Object.freeze({
      kind: "meme-analysis.evidence.absoluteContinuity-obstruction" as const,
      from,
      to,
      escaping: Object.freeze(escaping),
    });
  }
  return Object.freeze({ kind: "meme-analysis.evidence.absoluteContinuity:witness" as const, from, to });
}

/**
 * The ordering outcome of a mixedness comparison: the left distribution is more
 * mixed, the right is more mixed, or the two are equally mixed.
 */
export type MixednessRelation = "leftMoreMixed" | "rightMoreMixed" | "equallyMixed";

/**
 * A decided mixedness comparison: the two distributions and the relation
 * placing them in the majorization order.
 */
export interface MixednessComparison {
  readonly kind: "meme-analysis.evidence.mixedness";
  readonly left: ChargeDistributionCarrier;
  readonly right: ChargeDistributionCarrier;
  readonly relation: MixednessRelation;
}

/**
 * A mixedness comparison with no order: each distribution's descending prefix
 * concentration strictly exceeds the other's at some prefix length, so
 * different Schur-concave functionals rank them oppositely.
 */
export interface MixednessIncomparability {
  readonly kind: "meme-analysis.evidence.mixedness-incomparable";
  readonly left: ChargeDistributionCarrier;
  readonly right: ChargeDistributionCarrier;
  /** Prefix length at which left's concentration strictly exceeds right's. */
  readonly leftExceedsAtPrefix: number;
  /** Prefix length at which right's concentration strictly exceeds left's. */
  readonly rightExceedsAtPrefix: number;
}

/**
 * The result of a mixedness check: either a decided comparison in the
 * majorization order or an incomparability witnessed by prefixes that exceed in
 * both directions.
 */
export type MixednessJudgment = MixednessComparison | MixednessIncomparability;

const descendingPrefixSums = (distribution: ChargeDistributionCarrier): readonly Rational[] => {
  const sorted = distribution.bins
    .map((bin) => bin.probability)
    .sort((left, right) => ratSign(ratSubtract(right, left)));
  const sums: Rational[] = [];
  let running = zero();
  for (const probability of sorted) {
    running = ratAdd(running, probability);
    sums.push(running);
  }
  return sums;
};

/** The mixedness (majorization) order, exactly. "More mixed" means
 *  majorized-by: every Schur-concave uncertainty functional — Shannon
 *  entropy in any base among them — weakly increases with mixedness, so
 *  this one judgment settles every entropy comparison at once. Genuine
 *  incomparability is information the float entropy figure destroys: two
 *  incomparable distributions are ranked oppositely by different
 *  uncertainty functionals. */
export function mixedness(
  left: ChargeDistributionCarrier,
  right: ChargeDistributionCarrier,
): MixednessJudgment {
  const leftSums = descendingPrefixSums(left);
  const rightSums = descendingPrefixSums(right);
  let leftExceedsAt = 0;
  let rightExceedsAt = 0;
  for (let prefix = 0; prefix < leftSums.length; prefix += 1) {
    const sign = ratSign(ratSubtract(leftSums[prefix]!, rightSums[prefix]!));
    if (sign > 0 && leftExceedsAt === 0) leftExceedsAt = prefix + 1;
    if (sign < 0 && rightExceedsAt === 0) rightExceedsAt = prefix + 1;
  }
  if (leftExceedsAt > 0 && rightExceedsAt > 0) {
    return Object.freeze({
      kind: "meme-analysis.evidence.mixedness-incomparable" as const,
      left,
      right,
      leftExceedsAtPrefix: leftExceedsAt,
      rightExceedsAtPrefix: rightExceedsAt,
    });
  }
  const relation: MixednessRelation =
    leftExceedsAt > 0 ? "rightMoreMixed" : rightExceedsAt > 0 ? "leftMoreMixed" : "equallyMixed";
  return Object.freeze({ kind: "meme-analysis.evidence.mixedness" as const, left, right, relation });
}

/**
 * One cell of a joint charge histogram: a (source, reproduction) charge pair,
 * the count of observed pairs that took it, and its exact probability.
 */
export interface JointChargeCell {
  readonly kind: "meme-analysis.evidence.jointCell";
  readonly source: ChargeValue;
  readonly reproduction: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/**
 * An exact joint histogram of (source, reproduction) charge pairs: the total,
 * all sixteen cells in canonical order, and the source and reproduction
 * marginal distributions.
 */
export interface JointChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.joint";
  readonly total: Natural;
  /** All sixteen source × reproduction cells in canonical order. */
  readonly cells: readonly JointChargeCell[];
  readonly sourceMarginal: ChargeDistributionCarrier;
  readonly reproductionMarginal: ChargeDistributionCarrier;
}

/** Exact joint histogram of (source, reproduction) charge pairs — the
 *  observed-channel core. */
export function chargeJoint(
  pairs: readonly (readonly [source: ChargeValue, reproduction: ChargeValue])[],
): JointChargeDistributionCarrier {
  if (pairs.length === 0) throw new TypeError("an empty collection presents no joint distribution");
  const support = chargeValues;
  const total = count(pairs);
  const cells = support.flatMap((source) => support.map((reproduction) => {
    const tally = count(pairs.filter(([left, right]) =>
      left.name === source.name && right.name === reproduction.name));
    return Object.freeze({
      kind: "meme-analysis.evidence.jointCell" as const,
      source,
      reproduction,
      count: tally,
      probability: rational(fromNatural(tally), fromNatural(total)),
    });
  }));
  return Object.freeze({
    kind: "meme-analysis.evidence.joint" as const,
    total,
    cells: Object.freeze(cells),
    sourceMarginal: chargeDistribution(pairs.map(([source]) => source)),
    reproductionMarginal: chargeDistribution(pairs.map(([, reproduction]) => reproduction)),
  });
}

/**
 * Evidence that a joint factorizes: every cell's probability equals the product
 * of its source and reproduction marginals, so the mutual information vanishes.
 */
export interface IndependenceWitness {
  readonly kind: "meme-analysis.evidence.independence:witness";
  readonly joint: JointChargeDistributionCarrier;
}

/**
 * A failure of factorization at one (source, reproduction) cell: the cell's
 * joint probability differs from the product of its marginals, witnessing
 * dependence.
 */
export interface IndependenceObstruction {
  readonly kind: "meme-analysis.evidence.independence-obstruction";
  readonly joint: JointChargeDistributionCarrier;
  readonly source: ChargeValue;
  readonly reproduction: ChargeValue;
  readonly jointProbability: Rational;
  readonly productProbability: Rational;
}

/**
 * The result of an independence check: either a witness that the joint
 * factorizes or an obstruction naming the cell where joint and product
 * probability disagree.
 */
export type IndependenceJudgment = IndependenceWitness | IndependenceObstruction;

/** Exact factorization check of a joint against its marginals. Mutual
 *  information vanishes exactly on the witness; how much dependence an
 *  obstruction amounts to in bits is a boundary read. */
export function independence(joint: JointChargeDistributionCarrier): IndependenceJudgment {
  const support = chargeValues;
  for (const cell of joint.cells) {
    const sourceIndex = support.findIndex((value) => value.name === cell.source.name);
    const reproductionIndex = support.findIndex((value) => value.name === cell.reproduction.name);
    const product = ratMultiply(
      joint.sourceMarginal.bins[sourceIndex]!.probability,
      joint.reproductionMarginal.bins[reproductionIndex]!.probability,
    );
    if (!ratEqual(cell.probability, product)) {
      return Object.freeze({
        kind: "meme-analysis.evidence.independence-obstruction" as const,
        joint,
        source: cell.source,
        reproduction: cell.reproduction,
        jointProbability: cell.probability,
        productProbability: product,
      });
    }
  }
  return Object.freeze({ kind: "meme-analysis.evidence.independence:witness" as const, joint });
}

/** Per-side disagreement of two charge coordinates, in {0, 1/2, 1} — the
 *  structural distortion the predecessor rate-distortion surface buried
 *  under a β-weighted float objective. */
export function coordinateDistortion(left: ChargeValue, right: ChargeValue): Rational {
  let disagreements = natZero;
  if (present(left, 0) !== present(right, 0)) disagreements = successor(disagreements);
  if (present(left, 1) !== present(right, 1)) disagreements = successor(disagreements);
  
  return rational(fromNatural(disagreements), fromNatural(count(left.coordinates)));
}

/** Expected coordinate distortion of a joint, exactly. */
export function expectedDistortion(joint: JointChargeDistributionCarrier): Rational {
  let expected = zero();
  for (const cell of joint.cells) {
    if (natIsZero(cell.count)) continue;
    expected = ratAdd(expected, ratMultiply(cell.probability, coordinateDistortion(cell.source, cell.reproduction)));
  }
  return expected;
}

/**
 * One cell of a triple charge histogram: an (internal, boundary, external)
 * charge triple, the count of observed triples that took it, and its exact
 * probability.
 */
export interface TripleChargeCell {
  readonly kind: "meme-analysis.evidence.tripleCell";
  readonly internal: ChargeValue;
  readonly boundary: ChargeValue;
  readonly external: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/**
 * An exact joint histogram of (internal, boundary, external) charge triples:
 * the total and all sixty-four cells in canonical order.
 */
export interface TripleChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.triple";
  readonly total: Natural;
  /** All sixty-four internal × boundary × external cells. */
  readonly cells: readonly TripleChargeCell[];
}

/** Exact joint histogram of (internal, boundary, external) charge triples. */
export function chargeTriple(
  triples: readonly (readonly [internal: ChargeValue, boundary: ChargeValue, external: ChargeValue])[],
): TripleChargeDistributionCarrier {
  if (triples.length === 0) throw new TypeError("an empty collection presents no triple distribution");
  const support = chargeValues;
  const total = count(triples);
  const cells = support.flatMap((internal) => support.flatMap((boundary) => support.map((external) => {
    const tally = count(triples.filter(([i, b, e]) =>
      i.name === internal.name && b.name === boundary.name && e.name === external.name));
    return Object.freeze({
      kind: "meme-analysis.evidence.tripleCell" as const,
      internal,
      boundary,
      external,
      count: tally,
      probability: rational(fromNatural(tally), fromNatural(total)),
    });
  })));
  return Object.freeze({
    kind: "meme-analysis.evidence.triple" as const,
    total,
    cells: Object.freeze(cells),
  });
}

/**
 * Evidence that the boundary screens off internal from external: internal and
 * external are conditionally independent given the boundary at every cell of
 * the triple.
 */
export interface ScreeningOffWitness {
  readonly kind: "meme-analysis.evidence.screeningOff:witness";
  readonly triple: TripleChargeDistributionCarrier;
}

/**
 * A failure of screening-off at one (internal, boundary, external) cell: the
 * through-boundary product p(i,b,e)*p(b) differs from the around-boundary
 * product p(i,b)*p(b,e), a leak of information around the boundary.
 */
export interface ScreeningOffObstruction {
  readonly kind: "meme-analysis.evidence.screeningOff-obstruction";
  readonly triple: TripleChargeDistributionCarrier;
  readonly internal: ChargeValue;
  readonly boundary: ChargeValue;
  readonly external: ChargeValue;
  /** p(i,b,e) · p(b) and p(i,b) · p(b,e) — unequal exactly here. */
  readonly throughBoundary: Rational;
  readonly aroundBoundary: Rational;
}

/**
 * The result of a screening-off check: either a witness that the boundary
 * conditionally separates internal from external or an obstruction naming the
 * cell where information passes around it.
 */
export type ScreeningOffJudgment = ScreeningOffWitness | ScreeningOffObstruction;

/** The lawful core of a boundary claim: internal and external are
 *  conditionally independent given the boundary — p(i,b,e)·p(b) =
 *  p(i,b)·p(b,e) at every cell, exactly, with no tolerance knob. An
 *  obstruction exhibits a cell where information passes around the
 *  boundary. */
export function screeningOff(triple: TripleChargeDistributionCarrier): ScreeningOffJudgment {
  const marginal = (predicate: (cell: TripleChargeCell) => boolean): Rational =>
    triple.cells.filter(predicate).reduce((sum, cell) => ratAdd(sum, cell.probability), zero());
  
  for (const cell of triple.cells) {
    const boundaryMass = marginal((candidate) => candidate.boundary.name === cell.boundary.name);
    const internalBoundary = marginal((candidate) =>
      candidate.internal.name === cell.internal.name && candidate.boundary.name === cell.boundary.name);
    const boundaryExternal = marginal((candidate) =>
      candidate.boundary.name === cell.boundary.name && candidate.external.name === cell.external.name);
    const throughBoundary = ratMultiply(cell.probability, boundaryMass);
    const aroundBoundary = ratMultiply(internalBoundary, boundaryExternal);
    if (!ratEqual(throughBoundary, aroundBoundary)) {
      return Object.freeze({
        kind: "meme-analysis.evidence.screeningOff-obstruction" as const,
        triple,
        internal: cell.internal,
        boundary: cell.boundary,
        external: cell.external,
        throughBoundary,
        aroundBoundary,
      });
    }
  }
  return Object.freeze({ kind: "meme-analysis.evidence.screeningOff:witness" as const, triple });
}
