/**
 * Charge-faithful serialization of a category `Morphism`.
 *
 * A morphism $A \to B$ is its source arena, target arena, and the strategy on
 * $A^\perp \| B$ that presents it. The codec reuses `@emsenn/gaming/encoding`
 * (`encodeArena`/`encodeStrategy` and their decoders) for the carriers games
 * already serializes, and rebuilds the morphism with the real `morphism()`
 * constructor — so a decoded morphism is a genuine frozen carrier, round-tripping
 * `morphismEqual` up to structural equality, not a look-alike literal.
 */
import {
  type Json,
  asObject,
  decodeArena,
  decodeStrategy,
  encodeArena,
  encodeStrategy,
  field,
} from "@emsenn/gaming/encoding";
import { type Morphism, morphism } from "../categorifying/morphism.mjs";

export function encodeMorphism(value: Morphism): Json {
  return {
    kind: value.kind,
    source: encodeArena(value.source),
    target: encodeArena(value.target),
    strategy: encodeStrategy(value.strategy),
  };
}

export function decodeMorphism(json: unknown): Morphism {
  const obj = asObject(json, "morphism");
  return morphism(
    decodeArena(field(obj, "source", "morphism")),
    decodeArena(field(obj, "target", "morphism")),
    decodeStrategy(field(obj, "strategy", "morphism")),
  );
}
