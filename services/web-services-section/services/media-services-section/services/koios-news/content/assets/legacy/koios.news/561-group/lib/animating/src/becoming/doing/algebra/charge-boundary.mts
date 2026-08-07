// charge-boundary.mts — name-level reads of the bedrock charge values.
//
// Everything here is STATED over @emsenn/relating's bilattice: the
// truth/falsity sides come from the bedrock value coordinates, never from a
// hand-rolled truth table. The four names — absurd / potential / active /
// stable — mean exactly what the bedrock computes them to mean.

import {
  chargeValue,
  chargeValues,
  joinKnowledgeValue,
  valueOf,
  type ChargeCarrier,
  type ChargeValue,
  type ChargeValueName,
} from "@emsenn/relating";

/** Which evidence sides a charge value admits: [truth present, falsity present]. */
export function chargeSidesOf(name: ChargeValueName): readonly [truthPresent: boolean, falsityPresent: boolean] {
  const [truth, falsity] = chargeValue(name).coordinates;
  return [truth.name === "present", falsity.name === "present"];
}

/** The charge value named by a pair of evidence sides. Total: FOUR covers all four side pairs. */
export function chargeNameOfSides(truthPresent: boolean, falsityPresent: boolean): ChargeValueName {
  for (const value of chargeValues) {
    const [truth, falsity] = value.coordinates;
    if ((truth.name === "present") === truthPresent && (falsity.name === "present") === falsityPresent) {
      return value.name;
    }
  }
  throw new TypeError("chargeNameOfSides: the bilattice is total on side pairs; this is unreachable");
}

/** The canonical bedrock charge value object for a charge value name. */
export function chargeValueNamed(name: ChargeValueName): ChargeValue {
  return chargeValue(name);
}

/** Read a bedrock charge carrier down to its value name. */
export function chargeNameOfCarrier(carrier: ChargeCarrier): ChargeValueName {
  const [truth, falsity] = valueOf(carrier).coordinates;
  return chargeNameOfSides(truth.name === "present", falsity.name === "present");
}

/** Read a bedrock charge carrier down to the canonical charge value object. */
export function chargeValueOfCarrier(carrier: ChargeCarrier): ChargeValue {
  return chargeValueNamed(chargeNameOfCarrier(carrier));
}

/** Knowledge-join a sequence of charge value names. Empty joins to "absurd" (the knowledge bottom). */
export function joinKnowledgeNames(names: Iterable<ChargeValueName>): ChargeValueName {
  let acc = chargeValue("absurd");
  for (const name of names) acc = joinKnowledgeValue(acc, chargeValue(name));
  return acc.name;
}
