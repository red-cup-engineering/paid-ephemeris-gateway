// FOUR — Belnap's four-valued knowledge carrier, as FeltOS's own vocabulary ("neither"/"true"/
// "false"/"both", the {positiveEvidence, negativeEvidence} shape) over the one bilattice algebra:
// `joinKnowledge` here IS `@lenticule-science/metrologic/bilattice/charge`'s `joinKnowledge`, read on an
// evidence-free charge whose `value` is this pair. Nothing about the join is re-derived locally.
import { joinKnowledge as chargeJoinKnowledge } from "@lenticule-science/metrologic/bilattice/charge";

const NAMES = Object.freeze(["neither", "true", "false", "both"]);
const KEYS = Object.freeze(["negativeEvidence", "positiveEvidence"]);

function fail(message) {
  throw new TypeError(message);
}

function hasExactKeys(value) {
  return value !== null
    && typeof value === "object"
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...KEYS].sort().join("\u0000");
}

/** Construct one value in Belnap's FOUR knowledge carrier. */
export function four(positiveEvidence, negativeEvidence) {
  if (typeof positiveEvidence !== "boolean" || typeof negativeEvidence !== "boolean") {
    fail("FOUR evidence bits must be Boolean");
  }
  return Object.freeze({ positiveEvidence, negativeEvidence });
}

export const FOUR = Object.freeze({
  neither: four(false, false),
  true: four(true, false),
  false: four(false, true),
  both: four(true, true),
});

export function validateFour(value) {
  if (!hasExactKeys(value)) fail("FOUR values expose exactly positiveEvidence and negativeEvidence");
  return four(value.positiveEvidence, value.negativeEvidence);
}

export function fourNamed(name) {
  if (!NAMES.includes(name)) fail(`unknown FOUR value: ${String(name)}`);
  return FOUR[name];
}

export function fourName(value) {
  const normalized = validateFour(value);
  if (normalized.positiveEvidence) return normalized.negativeEvidence ? "both" : "true";
  return normalized.negativeEvidence ? "false" : "neither";
}

// FOUR value -> an evidence-free bilattice charge carrying the same [positive, negative] bits.
function toCharge(fourValue) {
  const normalized = validateFour(fourValue);
  return { value: [normalized.positiveEvidence, normalized.negativeEvidence], evidence: [[], []] };
}

/** Least upper bound in the knowledge order: evidence only accumulates. */
export function joinKnowledge(left, right) {
  const { value } = chargeJoinKnowledge({ left: toCharge(left), right: toCharge(right) });
  return four(value[0], value[1]);
}

export function joinEvidence(values) {
  return values.reduce(joinKnowledge, FOUR.neither);
}
