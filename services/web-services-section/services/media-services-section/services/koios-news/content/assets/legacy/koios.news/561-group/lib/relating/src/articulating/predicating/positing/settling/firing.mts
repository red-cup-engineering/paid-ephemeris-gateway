import { charge, chargeValue, negateValue, sameChargeValue, type ChargeSide, type ChargeValue } from "../../../../articulating/carriers.mjs";
import { count, natIsZero, natZero, successor, type Natural } from "../../../../articulating/carriers.mjs";
import { rankComparison, rankIdentity, type RankComparison, type RankIdentityJudgment } from "./cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type { SettlementFiltration, SettlingStageOrdinalCarrier } from "./object.mjs";
import { settlingStageOrdinalCoincidenceHolds } from "./ordinal.mjs";

/**
 * Carrier marking a firing whose truth side is present and falsity side absent:
 * the truth-only firing type.
 */
export interface TruthOnlyFiringTypeCarrier {
  readonly kind: "predication.firing.type.truthOnly";
}

/**
 * Carrier marking a firing whose falsity side is present and truth side absent:
 * the falsity-only firing type.
 */
export interface FalsityOnlyFiringTypeCarrier {
  readonly kind: "predication.firing.type.falsityOnly";
}

/**
 * Carrier marking a firing whose truth and falsity sides are both present: the
 * stable firing type.
 */
export interface StableFiringTypeCarrier {
  readonly kind: "predication.firing.type.stable";
}

/**
 * Carrier marking a firing whose truth and falsity sides are both absent: the
 * absurd firing type.
 */
export interface AbsurdFiringTypeCarrier {
  readonly kind: "predication.firing.type.absurd";
}

/**
 * Union of the four firing-type carriers - truth-only, falsity-only, stable,
 * and absurd - classifying a charge value by which of its two sides are
 * present.
 */
export type FiringTypeCarrier =
  | TruthOnlyFiringTypeCarrier
  | FalsityOnlyFiringTypeCarrier
  | StableFiringTypeCarrier
  | AbsurdFiringTypeCarrier;

/**
 * Witness that a firing's singleton-pair consistency holds: a charge value with
 * its truth multiplicity lPlus and falsity multiplicity lMinus, not both
 * nonzero.
 */
export interface FiringSingletonPairConsistencyWitness {
  readonly kind: "predication.firing.singletonPairConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/**
 * Obstruction to a firing's singleton-pair consistency: a charge value whose
 * truth multiplicity lPlus and falsity multiplicity lMinus are both nonzero.
 */
export interface FiringSingletonPairConsistencyObstruction {
  readonly kind: "predication.firing.singletonPairConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/**
 * Judgment of a firing's singleton-pair consistency: either a witness or an
 * obstruction.
 */
export type FiringSingletonPairConsistencyJudgment = FiringSingletonPairConsistencyWitness | FiringSingletonPairConsistencyObstruction;

/**
 * Witness that a firing's cone consistency holds: a charge value with its truth
 * multiplicity lPlus and falsity multiplicity lMinus, not both nonzero.
 */
export interface FiringConeConsistencyWitness {
  readonly kind: "predication.firing.coneConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/**
 * Obstruction to a firing's cone consistency: a charge value whose truth
 * multiplicity lPlus and falsity multiplicity lMinus are both nonzero.
 */
export interface FiringConeConsistencyObstruction {
  readonly kind: "predication.firing.coneConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/**
 * Judgment of a firing's cone consistency: either a witness or an obstruction.
 */
export type FiringConeConsistencyJudgment = FiringConeConsistencyWitness | FiringConeConsistencyObstruction;

/** Carrier recording the charge value of a firing as its totality datum. */
export interface FiringTotalityCarrier {
  readonly kind: "predication.firing.totality.carrier";
  readonly value: ChargeValue;
}

/**
 * Graded record of a single firing: its charge value, firing type, truth and
 * falsity multiplicities lPlus and lMinus, and its singleton-pair consistency
 * judgment.
 */
export interface FiringGrade {
  readonly kind: "predication.firing.grade";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringSingletonPairConsistencyJudgment;
}

/**
 * Generator record for a firing: its charge value, firing type, truth and
 * falsity multiplicities lPlus and lMinus, its cone consistency judgment, and
 * its totality carrier.
 */
export interface FiringGenerator {
  readonly kind: "predication.firing.generator";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringConeConsistencyJudgment;
  readonly totality: FiringTotalityCarrier;
}

/**
 * A firing generator placed in cohomology: its settling stage ordinal, charge
 * value, and the underlying firing generator.
 */
export interface FiringCohomologyGenerator {
  readonly kind: "predication.firing.cohomologyGenerator";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
  readonly generator: FiringGenerator;
}

/**
 * The free module on a set of firing cohomology generators: its basis and the
 * basis cardinality as rank.
 */
export interface FiringCohomologyModule {
  readonly kind: "predication.firing.cohomologyModule";
  readonly basis: readonly FiringCohomologyGenerator[];
  readonly rank: Natural;
}

/**
 * First cohomology of a family of firings: the cohomology generators, their
 * module, the module rank, and the counts lPlus and lMinus of generators with
 * nonzero truth and falsity multiplicities.
 */
export interface FiringFirstCohomology {
  readonly kind: "predication.firing.firstCohomology";
  readonly generators: readonly FiringCohomologyGenerator[];
  readonly module: FiringCohomologyModule;
  readonly rank: Natural;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Carrier marking the truth side of firing cohomology. */
export interface FiringTruthCohomologySideCarrier {
  readonly kind: "predication.firing.cohomologySide.truth";
}

/** Carrier marking the falsity side of firing cohomology. */
export interface FiringFalsityCohomologySideCarrier {
  readonly kind: "predication.firing.cohomologySide.falsity";
}

/**
 * Union of the firing cohomology side carriers: the truth side or the falsity
 * side.
 */
export type FiringCohomologySideCarrier =
  | FiringTruthCohomologySideCarrier
  | FiringFalsityCohomologySideCarrier;

/**
 * A one-sided firing cohomology module: the side it represents and the rank
 * carried on that side.
 */
export interface FiringSideModule {
  readonly kind: "predication.firing.sideModule";
  readonly side: FiringCohomologySideCarrier;
  readonly rank: Natural;
}

/**
 * Two-sided shadow of firing cohomology: the truth-side and falsity-side
 * modules together with the multiplicities lPlus and lMinus they carry.
 */
export interface FiringCohomologyShadow {
  readonly kind: "predication.firing.cohomologyShadow";
  readonly truthSide: FiringSideModule;
  readonly falsitySide: FiringSideModule;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/**
 * Graded cohomology of a family of charge values: the values, their per-firing
 * grades, firing-type multiplicities, an abelian rank abRank with its
 * comparison against the value count, the two-sided cohomology shadow, and the
 * shadow rank-identity judgment.
 */
export interface FiringGradeCohomology {
  readonly kind: "predication.firing.gradeCohomology";
  readonly values: readonly ChargeValue[];
  readonly perFiring: readonly FiringGrade[];
  readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
  readonly abRank: Natural;
  readonly abelianRankComparison: RankComparison;
  readonly shadow: FiringCohomologyShadow;
  readonly shadowRankIdentity: RankIdentityJudgment;
}

/**
 * A firing paired with a value: its settling stage ordinal and the charge value
 * assigned at that stage.
 */
export interface ValuedFiring {
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
}

/**
 * Carrier marking a firing orbit fixed by negation: the self-dual orbit type.
 */
export interface SelfDualFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.selfDual";
}

/**
 * Carrier marking a firing orbit composed only of truth-only firings: the
 * truth-only orbit type.
 */
export interface TruthOnlyFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.truthOnly";
}

/**
 * Carrier marking a firing orbit composed only of falsity-only firings: the
 * falsity-only orbit type.
 */
export interface FalsityOnlyFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.falsityOnly";
}

/**
 * Carrier marking a firing orbit holding both truth-only and falsity-only
 * firings but no stable or absurd ones: the exchange-mixed orbit type.
 */
export interface ExchangeMixedFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.exchangeMixed";
}

/**
 * Carrier marking a firing orbit holding stable or absurd firings alongside
 * one-sided ones: the mixed orbit type.
 */
export interface MixedFiringOrbitTypeCarrier {
  readonly kind: "predication.firing.orbitType.mixed";
}

/**
 * Union of the firing orbit-type carriers: self-dual, truth-only, falsity-only,
 * exchange-mixed, and mixed.
 */
export type FiringOrbitTypeCarrier =
  | SelfDualFiringOrbitTypeCarrier
  | TruthOnlyFiringOrbitTypeCarrier
  | FalsityOnlyFiringOrbitTypeCarrier
  | ExchangeMixedFiringOrbitTypeCarrier
  | MixedFiringOrbitTypeCarrier;

/**
 * Carrier counting firings by type: how many are truth-only, falsity-only,
 * stable, and absurd.
 */
export interface FiringTypeMultiplicityCarrier {
  readonly kind: "predication.firing.typeMultiplicity";
  readonly truthOnly: Natural;
  readonly falsityOnly: Natural;
  readonly stableFiring: Natural;
  readonly absurdFiring: Natural;
}

/**
 * Cardinality carrier for a firing orbit of size one: a singleton with rank
 * one.
 */
export interface FiringOrbitSingletonCardinality {
  readonly kind: "predication.firing.orbitCardinality.singleton";
  readonly rank: Natural;
}

/** Cardinality carrier for a firing orbit of size two: a pair with rank two. */
export interface FiringOrbitPairCardinality {
  readonly kind: "predication.firing.orbitCardinality.pair";
  readonly rank: Natural;
}

/**
 * Cardinality carrier for a firing orbit of variable size: carries the support
 * rank over the underlying values.
 */
export interface FiringOrbitVariableCardinality {
  readonly kind: "predication.firing.orbitCardinality.variable";
  readonly supportRank: Natural;
}

/**
 * Union of the firing orbit cardinality carriers: singleton, pair, or variable.
 */
export type FiringOrbitCardinality = FiringOrbitSingletonCardinality | FiringOrbitPairCardinality | FiringOrbitVariableCardinality;

/** Witness that a firing orbit is self-dual under negation. */
export interface FiringOrbitDualityWitness {
  readonly kind: "predication.firing.orbitDuality:witness";
}

/**
 * Obstruction to a firing orbit being self-dual: carries the orbit type that
 * fails self-duality.
 */
export interface FiringOrbitDualityObstruction {
  readonly kind: "predication.firing.orbitDuality-obstruction";
  readonly orbitType: FiringOrbitTypeCarrier;
}

/**
 * Judgment of a firing orbit's self-duality: either a witness or an
 * obstruction.
 */
export type FiringOrbitDualityJudgment = FiringOrbitDualityWitness | FiringOrbitDualityObstruction;

/**
 * Classification of a firing orbit: its firing-type multiplicities, orbit type,
 * cardinality, self-duality judgment, and the negated charge values.
 */
export interface FiringOrbitClassification {
  readonly kind: "predication.firing.orbit";
  readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
  readonly orbitType: FiringOrbitTypeCarrier;
  readonly cardinality: FiringOrbitCardinality;
  readonly duality: FiringOrbitDualityJudgment;
  readonly negated: readonly ChargeValue[];
}

/** Witness that a firing family satisfies a symmetry condition. */
export interface FiringSymmetryWitness {
  readonly kind: "predication.firing.symmetry:witness";
}

/**
 * Obstruction to a firing family's symmetry: carries the charge values that
 * violate it.
 */
export interface FiringSymmetryObstruction {
  readonly kind: "predication.firing.symmetry-obstruction";
  readonly values: readonly ChargeValue[];
}

/**
 * Judgment of a firing family's symmetry: either a witness or an obstruction.
 */
export type FiringSymmetryJudgment = FiringSymmetryWitness | FiringSymmetryObstruction;

/**
 * Witness that a firing family's orbit duality, symmetry, and negation all hold
 * coherently.
 */
export interface FiringSelfDualityCoherenceWitness {
  readonly kind: "predication.firing.selfDualityCoherence:witness";
}

/**
 * Obstruction to firing self-duality coherence: carries the orbit duality,
 * symmetry, and negation judgments not all witnessing.
 */
export interface FiringSelfDualityCoherenceObstruction {
  readonly kind: "predication.firing.selfDualityCoherence-obstruction";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
}

/**
 * Judgment of firing self-duality coherence: either a witness or an
 * obstruction.
 */
export type FiringSelfDualityCoherenceJudgment = FiringSelfDualityCoherenceWitness | FiringSelfDualityCoherenceObstruction;

/**
 * Self-duality record for a firing family: its orbit duality, symmetry, and
 * negation judgments together with the combined coherence judgment.
 */
export interface FiringSelfDuality {
  readonly kind: "predication.firing.selfDuality";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
  readonly coherence: FiringSelfDualityCoherenceJudgment;
}

/**
 * Witness that a family of valued firings is independent: no two share a
 * settling stage. Carries the firings.
 */
export interface FiringIndependenceWitness {
  readonly kind: "predication.firing.independence:witness";
  readonly firings: readonly ValuedFiring[];
}

/**
 * Obstruction to firing independence: the shared settling stage and the two
 * valued firings that collide on it.
 */
export interface FiringIndependenceObstruction {
  readonly kind: "predication.firing.independence-obstruction";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly firings: readonly ValuedFiring[];
}

/**
 * Judgment of a valued-firing family's independence: either a witness or an
 * obstruction.
 */
export type FiringIndependenceJudgment = FiringIndependenceWitness | FiringIndependenceObstruction;

/**
 * Returns the truth and falsity charge sides of a charge value as a tuple,
 * taken from its charge.
 */
export const firingSideContribution = (value: ChargeValue): readonly [truth: ChargeSide, falsity: ChargeSide] =>
  charge(value).value;

const sidePresent = (side: ChargeSide): boolean => side.name === "present";

/** Frozen truth-only firing-type carrier. */
export const truthOnlyFiringType: TruthOnlyFiringTypeCarrier = Object.freeze({
  kind: "predication.firing.type.truthOnly" as const,
});

/** Frozen falsity-only firing-type carrier. */
export const falsityOnlyFiringType: FalsityOnlyFiringTypeCarrier = Object.freeze({
  kind: "predication.firing.type.falsityOnly" as const,
});

/** Frozen stable firing-type carrier. */
export const stableFiringType: StableFiringTypeCarrier = Object.freeze({
  kind: "predication.firing.type.stable" as const,
});

/** Frozen absurd firing-type carrier. */
export const absurdFiringType: AbsurdFiringTypeCarrier = Object.freeze({
  kind: "predication.firing.type.absurd" as const,
});

/** Frozen truth-side firing cohomology carrier. */
export const firingTruthCohomologySide: FiringTruthCohomologySideCarrier = Object.freeze({
  kind: "predication.firing.cohomologySide.truth" as const,
});

/** Frozen falsity-side firing cohomology carrier. */
export const firingFalsityCohomologySide: FiringFalsityCohomologySideCarrier = Object.freeze({
  kind: "predication.firing.cohomologySide.falsity" as const,
});

/** Frozen self-dual firing orbit-type carrier. */
export const selfDualFiringOrbitType: SelfDualFiringOrbitTypeCarrier = Object.freeze({
  kind: "predication.firing.orbitType.selfDual" as const,
});

/** Frozen truth-only firing orbit-type carrier. */
export const truthOnlyFiringOrbitType: TruthOnlyFiringOrbitTypeCarrier = Object.freeze({
  kind: "predication.firing.orbitType.truthOnly" as const,
});

/** Frozen falsity-only firing orbit-type carrier. */
export const falsityOnlyFiringOrbitType: FalsityOnlyFiringOrbitTypeCarrier = Object.freeze({
  kind: "predication.firing.orbitType.falsityOnly" as const,
});

/** Frozen exchange-mixed firing orbit-type carrier. */
export const exchangeMixedFiringOrbitType: ExchangeMixedFiringOrbitTypeCarrier = Object.freeze({
  kind: "predication.firing.orbitType.exchangeMixed" as const,
});

/** Frozen mixed firing orbit-type carrier. */
export const mixedFiringOrbitType: MixedFiringOrbitTypeCarrier = Object.freeze({
  kind: "predication.firing.orbitType.mixed" as const,
});

/**
 * Classifies a charge value as stable, truth-only, falsity-only, or absurd by
 * which of its truth and falsity sides are present.
 */
export function classifyFiring(value: ChargeValue): FiringTypeCarrier {
  const [plus, minus] = firingSideContribution(value);
  if (sidePresent(plus) && sidePresent(minus)) return stableFiringType;
  if (sidePresent(plus)) return truthOnlyFiringType;
  if (sidePresent(minus)) return falsityOnlyFiringType;
  return absurdFiringType;
}

/**
 * Judges singleton-pair consistency for a charge value with multiplicities
 * lPlus and lMinus: an obstruction when both are nonzero, otherwise a witness.
 */
export function firingSingletonPairConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringSingletonPairConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({
      kind: "predication.firing.singletonPairConsistency-obstruction" as const,
      value,
      lPlus,
      lMinus,
    })
    : Object.freeze({
      kind: "predication.firing.singletonPairConsistency:witness" as const,
      value,
      lPlus,
      lMinus,
    });
}

/**
 * Judges cone consistency for a charge value with multiplicities lPlus and
 * lMinus: an obstruction when both are nonzero, otherwise a witness.
 */
export function firingConeConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringConeConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({
      kind: "predication.firing.coneConsistency-obstruction" as const,
      value,
      lPlus,
      lMinus,
    })
    : Object.freeze({
      kind: "predication.firing.coneConsistency:witness" as const,
      value,
      lPlus,
      lMinus,
    });
}

/**
 * Constructs a frozen firing totality carrier wrapping the given charge value.
 */
export const firingTotality = (value: ChargeValue): FiringTotalityCarrier => Object.freeze({
  kind: "predication.firing.totality.carrier" as const,
  value,
});

/**
 * Computes the firing grade of a charge value: its firing type, the truth and
 * falsity multiplicities lPlus and lMinus (one when the side is present, zero
 * otherwise), and its singleton-pair consistency judgment.
 */
export function firingGrade(value: ChargeValue): FiringGrade {
  const [plus, minus] = firingSideContribution(value);
  const lPlus = sidePresent(plus) ? successor(natZero) : natZero;
  const lMinus = sidePresent(minus) ? successor(natZero) : natZero;
  return Object.freeze({
    kind: "predication.firing.grade" as const,
    value,
    firingType: classifyFiring(value),
    lPlus,
    lMinus,
    consistency: firingSingletonPairConsistency(value, lPlus, lMinus),
  });
}

/**
 * Maps a list of charge values to their firing grades, returning a frozen
 * array.
 */
export function firingGrades(values: readonly ChargeValue[]): readonly FiringGrade[] {
  return Object.freeze(values.map(firingGrade));
}

/**
 * Computes the firing generator of a charge value: its firing type,
 * multiplicities lPlus and lMinus from the grade, its cone consistency
 * judgment, and its totality carrier.
 */
export function firingGenerator(value: ChargeValue): FiringGenerator {
  const grade = firingGrade(value);
  return Object.freeze({
    kind: "predication.firing.generator" as const,
    value,
    firingType: grade.firingType,
    lPlus: grade.lPlus,
    lMinus: grade.lMinus,
    consistency: firingConeConsistency(value, grade.lPlus, grade.lMinus),
    totality: firingTotality(value),
  });
}

/**
 * Computes the first cohomology of a list of valued firings: a cohomology
 * generator per firing, their module with rank equal to the generator count,
 * and the counts lPlus and lMinus of generators with nonzero truth and falsity
 * multiplicities.
 */
export function firingFirstCohomology(valuedFirings: readonly ValuedFiring[]): FiringFirstCohomology {
  const generators = Object.freeze(valuedFirings.map((firing) => Object.freeze({
    kind: "predication.firing.cohomologyGenerator" as const,
    stage: firing.stage,
    value: firing.value,
    generator: firingGenerator(firing.value),
  })));
  const lPlus = count(generators.filter((generator) => !natIsZero(generator.generator.lPlus)));
  const lMinus = count(generators.filter((generator) => !natIsZero(generator.generator.lMinus)));
  const moduleRank = count(generators);
  return Object.freeze({
    kind: "predication.firing.firstCohomology" as const,
    generators,
    module: Object.freeze({
      kind: "predication.firing.cohomologyModule" as const,
      basis: generators,
      rank: moduleRank,
    }),
    rank: moduleRank,
    lPlus,
    lMinus,
  });
}

/**
 * Constructs a frozen one-sided firing cohomology module from a side carrier
 * and a rank.
 */
export const firingSideModule = (side: FiringCohomologySideCarrier, moduleRank: Natural): FiringSideModule => Object.freeze({
  kind: "predication.firing.sideModule" as const,
  side,
  rank: moduleRank,
});

/**
 * Computes the two-sided cohomology shadow of a list of valued firings from
 * their first cohomology: truth- and falsity-side modules carrying the
 * multiplicities lPlus and lMinus.
 */
export function firingGradeShadow(valuedFirings: readonly ValuedFiring[]): FiringCohomologyShadow {
  const h = firingFirstCohomology(valuedFirings);
  return Object.freeze({
    kind: "predication.firing.cohomologyShadow" as const,
    lPlus: h.lPlus,
    lMinus: h.lMinus,
    truthSide: firingSideModule(firingTruthCohomologySide, h.lPlus),
    falsitySide: firingSideModule(firingFalsityCohomologySide, h.lMinus),
  });
}

/**
 * Returns the firing generator of the negation of the given generator's charge
 * value.
 */
export function negateFiringGenerator(generator: FiringGenerator): FiringGenerator {
  return firingGenerator(negateValue(generator.value));
}

/**
 * Judges whether a list of valued firings is independent: an obstruction naming
 * the first pair that share a settling stage ordinal, otherwise a witness over
 * all the firings.
 */
export function firingIndependence(valuedFirings: readonly ValuedFiring[]): FiringIndependenceJudgment {
  for (let index = 0; index < valuedFirings.length; index += 1) {
    const firing = valuedFirings[index]!;
    const collision = valuedFirings.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && settlingStageOrdinalCoincidenceHolds(candidate.stage, firing.stage));
    if (collision >= 0) {
      return Object.freeze({
        kind: "predication.firing.independence-obstruction" as const,
        stage: firing.stage,
        firings: Object.freeze([valuedFirings[collision]!, firing]),
      });
    }
  }
  return Object.freeze({
    kind: "predication.firing.independence:witness" as const,
    firings: Object.freeze([...valuedFirings]),
  });
}

/**
 * Pairs the non-Scott firings of a settlement filtration with the given charge
 * values in order, returning valued firings; throws RangeError when the value
 * count does not match the firing count.
 */
export function valuedFiringsOfSettlementFiltration(carrier: SettlementFiltration, values: readonly ChargeValue[]): readonly ValuedFiring[] {
  const nonScottFiringCarrier = readNonScottFiringsOfSettlementFiltration(carrier);
  if (values.length !== nonScottFiringCarrier.firings.length) {
    throw new RangeError(`valuedFiringsOfSettlementFiltration: expected ${nonScottFiringCarrier.firings.length} values, got ${values.length}`);
  }
  return Object.freeze(nonScottFiringCarrier.firings.map((firing, index) => Object.freeze({
    stage: firing.stage,
    value: values[index]!,
  })));
}

/**
 * Counts charge values by firing type, returning a carrier of the truth-only,
 * falsity-only, stable, and absurd totals.
 */
export function firingTypeMultiplicities(values: readonly ChargeValue[]): FiringTypeMultiplicityCarrier {
  let truthOnly = natZero;
  let falsityOnly = natZero;
  let stableFiring = natZero;
  let absurdFiring = natZero;
  for (const value of values) {
    const firingType = classifyFiring(value);
    if (firingType.kind === "predication.firing.type.truthOnly") truthOnly = successor(truthOnly);
    else if (firingType.kind === "predication.firing.type.falsityOnly") falsityOnly = successor(falsityOnly);
    else if (firingType.kind === "predication.firing.type.stable") stableFiring = successor(stableFiring);
    else absurdFiring = successor(absurdFiring);
  }
  return Object.freeze({
    kind: "predication.firing.typeMultiplicity" as const,
    truthOnly,
    falsityOnly,
    stableFiring,
    absurdFiring,
  });
}

/**
 * Classifies the firing orbit of a list of charge values: self-dual singleton
 * when no one-sided firings are present, a pair (truth-only, falsity-only, or
 * exchange-mixed) when no stable or absurd firings are present, otherwise a
 * mixed orbit of variable cardinality; carries the multiplicities, self-duality
 * judgment, and negated values.
 */
export function classifyFiringOrbit(values: readonly ChargeValue[]): FiringOrbitClassification {
  const firingMultiplicities = firingTypeMultiplicities(values);
  const truthOnly = firingMultiplicities.truthOnly;
  const falsityOnly = firingMultiplicities.falsityOnly;
  const stable = firingMultiplicities.stableFiring;
  const absurd = firingMultiplicities.absurdFiring;
  let orbitType: FiringOrbitTypeCarrier;
  let cardinality: FiringOrbitCardinality;
  if (natIsZero(truthOnly) && natIsZero(falsityOnly)) {
    orbitType = selfDualFiringOrbitType;
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.singleton" as const, rank: successor(natZero) });
  } else if (natIsZero(stable) && natIsZero(absurd)) {
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.pair" as const, rank: successor(successor(natZero)) });
    orbitType = natIsZero(falsityOnly)
      ? truthOnlyFiringOrbitType
      : natIsZero(truthOnly)
        ? falsityOnlyFiringOrbitType
        : exchangeMixedFiringOrbitType;
  } else {
    orbitType = mixedFiringOrbitType;
    cardinality = Object.freeze({
      kind: "predication.firing.orbitCardinality.variable" as const,
      supportRank: count(values),
    });
  }

  return Object.freeze({
    kind: "predication.firing.orbit" as const,
    firingMultiplicities,
    orbitType,
    cardinality,
    duality: orbitType.kind === "predication.firing.orbitType.selfDual"
      ? Object.freeze({ kind: "predication.firing.orbitDuality:witness" as const })
      : Object.freeze({
        kind: "predication.firing.orbitDuality-obstruction" as const,
        orbitType,
      }),
    negated: Object.freeze(values.map(negateValue)),
  });
}

/**
 * Computes the self-duality record of a list of charge values: the orbit
 * duality judgment, a symmetry judgment (witnessed when every value is stable
 * or absurd), a negation judgment (witnessed when every value equals its own
 * negation), and a coherence judgment combining all three.
 */
export function firingSelfDuality(values: readonly ChargeValue[]): FiringSelfDuality {
  const orbit = classifyFiringOrbit(values).duality;
  const symmetry: FiringSymmetryJudgment = values.every((value) => sameChargeValue(value, chargeValue("stable")) || sameChargeValue(value, chargeValue("absurd")))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({
      kind: "predication.firing.symmetry-obstruction" as const,
      values: Object.freeze([...values]),
    });
  const negation: FiringSymmetryJudgment = values.every((value) => sameChargeValue(negateValue(value), value))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({
      kind: "predication.firing.symmetry-obstruction" as const,
      values: Object.freeze([...values]),
    });
  const coherence = orbit.kind === "predication.firing.orbitDuality:witness"
    && symmetry.kind === "predication.firing.symmetry:witness"
    && negation.kind === "predication.firing.symmetry:witness"
    ? Object.freeze({ kind: "predication.firing.selfDualityCoherence:witness" as const })
    : Object.freeze({
      kind: "predication.firing.selfDualityCoherence-obstruction" as const,
      orbit,
      symmetry,
      negation,
    });
  return Object.freeze({
    kind: "predication.firing.selfDuality" as const,
    orbit,
    symmetry,
    negation,
    coherence,
  });
}

/**
 * Computes the graded cohomology of a list of charge values: per-firing grades,
 * firing-type multiplicities, the abelian rank abRank (defaulting to the value
 * count) compared against the value count, the two-sided shadow over
 * multiplicities lPlus and lMinus, and the shadow rank-identity judgment.
 */
export function firingGradeCohomology(values: readonly ChargeValue[], abRank: Natural = count(values)): FiringGradeCohomology {
  const perFiring = firingGrades(values);
  const firingMultiplicities = firingTypeMultiplicities(values);
  const lPlus = count(perFiring.filter((grade) => !natIsZero(grade.lPlus)));
  const lMinus = count(perFiring.filter((grade) => !natIsZero(grade.lMinus)));
  return Object.freeze({
    kind: "predication.firing.gradeCohomology" as const,
    values: Object.freeze([...values]),
    perFiring,
    firingMultiplicities,
    abRank,
    abelianRankComparison: rankComparison(abRank, count(values)),
    shadow: Object.freeze({
      kind: "predication.firing.cohomologyShadow" as const,
      truthSide: firingSideModule(firingTruthCohomologySide, lPlus),
      falsitySide: firingSideModule(firingFalsityCohomologySide, lMinus),
      lPlus,
      lMinus,
    }),
    shadowRankIdentity: rankIdentity(count(perFiring), abRank),
  });
}
