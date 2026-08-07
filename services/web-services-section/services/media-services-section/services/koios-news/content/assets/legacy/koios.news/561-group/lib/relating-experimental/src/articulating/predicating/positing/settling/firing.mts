/**
 * settling/firing — the firing pattern of a settlement's non-Scott firings.
 *
 * Each firing's charge value is classified by which sides are present (truth-only,
 * falsity-only, stable, absurd), graded with truth/falsity multiplicities, and
 * assembled into a first cohomology (one generator per firing) with its two-sided
 * shadow. A firing orbit is classified under negation (self-dual / one-sided /
 * exchange-mixed / mixed) and its self-duality coherence judged. Valued firings
 * pair the settlement's non-Scott firings with charge values.
 */
import { charge, chargeValue, negateValue, sameChargeValue, type ChargeSide, type ChargeValue } from "../bilattice-charge.mjs";
import { count, natIsZero, natZero, successor, type Natural } from "./analysis/exact-number.mjs";
import { rankComparison, rankIdentity, type RankComparison, type RankIdentityJudgment } from "./cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
import type { SettlementFiltration, SettlingStageOrdinalCarrier } from "./object.mjs";
import { settlingStageOrdinalCoincidenceHolds } from "./ordinal.mjs";

/** A firing whose truth side is present and falsity absent. */
export interface TruthOnlyFiringTypeCarrier { readonly kind: "predication.firing.type.truthOnly"; }
/** A firing whose falsity side is present and truth absent. */
export interface FalsityOnlyFiringTypeCarrier { readonly kind: "predication.firing.type.falsityOnly"; }
/** A firing whose truth and falsity sides are both present. */
export interface StableFiringTypeCarrier { readonly kind: "predication.firing.type.stable"; }
/** A firing whose truth and falsity sides are both absent. */
export interface AbsurdFiringTypeCarrier { readonly kind: "predication.firing.type.absurd"; }

/** The four firing types by which sides are present. */
export type FiringTypeCarrier = TruthOnlyFiringTypeCarrier | FalsityOnlyFiringTypeCarrier | StableFiringTypeCarrier | AbsurdFiringTypeCarrier;

/** Singleton-pair consistency holds (not both sides nonzero). */
export interface FiringSingletonPairConsistencyWitness {
  readonly kind: "predication.firing.singletonPairConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Singleton-pair consistency fails (both sides nonzero). */
export interface FiringSingletonPairConsistencyObstruction {
  readonly kind: "predication.firing.singletonPairConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Judgment of singleton-pair consistency. */
export type FiringSingletonPairConsistencyJudgment = FiringSingletonPairConsistencyWitness | FiringSingletonPairConsistencyObstruction;

/** Cone consistency holds. */
export interface FiringConeConsistencyWitness {
  readonly kind: "predication.firing.coneConsistency:witness";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Cone consistency fails. */
export interface FiringConeConsistencyObstruction {
  readonly kind: "predication.firing.coneConsistency-obstruction";
  readonly value: ChargeValue;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Judgment of cone consistency. */
export type FiringConeConsistencyJudgment = FiringConeConsistencyWitness | FiringConeConsistencyObstruction;

/** The totality datum of a firing (its charge value). */
export interface FiringTotalityCarrier {
  readonly kind: "predication.firing.totality.carrier";
  readonly value: ChargeValue;
}

/** A graded record of a single firing. */
export interface FiringGrade {
  readonly kind: "predication.firing.grade";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringSingletonPairConsistencyJudgment;
}

/** A generator record for a firing. */
export interface FiringGenerator {
  readonly kind: "predication.firing.generator";
  readonly value: ChargeValue;
  readonly firingType: FiringTypeCarrier;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
  readonly consistency: FiringConeConsistencyJudgment;
  readonly totality: FiringTotalityCarrier;
}

/** A firing generator placed in cohomology (at a stage). */
export interface FiringCohomologyGenerator {
  readonly kind: "predication.firing.cohomologyGenerator";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
  readonly generator: FiringGenerator;
}

/** The free module on firing cohomology generators. */
export interface FiringCohomologyModule {
  readonly kind: "predication.firing.cohomologyModule";
  readonly basis: readonly FiringCohomologyGenerator[];
  readonly rank: Natural;
}

/** First cohomology of a firing family. */
export interface FiringFirstCohomology {
  readonly kind: "predication.firing.firstCohomology";
  readonly generators: readonly FiringCohomologyGenerator[];
  readonly module: FiringCohomologyModule;
  readonly rank: Natural;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** The truth side of firing cohomology. */
export interface FiringTruthCohomologySideCarrier { readonly kind: "predication.firing.cohomologySide.truth"; }
/** The falsity side of firing cohomology. */
export interface FiringFalsityCohomologySideCarrier { readonly kind: "predication.firing.cohomologySide.falsity"; }

/** A firing cohomology side. */
export type FiringCohomologySideCarrier = FiringTruthCohomologySideCarrier | FiringFalsityCohomologySideCarrier;

/** A one-sided firing cohomology module. */
export interface FiringSideModule {
  readonly kind: "predication.firing.sideModule";
  readonly side: FiringCohomologySideCarrier;
  readonly rank: Natural;
}

/** The two-sided shadow of firing cohomology. */
export interface FiringCohomologyShadow {
  readonly kind: "predication.firing.cohomologyShadow";
  readonly truthSide: FiringSideModule;
  readonly falsitySide: FiringSideModule;
  readonly lPlus: Natural;
  readonly lMinus: Natural;
}

/** Counts of firings by type. */
export interface FiringTypeMultiplicityCarrier {
  readonly kind: "predication.firing.typeMultiplicity";
  readonly truthOnly: Natural;
  readonly falsityOnly: Natural;
  readonly stableFiring: Natural;
  readonly absurdFiring: Natural;
}

/** Graded cohomology of a family of charge values. */
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

/** A firing paired with a value (stage + charge). */
export interface ValuedFiring {
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: ChargeValue;
}

/** A firing orbit fixed by negation. */
export interface SelfDualFiringOrbitTypeCarrier { readonly kind: "predication.firing.orbitType.selfDual"; }
/** A firing orbit of only truth-only firings. */
export interface TruthOnlyFiringOrbitTypeCarrier { readonly kind: "predication.firing.orbitType.truthOnly"; }
/** A firing orbit of only falsity-only firings. */
export interface FalsityOnlyFiringOrbitTypeCarrier { readonly kind: "predication.firing.orbitType.falsityOnly"; }
/** A firing orbit of both one-sided firings, no stable/absurd. */
export interface ExchangeMixedFiringOrbitTypeCarrier { readonly kind: "predication.firing.orbitType.exchangeMixed"; }
/** A firing orbit holding stable/absurd alongside one-sided. */
export interface MixedFiringOrbitTypeCarrier { readonly kind: "predication.firing.orbitType.mixed"; }

/** A firing orbit type. */
export type FiringOrbitTypeCarrier =
  | SelfDualFiringOrbitTypeCarrier
  | TruthOnlyFiringOrbitTypeCarrier
  | FalsityOnlyFiringOrbitTypeCarrier
  | ExchangeMixedFiringOrbitTypeCarrier
  | MixedFiringOrbitTypeCarrier;

/** A singleton firing-orbit cardinality. */
export interface FiringOrbitSingletonCardinality { readonly kind: "predication.firing.orbitCardinality.singleton"; readonly rank: Natural; }
/** A pair firing-orbit cardinality. */
export interface FiringOrbitPairCardinality { readonly kind: "predication.firing.orbitCardinality.pair"; readonly rank: Natural; }
/** A variable firing-orbit cardinality. */
export interface FiringOrbitVariableCardinality { readonly kind: "predication.firing.orbitCardinality.variable"; readonly supportRank: Natural; }

/** A firing orbit cardinality. */
export type FiringOrbitCardinality = FiringOrbitSingletonCardinality | FiringOrbitPairCardinality | FiringOrbitVariableCardinality;

/** A self-dual firing orbit. */
export interface FiringOrbitDualityWitness { readonly kind: "predication.firing.orbitDuality:witness"; }
/** A non-self-dual firing orbit. */
export interface FiringOrbitDualityObstruction { readonly kind: "predication.firing.orbitDuality-obstruction"; readonly orbitType: FiringOrbitTypeCarrier; }
/** Judgment of a firing orbit's self-duality. */
export type FiringOrbitDualityJudgment = FiringOrbitDualityWitness | FiringOrbitDualityObstruction;

/** A firing orbit classification. */
export interface FiringOrbitClassification {
  readonly kind: "predication.firing.orbit";
  readonly firingMultiplicities: FiringTypeMultiplicityCarrier;
  readonly orbitType: FiringOrbitTypeCarrier;
  readonly cardinality: FiringOrbitCardinality;
  readonly duality: FiringOrbitDualityJudgment;
  readonly negated: readonly ChargeValue[];
}

/** A firing family satisfies a symmetry. */
export interface FiringSymmetryWitness { readonly kind: "predication.firing.symmetry:witness"; }
/** A firing family violates a symmetry. */
export interface FiringSymmetryObstruction { readonly kind: "predication.firing.symmetry-obstruction"; readonly values: readonly ChargeValue[]; }
/** Judgment of a firing family's symmetry. */
export type FiringSymmetryJudgment = FiringSymmetryWitness | FiringSymmetryObstruction;

/** Firing self-duality coherence holds. */
export interface FiringSelfDualityCoherenceWitness { readonly kind: "predication.firing.selfDualityCoherence:witness"; }
/** Firing self-duality coherence fails. */
export interface FiringSelfDualityCoherenceObstruction {
  readonly kind: "predication.firing.selfDualityCoherence-obstruction";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
}
/** Judgment of firing self-duality coherence. */
export type FiringSelfDualityCoherenceJudgment = FiringSelfDualityCoherenceWitness | FiringSelfDualityCoherenceObstruction;

/** A self-duality record for a firing family. */
export interface FiringSelfDuality {
  readonly kind: "predication.firing.selfDuality";
  readonly orbit: FiringOrbitDualityJudgment;
  readonly symmetry: FiringSymmetryJudgment;
  readonly negation: FiringSymmetryJudgment;
  readonly coherence: FiringSelfDualityCoherenceJudgment;
}

/** Valued firings are independent (no shared stage). */
export interface FiringIndependenceWitness { readonly kind: "predication.firing.independence:witness"; readonly firings: readonly ValuedFiring[]; }
/** Valued firings collide on a stage. */
export interface FiringIndependenceObstruction { readonly kind: "predication.firing.independence-obstruction"; readonly stage: SettlingStageOrdinalCarrier; readonly firings: readonly ValuedFiring[]; }
/** Judgment of valued-firing independence. */
export type FiringIndependenceJudgment = FiringIndependenceWitness | FiringIndependenceObstruction;

/** The truth and falsity sides of a charge value. */
export const firingSideContribution = (value: ChargeValue): readonly [truth: ChargeSide, falsity: ChargeSide] => charge(value).value;

const sidePresent = (side: ChargeSide): boolean => side.name === "present";

/** Frozen truth-only firing-type carrier. */
export const truthOnlyFiringType: TruthOnlyFiringTypeCarrier = Object.freeze({ kind: "predication.firing.type.truthOnly" as const });
/** Frozen falsity-only firing-type carrier. */
export const falsityOnlyFiringType: FalsityOnlyFiringTypeCarrier = Object.freeze({ kind: "predication.firing.type.falsityOnly" as const });
/** Frozen stable firing-type carrier. */
export const stableFiringType: StableFiringTypeCarrier = Object.freeze({ kind: "predication.firing.type.stable" as const });
/** Frozen absurd firing-type carrier. */
export const absurdFiringType: AbsurdFiringTypeCarrier = Object.freeze({ kind: "predication.firing.type.absurd" as const });
/** Frozen truth-side firing cohomology carrier. */
export const firingTruthCohomologySide: FiringTruthCohomologySideCarrier = Object.freeze({ kind: "predication.firing.cohomologySide.truth" as const });
/** Frozen falsity-side firing cohomology carrier. */
export const firingFalsityCohomologySide: FiringFalsityCohomologySideCarrier = Object.freeze({ kind: "predication.firing.cohomologySide.falsity" as const });
/** Frozen self-dual firing orbit-type carrier. */
export const selfDualFiringOrbitType: SelfDualFiringOrbitTypeCarrier = Object.freeze({ kind: "predication.firing.orbitType.selfDual" as const });
/** Frozen truth-only firing orbit-type carrier. */
export const truthOnlyFiringOrbitType: TruthOnlyFiringOrbitTypeCarrier = Object.freeze({ kind: "predication.firing.orbitType.truthOnly" as const });
/** Frozen falsity-only firing orbit-type carrier. */
export const falsityOnlyFiringOrbitType: FalsityOnlyFiringOrbitTypeCarrier = Object.freeze({ kind: "predication.firing.orbitType.falsityOnly" as const });
/** Frozen exchange-mixed firing orbit-type carrier. */
export const exchangeMixedFiringOrbitType: ExchangeMixedFiringOrbitTypeCarrier = Object.freeze({ kind: "predication.firing.orbitType.exchangeMixed" as const });
/** Frozen mixed firing orbit-type carrier. */
export const mixedFiringOrbitType: MixedFiringOrbitTypeCarrier = Object.freeze({ kind: "predication.firing.orbitType.mixed" as const });

/** Classify a charge value by which sides are present. */
export function classifyFiring(value: ChargeValue): FiringTypeCarrier {
  const [plus, minus] = firingSideContribution(value);
  if (sidePresent(plus) && sidePresent(minus)) return stableFiringType;
  if (sidePresent(plus)) return truthOnlyFiringType;
  if (sidePresent(minus)) return falsityOnlyFiringType;
  return absurdFiringType;
}

/** Judge singleton-pair consistency (obstruction when both sides nonzero). */
export function firingSingletonPairConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringSingletonPairConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.singletonPairConsistency-obstruction" as const, value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.singletonPairConsistency:witness" as const, value, lPlus, lMinus });
}

/** Judge cone consistency (obstruction when both sides nonzero). */
export function firingConeConsistency(value: ChargeValue, lPlus: Natural, lMinus: Natural): FiringConeConsistencyJudgment {
  return !natIsZero(lPlus) && !natIsZero(lMinus)
    ? Object.freeze({ kind: "predication.firing.coneConsistency-obstruction" as const, value, lPlus, lMinus })
    : Object.freeze({ kind: "predication.firing.coneConsistency:witness" as const, value, lPlus, lMinus });
}

/** A firing totality carrier. */
export const firingTotality = (value: ChargeValue): FiringTotalityCarrier => Object.freeze({ kind: "predication.firing.totality.carrier" as const, value });

/** The firing grade of a charge value. */
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

/** The firing grades of a list of charge values. */
export function firingGrades(values: readonly ChargeValue[]): readonly FiringGrade[] {
  return Object.freeze(values.map(firingGrade));
}

/** The firing generator of a charge value. */
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

/** The first cohomology of a list of valued firings. */
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
    module: Object.freeze({ kind: "predication.firing.cohomologyModule" as const, basis: generators, rank: moduleRank }),
    rank: moduleRank,
    lPlus,
    lMinus,
  });
}

/** A one-sided firing cohomology module. */
export const firingSideModule = (side: FiringCohomologySideCarrier, moduleRank: Natural): FiringSideModule =>
  Object.freeze({ kind: "predication.firing.sideModule" as const, side, rank: moduleRank });

/** The two-sided cohomology shadow of valued firings. */
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

/** The firing generator of a generator's negation. */
export function negateFiringGenerator(generator: FiringGenerator): FiringGenerator {
  return firingGenerator(negateValue(generator.value));
}

/** Whether a list of valued firings is independent (no shared stage). */
export function firingIndependence(valuedFirings: readonly ValuedFiring[]): FiringIndependenceJudgment {
  for (let index = 0; index < valuedFirings.length; index += 1) {
    const firing = valuedFirings[index]!;
    const collision = valuedFirings.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && settlingStageOrdinalCoincidenceHolds(candidate.stage, firing.stage));
    if (collision >= 0) {
      return Object.freeze({ kind: "predication.firing.independence-obstruction" as const, stage: firing.stage, firings: Object.freeze([valuedFirings[collision]!, firing]) });
    }
  }
  return Object.freeze({ kind: "predication.firing.independence:witness" as const, firings: Object.freeze([...valuedFirings]) });
}

/** Pair a settlement's non-Scott firings with charge values in order. */
export function valuedFiringsOfSettlementFiltration(carrier: SettlementFiltration, values: readonly ChargeValue[]): readonly ValuedFiring[] {
  const nonScottFiringCarrier = readNonScottFiringsOfSettlementFiltration(carrier);
  if (values.length !== nonScottFiringCarrier.firings.length) {
    throw new RangeError(`valuedFiringsOfSettlementFiltration: expected ${nonScottFiringCarrier.firings.length} values, got ${values.length}`);
  }
  return Object.freeze(nonScottFiringCarrier.firings.map((firing, index) => Object.freeze({ stage: firing.stage, value: values[index]! })));
}

/** Count charge values by firing type. */
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
  return Object.freeze({ kind: "predication.firing.typeMultiplicity" as const, truthOnly, falsityOnly, stableFiring, absurdFiring });
}

/** Classify the firing orbit of a list of charge values under negation. */
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
    orbitType = natIsZero(falsityOnly) ? truthOnlyFiringOrbitType : natIsZero(truthOnly) ? falsityOnlyFiringOrbitType : exchangeMixedFiringOrbitType;
  } else {
    orbitType = mixedFiringOrbitType;
    cardinality = Object.freeze({ kind: "predication.firing.orbitCardinality.variable" as const, supportRank: count(values) });
  }
  return Object.freeze({
    kind: "predication.firing.orbit" as const,
    firingMultiplicities,
    orbitType,
    cardinality,
    duality: orbitType.kind === "predication.firing.orbitType.selfDual"
      ? Object.freeze({ kind: "predication.firing.orbitDuality:witness" as const })
      : Object.freeze({ kind: "predication.firing.orbitDuality-obstruction" as const, orbitType }),
    negated: Object.freeze(values.map(negateValue)),
  });
}

/** The self-duality record of a list of charge values. */
export function firingSelfDuality(values: readonly ChargeValue[]): FiringSelfDuality {
  const orbit = classifyFiringOrbit(values).duality;
  const symmetry: FiringSymmetryJudgment = values.every((value) => sameChargeValue(value, chargeValue("stable")) || sameChargeValue(value, chargeValue("absurd")))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({ kind: "predication.firing.symmetry-obstruction" as const, values: Object.freeze([...values]) });
  const negation: FiringSymmetryJudgment = values.every((value) => sameChargeValue(negateValue(value), value))
    ? Object.freeze({ kind: "predication.firing.symmetry:witness" as const })
    : Object.freeze({ kind: "predication.firing.symmetry-obstruction" as const, values: Object.freeze([...values]) });
  const coherence = orbit.kind === "predication.firing.orbitDuality:witness"
    && symmetry.kind === "predication.firing.symmetry:witness"
    && negation.kind === "predication.firing.symmetry:witness"
    ? Object.freeze({ kind: "predication.firing.selfDualityCoherence:witness" as const })
    : Object.freeze({ kind: "predication.firing.selfDualityCoherence-obstruction" as const, orbit, symmetry, negation });
  return Object.freeze({ kind: "predication.firing.selfDuality" as const, orbit, symmetry, negation, coherence });
}

/** The graded cohomology of a list of charge values. */
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
