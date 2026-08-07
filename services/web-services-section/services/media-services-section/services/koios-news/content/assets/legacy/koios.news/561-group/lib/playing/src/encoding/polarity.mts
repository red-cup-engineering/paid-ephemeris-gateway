/**
 * Polarity codec — Player/Opponent duality, serialized by its name.
 *
 * A polarity is the dualizing $(-)^\perp$ of $\mathbf{CGS}$, a Belnap class of
 * the apex charge; its serialized form is its name (`"positive"` / `"negative"`).
 * Decode reuses the `polarity` constructor so the result is a real frozen carrier.
 */
import { polarity } from "../index.mjs";
import type { Polarity } from "../index.mjs";
import { asString } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a polarity to its name tag. */
export function encodePolarity(value: Polarity): Json {
  return value.name;
}

/** Decode a polarity-name tag back to the frozen `Polarity`; `TypeError` on a bad tag. */
export function decodePolarity(json: unknown): Polarity {
  const name = asString(json, "polarity");
  if (name !== "positive" && name !== "negative") {
    throw new TypeError(`game-codecs: expected polarity name, got ${JSON.stringify(json)}`);
  }
  return polarity(name);
}
