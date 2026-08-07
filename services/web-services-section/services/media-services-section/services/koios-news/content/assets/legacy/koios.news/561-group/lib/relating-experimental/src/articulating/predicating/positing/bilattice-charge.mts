/**
 * positing/bilattice-charge — the four-valued bilattice of charge.
 *
 * Belnap's FOUR as a charge: a pair of independent sides (truth, falsity), each
 * "absent" or "present", naming `absurd` (neither), `potential` (truth only),
 * `active` (falsity only), `stable` (both). A `ChargeCarrier` also bears the
 * evidence — the witness Marks — accumulated on each side. Two orders share the
 * underlying sides: the KNOWLEDGE order grows both sides; the TRUTH order grows
 * truth and shrinks falsity. Negation swaps the sides; conflation complements and
 * swaps; together with identity and their composite they form the Klein-four
 * gauge group acting on the values.
 *
 * Charges are never admitted directly — they are constructed from evidence and
 * joined; positing/settling derive them. Evidence is deduped by STRUCTURAL
 * content coincidence (this package is content-addressed and boundary-first), so
 * two witnesses with equal payloads count once and survive a transport round-trip.
 */
import { coincides, Mark } from "../../utterance.mjs";

/** The four bilattice charge value names. */
export type ChargeValueName = "absurd" | "potential" | "active" | "stable";
/** A charge side coordinate name. */
export type ChargeSideName = "absent" | "present";

/** One side coordinate of a charge. */
export interface ChargeSide {
  readonly kind: "bilattice-charge.side";
  readonly name: ChargeSideName;
}

/** A charge point: [truth, falsity] sides. */
export type ChargeCoordinates = readonly [truth: ChargeSide, falsity: ChargeSide];

/** A named point of the four-element bilattice. */
export interface ChargeValue {
  readonly kind: "bilattice-charge.value";
  readonly name: ChargeValueName;
  readonly coordinates: ChargeCoordinates;
}

/** A charge bearing evidence: the side coordinates and the witness lists per side. */
export interface ChargeCarrier {
  readonly kind: "bilattice-charge.carrier";
  readonly value: ChargeCoordinates;
  readonly evidence: readonly [readonly Mark[], readonly Mark[]];
}

/** The finite carrier of the charge bilattice: its sides and four values. */
export interface ChargeFiniteAlgebraCarrier {
  readonly kind: "bilattice-charge.finiteAlgebra";
  readonly sides: readonly ChargeSide[];
  readonly values: readonly ChargeValue[];
}

/** An ordered pair of charges. */
export interface ChargePair {
  readonly left: ChargeCarrier;
  readonly right: ChargeCarrier;
}

/** All charge side names. */
export const chargeSideNames: readonly ChargeSideName[] =
  Object.freeze(["absent", "present"] as const satisfies readonly ChargeSideName[]);

/** All charge value names. */
export const chargeValueNames: readonly ChargeValueName[] =
  Object.freeze(["absurd", "potential", "active", "stable"] as const satisfies readonly ChargeValueName[]);

/** Construct a charge side. */
export const chargeSide = (name: ChargeSideName): ChargeSide => Object.freeze({ kind: "bilattice-charge.side" as const, name });

const chargeCoordinatesByName: { readonly [name in ChargeValueName]: readonly [truth: ChargeSideName, falsity: ChargeSideName] } = {
  absurd: ["absent", "absent"],
  potential: ["present", "absent"],
  active: ["absent", "present"],
  stable: ["present", "present"],
};

/** Construct a charge value by name, resolving its side coordinates. */
export function chargeValue(name: ChargeValueName): ChargeValue {
  const [truth, falsity] = chargeCoordinatesByName[name];
  return Object.freeze({
    kind: "bilattice-charge.value" as const,
    name,
    coordinates: Object.freeze([chargeSide(truth), chargeSide(falsity)] as const),
  });
}

/** All four charge values. */
export const chargeValues: readonly ChargeValue[] = Object.freeze(chargeValueNames.map(chargeValue));

/** The finite-algebra carrier of the charge bilattice. */
export const chargeFiniteAlgebra: ChargeFiniteAlgebraCarrier = Object.freeze({
  kind: "bilattice-charge.finiteAlgebra" as const,
  sides: Object.freeze(chargeSideNames.map(chargeSide)),
  values: chargeValues,
});

/** The name of a charge side. */
export const chargeSideName = (side: ChargeSide): ChargeSideName => side.name;
/** The name of a charge value. */
export const chargeValueName = (value: ChargeValue): ChargeValueName => value.name;

const sameSide = (left: ChargeSide, right: ChargeSide): boolean => left.name === right.name;
const presentSide = (side: ChargeSide): boolean => sameSide(side, chargeSide("present"));
const absentSide = (side: ChargeSide): boolean => sameSide(side, chargeSide("absent"));
const joinSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) || presentSide(right) ? chargeSide("present") : chargeSide("absent");
const meetSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) && presentSide(right) ? chargeSide("present") : chargeSide("absent");
const complementSide = (side: ChargeSide): ChargeSide => presentSide(side) ? chargeSide("absent") : chargeSide("present");
const leqSide = (left: ChargeSide, right: ChargeSide): boolean => absentSide(left) || presentSide(right);

/** Whether a string names a charge value. */
export function isChargeValueName(value: string): value is ChargeValueName {
  return Object.prototype.hasOwnProperty.call(chargeCoordinatesByName, value);
}

/** Whether a string names a charge side. */
export function isChargeSideName(value: string | undefined): value is ChargeSideName {
  return value === "absent" || value === "present";
}

/** Type guard for a charge side. */
export function isChargeSide(value: object): value is ChargeSide {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  return kind === "bilattice-charge.side" && typeof name === "string" && isChargeSideName(name);
}

/** Type guard for a charge value. */
export function isChargeValue(value: object): value is ChargeValue {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  const coordinates = "coordinates" in value ? value.coordinates : undefined;
  return kind === "bilattice-charge.value"
    && typeof name === "string"
    && isChargeValueName(name)
    && Array.isArray(coordinates)
    && coordinates.length === 2
    && typeof coordinates[0] === "object" && coordinates[0] !== null && isChargeSide(coordinates[0])
    && typeof coordinates[1] === "object" && coordinates[1] !== null && isChargeSide(coordinates[1]);
}

/** Type guard for a charge carrier. */
export function isCharge(value: object): value is ChargeCarrier {
  const kind = "kind" in value ? value.kind : undefined;
  const chargeValue = "value" in value ? value.value : undefined;
  const evidence = "evidence" in value ? value.evidence : undefined;
  return kind === "bilattice-charge.carrier"
    && Array.isArray(chargeValue) && chargeValue.length === 2
    && typeof chargeValue[0] === "object" && chargeValue[0] !== null && isChargeSide(chargeValue[0])
    && typeof chargeValue[1] === "object" && chargeValue[1] !== null && isChargeSide(chargeValue[1])
    && Array.isArray(evidence) && evidence.length === 2
    && Array.isArray(evidence[0]) && Array.isArray(evidence[1])
    && evidence[0].every((witness) => witness instanceof Mark)
    && evidence[1].every((witness) => witness instanceof Mark);
}

/** Coerce a string to a charge value name, or throw. */
export function asChargeValueName(value: string): ChargeValueName {
  if (!isChargeValueName(value)) {
    throw new TypeError(`not a bilattice charge value name: ${JSON.stringify(value)} (expected one of ${chargeValueNames.join(", ")})`);
  }
  return value;
}

/** Coerce a value or name to a charge value. */
export function asChargeValue(value: ChargeValue | ChargeValueName): ChargeValue {
  if (typeof value === "object" && isChargeValue(value)) return value;
  return chargeValue(asChargeValueName(value));
}

/** Construct a charge carrier from a value and optional evidence. */
export function charge(value: ChargeValue, evidence: readonly [readonly Mark[], readonly Mark[]] = [[], []]): ChargeCarrier {
  const [truth, falsity] = value.coordinates;
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([truth, falsity] as const),
    evidence: Object.freeze([Object.freeze([...evidence[0]]), Object.freeze([...evidence[1]])] as const),
  });
}

/** The coordinate pair a charge carries. */
export const present = (c: ChargeCarrier): ChargeCoordinates => c.value;

/** Whether two charge values name the same value. */
export const sameChargeValue = (left: ChargeValue, right: ChargeValue): boolean => left.name === right.name;

/** Whether two charge carriers denote the same value. */
export function sameCharge(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return sameChargeValue(valueOf(left), valueOf(right));
}

/** The charge value named by a carrier's coordinates. */
export function valueOf(c: ChargeCarrier): ChargeValue {
  const [truth, falsity] = c.value;
  if (presentSide(truth) && presentSide(falsity)) return chargeValue("stable");
  if (presentSide(truth)) return chargeValue("potential");
  if (presentSide(falsity)) return chargeValue("active");
  return chargeValue("absurd");
}

/** The knowledge-order bottom: absurd with no evidence. */
export const bottom: ChargeCarrier = charge(chargeValue("absurd"));

/** A potential carrier whose truth side carries the given witness. */
export const witnessedPotential = (witness: Mark): ChargeCarrier => charge(chargeValue("potential"), [[witness], []]);

/** Negate a charge: swap truth and falsity sides and their evidence. */
export function negate(c: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([c.value[1], c.value[0]] as const),
    evidence: Object.freeze([c.evidence[1], c.evidence[0]] as const),
  });
}

/** Conflate a charge: complement and swap both sides, keeping evidence. */
export function conflate(c: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([complementSide(c.value[1]), complementSide(c.value[0])] as const),
    evidence: c.evidence,
  });
}

// Evidence merges by structural content coincidence (content-addressed), so equal
// payloads count once and survive a JSON round-trip.
const mergeEvidence = (left: readonly Mark[], right: readonly Mark[]): readonly Mark[] => {
  const out: Mark[] = [];
  for (const witness of [...left, ...right]) if (!out.some((item) => coincides(item.value, witness.value))) out.push(witness);
  return Object.freeze(out);
};

const combine = (
  truth: (l: ChargeSide, r: ChargeSide) => ChargeSide,
  falsity: (l: ChargeSide, r: ChargeSide) => ChargeSide,
) => (left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier => Object.freeze({
  kind: "bilattice-charge.carrier" as const,
  value: Object.freeze([truth(left.value[0], right.value[0]), falsity(left.value[1], right.value[1])] as const),
  evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])] as const),
});

/** Knowledge-order join: both sides grow. */
export const joinKnowledge = combine(joinSide, joinSide);
/** Knowledge-order meet: both sides shrink. */
export const meetKnowledge = combine(meetSide, meetSide);
/** Truth-order join: truth grows, falsity shrinks. */
export const joinTruth = combine(joinSide, meetSide);
/** Truth-order meet: truth shrinks, falsity grows. */
export const meetTruth = combine(meetSide, joinSide);

/** Knowledge-order join of values (evidence ignored). */
export const joinKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(joinKnowledge(charge(left), charge(right)));
/** Knowledge-order meet of values. */
export const meetKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(meetKnowledge(charge(left), charge(right)));
/** Truth-order join of values. */
export const joinTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(joinTruth(charge(left), charge(right)));
/** Truth-order meet of values. */
export const meetTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(meetTruth(charge(left), charge(right)));
/** Negation of a charge value. */
export const negateValue = (value: ChargeValue): ChargeValue => valueOf(negate(charge(value)));
/** Conflation of a charge value. */
export const conflateValue = (value: ChargeValue): ChargeValue => valueOf(conflate(charge(value)));

/** Whether left ≤ right in the knowledge order. */
export function leqKnowledge(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(left.value[1], right.value[1]);
}

/** The right charge of a pair when left ≤ right in the knowledge order, else throw. */
export function compareKnowledge(pair: ChargePair): ChargeCarrier {
  if (!leqKnowledge(pair.left, pair.right)) {
    throw new TypeError("compareKnowledge: no knowledge-order witness; left has knowledge not present in right");
  }
  return pair.right;
}

/** The knowledge-order join of a pair, accumulating evidence. */
export const aggregate = (pair: ChargePair): ChargeCarrier => joinKnowledge(pair.left, pair.right);

/** Whether left ≤ right in the truth order (truth grows, falsity shrinks). */
export function leqTruth(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(right.value[1], left.value[1]);
}

/** Whether a charge is the top (stable). */
export function isTop(c: ChargeCarrier): boolean {
  return presentSide(c.value[0]) && presentSide(c.value[1]);
}

/** Whether a charge is the bottom (absurd). */
export function isBottom(c: ChargeCarrier): boolean {
  return absentSide(c.value[0]) && absentSide(c.value[1]);
}

/** A gauge group element acting on charge values. */
export type GaugeElementName = "id" | "negation" | "conflation" | "double";

/** All gauge element names. */
export const gaugeElementNames: readonly GaugeElementName[] =
  Object.freeze(["id", "negation", "conflation", "double"] as const satisfies readonly GaugeElementName[]);

/** Apply a gauge element to a charge value. */
export function gauge(sigma: GaugeElementName, value: ChargeValue): ChargeValue {
  if (sigma === "negation") return negateValue(value);
  if (sigma === "conflation") return conflateValue(value);
  if (sigma === "double") return negateValue(conflateValue(value));
  return value;
}

/** The charge values fixed by a gauge element. */
export const fixedSet = (sigma: GaugeElementName): readonly ChargeValue[] =>
  Object.freeze(chargeValues.filter((value) => sameChargeValue(gauge(sigma, value), value)));

/** A witness that a labeling is self-dual under a gauge element. */
export interface FiringPatternSelfDualityWitness {
  readonly kind: "bilattice-charge.firingPatternSelfDuality:witness";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
}

/** An obstruction to self-duality of a labeling under a gauge element. */
export interface FiringPatternSelfDualityObstruction {
  readonly kind: "bilattice-charge.firingPatternSelfDuality-obstruction";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
  readonly moving: readonly ChargeValue[];
}

/** The result of testing a labeling for self-duality under a gauge element. */
export type FiringPatternSelfDualityJudgment = FiringPatternSelfDualityWitness | FiringPatternSelfDualityObstruction;

/** Test a labeling for self-duality under a gauge element. */
export function firingPatternSelfDuality(labeling: readonly ChargeValue[], sigma: GaugeElementName): FiringPatternSelfDualityJudgment {
  const fixed = fixedSet(sigma);
  const moving = Object.freeze(labeling.filter((value) => !fixed.some((fixedValue) => sameChargeValue(fixedValue, value))));
  return moving.length === 0
    ? Object.freeze({ kind: "bilattice-charge.firingPatternSelfDuality:witness" as const, labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed })
    : Object.freeze({ kind: "bilattice-charge.firingPatternSelfDuality-obstruction" as const, labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed, moving });
}

/** A witness that two charge values are identical. */
export interface ChargeValueIdentityWitness {
  readonly kind: "bilattice-charge.valueIdentity:witness";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

/** An obstruction to identity of two charge values. */
export interface ChargeValueIdentityObstruction {
  readonly kind: "bilattice-charge.valueIdentity-obstruction";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

/** The result of comparing two charge values for identity. */
export type ChargeValueIdentityJudgment = ChargeValueIdentityWitness | ChargeValueIdentityObstruction;

/** Compare two charge values for identity. */
export function chargeValueIdentity(left: ChargeValue, right: ChargeValue): ChargeValueIdentityJudgment {
  return sameChargeValue(left, right)
    ? Object.freeze({ kind: "bilattice-charge.valueIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "bilattice-charge.valueIdentity-obstruction" as const, left, right });
}

/** A witness that left ≤ right in the named order. */
export interface OrderLeqWitness {
  readonly kind: "bilattice-charge.orderLeq:witness";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly join: ChargeValue;
}

/** An obstruction to left ≤ right in the named order. */
export interface OrderLeqObstruction {
  readonly kind: "bilattice-charge.orderLeq-obstruction";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  readonly join: ChargeValue;
}

/** The result of testing the order relation between two charge values. */
export type OrderLeqJudgment = OrderLeqWitness | OrderLeqObstruction;

const orderLeq = (
  order: "knowledge" | "truth",
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue,
) => (left: ChargeValue, right: ChargeValue): OrderLeqJudgment => {
  const joined = join(left, right);
  return sameChargeValue(joined, right)
    ? Object.freeze({ kind: "bilattice-charge.orderLeq:witness" as const, order, left, right, join: joined })
    : Object.freeze({ kind: "bilattice-charge.orderLeq-obstruction" as const, order, left, right, join: joined });
};

/** Whether one charge value is ≤ another in the knowledge order. */
export const knowledgeLeq = orderLeq("knowledge", joinKnowledgeValue);
/** Whether one charge value is ≤ another in the truth order. */
export const truthLeq = orderLeq("truth", joinTruthValue);
