/**
 * Design codec — Girard's dialogical objects as charge valuations.
 *
 * The ludics correspondence theorem makes a design a partial valuation from
 * loci into the bilattice charge: a finite list of `{locusKey, charge}` entries.
 * We serialize each entry as `{locus: <key string>, charge: <charge tag>}` (the
 * entry already stores its locus *key*, so no locus address array is needed).
 *
 * Round-trip note: `design(map)` drops any entry whose charge is `absurd`
 * ($\bot$) — that is the default, the no-action region.  This is harmless for
 * round-tripping because a design's support never carries `absurd` (entries
 * with $\bot$ are already dropped at construction), so `encode` never emits one
 * and `decode` never needs to preserve one.
 */
import { design } from "../index.mjs";
import type { Design } from "../index.mjs";
import type { ChargeValue } from "@emsenn/relating";
import { decodeCharge, encodeCharge } from "./charge.mjs";
import { asArray, asObject, asString, field } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a design to `{entries: [{locus, charge}, ...]}`. */
export function encodeDesign(value: Design): Json {
  return {
    entries: value.entries.map((entry) => ({
      locus: entry.locusKey,
      charge: encodeCharge(entry.charge),
    })),
  };
}

/** Decode `{entries: [{locus, charge}, ...]}` back to the frozen `Design`. */
export function decodeDesign(json: unknown): Design {
  const obj = asObject(json, "design");
  const entries = asArray(field(obj, "entries", "design"), "design.entries");
  const labelling = new Map<string, ChargeValue>();
  for (const raw of entries) {
    const entry = asObject(raw, "design.entry");
    const key = asString(field(entry, "locus", "design.entry"), "design.entry.locus");
    labelling.set(key, decodeCharge(field(entry, "charge", "design.entry")));
  }
  return design(labelling);
}
