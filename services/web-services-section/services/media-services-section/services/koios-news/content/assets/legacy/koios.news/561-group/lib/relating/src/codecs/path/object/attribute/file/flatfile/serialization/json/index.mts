/**
 * codecs/path/object/attribute/file/flatfile/serialization/json
 *
 * JSON values and canonical deterministic serialization. JSONL is the next
 * restriction under this node; this module owns one complete JSON value.
 */
import { restrict, type Projector } from "../../../../../../../../holography/index.mjs";
import { serializationProjector } from "../projector.mjs";
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** A string-keyed JSON object carrier. */
export type JsonRecord = { readonly [key: string]: JsonValue };

type JsonDocumentCandidate = unknown;

export const JSON_MEDIA_TYPE = "application/json; charset=utf-8";

export const jsonProjector: Projector<unknown> = restrict(serializationProjector, {
  type: "json",
  recognize: (resource) => {
    try {
      parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
});

/** Parse one JSON document. */
export function parse(text: string): JsonValue {
  const value: JsonDocumentCandidate = JSON.parse(text);
  if (isJsonValue(value)) return value;
  throw new TypeError("json: parsed value is not a JSON value");
}

export function isJsonRecord(value: JsonValue): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlainJsonRecord(value: unknown): value is JsonRecord {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return true;
  if (kind === "number") return Number.isFinite(value);
  if (kind !== "object" || value === undefined) return false;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isPlainJsonRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

/** Assert that an in-memory value is a JSON value. */
export function requireJsonValue(value: unknown, label = "value"): JsonValue {
  if (isJsonValue(value)) return value;
  throw new TypeError(`json: ${label} is not a JSON value`);
}

/** Canonical serialization: object keys sorted, no insignificant whitespace. */
export function canonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") return globalThis.JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => globalThis.JSON.stringify(key) + ":" + canonical(item))
    .join(",") + "}";
}
