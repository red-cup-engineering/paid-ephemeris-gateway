/**
 * codecs/path — a path is a categorical *address*, not a bag of file metadata.
 *
 * Two layers, both pure (filesystem effects stay outside this codec):
 *  - term addressing — a term (any JSON value, or split parts) ⇄ a
 *    filesystem-safe typed filepath under a root, and the inverse recovery of
 *    the term from a path. This is how the invocation ledger turns a caller or
 *    morphism into the dated log path it appends to.
 *  - path points — POSIX lexical path normalization, parent/basename, and the
 *    `path:` point identifier, plus the holography `pathProjector`.
 *
 * Utterance (de/re)hydration lives here too: it dehydrates carriers to a
 * JSON-compatible log shape and rehydrates fresh carriers — preserving carried
 * content without claiming mark coincidence across peers (the deliberate
 * structural-not-reference seam).
 */
import { join, sep } from "node:path";
import { define, type Projector, type Resource } from "../holography/index.mjs";
import { mark, utterance, type UtteranceCarrier } from "../articulating/utterance.mjs";
import { eavtRecord, type EAVT, type EAVTRecord } from "./eavt.mjs";
import type { JsonValue } from "./json.mjs";

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

/** Dehydrate utterance carriers into a JSON-compatible utterance-log carrier. */
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

/** The canonical key for a term: plain strings unchanged (reserved prefixes
 *  escaped), non-strings serialized to stable JSON with sorted keys. */
export function termKey(term: JsonValue): string {
  if (typeof term === "string") {
    return term.startsWith(JSON_TERM_PREFIX) || term.startsWith(STRING_TERM_PREFIX)
      ? `${STRING_TERM_PREFIX}${term}`
      : term;
  }
  return `${JSON_TERM_PREFIX}${JSON.stringify(canonicalTermValue(term))}`;
}

const escapeByte = (byte: number): string => ESC + byte.toString(16).padStart(2, "0");

/** Encode a string into a single filesystem-safe path segment. */
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

/** Decode a path segment produced by sanitizeSegment back into its string. */
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

/** A term as a single filesystem-safe path segment. */
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

/** The typed filepath for a term under a root. */
export function address(root: string, term: AddressTerm, type: string): string {
  return addressOfSegments(root, segmentsOf(term).map(sanitizeSegment), type);
}

/** The address of a term's append-only log under a root (the `jsonl` type). */
export const logPath = (root: string, term: AddressTerm): string => address(root, term, "jsonl");

/** The subject and predicate log paths for an EAVT row under a root. */
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

/** The slash-separated term recovered from a filepath under a root. */
export function termOf(root: string, path: string): string {
  return termSegmentsOfPath(root, path).join("/");
}

/** The typed filepath for a term given as already-split parts. */
export function addressNested(root: string, parts: JsonValue | readonly JsonValue[], type: string): string {
  const list = Array.isArray(parts) ? parts : [parts];
  return addressOfSegments(root, list.map((part) => sanitizeSegment(termKey(part))), type);
}

/** The term parts recovered from a filepath under a root (unjoined). */
export function termOfNested(root: string, path: string): string[] {
  return termSegmentsOfPath(root, path);
}

/** A slash-separated term built from a namespace and optional parts. */
export function composeTerm(namespace: JsonValue, parts: JsonValue | readonly JsonValue[] = []): string {
  const list = Array.isArray(parts) ? parts : [parts];
  return [sanitizeSegment(termKey(namespace)), ...list.map((part) => sanitizeSegment(termKey(part)))].join("/");
}

/** The frozen decomposition of a slash-separated term into namespace and parts. */
export function decomposeTerm(term: string): Readonly<{ readonly namespace: string; readonly parts: readonly string[] }> {
  const atoms = term.split("/").filter(Boolean);
  if (atoms.length === 0) return Object.freeze({ namespace: "", parts: Object.freeze([]) });
  return Object.freeze({
    namespace: desanitizeSegment(atoms[0]!),
    parts: Object.freeze(atoms.slice(1).map(desanitizeSegment)),
  });
}

/** The namespace of a slash-separated term: its first segment desanitized. */
export function namespaceOf(term: string): string {
  const head = term.split("/").filter(Boolean)[0];
  return head === undefined ? "" : desanitizeSegment(head);
}

/** Whether a term belongs to a namespace (its first segment is that namespace). */
export function withinNamespace(term: string, namespace: JsonValue): boolean {
  const head = term.split("/").filter(Boolean)[0];
  return head !== undefined && head === sanitizeSegment(termKey(namespace));
}

/* ── path points ────────────────────────────────────────────────────────── */

export type PathResource = Resource;

export const POSIX_PATHNAME_PATTERN = /^\/$|^\/?(?:[^/\u0000]+\/?)+$/;

export const isPathname = (value: string): boolean => POSIX_PATHNAME_PATTERN.test(value);

/** A POSIX lexical path is a non-empty string with no NUL byte. */
export const validPath = (path: unknown): path is string =>
  typeof path === "string" && path.length > 0 && !path.includes("\0");

/** Lexically normalize a path: drop "." and empty segments, resolve "..". */
export function normalizePath(path: string): string {
  if (!validPath(path)) throw new TypeError("normalizePath: path must be a non-empty string without NUL");
  const absolute = path.startsWith("/");
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length > 0 && parts[parts.length - 1] !== "..") parts.pop();
      else if (!absolute) parts.push("..");
      continue;
    }
    parts.push(part);
  }
  const joined = parts.join("/");
  if (absolute) return joined ? `/${joined}` : "/";
  return joined || ".";
}

/** The normalized parent path, or null at a root path ("/" or "."). */
export function pathParent(path: string): string | null {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return null;
  const absolute = normalized.startsWith("/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return absolute ? "/" : ".";
  const parent = parts.slice(0, -1).join("/");
  return absolute ? `/${parent}` : parent;
}

/** The final normalized path segment. */
export function pathBasename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return normalized;
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

/** The point identifier for a normalized POSIX path. */
export function pathPoint(path: string): string {
  return `path:${normalizePath(path)}`;
}

/** The path carried by a path point, or null when not path-shaped. */
export function pathOfPoint(point: string): string | null {
  return point.startsWith("path:") ? point.slice(5) : null;
}

/** The root path projector: recognizes POSIX pathnames. */
export const pathProjector: Projector<JsonValue> = define<JsonValue>({
  type: "path",
  recognize: (resource) => isPathname(resource.path),
});
