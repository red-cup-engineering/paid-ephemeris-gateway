/**
 * codecs/json — the JSON representation boundary.
 *
 * JSON is the wire form for everything passed *between* scripts. This codec
 * witnesses JSON membership, canonicalizes (object keys sorted, stable bytes so
 * idempotence is detectable across a pipe), and projects JSON-line documents.
 * Free data enters or leaves only through here; core code works over carriers.
 */
import { define, restrict, type Projector, type Resource } from "../holography/index.mjs";

/** A JSON value: the closed universe of JSON. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
/** A JSON object. */
export type JsonRecord = { readonly [key: string]: JsonValue };

/** Whether a value inhabits the JSON universe (finite numbers only, plain objects). */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

/** Whether a value is a JSON object (not null, not an array). */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Witness a value as JSON or throw — the free-data gate. */
export function requireJsonValue(value: unknown, context: string): JsonValue {
  if (!isJsonValue(value)) throw new TypeError(`${context}: not a JSON value`);
  return value;
}

/** Parse JSON text and witness the result as a JSON value. */
export function parse(text: string): JsonValue {
  return requireJsonValue(JSON.parse(text), "json");
}

/** Witness an arbitrary runtime value as a JSON resource by round-tripping it
 *  through JSON and checking membership. The boundary gate for carriers (frozen
 *  class instances, etc.) whose enumerable shape is JSON. */
export function jsonResource(value: unknown, context = "json resource"): JsonValue {
  return requireJsonValue(JSON.parse(JSON.stringify(value)) as unknown, context);
}

/** The canonical serialization of a JSON value: object keys sorted, stable bytes. */
export function canonical(value: JsonValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as JsonRecord;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key] as JsonValue)}`).join(",")}}`;
}

/** The non-blank lines of a document. */
export const nonBlankLines = (content: string): string[] =>
  content.split("\n").filter((line) => line.trim() !== "");

/** Parse newline-delimited JSON, skipping blank lines; each line witnessed. */
export function parseLines(content: string): JsonValue[] {
  const out: JsonValue[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    out.push(parse(trimmed));
  }
  return out;
}

/** Serialize values as newline-delimited canonical JSON (trailing newline). */
export function serializeLines(values: readonly JsonValue[]): string {
  return values.length === 0 ? "" : `${values.map(canonical).join("\n")}\n`;
}

/** The JSON projector: recognizes any content that parses as JSON; reads it as a
 *  single carried value; writes one canonical document. */
export const jsonProjector: Projector<JsonValue> = define<JsonValue>({
  type: "json",
  recognize: (resource: Resource) => {
    try {
      JSON.parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => [parse(resource.content)],
  write: (items) => (items.length === 0 ? "" : `${canonical(items[0] as JsonValue)}\n`),
});

/** The JSON-lines projector: a restriction reading each line as a carried value. */
export const jsonlProjector: Projector<JsonValue> = restrict(jsonProjector, {
  type: "jsonl",
  recognize: (resource) => {
    try {
      parseLines(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => parseLines(resource.content),
  write: (items) => serializeLines(items),
});
