/**
 * typing/print — the representation boundary: a structural type printed as TS.
 *
 * The second morphism of the type pipeline (realize, then print). Prints a
 * StructuralType as TypeScript source and assembles a `.d.mts`-style declaration
 * for a schema and its `$defs` — named types so `$ref` recursion is preserved as
 * named fixpoints, never inlined.
 */
import { canonical, type JsonValue } from "../codecs/json.mjs";
import { realize, realizeDefs } from "./realize.mjs";
import type { StructuralType } from "./structural.mjs";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function key(name: string): string {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name);
}

/** Print a structural type as a TypeScript type expression. */
export function printType(type: StructuralType): string {
  switch (type.kind) {
    case "unknown": return "unknown";
    case "never": return "never";
    case "primitive": return type.name;
    case "literal": return canonical(type.value as JsonValue);
    case "ref": return type.name;
    case "array": return `Array<${printType(type.element)}>`;
    case "tuple": return `[${type.elements.map(printType).join(", ")}]`;
    case "union": return type.members.map(printType).join(" | ");
    case "intersection": return type.members.map((m) => `(${printType(m)})`).join(" & ");
    case "object": {
      const fields = type.fields.map((field) => `${key(field.name)}${field.optional ? "?" : ""}: ${printType(field.type)};`);
      if (type.rest !== null) fields.push(`[key: string]: ${printType(type.rest)};`);
      return fields.length === 0 ? "Record<string, never>" : `{ ${fields.join(" ")} }`;
    }
  }
}

function declare(name: string, type: StructuralType): string {
  return type.kind === "object" && type.rest === null
    ? `export interface ${name} ${printType(type)}`
    : `export type ${name} = ${printType(type)};`;
}

/** Assemble a `.d.mts`-style declaration for a schema's root and its `$defs`. */
export function generateDeclaration(schema: JsonValue, rootName: string): string {
  const lines: string[] = [
    "// Generated from object.schema.json by realize: Sub(J) → StructuralTypes.",
    "// Refinements (minLength, pattern, format, …) are forgotten here and remain",
    "// the schema's runtime law. Do not edit by hand.",
    "",
  ];
  for (const [name, type] of realizeDefs(schema)) lines.push(declare(name, type), "");
  lines.push(declare(rootName, realize(schema)), "");
  return lines.join("\n");
}
