import {
  charge,
  chargeValue,
  joinTruth,
  leqTruth,
  meetTruth,
  valueOf,
  type ChargeCarrier,
  type ChargeValueName,
} from "@emsenn/relating-experimental";

export type ChargeStatus = "decided" | "ambiguous" | "void";

export const chargeStatus = (carrier: ChargeCarrier): ChargeStatus => {
  const name = valueOf(carrier).name;
  if (name === "stable") return "ambiguous";
  if (name === "absurd") return "void";
  return "decided";
};

/** Lambek fusion: combine a grammatical predicate and argument in the truth order. */
export const fuse = (left: ChargeCarrier, right: ChargeCarrier): ChargeCarrier =>
  meetTruth(left, right);

const FOUR: readonly ChargeValueName[] = ["absurd", "active", "potential", "stable"];
const valued = (name: ChargeValueName): ChargeCarrier => charge(chargeValue(name));

/** Right residual of fusion: largest a in truth order such that a * b <= c. */
export const implies = (b: ChargeCarrier, c: ChargeCarrier): ChargeCarrier => {
  const bv = valued(valueOf(b).name);
  const cv = valued(valueOf(c).name);
  return FOUR
    .map(valued)
    .filter((a) => leqTruth(fuse(a, bv), cv))
    .reduce((acc, a) => joinTruth(acc, a), valued("active"));
};
