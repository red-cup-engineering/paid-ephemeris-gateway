import { Mark } from "../../utterance.mjs";

/**
 * The four bilattice charge value names: "absurd" (neither truth nor falsity
 * present), "potential" (truth only), "active" (falsity only), and "stable"
 * (both present).
 */
export type ChargeValueName = "absurd" | "potential" | "active" | "stable";
/** The name of one bilattice charge side coordinate: "absent" or "present". */
export type ChargeSideName = "absent" | "present";

/**
 * A single side coordinate of a bilattice charge: a frozen carrier tagging
 * "bilattice-charge.side" with an "absent" or "present" name.
 */
export interface ChargeSide {
  readonly kind: "bilattice-charge.side";
  readonly name: ChargeSideName;
}

/**
 * A bilattice charge point: a readonly pair of sides, the first the truth
 * coordinate and the second the falsity coordinate.
 */
export type ChargeCoordinates = readonly [truth: ChargeSide, falsity: ChargeSide];

/**
 * A named point of the four-element bilattice: tags "bilattice-charge.value"
 * with a value name and the truth/falsity side coordinates it denotes.
 */
export interface ChargeValue {
  readonly kind: "bilattice-charge.value";
  readonly name: ChargeValueName;
  readonly coordinates: ChargeCoordinates;
}

/**
 * A charge bearing evidence: its value is the truth/falsity coordinate pair,
 * and its evidence is a pair of witness lists for the truth and falsity sides
 * respectively.
 */
export interface ChargeCarrier {
  readonly kind: "bilattice-charge.carrier";
  readonly value: ChargeCoordinates;
  readonly evidence: readonly [readonly Mark[], readonly Mark[]];
}

/**
 * The finite carrier describing the charge bilattice: the enumerated sides and
 * the four enumerated values.
 */
export interface ChargeFiniteAlgebraCarrier {
  readonly kind: "bilattice-charge.finiteAlgebra";
  readonly sides: readonly ChargeSide[];
  readonly values: readonly ChargeValue[];
}

/**
 * An ordered pair of charge carriers, left and right, used as input to order
 * and aggregation operations.
 */
export interface ChargePair {
  readonly left: ChargeCarrier;
  readonly right: ChargeCarrier;
}

/**
 * A witness that a labeling is self-dual under a gauge element: records the
 * labeling, the gauge element applied, and the gauge element's fixed values,
 * with every labeled value fixed.
 */
export interface FiringPatternSelfDualityWitness {
  readonly kind: "bilattice-charge.firingPatternSelfDuality:witness";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
}

/**
 * An obstruction to self-duality of a labeling under a gauge element: records
 * the labeling, the gauge element, its fixed values, and the moving values -
 * labeled values the gauge element does not fix.
 */
export interface FiringPatternSelfDualityObstruction {
  readonly kind: "bilattice-charge.firingPatternSelfDuality-obstruction";
  readonly labeling: readonly ChargeValue[];
  readonly gaugeElement: GaugeElementName;
  readonly fixed: readonly ChargeValue[];
  readonly moving: readonly ChargeValue[];
}

/**
 * The result of testing a labeling for self-duality under a gauge element:
 * either a witness (all values fixed) or an obstruction (some values move).
 */
export type FiringPatternSelfDualityJudgment = FiringPatternSelfDualityWitness | FiringPatternSelfDualityObstruction;

/**
 * Frozen list of all charge side names: "absent" then "present".
 */
export const chargeSideNames: readonly ChargeSideName[] =
  Object.freeze(["absent", "present"] as const satisfies readonly ChargeSideName[]);

/**
 * Frozen list of all charge value names: "absurd", "potential",
 * "active", "stable".
 */
export const chargeValueNames: readonly ChargeValueName[] =
  Object.freeze(["absurd", "potential", "active", "stable"] as const satisfies readonly ChargeValueName[]);

/** Constructs a frozen ChargeSide carrier for the given side name. */
export const chargeSide = (name: ChargeSideName): ChargeSide => Object.freeze({
  kind: "bilattice-charge.side" as const,
  name,
});

const chargeCoordinatesByName: { readonly [name in ChargeValueName]: readonly [truth: ChargeSideName, falsity: ChargeSideName] } = {
  absurd: ["absent", "absent"],
  potential: ["present", "absent"],
  active: ["absent", "present"],
  stable: ["present", "present"],
};

/**
 * Constructs a frozen ChargeValue for the given value name, resolving its
 * truth/falsity side coordinates from the value-to-coordinate table.
 */
export function chargeValue(name: ChargeValueName): ChargeValue {
  const [truth, falsity] = chargeCoordinatesByName[name];
  return Object.freeze({
    kind: "bilattice-charge.value" as const,
    name,
    coordinates: Object.freeze([chargeSide(truth), chargeSide(falsity)] as const),
  });
}

/** Frozen list of all four charge values, one per value name. */
export const chargeValues: readonly ChargeValue[] =
  Object.freeze(chargeValueNames.map(chargeValue));

/**
 * Frozen finite-algebra carrier for the charge bilattice, holding all sides
 * and all four values.
 */
export const chargeFiniteAlgebra: ChargeFiniteAlgebraCarrier = Object.freeze({
  kind: "bilattice-charge.finiteAlgebra" as const,
  sides: Object.freeze(chargeSideNames.map(chargeSide)),
  values: chargeValues,
});

/** Returns the name of a charge side. */
export const chargeSideName = (side: ChargeSide): ChargeSideName => side.name;
/** Returns the name of a charge value. */
export const chargeValueName = (value: ChargeValue): ChargeValueName => value.name;

const sameChargeSide = (left: ChargeSide, right: ChargeSide): boolean => left.name === right.name;
const presentSide = (side: ChargeSide): boolean => sameChargeSide(side, chargeSide("present"));
const absentSide = (side: ChargeSide): boolean => sameChargeSide(side, chargeSide("absent"));
const joinSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) || presentSide(right) ? chargeSide("present") : chargeSide("absent");
const meetSide = (left: ChargeSide, right: ChargeSide): ChargeSide =>
  presentSide(left) && presentSide(right) ? chargeSide("present") : chargeSide("absent");
const complementSide = (side: ChargeSide): ChargeSide => presentSide(side) ? chargeSide("absent") : chargeSide("present");
const leqSide = (left: ChargeSide, right: ChargeSide): boolean => absentSide(left) || presentSide(right);

/**
 * Type guard: holds when the input is a string that names one of the four
 * charge values.
 */
export function isChargeValueName(value: string): value is ChargeValueName {
  return Object.prototype.hasOwnProperty.call(chargeCoordinatesByName, value);
}

/**
 * Type guard: holds when the input is a frozen ChargeSide object with the side
 * kind tag and a valid side name.
 */
export function isChargeSide(value: object): value is ChargeSide {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  return kind === "bilattice-charge.side" && typeof name === "string" && isChargeSideName(name);
}

/** Type guard: holds when the input is the string "absent" or "present". */
export function isChargeSideName(value: string | undefined): value is ChargeSideName {
  return value === "absent" || value === "present";
}

/**
 * Type guard: holds when the input is a ChargeValue object with the value kind
 * tag, a valid value name, and a two-element coordinate pair of valid sides.
 */
export function isChargeValue(value: object): value is ChargeValue {
  const kind = "kind" in value ? value.kind : undefined;
  const name = "name" in value ? value.name : undefined;
  const coordinates = "coordinates" in value ? value.coordinates : undefined;
  return kind === "bilattice-charge.value"
    && typeof name === "string"
    && isChargeValueName(name)
    && Array.isArray(coordinates)
    && coordinates.length === 2
    && typeof coordinates[0] === "object"
    && coordinates[0] !== null
    && isChargeSide(coordinates[0])
    && typeof coordinates[1] === "object"
    && coordinates[1] !== null
    && isChargeSide(coordinates[1]);
}

/**
 * Type guard: holds when the input is a ChargeCarrier with the carrier kind
 * tag, a two-side value pair, and an evidence pair of two arrays.
 */
export function isCharge(value: object): value is ChargeCarrier {
  const kind = "kind" in value ? value.kind : undefined;
  const chargeValue = "value" in value ? value.value : undefined;
  const evidence = "evidence" in value ? value.evidence : undefined;
  return kind === "bilattice-charge.carrier"
    && Array.isArray(chargeValue)
    && chargeValue.length === 2
    && typeof chargeValue[0] === "object"
    && chargeValue[0] !== null
    && isChargeSide(chargeValue[0])
    && typeof chargeValue[1] === "object"
    && chargeValue[1] !== null
    && isChargeSide(chargeValue[1])
    && Array.isArray(evidence)
    && evidence.length === 2
    && Array.isArray(evidence[0])
    && Array.isArray(evidence[1])
    && evidence[0].every((witness) => witness instanceof Mark)
    && evidence[1].every((witness) => witness instanceof Mark);
}

/**
 * Coerces the input to a charge value name, throwing a TypeError naming the
 * valid names if it is not one.
 */
export function asChargeValueName(value: string): ChargeValueName {
  if (!isChargeValueName(value)) {
    throw new TypeError(`not a bilattice charge value name: ${JSON.stringify(value)} (expected one of ${chargeValueNames.join(", ")})`);
  }
  return value;
}

/**
 * Coerces the input to a ChargeValue: returns it unchanged if already a charge
 * value, otherwise constructs the value named by it.
 */
export function asChargeValue(value: ChargeValue | ChargeValueName): ChargeValue {
  if (typeof value === "object" && isChargeValue(value)) return value;
  return chargeValue(asChargeValueName(value));
}

/**
 * Constructs a frozen ChargeCarrier from a value and optional evidence: copies
 * the value's truth/falsity coordinates and freezes copies of the two evidence
 * witness lists, defaulting to empty.
 */
export function charge(value: ChargeValue, evidence: readonly [readonly Mark[], readonly Mark[]] = [[], []]): ChargeCarrier {
  const [truth, falsity] = value.coordinates;
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([truth, falsity] as const),
    evidence: Object.freeze([Object.freeze([...evidence[0]]), Object.freeze([...evidence[1]])] as const),
  });
}

/** Returns the truth/falsity coordinate pair carried by a charge. */
export const present = (c: ChargeCarrier): ChargeCoordinates => c.value;

/** Returns whether two charge values name the same value. */
export const sameChargeValue = (left: ChargeValue, right: ChargeValue): boolean => left.name === right.name;

/**
 * Returns whether two charge carriers denote the same value, comparing the
 * values their coordinates resolve to.
 */
export function sameCharge(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return sameChargeValue(valueOf(left), valueOf(right));
}

/**
 * Returns the ChargeValue named by a carrier's coordinates: "stable" when both
 * sides present, "potential" when only truth, "active" when only falsity,
 * "absurd" when neither.
 */
export function valueOf(c: ChargeCarrier): ChargeValue {
  const [truth, falsity] = c.value;
  if (presentSide(truth) && presentSide(falsity)) return chargeValue("stable");
  if (presentSide(truth)) return chargeValue("potential");
  if (presentSide(falsity)) return chargeValue("active");
  return chargeValue("absurd");
}

/**
 * Knowledge-order bottom carrier: the "absurd" value with no evidence.
 */
export const bottom: ChargeCarrier = charge(chargeValue("absurd"));
/**
 * Returns a "potential" carrier whose truth side carries the given witness as
 * its sole piece of evidence.
 */
export const witnessedPotential = (witness: Mark): ChargeCarrier => charge(chargeValue("potential"), [[witness], []]);

/**
 * Returns the negation of a charge: swaps the truth and falsity coordinates and
 * their corresponding evidence lists.
 */
export function negate(c: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([c.value[1], c.value[0]] as const),
    evidence: Object.freeze([c.evidence[1], c.evidence[0]] as const),
  });
}

/**
 * Returns the conflation of a charge: complements and swaps both side
 * coordinates while keeping the original evidence.
 */
export function conflate(c: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([complementSide(c.value[1]), complementSide(c.value[0])] as const),
    evidence: c.evidence,
  });
}

const mergeEvidence = (left: readonly Mark[], right: readonly Mark[]): readonly Mark[] => {
  const out: Mark[] = [];
  for (const witness of [...left, ...right]) if (!out.some((item) => Object.is(item, witness))) out.push(witness);
  return Object.freeze(out);
};

/**
 * Returns the knowledge-order join of two charges: takes the side-wise join
 * (present if either present) of both coordinates and merges the evidence lists
 * side by side.
 */
export function joinKnowledge(left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([joinSide(left.value[0], right.value[0]), joinSide(left.value[1], right.value[1])] as const),
    evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])] as const),
  });
}

/**
 * Returns the knowledge-order meet of two charges: takes the side-wise meet
 * (present only if both present) of both coordinates and merges the evidence
 * lists side by side.
 */
export function meetKnowledge(left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([meetSide(left.value[0], right.value[0]), meetSide(left.value[1], right.value[1])] as const),
    evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])] as const),
  });
}

/**
 * Returns the truth-order join of two charges: joins the truth sides, meets the
 * falsity sides, and merges the evidence lists side by side.
 */
export function joinTruth(left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([joinSide(left.value[0], right.value[0]), meetSide(left.value[1], right.value[1])] as const),
    evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])] as const),
  });
}

/**
 * Returns the truth-order meet of two charges: meets the truth sides, joins the
 * falsity sides, and merges the evidence lists side by side.
 */
export function meetTruth(left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier {
  return Object.freeze({
    kind: "bilattice-charge.carrier" as const,
    value: Object.freeze([meetSide(left.value[0], right.value[0]), joinSide(left.value[1], right.value[1])] as const),
    evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])] as const),
  });
}

/** Returns the knowledge-order join of two charge values, ignoring evidence. */
export const joinKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(joinKnowledge(charge(left), charge(right)));
/** Returns the knowledge-order meet of two charge values, ignoring evidence. */
export const meetKnowledgeValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(meetKnowledge(charge(left), charge(right)));
/** Returns the truth-order join of two charge values, ignoring evidence. */
export const joinTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(joinTruth(charge(left), charge(right)));
/** Returns the truth-order meet of two charge values, ignoring evidence. */
export const meetTruthValue = (left: ChargeValue, right: ChargeValue): ChargeValue => valueOf(meetTruth(charge(left), charge(right)));
/**
 * Returns the negation of a charge value: the value obtained by swapping its
 * truth and falsity coordinates.
 */
export const negateValue = (value: ChargeValue): ChargeValue => valueOf(negate(charge(value)));
/**
 * Returns the conflation of a charge value: the value obtained by complementing
 * and swapping its coordinates.
 */
export const conflateValue = (value: ChargeValue): ChargeValue => valueOf(conflate(charge(value)));

/**
 * Returns whether the left charge is below or equal to the right in the
 * knowledge order: every side present on the left is present on the right.
 */
export function leqKnowledge(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(left.value[1], right.value[1]);
}

/**
 * Returns the right charge of a pair when the left is below or equal to it in
 * the knowledge order, throwing a TypeError otherwise.
 */
export function compareKnowledge(pair: ChargePair): ChargeCarrier {
  if (!leqKnowledge(pair.left, pair.right)) {
    throw new TypeError("compareKnowledge: no knowledge-order witness; left has knowledge not present in right");
  }
  return pair.right;
}

/**
 * Returns the knowledge-order join of the two charges in a pair, accumulating
 * all of their evidence.
 */
export const aggregate = (pair: ChargePair): ChargeCarrier => joinKnowledge(pair.left, pair.right);

/**
 * Returns whether the left charge is below or equal to the right in the truth
 * order: truth grows and falsity shrinks from left to right.
 */
export function leqTruth(left: ChargeCarrier, right: ChargeCarrier): boolean {
  return leqSide(left.value[0], right.value[0]) && leqSide(right.value[1], left.value[1]);
}

/**
 * Returns whether a charge is the top: both its truth and falsity sides are
 * present (the "stable" value).
 */
export function isTop(c: ChargeCarrier): boolean {
  return presentSide(c.value[0]) && presentSide(c.value[1]);
}

/**
 * Returns whether a charge is the bottom: both its truth and falsity sides are
 * absent (the "absurd" value).
 */
export function isBottom(c: ChargeCarrier): boolean {
  return absentSide(c.value[0]) && absentSide(c.value[1]);
}

/**
 * A name in the gauge group acting on charge values: "id", "negation",
 * "conflation", or "double" (negation composed with conflation).
 */
export type GaugeElementName = "id" | "negation" | "conflation" | "double";

/**
 * Frozen list of all gauge element names: "id", "negation",
 * "conflation", "double".
 */
export const gaugeElementNames: readonly GaugeElementName[] =
  Object.freeze(["id", "negation", "conflation", "double"] as const satisfies readonly GaugeElementName[]);

/**
 * Applies the named gauge element to a charge value: identity for "id",
 * negation, conflation, or their composition for "double".
 */
export function gauge(sigma: GaugeElementName, value: ChargeValue): ChargeValue {
  if (sigma === "negation") return negateValue(value);
  if (sigma === "conflation") return conflateValue(value);
  if (sigma === "double") return negateValue(conflateValue(value));
  return value;
}

/**
 * Returns the frozen list of charge values left unchanged by the named gauge
 * element.
 */
export const fixedSet = (sigma: GaugeElementName): readonly ChargeValue[] =>
  Object.freeze(chargeValues.filter((value) => sameChargeValue(gauge(sigma, value), value)));

/**
 * Tests a labeling for self-duality under a gauge element: returns a witness
 * when every labeled value lies in the gauge element's fixed set, or an
 * obstruction listing the moving values otherwise.
 */
export function firingPatternSelfDuality(labeling: readonly ChargeValue[], sigma: GaugeElementName): FiringPatternSelfDualityJudgment {
  const fixed = fixedSet(sigma);
  const moving = Object.freeze(labeling.filter((value) => !fixed.some((fixedValue) => sameChargeValue(fixedValue, value))));
  return moving.length === 0
    ? Object.freeze({
      kind: "bilattice-charge.firingPatternSelfDuality:witness" as const,
      labeling: Object.freeze([...labeling]),
      gaugeElement: sigma,
      fixed,
    })
    : Object.freeze({
      kind: "bilattice-charge.firingPatternSelfDuality-obstruction" as const,
      labeling: Object.freeze([...labeling]),
      gaugeElement: sigma,
      fixed,
      moving,
    });
}

/**
 * A witness that two charge values are identical: records the equal left and
 * right values.
 */
export interface ChargeValueIdentityWitness {
  readonly kind: "bilattice-charge.valueIdentity:witness";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

/**
 * An obstruction to identity of two charge values: records the differing left
 * and right values.
 */
export interface ChargeValueIdentityObstruction {
  readonly kind: "bilattice-charge.valueIdentity-obstruction";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

/**
 * The result of comparing two charge values for identity: either a witness
 * (equal) or an obstruction (differing).
 */
export type ChargeValueIdentityJudgment = ChargeValueIdentityWitness | ChargeValueIdentityObstruction;

/**
 * Compares two charge values for identity, returning a witness when they name
 * the same value and an obstruction otherwise.
 */
export function chargeValueIdentity(left: ChargeValue, right: ChargeValue): ChargeValueIdentityJudgment {
  return sameChargeValue(left, right)
    ? Object.freeze({ kind: "bilattice-charge.valueIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "bilattice-charge.valueIdentity-obstruction" as const, left, right });
}

/**
 * A witness that left is below or equal to right in the named order
 * ("knowledge" or "truth"): records the two values and the join that coincides
 * with right.
 */
export interface OrderLeqWitness {
  readonly kind: "bilattice-charge.orderLeq:witness";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  /** The join computation that witnesses the bound: join(left, right) coincides with right. */
  readonly join: ChargeValue;
}

/**
 * An obstruction to left being below or equal to right in the named order:
 * records the two values and the join that differs from right.
 */
export interface OrderLeqObstruction {
  readonly kind: "bilattice-charge.orderLeq-obstruction";
  readonly order: "knowledge" | "truth";
  readonly left: ChargeValue;
  readonly right: ChargeValue;
  /** The counterexample: join(left, right) differs from right. */
  readonly join: ChargeValue;
}

/**
 * The result of testing the order relation between two charge values: either a
 * witness (join equals right) or an obstruction (join differs from right).
 */
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

/**
 * Tests whether one charge value is below or equal to another in the knowledge
 * order, witnessed by their knowledge-join coinciding with the right value.
 */
export const knowledgeLeq = orderLeq("knowledge", joinKnowledgeValue);
/**
 * Tests whether one charge value is below or equal to another in the truth
 * order, witnessed by their truth-join coinciding with the right value.
 */
export const truthLeq = orderLeq("truth", joinTruthValue);
