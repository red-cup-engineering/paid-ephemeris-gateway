/**
 * One-dimensional cut-and-project schemes over ℤ².
 *
 * A scheme is a slope: an irrational quadratic α. A lattice site (m, n)
 * projects two ways — physically to m + nα (the cut) and internally to its
 * Galois conjugate m + nᾱ. A window in internal space decides which sites
 * are realized in the cut. The window is the computational form of the
 * potentiality dimension: it admits or obstructs realization, and
 * acceptance is a judgment, not a filter hidden in a loop.
 *
 * The accepted physical coordinates form a model set; its gap structure is
 * the aperiodic order the scheme produces. Which slope corresponds to which
 * empirical structure is a correspondence question asked at a locus, never
 * an input to the scheme.
 */

import { fromInteger, intAdd, type Integer } from "../../../carriers.mjs";
import { fromInt } from "../../../../codecs/index.mjs";
import {
  quadraticAddRational,
  quadraticCompare,
  quadraticConjugate,
  quadraticEqual,
  quadraticIsRational,
  quadraticLeq,
  quadraticLess,
  quadraticScale,
  quadraticSubtract,
  sameRadicand,
  type QuadraticRational,
} from "./quadratic.mjs";

/**
 * A one-dimensional cut-and-project scheme: an irrational quadratic slope from
 * which physical and internal projections of lattice sites are derived.
 */
export interface CutProjectScheme {
  readonly kind: "meme-geometry.cutProject.scheme";
  readonly slope: QuadraticRational;
}

/**
 * Constructs a cut-and-project scheme from a slope: throws if the slope is
 * rational, since a rational cut is periodic rather than aperiodic.
 */
export const cutProjectScheme = (slope: QuadraticRational): CutProjectScheme => {
  if (quadraticIsRational(slope)) {
    throw new TypeError("cutProjectScheme: slope must be irrational — a rational cut is periodic");
  }
  return Object.freeze({ kind: "meme-geometry.cutProject.scheme" as const, slope });
};

/**
 * A site of the integer lattice ℤ²: integer coordinates (unit, slopeCount)
 * standing for m + nα where m is unit and n is slopeCount.
 */
export interface LatticeSite {
  readonly kind: "meme-geometry.cutProject.latticeSite";
  readonly unit: Integer;
  readonly slopeCount: Integer;
}

/**
 * Constructs a lattice site from integer coordinates unit and slopeCount,
 * converting each to an Integer.
 */
export const latticeSite = (unit: number, slopeCount: number): LatticeSite => Object.freeze({
  kind: "meme-geometry.cutProject.latticeSite" as const,
  unit: fromInt(unit),
  slopeCount: fromInt(slopeCount),
});

/**
 * Translates a lattice site by adding the integer offsets unit and slopeCount
 * to its respective coordinates, returning a new site.
 */
export const translateSite = (site: LatticeSite, unit: number, slopeCount: number): LatticeSite => Object.freeze({
  kind: "meme-geometry.cutProject.latticeSite" as const,
  unit: intAdd(site.unit, fromInt(unit)),
  slopeCount: intAdd(site.slopeCount, fromInt(slopeCount)),
});

/** The cut: (m, n) ↦ m + nα. */
export const physicalProjection = (scheme: CutProjectScheme, site: LatticeSite): QuadraticRational =>
  quadraticAddRational(quadraticScale(scheme.slope, fromInteger(site.slopeCount)), fromInteger(site.unit));

/** Internal space: (m, n) ↦ m + nᾱ, the conjugate of the cut. Conjugation
 *  fixes ℚ, so this is exactly the conjugate of the physical projection. */
export const internalProjection = (scheme: CutProjectScheme, site: LatticeSite): QuadraticRational =>
  quadraticConjugate(physicalProjection(scheme, site));

/** Half-open interval [lower, upper) in internal space. */
export interface AcceptanceWindow {
  readonly kind: "meme-geometry.cutProject.window";
  readonly lower: QuadraticRational;
  readonly upper: QuadraticRational;
}

/**
 * Constructs a half-open acceptance window [lower, upper): throws if the bounds
 * live in different quadratic fields or if lower is not strictly below upper.
 */
export const acceptanceWindow = (lower: QuadraticRational, upper: QuadraticRational): AcceptanceWindow => {
  if (!sameRadicand(lower, upper)) throw new TypeError("acceptanceWindow: bounds live in one field");
  if (!quadraticLess(lower, upper)) throw new TypeError("acceptanceWindow: lower must be strictly below upper");
  return Object.freeze({ kind: "meme-geometry.cutProject.window" as const, lower, upper });
};

/**
 * The positive outcome of a window acceptance judgment: records the accepted
 * site together with its physical and internal projections.
 */
export interface WindowAcceptanceWitness {
  readonly kind: "meme-geometry.cutProject.acceptance:witness";
  readonly site: LatticeSite;
  readonly physical: QuadraticRational;
  readonly internal: QuadraticRational;
}

/**
 * The negative outcome of a window acceptance judgment: records the rejected
 * site, its internal projection, and the window that excluded it.
 */
export interface WindowAcceptanceObstruction {
  readonly kind: "meme-geometry.cutProject.acceptance-obstruction";
  readonly site: LatticeSite;
  readonly internal: QuadraticRational;
  readonly window: AcceptanceWindow;
}

/**
 * The result of testing a site against a window: either a
 * WindowAcceptanceWitness when the internal projection lies in the window or a
 * WindowAcceptanceObstruction when it does not.
 */
export type WindowAcceptanceJudgment = WindowAcceptanceWitness | WindowAcceptanceObstruction;

/**
 * Judges whether a site is accepted by a window: returns a witness when the
 * site's internal projection falls in [lower, upper), otherwise an obstruction;
 * throws if scheme and window live in different fields.
 */
export function windowAcceptance(
  scheme: CutProjectScheme,
  site: LatticeSite,
  window: AcceptanceWindow,
): WindowAcceptanceJudgment {
  if (!sameRadicand(scheme.slope, window.lower)) throw new TypeError("windowAcceptance: scheme and window fields differ");
  const internal = internalProjection(scheme, site);
  return quadraticLeq(window.lower, internal) && quadraticLess(internal, window.upper)
    ? Object.freeze({
      kind: "meme-geometry.cutProject.acceptance:witness" as const,
      site,
      physical: physicalProjection(scheme, site),
      internal,
    })
    : Object.freeze({
      kind: "meme-geometry.cutProject.acceptance-obstruction" as const,
      site,
      internal,
      window,
    });
}

/**
 * A model set: the scheme, the window, and the accepted acceptance witnesses
 * ordered by physical coordinate.
 */
export interface ModelSetCarrier {
  readonly kind: "meme-geometry.cutProject.modelSet";
  readonly scheme: CutProjectScheme;
  readonly window: AcceptanceWindow;
  readonly accepted: readonly WindowAcceptanceWitness[];
}

/** All sites with |coordinates| ≤ radius the window admits, ordered by
 *  physical coordinate. The radius is an honest finite horizon on the
 *  lattice, not on the window — gaps near the physical extremes can be
 *  horizon artifacts; restrict before reading them. */
export function modelSet(scheme: CutProjectScheme, window: AcceptanceWindow, radius: number): ModelSetCarrier {
  const accepted: WindowAcceptanceWitness[] = [];
  for (let unit = -radius; unit <= radius; unit += 1) {
    for (let slopeCount = -radius; slopeCount <= radius; slopeCount += 1) {
      const judgment = windowAcceptance(scheme, latticeSite(unit, slopeCount), window);
      if (judgment.kind === "meme-geometry.cutProject.acceptance:witness") accepted.push(judgment);
    }
  }
  accepted.sort((left, right) => quadraticCompare(left.physical, right.physical));
  return Object.freeze({
    kind: "meme-geometry.cutProject.modelSet" as const,
    scheme,
    window,
    accepted: Object.freeze(accepted),
  });
}

/** The model set restricted to physical coordinates in [lower, upper] —
 *  the interior read that discards horizon artifacts. */
export function restrictModelSet(
  carrier: ModelSetCarrier,
  lower: QuadraticRational,
  upper: QuadraticRational,
): ModelSetCarrier {
  return Object.freeze({
    kind: "meme-geometry.cutProject.modelSet" as const,
    scheme: carrier.scheme,
    window: carrier.window,
    accepted: Object.freeze(carrier.accepted.filter((witness) =>
      quadraticLeq(lower, witness.physical) && quadraticLeq(witness.physical, upper))),
  });
}

/**
 * The gap structure of a model set: the successive gaps, the distinct gap
 * lengths in ascending order, and the word over those distinct lengths
 * recording the gap sequence.
 */
export interface GapSpectrumCarrier {
  readonly kind: "meme-geometry.cutProject.gapSpectrum";
  readonly gaps: readonly QuadraticRational[];
  readonly distinct: readonly QuadraticRational[];
  readonly word: readonly number[];
}

/** Successive gaps of the model set, read as a word over the distinct gap
 *  lengths (ascending; `word[i]` indexes `distinct`). The size of the
 *  spectrum is structural content: an interval window yields finitely many
 *  distinct gaps, and how many is a theorem about the scheme, not a choice. */
export function gapSpectrum(carrier: ModelSetCarrier): GapSpectrumCarrier {
  const gaps: QuadraticRational[] = [];
  for (let index = 1; index < carrier.accepted.length; index += 1) {
    gaps.push(quadraticSubtract(carrier.accepted[index]!.physical, carrier.accepted[index - 1]!.physical));
  }
  const distinct: QuadraticRational[] = [];
  for (const gap of gaps) if (!distinct.some((seen) => quadraticEqual(seen, gap))) distinct.push(gap);
  distinct.sort(quadraticCompare);
  const word = gaps.map((gap) => distinct.findIndex((seen) => quadraticEqual(seen, gap)));
  return Object.freeze({
    kind: "meme-geometry.cutProject.gapSpectrum" as const,
    gaps: Object.freeze(gaps),
    distinct: Object.freeze(distinct),
    word: Object.freeze(word),
  });
}

/**
 * The positive outcome of a period refutation: records the tested period and
 * the index in the gap word where the word disagrees with itself shifted by
 * that period.
 */
export interface AperiodicityWitness {
  readonly kind: "meme-geometry.cutProject.aperiodicity:witness";
  readonly period: number;
  readonly mismatchIndex: number;
}

/**
 * The negative outcome of a period refutation: records the period that was not
 * refuted over the sampled stretch of the gap word.
 */
export interface AperiodicityObstruction {
  readonly kind: "meme-geometry.cutProject.aperiodicity-obstruction";
  readonly period: number;
}

/**
 * The result of attempting to refute a period: an AperiodicityWitness when a
 * mismatch is found, otherwise an AperiodicityObstruction.
 */
export type AperiodicityJudgment = AperiodicityWitness | AperiodicityObstruction;

/** Witnesses that the gap word is not periodic with the given period over
 *  the sampled stretch — a finite, honest read: it refutes one period, it
 *  does not prove global aperiodicity. */
export function refutePeriod(spectrum: GapSpectrumCarrier, period: number): AperiodicityJudgment {
  if (!Number.isSafeInteger(period) || period < 1) throw new TypeError("refutePeriod: period must be a positive integer");
  for (let index = 0; index + period < spectrum.word.length; index += 1) {
    if (spectrum.word[index] !== spectrum.word[index + period]) {
      return Object.freeze({
        kind: "meme-geometry.cutProject.aperiodicity:witness" as const,
        period,
        mismatchIndex: index,
      });
    }
  }
  return Object.freeze({ kind: "meme-geometry.cutProject.aperiodicity-obstruction" as const, period });
}
