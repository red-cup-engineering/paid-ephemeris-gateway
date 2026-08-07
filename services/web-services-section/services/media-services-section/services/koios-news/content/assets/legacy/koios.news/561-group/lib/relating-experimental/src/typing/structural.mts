/**
 * typing/structural — the structural-type carrier.
 *
 * The codomain of the forgetful functor `realize: Sub(J) → StructuralTypes`. A
 * JSON Schema is a predicate on the universe of JSON values (a subobject in
 * Sub(J)); a TypeScript structural type is an object in a bicartesian category:
 * labeled products (objects), coproducts (unions), intersections, arrays/tuples,
 * literals, and recursion via named fixpoints. This module is that category as
 * data, with no dependency on TypeScript. It is also the semantics the schema
 * codec otherwise lacks: what a schema *means* as a set of values.
 */
import type { JsonValue } from "../codecs/json.mjs";

/** A structural type — an object of the bicartesian category of TS structural types. */
export type StructuralType =
  | { readonly kind: "unknown" }
  | { readonly kind: "never" }
  | { readonly kind: "primitive"; readonly name: "string" | "number" | "boolean" | "null" }
  | { readonly kind: "literal"; readonly value: JsonValue }
  | { readonly kind: "array"; readonly element: StructuralType }
  | { readonly kind: "tuple"; readonly elements: readonly StructuralType[] }
  | { readonly kind: "object"; readonly fields: readonly StructuralField[]; readonly rest: StructuralType | null }
  | { readonly kind: "union"; readonly members: readonly StructuralType[] }
  | { readonly kind: "intersection"; readonly members: readonly StructuralType[] }
  | { readonly kind: "ref"; readonly name: string };

/** One labeled factor of a product (object) type. */
export interface StructuralField {
  readonly name: string;
  readonly type: StructuralType;
  readonly optional: boolean;
}

export const unknownType: StructuralType = Object.freeze({ kind: "unknown" });
export const neverType: StructuralType = Object.freeze({ kind: "never" });

export const primitive = (name: "string" | "number" | "boolean" | "null"): StructuralType =>
  Object.freeze({ kind: "primitive", name });

export const literal = (value: JsonValue): StructuralType => Object.freeze({ kind: "literal", value });

export const array = (element: StructuralType): StructuralType => Object.freeze({ kind: "array", element });

export const tuple = (elements: readonly StructuralType[]): StructuralType =>
  Object.freeze({ kind: "tuple", elements: Object.freeze([...elements]) });

export const ref = (name: string): StructuralType => Object.freeze({ kind: "ref", name });

export const objectType = (fields: readonly StructuralField[], rest: StructuralType | null = null): StructuralType =>
  Object.freeze({ kind: "object", fields: Object.freeze([...fields]), rest });

/** The coproduct, normalized: drop `never`, collapse a singleton, dedupe by shape. */
export function union(members: readonly StructuralType[]): StructuralType {
  const flat = members.flatMap((m) => (m.kind === "union" ? m.members : [m])).filter((m) => m.kind !== "never");
  const seen = new Map<string, StructuralType>();
  for (const m of flat) seen.set(JSON.stringify(m), m);
  const distinct = [...seen.values()];
  if (distinct.length === 0) return neverType;
  if (distinct.length === 1) return distinct[0] as StructuralType;
  return Object.freeze({ kind: "union", members: Object.freeze(distinct) });
}

/** The meet (intersection), normalized: drop `unknown`, collapse a singleton. */
export function intersection(members: readonly StructuralType[]): StructuralType {
  const flat = members.flatMap((m) => (m.kind === "intersection" ? m.members : [m])).filter((m) => m.kind !== "unknown");
  if (flat.length === 0) return unknownType;
  if (flat.length === 1) return flat[0] as StructuralType;
  return Object.freeze({ kind: "intersection", members: Object.freeze(flat) });
}
