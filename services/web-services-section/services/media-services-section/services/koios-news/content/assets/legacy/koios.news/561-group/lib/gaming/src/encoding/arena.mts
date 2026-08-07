/**
 * Arena codec — concurrent game systems *with symmetry*.
 *
 * An arena is a polarized prime event structure paired with a symmetry
 * groupoid: the feature that promotes plain concurrent games to
 * Castellan-Clairambault-Winskel's $\mathbf{CGS}$.  A `SymmetryGroupoid` is a
 * list of bijections, each a list of `[from, to]` event-id pairs.  Decode
 * reuses the `arena` constructor (and the shared pair codecs) so the result is
 * a real frozen carrier.
 */
import { arena } from "../index.mjs";
import type { Arena, Bijection, SymmetryGroupoid } from "../index.mjs";
import { asArray, asObject, field } from "./json.mjs";
import type { Json } from "./json.mjs";
import { decodeEventPair, decodeEventStructure, encodeEventPair, encodeEventStructure } from "./event-structure.mjs";

function encodeBijection(bij: Bijection): Json {
  return bij.map(encodeEventPair);
}

function decodeBijection(json: unknown): Bijection {
  return asArray(json, "bijection").map((p) => decodeEventPair(p, "bijection")) as Bijection;
}

/** Encode a symmetry groupoid (array of bijections, each an array of `[from, to]` pairs). */
export function encodeSymmetry(value: SymmetryGroupoid): Json {
  return value.map(encodeBijection);
}

/** Decode a symmetry groupoid back to a frozen array-of-bijections. */
export function decodeSymmetry(json: unknown): SymmetryGroupoid {
  return Object.freeze(asArray(json, "symmetry").map(decodeBijection)) as SymmetryGroupoid;
}

/** Encode an arena to `{structure, symmetry}`. */
export function encodeArena(value: Arena): Json {
  return {
    structure: encodeEventStructure(value.structure),
    symmetry: encodeSymmetry(value.symmetry),
  };
}

/** Decode `{structure, symmetry}` back to the frozen `Arena`. */
export function decodeArena(json: unknown): Arena {
  const obj = asObject(json, "arena");
  const structure = decodeEventStructure(field(obj, "structure", "arena"));
  const symmetry = decodeSymmetry(field(obj, "symmetry", "arena"));
  return arena(structure, symmetry);
}

export { encodeBijection, decodeBijection };
