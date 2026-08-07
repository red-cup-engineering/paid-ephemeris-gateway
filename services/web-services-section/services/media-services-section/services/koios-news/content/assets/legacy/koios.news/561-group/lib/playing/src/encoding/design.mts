/**
 * Design codec — Girard's dialogical objects as charge valuations.
 *
 * The ludics correspondence theorem makes a design a partial valuation from
 * loci into the bilattice charge: a finite list of `{locusKey, charge}` entries.
 * We serialize each entry as `{locus: <address>, charge: <charge tag>}`, using
 * the same address-array carrier as the rest of the ludics surface.
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
import { locusFromKey, locusKey } from "../index.mjs";
import { decodeLocus, encodeLocus } from "./locus.mjs";
import { asArray, asObject, field } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a design to `{entries: [{locus, charge}, ...]}`. */
export function encodeDesign(value: Design): Json {
  return {
    entries: value.entries.map((entry) => ({
      locus: encodeLocus(locusFromKey(entry.locusKey)),
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
    const key = locusKey(decodeLocus(field(entry, "locus", "design.entry")));
    labelling.set(key, decodeCharge(field(entry, "charge", "design.entry")));
  }
  return design(labelling);
}
