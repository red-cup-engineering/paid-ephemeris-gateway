/**
 * Float boundary reads for exact evidence carriers.
 *
 * Analysis/evidence owns exact histograms and witness/obstruction judgments.
 * This codec boundary reads selected exact rationals as JavaScript numbers for
 * entropy, divergence, and mutual-information bit figures.
 */
import { natIsZero } from "../articulating/carriers.mjs";
import {
  absoluteContinuity,
  independence,
  type ChargeDistributionCarrier,
  type JointChargeDistributionCarrier,
} from "../articulating/predicating/positing/settling/analysis/evidence.mjs";
import { chargeValues } from "../articulating/carriers.mjs";
import { toNumber } from "./exact-number.mjs";

const log2 = (value: number): number => Math.log(value) / Math.log(2);

/** Shannon entropy in bits: a float boundary read of an exact distribution. */
export function entropyBitsAtBoundary(distribution: ChargeDistributionCarrier): number {
  return distribution.bins.reduce((sum, bin) => {
    if (natIsZero(bin.count)) return sum;
    const probability = toNumber(bin.probability);
    return sum - probability * log2(probability);
  }, 0);
}

/** Divergence of `from` relative to `to` in bits: a float boundary read.
 * Infinite exactly when `absoluteContinuity(from, to)` obstructs. */
export function klBitsAtBoundary(
  from: ChargeDistributionCarrier,
  to: ChargeDistributionCarrier,
): number {
  if (absoluteContinuity(from, to).kind === "meme-analysis.evidence.absoluteContinuity-obstruction") {
    return Number.POSITIVE_INFINITY;
  }
  return from.bins.reduce((sum, bin, index) => {
    if (natIsZero(bin.count)) return sum;
    const p = toNumber(bin.probability);
    const q = toNumber(to.bins[index]!.probability);
    return sum + p * log2(p / q);
  }, 0);
}

/** Mutual information in bits: a float boundary read. Zero exactly when
 * `independence(joint)` witnesses. */
export function mutualInformationBitsAtBoundary(joint: JointChargeDistributionCarrier): number {
  if (independence(joint).kind === "meme-analysis.evidence.independence:witness") return 0;
  const support = chargeValues;
  return joint.cells.reduce((sum, cell) => {
    if (natIsZero(cell.count)) return sum;
    const sourceIndex = support.findIndex((value) => value.name === cell.source.name);
    const reproductionIndex = support.findIndex((value) => value.name === cell.reproduction.name);
    const pxy = toNumber(cell.probability);
    const px = joint.sourceMarginal.bins[sourceIndex]!.probability;
    const py = joint.reproductionMarginal.bins[reproductionIndex]!.probability;
    return sum + pxy * log2(pxy / (toNumber(px) * toNumber(py)));
  }, 0);
}
