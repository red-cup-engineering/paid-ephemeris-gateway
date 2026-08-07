/**
 * codecs/path/object/attribute/file/flatfile/serialization/json/schema
 *
 * JSON Schema as a JSON boundary whose claim trace is object-spelled EAVT.
 * This is the pure catalog kernel formerly carried by typed-resource-catalog:
 * schema fragments unfold into append-only rows, rows merge by content identity,
 * coherent rows fold back into a projected JSON Schema document.
 */
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { restrict, type Projector } from "../../../../../../../../../holography/index.mjs";
import { type EAVTRecord, eavtId, eavtRecord, foldJson, mergeEavtLogs, unfoldJson } from "../jsonl/eavt/index.mjs";
import { canonical, isJsonValue, jsonProjector, requireJsonValue, type JsonValue } from "../index.mjs";

export const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

export const schemaProjector: Projector<unknown> = restrict(jsonProjector, {
  type: "schema",
  recognize: (resource) => basename(resource.path).endsWith(".schema.json"),
});

export type JsonSchema = { readonly [key: string]: JsonValue };
export type JsonSchemaDocument = JsonValue;

export type SchemaAssertion = Readonly<{
  readonly [key: string]: JsonValue;
  readonly e: string;
  readonly a: string;
  readonly v: JsonValue;
  readonly t: string;
}>;

export type SchemaContradiction = Readonly<{
  readonly e: string;
  readonly a: string;
  readonly values: readonly JsonValue[];
  readonly assertions: readonly SchemaAssertion[];
}>;

export type SchemaCohereResult = Readonly<{
  readonly schema: JsonSchema | null;
  readonly contradictions: readonly SchemaContradiction[];
}>;

export type SchemaProjectResult = Readonly<{
  readonly schema: JsonSchema | null;
  readonly contradictions: readonly SchemaContradiction[];
}>;

export function canonicalJson(value: unknown): string {
  return canonical(requireJsonValue(value, "schema value"));
}

export function schemaAssertionId(assertion: SchemaAssertion): string {
  return createHash("sha256").update(canonicalJson(assertion), "utf8").digest("hex");
}

export function assertSchemaAssertion(value: unknown): SchemaAssertion {
  const row = eavtRecord(requireJsonValue(value, "schema assertion") as EAVTRecord);
  if (typeof row.e !== "string" || row.e.length === 0) throw new TypeError("schema assertion e must be a non-empty string");
  if (typeof row.a !== "string" || row.a.length === 0) throw new TypeError("schema assertion a must be a non-empty string");
  if (typeof row.t !== "string" || row.t.length === 0) throw new TypeError("schema assertion t must be a non-empty string");
  if (!isJsonValue(row.v)) throw new TypeError("schema assertion v must be a JSON value");
  return Object.freeze({ e: row.e, a: row.a, v: row.v, t: row.t });
}

export function parseSchemaAssertions(content: string): SchemaAssertion[] {
  return content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      try {
        return assertSchemaAssertion(JSON.parse(line));
      } catch (error) {
        if (error instanceof Error) error.message = `line ${index + 1}: ${error.message}`;
        throw error;
      }
    });
}

export function serializeSchemaAssertions(assertions: readonly SchemaAssertion[]): string {
  return assertions.map((assertion) => `${canonical(assertSchemaAssertion(assertion))}\n`).join("");
}

export function mergeSchemaAssertions(...traces: readonly (readonly SchemaAssertion[])[]): SchemaAssertion[] {
  return mergeEavtLogs(...traces).map(assertSchemaAssertion);
}

export function unfoldSchema(schema: unknown, opts: { readonly base?: string; readonly t: string }): SchemaAssertion[] {
  if (!opts.t) throw new TypeError("unfoldSchema: opts.t is required");
  const value = requireJsonValue(schema, "schema");
  return unfoldJson(value, { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t }).map(assertSchemaAssertion);
}

export function foldSchema(assertions: readonly SchemaAssertion[]): JsonSchema {
  const schema = foldJson(assertions);
  if (!schema || Array.isArray(schema) || typeof schema !== "object") {
    throw new TypeError("foldSchema: rows did not fold to a JSON object");
  }
  return Object.freeze(schema as JsonSchema);
}

export function cohereSchemaAssertions(assertions: readonly SchemaAssertion[]): SchemaCohereResult {
  const cells = new Map<string, { e: string; a: string; assertions: SchemaAssertion[] }>();
  for (const assertion of assertions.map(assertSchemaAssertion)) {
    const key = `${canonical(assertion.e)}\0${assertion.a}`;
    const cell = cells.get(key) ?? { e: assertion.e, a: assertion.a, assertions: [] };
    cell.assertions.push(assertion);
    cells.set(key, cell);
  }

  const cohered: SchemaAssertion[] = [];
  const contradictions: SchemaContradiction[] = [];
  for (const cell of cells.values()) {
    const distinct = new Map<string, JsonValue>();
    for (const assertion of cell.assertions) distinct.set(canonical(assertion.v), assertion.v);
    if (distinct.size > 1) {
      contradictions.push(Object.freeze({
        e: cell.e,
        a: cell.a,
        values: Object.freeze([...distinct.values()]),
        assertions: Object.freeze([...cell.assertions]),
      }));
      continue;
    }
    cohered.push(cell.assertions.reduce((left, right) => right.t > left.t ? right : left));
  }

  return Object.freeze({
    schema: contradictions.length === 0 ? foldSchema(cohered) : null,
    contradictions: Object.freeze(contradictions),
  });
}

export function projectSchemaAssertions(assertions: readonly SchemaAssertion[], opts: { readonly id: string }): SchemaProjectResult {
  const result = cohereSchemaAssertions(assertions);
  if (result.contradictions.length > 0) return result;
  const schema = result.schema ?? {};
  const claimedId = schema["$id"];
  if (typeof claimedId === "string" && claimedId !== opts.id) {
    throw new Error(`projectSchemaAssertions: claimed $id ${JSON.stringify(claimedId)} does not match ${JSON.stringify(opts.id)}`);
  }
  const { ["$schema"]: _schema, ["$id"]: _id, ...rest } = schema;
  return Object.freeze({
    schema: Object.freeze({ $schema: JSON_SCHEMA_DIALECT, $id: opts.id, ...rest }) as JsonSchema,
    contradictions: Object.freeze([]),
  });
}

export function schemaAssertionTriple(assertion: SchemaAssertion): Readonly<{ readonly s: JsonValue; readonly p: JsonValue; readonly o: JsonValue }> {
  const asserted = assertSchemaAssertion(assertion);
  return Object.freeze({ s: asserted.e, p: asserted.a, o: asserted.v });
}

export function schemaAssertionEavt(assertion: SchemaAssertion): EAVTRecord {
  const asserted = assertSchemaAssertion(assertion);
  return eavtRecord({ e: asserted.e, a: asserted.a, v: asserted.v, t: asserted.t });
}

export function schemaAssertionEavtId(assertion: SchemaAssertion): string {
  return eavtId(schemaAssertionEavt(assertion));
}

export function resolveJsonPointer(document: JsonValue, fragment: string): JsonValue | undefined {
  if (!fragment) return document;
  const pointer = fragment.startsWith("/") ? fragment : fragment.startsWith("#/") ? fragment.slice(1) : fragment;
  if (!pointer.startsWith("/")) return undefined;
  let current: JsonValue | undefined = document;
  for (const rawPart of pointer.slice(1).split("/")) {
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) current = current[Number(part)];
    else current = (current as Record<string, JsonValue>)[part];
  }
  return current;
}
