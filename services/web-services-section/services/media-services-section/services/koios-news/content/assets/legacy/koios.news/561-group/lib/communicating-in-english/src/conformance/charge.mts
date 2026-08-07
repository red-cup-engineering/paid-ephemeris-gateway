import {
  mark,
  negate,
  witnessedPotential,
  type ChargeCarrier,
  type Mark,
} from "@emsenn/relating-experimental";

const isMark = (value: unknown): value is Mark =>
  typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.mark";

const witnessMark = (witness: unknown): Mark => isMark(witness) ? witness : mark(witness);

export const compliant = (witness: unknown): ChargeCarrier =>
  witnessedPotential(witnessMark(witness));

export const violation = (witness: unknown): ChargeCarrier =>
  negate(compliant(witness));
