import { join, sep } from "node:path";
import { mark, utterance, type UtteranceCarrier } from "../articulating/index.mjs";
import type { JsonValue } from "./path/object/attribute/file/flatfile/serialization/json/index.mjs";
import { eavtRecord, type EAVT, type EAVTRecord } from "./path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";

export * as path from "./path/index.mjs";
export {
  escapeAttr,
  escapeText,
  slug,
} from "./path/object/attribute/file/flatfile/serialization/html/index.mjs";
export type { HtmlValue } from "./path/object/attribute/file/flatfile/serialization/html/escape.mjs";

export {
  canonical,
  canonicalJson,
  cellToEavt,
  currentDatomValue,
  decodeToml,
  encodeToml,
  EAVT_JSONL,
  eavtToCell,
  allDocumentTypeAssertions,
  assertTriple,
  dedupeTriples,
  documentTypeAssertions,
  documentTypeDefinitions,
  documentTypeFragment,
  foldObjectDatoms,
  iriRef,
  isJsonRecord,
  isJsonValue,
  isEavtShape,
  objectDatomId,
  objectDatomWitnesses,
  objectDatomsAsOf,
  markdownDocumentSchemaFragment,
  markdownDataform,
  markdownProjector,
  normalizePath,
  parseDatoms,
  parseEavt,
  parseJson,
  parseLines,
  parseJsonlLines,
  pathBasename,
  pathOfPoint,
  pathParent,
  pathPoint,
  projectSchemaAssertions,
  requireJsonValue,
  resolveJsonPointer,
  schemaProjector,
  serializeDatoms,
  serializeEavt,
  serializeLines,
  serializeJsonlLines,
  toEavt,
  tripleFromDatom,
  tripleFromEavt,
  tripleId,
  turtleLiteral,
  unfoldSchema,
  validPath,
  type CurrentDatomFact,
  type Cell,
  type Datom,
  type DocumentTypeDefinition,
  type EAVT,
  type JsonRecord,
  type JsonSchema,
  type MarkdownDataform,
  type ObjectDatom,
  type ObjectDatomCharge,
  type ObjectDatomSection,
  type ObjectDatomSectionCell,
  type SchemaAssertion,
  type Triple,
  type JsonValue,
  type TomlTable,
  type TomlValue,
} from "./path/index.mjs";

/** An addressable term: a JSON value or a readonly array of JSON path parts. */
export type AddressTerm = JsonValue | readonly JsonValue[];
type MutableJsonRecord = { [key: string]: JsonValue };
type UtteranceLogEntry = Readonly<{ token: JsonValue; claim: JsonValue }>;

const JSON_TERM_PREFIX = "~json:";
const STRING_TERM_PREFIX = "~string:";
const ESC = "~";
const SAFE = /[A-Za-z0-9._-]/;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function asJsonValue(value: unknown, context: string): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${context}: non-finite number is not a JSON value`);
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((item, index) => asJsonValue(item, `${context}[${index}]`)));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: MutableJsonRecord = {};
    for (const [key, item] of Object.entries(value)) out[key] = asJsonValue(item, `${context}.${key}`);
    return Object.freeze(out);
  }
  throw new TypeError(`${context}: not a JSON value`);
}

function jsonRecord(value: JsonValue): Readonly<Record<string, JsonValue>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, JsonValue>>
    : null;
}

/** Dehydrate utterance carriers into a JSON-compatible utterance-log carrier.
 *
 * The wire form stores token and claim mark values only. Rehydration creates
 * fresh marks, so this codec preserves carried content without claiming mark
 * coincidence across peers.
 */
export function dehydrateUtterances(utterances: readonly UtteranceCarrier[]): JsonValue {
  const encoded = utterances.map((carrier, index): UtteranceLogEntry => {
    const context = `dehydrateUtterances: utterance ${index}`;
    if (typeof carrier !== "object" || carrier === null || carrier.kind !== "utterance.carrier") {
      throw new TypeError(`${context}: expected an utterance carrier`);
    }
    return Object.freeze({
      token: asJsonValue(carrier.token.mark.value, `${context} token mark value`),
      claim: asJsonValue(carrier.claim.mark.value, `${context} claim mark value`),
    });
  });
  return Object.freeze({ kind: "meme-topology.utteranceLog", utterances: Object.freeze(encoded) });
}

/** Rehydrate a JSON utterance-log carrier into fresh utterance carriers. */
export function rehydrateUtterances(value: JsonValue): readonly UtteranceCarrier[] {
  const record = jsonRecord(value);
  if (record === null) throw new TypeError("rehydrateUtterances: expected an utterance log object");
  if (record["kind"] !== "meme-topology.utteranceLog" || !Array.isArray(record["utterances"])) {
    throw new TypeError("rehydrateUtterances: expected a meme-topology.utteranceLog carrier");
  }
  return Object.freeze(record["utterances"].map((entry, index) => {
    const item = jsonRecord(entry);
    const context = `rehydrateUtterances: utterance ${index}`;
    if (item === null) throw new TypeError(`${context}: expected an encoded utterance`);
    if (!("token" in item) || !("claim" in item)) {
      throw new TypeError(`${context}: encoded utterance must carry token and claim mark values`);
    }
    return utterance(mark(item["token"]), mark(item["claim"]));
  }));
}

const canonicalTermValue = (value: JsonValue): JsonValue => {
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("termKey: non-finite numbers are not addressable terms");
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalTermValue);
  const out: MutableJsonRecord = {};
  for (const [name, item] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    out[name] = canonicalTermValue(item);
  }
  return out;
};

/**
 * The canonical key for a term: returns plain strings unchanged (escaping any
 * that collide with the reserved prefixes), and serializes non-strings to a
 * stable JSON form with object keys sorted.
 */
export function termKey(term: JsonValue): string {
  if (typeof term === "string") {
    return term.startsWith(JSON_TERM_PREFIX) || term.startsWith(STRING_TERM_PREFIX)
      ? `${STRING_TERM_PREFIX}${term}`
      : term;
  }
  return `${JSON_TERM_PREFIX}${JSON.stringify(canonicalTermValue(term))}`;
}

const escapeByte = (byte: number): string => ESC + byte.toString(16).padStart(2, "0");

/**
 * Encodes a string into a single filesystem-safe path segment: keeps ASCII
 * alphanumerics and "._-", percent-style escapes everything else as "~hh" hex
 * bytes, and special-cases the empty string, ".", "..", and a leading ".".
 */
export function sanitizeSegment(value: string): string {
  if (value === "") return `${ESC}e`;
  if (value === ".") return `${ESC}2e`;
  if (value === "..") return `${ESC}2e${ESC}2e`;
  let out = "";
  let first = true;
  for (const character of value) {
    if (character === ESC) out += escapeByte(character.charCodeAt(0));
    else if (first && character === ".") out += escapeByte(character.charCodeAt(0));
    else if (character.length === 1 && character.charCodeAt(0) < 128 && SAFE.test(character)) out += character;
    else for (const byte of encoder.encode(character)) out += escapeByte(byte);
    first = false;
  }
  return out;
}

/**
 * Decodes a path segment produced by sanitizeSegment back into its original
 * string, reversing the "~hh" hex escapes. Throws on malformed escapes or
 * disallowed raw bytes.
 */
export function desanitizeSegment(segmentText: string): string {
  if (segmentText === `${ESC}e`) return "";
  const bytes: number[] = [];
  for (let index = 0; index < segmentText.length;) {
    if (segmentText[index] === ESC) {
      const hex = segmentText.slice(index + 1, index + 3);
      if (!/^[0-9a-f]{2}$/i.test(hex)) throw new TypeError(`desanitizeSegment: invalid escape ${segmentText.slice(index, index + 3)}`);
      bytes.push(parseInt(hex, 16));
      index += 3;
    } else {
      const character = segmentText[index]!;
      if (!SAFE.test(character)) throw new TypeError(`desanitizeSegment: invalid raw byte ${JSON.stringify(character)}`);
      for (const byte of encoder.encode(character)) bytes.push(byte);
      index += 1;
    }
  }
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Converts a term into a single filesystem-safe path segment: the term's
 * canonical key passed through sanitizeSegment.
 */
export const segment = (term: JsonValue): string => sanitizeSegment(termKey(term));

const segmentsOf = (term: AddressTerm): string[] => {
  if (Array.isArray(term)) return term.map(termKey);
  return typeof term === "string"
    ? term.split("/").map((part) => part.trim()).filter(Boolean)
    : [termKey(term)];
};

const typeOf = (type: string): string => {
  const text = String(type ?? "").trim().replace(/^\.+/, "");
  if (!text) throw new TypeError("address: a typed filepath needs a type");
  return text;
};

const addressOfSegments = (root: string, segments: readonly string[], type: string): string => {
  if (segments.length === 0) throw new TypeError("address: the empty term has no address");
  const leaf = segments[segments.length - 1]!;
  return join(root, ...segments, `${leaf}.${typeOf(type)}`);
};

/**
 * The typed filepath for a term under a root: joins the root with each
 * sanitized term segment and appends a leaf file named after the last segment
 * with the given type as its extension. Throws on an empty term or missing
 * type.
 */
export function address(root: string, term: AddressTerm, type: string): string {
  return addressOfSegments(root, segmentsOf(term).map(sanitizeSegment), type);
}

/**
 * The address of a term's append-only log under a root: its typed filepath with
 * the "jsonl" type.
 */
export const logPath = (root: string, term: AddressTerm): string => address(root, term, "jsonl");

/**
 * The subject and predicate log paths for an EAVT row under a root. This is the
 * pure dual-filing projection: callers may append the same row at these paths,
 * but filesystem effects stay outside this codec.
 */
export function eavtLogPaths(root: string, row: EAVT | EAVTRecord): readonly string[] {
  const record = eavtRecord(row);
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const anchor of [record.e, record.a]) {
    const path = logPath(root, anchor);
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return Object.freeze(paths);
}

const termSegmentsOfPath = (root: string, path: string): string[] => {
  const relative = path.startsWith(root) ? path.slice(root.length) : path;
  const parts = relative.split(sep).filter(Boolean);
  parts.pop();
  return parts.map(desanitizeSegment);
};

/**
 * The slash-separated term recovered from a filepath under a root: strips the
 * root prefix and the leaf filename, desanitizes the remaining segments, and
 * joins them with "/". Inverse of address for the directory portion.
 */
export function termOf(root: string, path: string): string {
  return termSegmentsOfPath(root, path).join("/");
}

/**
 * The typed filepath for a term given as already-split parts: coerces each part
 * to a string, sanitizes it as a segment, and builds the address under the root
 * the same way as address. A single non-array part is treated as a one-element
 * list.
 */
export function addressNested(root: string, parts: JsonValue | readonly JsonValue[], type: string): string {
  const list = Array.isArray(parts) ? parts : [parts];
  return addressOfSegments(root, list.map((part) => sanitizeSegment(termKey(part))), type);
}

/**
 * The term parts recovered from a filepath under a root: the desanitized path
 * segments as an array, without joining them. Inverse of addressNested for the
 * directory portion.
 */
export function termOfNested(root: string, path: string): string[] {
  return termSegmentsOfPath(root, path);
}

/**
 * A slash-separated term built from a namespace and optional parts: sanitizes
 * the namespace and each part as a segment and joins them with "/". A single
 * non-array part is treated as a one-element list.
 */
export function composeTerm(namespace: JsonValue, parts: JsonValue | readonly JsonValue[] = []): string {
  const list = Array.isArray(parts) ? parts : [parts];
  return [sanitizeSegment(termKey(namespace)), ...list.map((part) => sanitizeSegment(termKey(part)))].join("/");
}

/**
 * The frozen decomposition of a slash-separated term: its first segment
 * desanitized into the namespace and the remaining segments desanitized into
 * parts. The empty term yields an empty namespace and no parts. Inverse of
 * composeTerm.
 */
export function decomposeTerm(term: string): Readonly<{ readonly namespace: string; readonly parts: readonly string[] }> {
  const atoms = term.split("/").filter(Boolean);
  if (atoms.length === 0) return Object.freeze({ namespace: "", parts: Object.freeze([]) });
  return Object.freeze({
    namespace: desanitizeSegment(atoms[0]!),
    parts: Object.freeze(atoms.slice(1).map(desanitizeSegment)),
  });
}

/**
 * The namespace of a slash-separated term: its first segment desanitized, or
 * the empty string when the term has no segments.
 */
export function namespaceOf(term: string): string {
  const head = term.split("/").filter(Boolean)[0];
  return head === undefined ? "" : desanitizeSegment(head);
}

/**
 * Whether a term belongs to a namespace: true when the term's first segment
 * equals the sanitized namespace.
 */
export function withinNamespace(term: string, namespace: JsonValue): boolean {
  const head = term.split("/").filter(Boolean)[0];
  return head !== undefined && head === sanitizeSegment(termKey(namespace));
}

export * as json from "./path/object/attribute/file/flatfile/serialization/json/index.mjs";
export * as jsonSchema from "./path/object/attribute/file/flatfile/serialization/json/schema/index.mjs";
export * as jsonl from "./path/object/attribute/file/flatfile/serialization/json/jsonl/index.mjs";
export * as eavt from "./path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mjs";
export * as datom from "./path/object/attribute/file/flatfile/serialization/json/jsonl/datom/index.mjs";
export * as markdown from "./path/object/attribute/file/flatfile/text/markdown/index.mjs";
export * as triple from "./path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/triple/index.mjs";
export * as html from "./path/object/attribute/file/flatfile/serialization/html/index.mjs";
export * as xml from "./path/object/attribute/file/flatfile/serialization/xml/index.mjs";
export * as svg from "./path/object/attribute/file/flatfile/serialization/xml/svg/index.mjs";
export * as toml from "./path/object/attribute/file/flatfile/serialization/toml/index.mjs";
export * as turtle from "./path/object/attribute/file/flatfile/serialization/turtle/index.mjs";
export * as evidence from "./evidence.mjs";
export * as spectral from "./spectral.mjs";
export * from "./exact-number.mjs";
