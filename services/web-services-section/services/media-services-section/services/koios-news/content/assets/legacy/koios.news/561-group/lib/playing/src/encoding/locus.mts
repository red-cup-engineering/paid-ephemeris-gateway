/**
 * Locus codec — the addresses of ludics.
 *
 * A locus is a finite path from the root of the locus tree: a sequence of
 * natural numbers.  Its charge-faithful JSON is exactly that address array
 * (root = `[]`).  Decode reuses the `locus` constructor.
 */
import { locus } from "../index.mjs";
import type { Locus } from "../index.mjs";
import { asArray, asNumber } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a locus to its address array (root is `[]`). */
export function encodeLocus(value: Locus): Json {
  return [...value.address];
}

/** Decode an address array back to the frozen `Locus`; `TypeError` on non-integer entries. */
export function decodeLocus(json: unknown): Locus {
  const arr = asArray(json, "locus");
  const address = arr.map((n, i) => {
    const num = asNumber(n, `locus.address[${i}]`);
    if (!Number.isInteger(num) || num < 0) {
      throw new TypeError(`game-codecs: locus address must be non-negative integers, got ${JSON.stringify(n)}`);
    }
    return num;
  });
  return locus(address);
}
