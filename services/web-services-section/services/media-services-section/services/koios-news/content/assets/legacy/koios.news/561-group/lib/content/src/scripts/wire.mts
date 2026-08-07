/**
 * scripts/wire — the shell-boundary helpers shared by the content verbs.
 *
 * Pure functions only. The I/O (reading stdin, parsing argv) happens when a
 * verb CALLS these, never on import, so the package's `sideEffects: false`
 * invariant still holds and nothing here runs unless a bin entrypoint runs it.
 *
 * Three interchange formats cross the wire:
 *   - the utterance LOG — `content-read`'s input; the composition point (logs
 *     concatenate, evidence is monotone). A line is an encoded utterance, or a
 *     `{subject, predicate, object}` cell whose terms are content vocabulary.
 *   - the section READING — `content-read`'s output, `content-gate`'s input:
 *     one `{subject, predicate, object, charge}` record per line (JSONL); the
 *     charge is the four value names, DERIVED via `valueOf`, never named.
 *   - the demand TRACE — `content-rank`'s input: append-only `{term, value}`
 *     affirmations (one per line). Demand is a finitely additive charge; a
 *     withdrawal is a NEGATIVE entry appended, never a removed one.
 *
 * Content is a configuration of the relationality apex, so a settled reading is
 * the SAME wire shape relationality settles to — and re-admissible the same way:
 * a `{subject, predicate, object, charge}` record is admitted as a fresh
 * utterance (`token = {subject, object}`, `claim = predicate`). A mark is
 * anything, so `content-read | content-read` composes — content induced on
 * content. Re-admission is a fresh affirmation; the prior charge is re-derived
 * by the next settling, never re-injected as a polarity.
 */
import {
  valueOf,
  sectionOf,
  type UtteranceCarrier,
  type ChargeValueName,
  type SectionCarrier,
  type SectionEntry,
} from "@emsenn/relating";
import {
  canonical,
  isJsonRecord,
  parse,
  parseLines,
  serializeLines,
  type JsonValue,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";
import { rehydrateUtterances } from "@emsenn/relating/codecs";
import { induceContentTopology, type ContentTopologyCarrier } from "../topology/content-topology.mjs";

/** A settled cell rendered for the wire: term values plus the charge name. */
export interface SectionRecord {
  readonly subject: JsonValue;
  readonly predicate: JsonValue;
  readonly object: JsonValue;
  readonly charge: ChargeValueName;
}

/** Parsed argv: `--key=value` and bare `--flag` (empty value), plus positionals. */
export interface Args {
  readonly flags: ReadonlyMap<string, string>;
  readonly positionals: readonly string[];
}

export function parseArgs(argv: readonly string[]): Args {
  const flags = new Map<string, string>();
  const positionals: string[] = [];
  for (const token of argv) {
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq === -1) flags.set(token.slice(2), "");
      else flags.set(token.slice(2, eq), token.slice(eq + 1));
    } else {
      positionals.push(token);
    }
  }
  return { flags, positionals };
}

/** Read all of stdin as UTF-8 — the filter's input when no path arg is given. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Re-admit a settled section record as a fresh utterance. The cell
 * `{subject, predicate, object}` becomes `{token: {subject, object}, claim:
 * predicate}` — a fresh affirmation. The prior `charge` is dropped: it is the
 * OBSERVATION, re-derived by the next settling, never re-injected (the closure
 * engine is ≤_k-monotone; you cannot admit a charge as a negative).
 */
function toEncodedUtterance(value: JsonValue): JsonValue {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as { readonly [k: string]: JsonValue };
    if ("token" in record && "claim" in record) return { token: record["token"], claim: record["claim"] };
    if ("subject" in record && "predicate" in record) {
      const token = "object" in record ? { subject: record["subject"], object: record["object"] } : record["subject"];
      return { token: token ?? null, claim: record["predicate"] ?? null };
    }
  }
  return value;
}

/**
 * Read a content utterance log: the log object `{kind, utterances}`, a bare
 * array of encoded utterances, or JSONL of cells / `{token, claim}` pairs.
 * Empty input is the empty log — `content-read` of nothing is the empty content.
 */
export function readLog(text: string): readonly UtteranceCarrier[] {
  const trimmed = text.trim();
  if (trimmed === "") return rehydrateUtterances({ kind: "meme-topology.utteranceLog", utterances: [] });
  let doc: JsonValue | undefined;
  try {
    doc = parse(trimmed);
  } catch {
    doc = undefined;
  }
  if (doc !== undefined && isJsonRecord(doc)) {
    if (doc["kind"] === "meme-topology.utteranceLog") return rehydrateUtterances(doc);
  }
  const lines: readonly JsonValue[] = Array.isArray(doc) ? doc : parseLines(trimmed);
  return rehydrateUtterances({ kind: "meme-topology.utteranceLog", utterances: lines.map(toEncodedUtterance) });
}

/** Settle a content utterance log into a carrier — the closure endomorphism, folded. */
export const readContent = (text: string): ContentTopologyCarrier => induceContentTopology(readLog(text));

const termValue = (term: { readonly mark: { readonly value: unknown } }): JsonValue => term.mark.value as JsonValue;

/** A section entry rendered as a wire record (term values + DERIVED charge name). */
export function recordOf(entry: SectionEntry): SectionRecord {
  return {
    subject: termValue(entry.cell.subject),
    predicate: termValue(entry.cell.predicate),
    object: termValue(entry.cell.object),
    charge: valueOf(entry.charge).name,
  };
}

/** Read a section reading back from JSONL — `content-gate`'s input (read's output). */
export function readRecords(text: string): SectionRecord[] {
  return parseLines(text).map((value) => {
    if (!isJsonRecord(value)) throw new TypeError("section record must be a JSON object");
    return {
      subject: value["subject"] ?? null,
      predicate: value["predicate"] ?? null,
      object: value["object"] ?? null,
      charge: value["charge"] as ChargeValueName,
    };
  });
}

/** Render records to the requested output format. Default jsonl is the wire reading. */
export function formatRecords(records: readonly SectionRecord[], output: string): string {
  switch (output) {
    case "json":
      return canonical(records as unknown as JsonValue) + "\n";
    case "table":
      return ["subject\tpredicate\tobject\tcharge"]
        .concat(records.map((r) => [r.subject, r.predicate, r.object, r.charge].map((v) => canonical(v as JsonValue)).join("\t")))
        .join("\n") + "\n";
    case "jsonl":
    case "":
      return serializeLines(records as unknown as readonly JsonValue[]);
    default:
      throw new Error(`unknown --output=${output} (expected jsonl, json, or table)`);
  }
}

// ---------- demand wire (content-rank) ----------

/** One affirmed unit of demand on a term. A withdrawal is a negative `value`. */
export interface DemandRecord {
  readonly term: string;
  readonly value: bigint;
  readonly evidence: readonly JsonValue[];
}

/**
 * Read a demand TRACE: JSONL (or a bare array) of `{term, value, evidence?}`.
 * `value` is admitted as an exact bigint — carrier math is exact, no float
 * touches a demand value. Every entry is an affirmation; the only "negative" is
 * a withdrawal entry the witness itself appends, never a polarity flag.
 */
export function readDemandTrace(text: string): DemandRecord[] {
  const trimmed = text.trim();
  if (trimmed === "") return [];
  let doc: JsonValue | undefined;
  try {
    doc = parse(trimmed);
  } catch {
    doc = undefined;
  }
  const lines: readonly JsonValue[] = Array.isArray(doc) ? doc : parseLines(trimmed);
  return lines.map((line) => {
    if (line === null || typeof line !== "object" || Array.isArray(line)) {
      throw new Error("demand record must be an object {term, value}");
    }
    const record = line as { readonly [k: string]: JsonValue };
    const term = record["term"];
    if (typeof term !== "string" || term === "") throw new Error("demand record term must be a non-empty string");
    const rawValue = record["value"];
    if (typeof rawValue !== "number" && typeof rawValue !== "string") {
      throw new Error(`demand record value for "${term}" must be an integer or integer string`);
    }
    const value = BigInt(rawValue);
    const evidence = Array.isArray(record["evidence"]) ? (record["evidence"] as readonly JsonValue[]) : [];
    return { term, value, evidence };
  });
}

export type { ChargeValueName, ContentTopologyCarrier, SectionCarrier, SectionEntry, JsonValue };
export { sectionOf };
