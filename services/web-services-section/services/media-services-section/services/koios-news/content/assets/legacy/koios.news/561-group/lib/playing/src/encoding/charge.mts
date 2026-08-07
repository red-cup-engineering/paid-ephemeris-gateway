/**
 * Charge codec — the apex value, serialized by its stable name.
 *
 * "meme is the APEX": every game object is a configuration of
 * `@emsenn/meme-algebra`, and the atom of that configuration is the bilattice
 * `ChargeValue`.  A charge value is named by one of four stable tags —
 * `absurd` ($\bot$), `potential` ($t$), `active` ($f$), `stable` ($\top$) — so
 * the charge-faithful JSON of a charge is exactly that name string.  Decode
 * guards the tag and rebuilds the *real* frozen charge via `chargeValue`; we do
 * not reinvent the bilattice, we name it.
 */
import { chargeValue, chargeValueName, isChargeValueName } from "@emsenn/relating";
import type { ChargeValue, ChargeValueName } from "@emsenn/relating";
import type { Json } from "./json.mjs";

/** Encode a charge value to its stable name tag (e.g. `"stable"`). */
export function encodeCharge(value: ChargeValue): Json {
  return chargeValueName(value);
}

/** Decode a charge-name tag back to the frozen `ChargeValue`; `TypeError` on a bad tag. */
export function decodeCharge(json: unknown): ChargeValue {
  if (typeof json !== "string" || !isChargeValueName(json)) {
    throw new TypeError(`game-codecs: expected charge-value name, got ${JSON.stringify(json)}`);
  }
  return chargeValue(json as ChargeValueName);
}
