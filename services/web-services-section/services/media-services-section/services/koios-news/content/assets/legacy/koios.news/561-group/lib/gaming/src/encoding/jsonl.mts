/**
 * JSONL line layer — single-line JSON for persistent game logs.
 *
 * The codecs above are pure object<->Json maps; this layer turns them into
 * line-oriented records for append-only game logs (a play history, an
 * interaction trace).  `encodeLine` serializes to one newline-free line;
 * `decodeLine` parses a line back to `unknown` (the honest boundary — the
 * specific decoder is chosen by the caller).  A *log entry* tags a payload with
 * a `kind` and an optional timestamp `at`, the minimal shape of a persistent
 * record.  No filesystem I/O lives here: just string<->object transforms.
 */
import { asObject, asString, field } from "./json.mjs";
import type { Json } from "./json.mjs";
import {
  parseLines,
  serializeLines,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";

/** Serialize a JSON value to a single newline-free line. */
export function encodeLine(obj: Json): string {
  const line = serializeLines([obj]).slice(0, -1);
  if (line.includes("\n")) {
    throw new TypeError("game-codecs: encoded line unexpectedly contains a newline");
  }
  return line;
}

/** Parse a single JSONL line back to an untyped value; `TypeError` on malformed JSON. */
export function decodeLine(s: string): unknown {
  if (typeof s !== "string") {
    throw new TypeError(`game-codecs: expected string line, got ${typeof s}`);
  }
  try {
    const lines = parseLines(s);
    if (lines.length !== 1) {
      throw new TypeError(`expected one JSONL value, got ${lines.length}`);
    }
    return lines[0];
  } catch (cause) {
    throw new TypeError(`game-codecs: malformed JSONL line: ${(cause as Error).message}`);
  }
}

/** A tagged, optionally-timestamped persistent log record over a JSON payload. */
export interface LogEntry {
  readonly kind: string;
  readonly at?: string;
  readonly payload: Json;
}

/** Encode a log entry; the `at` key is omitted entirely when no timestamp is given. */
export function encodeLogEntry(entry: LogEntry): Json {
  const base: { kind: string; payload: Json; at?: string } = {
    kind: entry.kind,
    payload: entry.payload,
  };
  if (entry.at !== undefined) {
    base.at = entry.at;
  }
  return base;
}

/** Decode a log entry from `unknown`; `TypeError` on a bad shape. */
export function decodeLogEntry(json: unknown): LogEntry {
  const obj = asObject(json, "logEntry");
  const kind = asString(field(obj, "kind", "logEntry"), "logEntry.kind");
  const payload = field(obj, "payload", "logEntry") as Json;
  if (Object.prototype.hasOwnProperty.call(obj, "at") && obj["at"] !== undefined) {
    const at = asString(obj["at"], "logEntry.at");
    return { kind, at, payload };
  }
  return { kind, payload };
}
