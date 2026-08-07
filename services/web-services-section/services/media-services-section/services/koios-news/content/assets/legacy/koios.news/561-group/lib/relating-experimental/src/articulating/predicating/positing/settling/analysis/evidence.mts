/**
 * analysis/evidence — exact information reads of charge distributions.
 *
 * Charge histograms (exact rational probabilities over Belnap's FOUR), the
 * expected evidence coordinates (truth/falsity presence, knowledge height,
 * conflict), the prior→posterior coordinate delta, absolute continuity (finite
 * divergence ⇔ support containment), the majorization (mixedness) order — which
 * settles every Schur-concave entropy comparison at once and exposes genuine
 * incomparability — joint distributions with mutual-information factorization,
 * coordinate distortion, and screening-off (conditional independence given a
 * boundary). Exact throughout; how much an obstruction is in bits is a boundary read.
 */
import { chargeValues, type ChargeValue, type ChargeValueName } from "../../bilattice-charge.mjs";
import type { MemeTopologyInformation } from "../fixed-point-reading.mjs";
import {
  count, fromNatural, natIsZero, natZero, ratAdd, ratEqual, ratMultiply, ratSign, ratSubtract, rational, ratZero, successor,
  type Natural, type Rational,
} from "./exact-number.mjs";

const zero = (): Rational => ratZero;
const present = (value: ChargeValue, side: 0 | 1): boolean => value.coordinates[side].name === "present";

/** One bin of a charge histogram. */
export interface ChargeBin {
  readonly kind: "meme-analysis.evidence.bin";
  readonly value: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/** An exact charge histogram (a bin per charge value, zero counts kept). */
export interface ChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.distribution";
  readonly total: Natural;
  readonly bins: readonly ChargeBin[];
}

/** Exact histogram of charge values. */
export function chargeDistribution(values: readonly ChargeValue[]): ChargeDistributionCarrier {
  if (values.length === 0) throw new TypeError("an empty collection presents no distribution");
  const total = count(values);
  const bins = chargeValues.map((value) => {
    const tally = count(values.filter((candidate) => candidate.name === value.name));
    return Object.freeze({ kind: "meme-analysis.evidence.bin" as const, value, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
  });
  return Object.freeze({ kind: "meme-analysis.evidence.distribution" as const, total, bins: Object.freeze(bins) });
}

/** The charge histogram of a fixed-point reading's information entries. */
export function informationDistribution(information: MemeTopologyInformation): ChargeDistributionCarrier {
  return chargeDistribution(information.entryCarrier.entries.map((entry) => entry.value));
}

/** The expected bedrock charge coordinates of a distribution. */
export interface EvidenceCoordinatesCarrier {
  readonly kind: "meme-analysis.evidence.coordinates";
  readonly distribution: ChargeDistributionCarrier;
  readonly truth: Rational;
  readonly falsity: Rational;
  readonly knowledge: Rational;
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
  return Object.freeze({ kind: "meme-analysis.evidence.coordinates" as const, distribution, truth, falsity, knowledge: ratAdd(truth, falsity), conflict });
}

/** The exact movement of evidence coordinates from a prior to a posterior. */
export interface EvidenceDeltaCarrier {
  readonly kind: "meme-analysis.evidence.coordinatesDelta";
  readonly prior: EvidenceCoordinatesCarrier;
  readonly posterior: EvidenceCoordinatesCarrier;
  readonly truthDelta: Rational;
  readonly falsityDelta: Rational;
  readonly knowledgeDelta: Rational;
  readonly conflictDelta: Rational;
}

/** Exact movement of evidence coordinates from prior to posterior. */
export function evidenceDelta(prior: ChargeDistributionCarrier, posterior: ChargeDistributionCarrier): EvidenceDeltaCarrier {
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

/** Support containment of `from` within `to`. */
export interface AbsoluteContinuityWitness {
  readonly kind: "meme-analysis.evidence.absoluteContinuity:witness";
  readonly from: ChargeDistributionCarrier;
  readonly to: ChargeDistributionCarrier;
}

/** A failure of support containment (the escaping charge values). */
export interface AbsoluteContinuityObstruction {
  readonly kind: "meme-analysis.evidence.absoluteContinuity-obstruction";
  readonly from: ChargeDistributionCarrier;
  readonly to: ChargeDistributionCarrier;
  readonly escaping: readonly ChargeValueName[];
}

/** The result of an absolute-continuity check. */
export type AbsoluteContinuityJudgment = AbsoluteContinuityWitness | AbsoluteContinuityObstruction;

/** Support containment of `from` within `to` (finite divergence ⇔ witness). */
export function absoluteContinuity(from: ChargeDistributionCarrier, to: ChargeDistributionCarrier): AbsoluteContinuityJudgment {
  const escaping = from.bins
    .filter((bin, index) => !natIsZero(bin.count) && natIsZero(to.bins[index]!.count))
    .map((bin) => bin.value.name);
  if (escaping.length > 0) {
    return Object.freeze({ kind: "meme-analysis.evidence.absoluteContinuity-obstruction" as const, from, to, escaping: Object.freeze(escaping) });
  }
  return Object.freeze({ kind: "meme-analysis.evidence.absoluteContinuity:witness" as const, from, to });
}

/** The ordering outcome of a mixedness comparison. */
export type MixednessRelation = "leftMoreMixed" | "rightMoreMixed" | "equallyMixed";

/** A decided mixedness comparison (majorization order). */
export interface MixednessComparison {
  readonly kind: "meme-analysis.evidence.mixedness";
  readonly left: ChargeDistributionCarrier;
  readonly right: ChargeDistributionCarrier;
  readonly relation: MixednessRelation;
}

/** A mixedness comparison with no order (incomparable prefixes). */
export interface MixednessIncomparability {
  readonly kind: "meme-analysis.evidence.mixedness-incomparable";
  readonly left: ChargeDistributionCarrier;
  readonly right: ChargeDistributionCarrier;
  readonly leftExceedsAtPrefix: number;
  readonly rightExceedsAtPrefix: number;
}

/** The result of a mixedness check. */
export type MixednessJudgment = MixednessComparison | MixednessIncomparability;

const descendingPrefixSums = (distribution: ChargeDistributionCarrier): readonly Rational[] => {
  const sorted = distribution.bins.map((bin) => bin.probability).sort((left, right) => ratSign(ratSubtract(right, left)));
  const sums: Rational[] = [];
  let running = zero();
  for (const probability of sorted) {
    running = ratAdd(running, probability);
    sums.push(running);
  }
  return sums;
};

/** The mixedness (majorization) order, exactly. */
export function mixedness(left: ChargeDistributionCarrier, right: ChargeDistributionCarrier): MixednessJudgment {
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
    return Object.freeze({ kind: "meme-analysis.evidence.mixedness-incomparable" as const, left, right, leftExceedsAtPrefix: leftExceedsAt, rightExceedsAtPrefix: rightExceedsAt });
  }
  const relation: MixednessRelation = leftExceedsAt > 0 ? "rightMoreMixed" : rightExceedsAt > 0 ? "leftMoreMixed" : "equallyMixed";
  return Object.freeze({ kind: "meme-analysis.evidence.mixedness" as const, left, right, relation });
}

/** One cell of a joint charge histogram. */
export interface JointChargeCell {
  readonly kind: "meme-analysis.evidence.jointCell";
  readonly source: ChargeValue;
  readonly reproduction: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/** An exact joint histogram of (source, reproduction) charge pairs. */
export interface JointChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.joint";
  readonly total: Natural;
  readonly cells: readonly JointChargeCell[];
  readonly sourceMarginal: ChargeDistributionCarrier;
  readonly reproductionMarginal: ChargeDistributionCarrier;
}

/** Exact joint histogram of (source, reproduction) charge pairs. */
export function chargeJoint(pairs: readonly (readonly [source: ChargeValue, reproduction: ChargeValue])[]): JointChargeDistributionCarrier {
  if (pairs.length === 0) throw new TypeError("an empty collection presents no joint distribution");
  const support = chargeValues;
  const total = count(pairs);
  const cells = support.flatMap((source) => support.map((reproduction) => {
    const tally = count(pairs.filter(([left, right]) => left.name === source.name && right.name === reproduction.name));
    return Object.freeze({ kind: "meme-analysis.evidence.jointCell" as const, source, reproduction, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
  }));
  return Object.freeze({
    kind: "meme-analysis.evidence.joint" as const,
    total,
    cells: Object.freeze(cells),
    sourceMarginal: chargeDistribution(pairs.map(([source]) => source)),
    reproductionMarginal: chargeDistribution(pairs.map(([, reproduction]) => reproduction)),
  });
}

/** A joint that factorizes (mutual information vanishes). */
export interface IndependenceWitness {
  readonly kind: "meme-analysis.evidence.independence:witness";
  readonly joint: JointChargeDistributionCarrier;
}

/** A failure of factorization at one cell (dependence). */
export interface IndependenceObstruction {
  readonly kind: "meme-analysis.evidence.independence-obstruction";
  readonly joint: JointChargeDistributionCarrier;
  readonly source: ChargeValue;
  readonly reproduction: ChargeValue;
  readonly jointProbability: Rational;
  readonly productProbability: Rational;
}

/** The result of an independence check. */
export type IndependenceJudgment = IndependenceWitness | IndependenceObstruction;

/** Exact factorization check of a joint against its marginals. */
export function independence(joint: JointChargeDistributionCarrier): IndependenceJudgment {
  const support = chargeValues;
  for (const cell of joint.cells) {
    const sourceIndex = support.findIndex((value) => value.name === cell.source.name);
    const reproductionIndex = support.findIndex((value) => value.name === cell.reproduction.name);
    const product = ratMultiply(joint.sourceMarginal.bins[sourceIndex]!.probability, joint.reproductionMarginal.bins[reproductionIndex]!.probability);
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

/** Per-side disagreement of two charge coordinates, in {0, 1/2, 1}. */
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

/** One cell of a triple charge histogram. */
export interface TripleChargeCell {
  readonly kind: "meme-analysis.evidence.tripleCell";
  readonly internal: ChargeValue;
  readonly boundary: ChargeValue;
  readonly external: ChargeValue;
  readonly count: Natural;
  readonly probability: Rational;
}

/** An exact joint histogram of (internal, boundary, external) charge triples. */
export interface TripleChargeDistributionCarrier {
  readonly kind: "meme-analysis.evidence.triple";
  readonly total: Natural;
  readonly cells: readonly TripleChargeCell[];
}

/** Exact joint histogram of (internal, boundary, external) charge triples. */
export function chargeTriple(triples: readonly (readonly [internal: ChargeValue, boundary: ChargeValue, external: ChargeValue])[]): TripleChargeDistributionCarrier {
  if (triples.length === 0) throw new TypeError("an empty collection presents no triple distribution");
  const support = chargeValues;
  const total = count(triples);
  const cells = support.flatMap((internal) => support.flatMap((boundary) => support.map((external) => {
    const tally = count(triples.filter(([i, b, e]) => i.name === internal.name && b.name === boundary.name && e.name === external.name));
    return Object.freeze({ kind: "meme-analysis.evidence.tripleCell" as const, internal, boundary, external, count: tally, probability: rational(fromNatural(tally), fromNatural(total)) });
  })));
  return Object.freeze({ kind: "meme-analysis.evidence.triple" as const, total, cells: Object.freeze(cells) });
}

/** The boundary screens off internal from external (conditional independence). */
export interface ScreeningOffWitness {
  readonly kind: "meme-analysis.evidence.screeningOff:witness";
  readonly triple: TripleChargeDistributionCarrier;
}

/** A failure of screening-off at one cell. */
export interface ScreeningOffObstruction {
  readonly kind: "meme-analysis.evidence.screeningOff-obstruction";
  readonly triple: TripleChargeDistributionCarrier;
  readonly internal: ChargeValue;
  readonly boundary: ChargeValue;
  readonly external: ChargeValue;
  readonly throughBoundary: Rational;
  readonly aroundBoundary: Rational;
}

/** The result of a screening-off check. */
export type ScreeningOffJudgment = ScreeningOffWitness | ScreeningOffObstruction;

/** Conditional independence of internal and external given the boundary, exactly. */
export function screeningOff(triple: TripleChargeDistributionCarrier): ScreeningOffJudgment {
  const marginal = (predicate: (cell: TripleChargeCell) => boolean): Rational =>
    triple.cells.filter(predicate).reduce((sum, cell) => ratAdd(sum, cell.probability), zero());
  for (const cell of triple.cells) {
    const boundaryMass = marginal((candidate) => candidate.boundary.name === cell.boundary.name);
    const internalBoundary = marginal((candidate) => candidate.internal.name === cell.internal.name && candidate.boundary.name === cell.boundary.name);
    const boundaryExternal = marginal((candidate) => candidate.boundary.name === cell.boundary.name && candidate.external.name === cell.external.name);
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
