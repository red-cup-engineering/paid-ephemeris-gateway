/**
 * Play codec — positions with history.
 *
 * A play is a sequence of moves (event ids); its charge-faithful JSON is the
 * moves array.  Decode reuses the `play` constructor.
 */
import { play } from "../index.mjs";
import type { Play } from "../index.mjs";
import { asArray, asString } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a play to its moves array. */
export function encodePlay(value: Play): Json {
  return [...value.moves];
}

/** Decode a moves array back to the frozen `Play`. */
export function decodePlay(json: unknown): Play {
  const arr = asArray(json, "play");
  return play(arr.map((m, i) => asString(m, `play.moves[${i}]`)));
}
