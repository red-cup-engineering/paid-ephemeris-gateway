// References-relational codec: a markdown document's bibliographic and relational
// front matter, read as relationality and written back from it.
//
// A markdown document already carries relations: it `cites` works (the
// `references:` block) and it stands in typed relations to other pieces
// (`depends-on`, `contrasts-with`, `derived_from`, … — the CITATION/RELATION
// field taxonomy in ./references). This module projects those edges onto
// relationality's resource model: each becomes an EAVT witness datom
//   [entity, attribute, value, time]
// where the document is the entity (subject), the relation is the attribute
// (predicate), the target is the value (object), and the witness is the time —
// a *mark* in relationality's sense. `eavtToCell` lifts each to a charged cell
// with a `potential` (told-true) charge: a witness log admits no negative, so
// reading a document never lands evidence on a falsity side. Because the output
// is relationality's own witness form, it is re-admissible — a document induces
// relationality, relationality re-emits the document. ("A mark is anything,
// which means it can be the results of these things.")
//
// The inverse reads charged cells back into front matter: `relationFieldsFromCells`
// rebuilds the typed-relation fields, and `referencesFromCells` rebuilds CSL
// items (which ./references then encodes into a `references:` block). Together
// with ./references' encoder this closes the loop: document → cells → … → cells
// → document. Pure throughout; no filesystem, no clock — the witness is a
// parameter, defaulting to the document's own identity.

import {
  decodeReferences,
  internalReferenceTargets,
  referenceSlug,
  CITATION_FIELDS,
  RELATION_FIELDS,
  type CslItem,
  type CslName,
} from "./references.mjs";
import { decodeFrontMatterDocument, type FrontMatterRecord } from "./frontmatter.mjs";
import {
  eavtToCell,
  type EAVT,
  type ChargedCell,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt";
import { type JsonValue } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";

export type { EAVT, ChargedCell } from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt";

/** The predicate under which a document's `references:` citations are recorded. */
export const CITES_PREDICATE = "cites" as const;

/** Front-matter keys, in order, consulted for a document's own identity (the
 *  subject of every edge it asserts) when no explicit subject is given. */
export const SUBJECT_KEYS: readonly string[] = Object.freeze(["id", "slug", "permalink", "url", "title"]);

/**
 * Options for projecting a document into relationality datoms: an optional
 * subject override, the witness mark, and whether to also emit per-reference
 * attribute datoms.
 */
export type DocumentRelationalOptions = Readonly<{
  /** Override the document's identity (its subject). Default: read from front
   *  matter via SUBJECT_KEYS, else "document". */
  subject?: string;
  /** The witness (the datom's time/mark). Default: the document's subject — a
   *  document witnesses its own front matter. */
  witness?: JsonValue;
  /** Also emit `[citekey, attribute, value]` datoms for each reference's own
   *  fields (title, container-title, issued year, DOI, URL, authors), making the
   *  reference itself a relational subject. Default: true. */
  includeReferenceAttributes?: boolean;
}>;

/** A document's identity: an explicit override, else the first present
 *  SUBJECT_KEYS front-matter value, else "document". Pure; total. */
export function documentSubject(documentText: string, override?: string): string {
  if (typeof override === "string" && override.trim() !== "") return override.trim();
  const frontMatter = softFrontMatter(documentText);
  for (const key of SUBJECT_KEYS) {
    const value = frontMatter[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "document";
}

/** Project a markdown document's citations and typed relations to relationality
 *  EAVT witness datoms. Pure; total over any string (a document with no front
 *  matter and no references yields no datoms). */
export function documentToEavt(documentText: string, opts: DocumentRelationalOptions = {}): readonly EAVT[] {
  if (typeof documentText !== "string") throw new TypeError("document must be a string");
  const frontMatter = softFrontMatter(documentText);
  const subject = documentSubject(documentText, opts.subject);
  const witness: JsonValue = opts.witness ?? subject;
  const includeAttributes = opts.includeReferenceAttributes ?? true;
  const datoms: EAVT[] = [];

  for (const item of decodeReferences(documentText).items) {
    const citekey = citekeyOf(item);
    datoms.push([subject, CITES_PREDICATE, citekey, witness]);
    if (includeAttributes) {
      for (const datom of referenceAttributeEavt(citekey, item, witness)) datoms.push(datom);
    }
  }

  for (const target of internalReferenceTargets(frontMatter)) {
    datoms.push([subject, target.field, referenceSlug(target.value), witness]);
  }

  return Object.freeze(datoms);
}

/** As `documentToEavt`, lifted to relationality charged cells (each a
 *  `potential`/told-true witness — no negative is ever asserted). */
export function documentToCells(documentText: string, opts: DocumentRelationalOptions = {}): readonly ChargedCell[] {
  return documentToEavt(documentText, opts).map(eavtToCell);
}

/** Rebuild the typed-relation front-matter fields (CITATION ∪ RELATION) from
 *  charged cells whose subject is `subject`. The inverse of the relation edges
 *  in `documentToEavt`. Pure; total. */
export function relationFieldsFromCells(subject: string, cells: readonly ChargedCell[]): FrontMatterRecord {
  // The typed-relation fields, MINUS the `cites` citation edge — bibliographic
  // citations round-trip through `referencesFromCells` into a `references:`
  // block, so the two inverses partition the edges without duplicating them.
  const known = new Set<string>([...CITATION_FIELDS, ...RELATION_FIELDS]);
  known.delete(CITES_PREDICATE);
  const fields: Record<string, string[]> = {};
  for (const { cell } of cells) {
    if (String(cell.subject) !== subject) continue;
    const predicate = String(cell.predicate);
    if (!known.has(predicate)) continue;
    const object = String(cell.object);
    const bucket = (fields[predicate] ??= []);
    if (!bucket.includes(object)) bucket.push(object);
  }
  const out: Record<string, readonly string[]> = {};
  for (const [key, values] of Object.entries(fields)) out[key] = Object.freeze(values);
  return Object.freeze(out);
}

/** Rebuild CSL-JSON items from charged cells: every `[subject, "cites", citekey]`
 *  edge names a reference, and `[citekey, attribute, value]` cells supply its
 *  fields. The inverse of the citation edges in `documentToEavt`; feed the
 *  result to `encodeReferencesBlock`/`setReferences` to write it into a document.
 *  Pure; total. */
export function referencesFromCells(subject: string, cells: readonly ChargedCell[]): readonly CslItem[] {
  const order: string[] = [];
  const attributes = new Map<string, Record<string, JsonValue[]>>();
  const note = (entity: string, attribute: string, value: JsonValue): void => {
    const record = attributes.get(entity) ?? {};
    (record[attribute] ??= []).push(value);
    attributes.set(entity, record);
  };
  for (const { cell } of cells) {
    const subj = String(cell.subject);
    const predicate = String(cell.predicate);
    const object = cell.object as JsonValue;
    if (subj === subject && predicate === CITES_PREDICATE) {
      const citekey = String(object);
      if (!order.includes(citekey)) order.push(citekey);
      continue;
    }
    note(subj, predicate, object);
  }
  return Object.freeze(order.map((citekey) => cslItemFromAttributes(citekey, attributes.get(citekey) ?? {})));
}

// — internals —

function citekeyOf(item: CslItem): JsonValue {
  if (typeof item.id === "string" && item.id.trim() !== "") return item.id.trim();
  if (typeof item.title === "string" && item.title.trim() !== "") return slugifyTitle(item.title);
  return "reference";
}

function slugifyTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "reference";
}

const REFERENCE_SCALAR_FIELDS: readonly string[] = Object.freeze([
  "type", "title", "container-title", "publisher", "volume", "issue", "page", "DOI", "URL", "note",
]);

function referenceAttributeEavt(citekey: JsonValue, item: CslItem, witness: JsonValue): readonly EAVT[] {
  const datoms: EAVT[] = [];
  for (const field of REFERENCE_SCALAR_FIELDS) {
    const value = scalarOf(item[field]);
    if (value !== undefined) datoms.push([citekey, field, value, witness]);
  }
  const year = cslYear(item.issued);
  if (year !== undefined) datoms.push([citekey, "issued", year, witness]);
  for (const name of item.author ?? []) {
    const literal = nameLiteral(name);
    if (literal !== undefined) datoms.push([citekey, "author", literal, witness]);
  }
  return datoms;
}

function cslItemFromAttributes(citekey: string, attributes: Readonly<Record<string, JsonValue[]>>): CslItem {
  const item: Record<string, unknown> = { id: citekey };
  const typeValue = firstString(attributes["type"]);
  item["type"] = typeValue ?? "document";
  for (const field of REFERENCE_SCALAR_FIELDS) {
    if (field === "type") continue;
    const value = firstString(attributes[field]);
    if (value !== undefined) item[field] = value;
  }
  const authors = (attributes["author"] ?? [])
    .map((value) => String(value).trim())
    .filter((value) => value !== "")
    .map((literal): CslName => ({ literal }));
  if (authors.length > 0) item["author"] = Object.freeze(authors);
  const year = firstNumber(attributes["issued"]);
  if (year !== undefined) item["issued"] = { "date-parts": [[year]] };
  return Object.freeze(item) as CslItem;
}

function scalarOf(value: unknown): JsonValue | undefined {
  if (typeof value === "string") return value.trim() === "" ? undefined : value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function cslYear(issued: unknown): number | undefined {
  if (!isRecord(issued)) return undefined;
  const parts = issued["date-parts"];
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  const first = parts[0];
  if (!Array.isArray(first) || first.length === 0) return undefined;
  return typeof first[0] === "number" ? first[0] : undefined;
}

function nameLiteral(name: CslName): string | undefined {
  if (typeof name.literal === "string" && name.literal.trim() !== "") return name.literal.trim();
  const given = typeof name.given === "string" ? name.given.trim() : "";
  const family = typeof name.family === "string" ? name.family.trim() : "";
  const joined = `${given} ${family}`.trim();
  return joined === "" ? undefined : joined;
}

function firstString(values: readonly JsonValue[] | undefined): string | undefined {
  for (const value of values ?? []) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function firstNumber(values: readonly JsonValue[] | undefined): number | undefined {
  for (const value of values ?? []) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d{4}$/.test(value.trim())) return Number(value.trim());
  }
  return undefined;
}

function softFrontMatter(documentText: string): FrontMatterRecord {
  if (!documentText.startsWith("---")) return EMPTY_RECORD;
  try {
    return decodeFrontMatterDocument(documentText).frontMatter;
  } catch {
    try {
      // If a legacy references block is malformed beyond the frontmatter
      // subset, isolate it so simpler typed-relation fields remain available.
      return decodeFrontMatterDocument(withoutReferencesBlock(documentText)).frontMatter;
    } catch {
      return EMPTY_RECORD;
    }
  }
}

function withoutReferencesBlock(documentText: string): string {
  const lines = documentText.split("\n");
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (stripCr(lines[i] ?? "") === "---") { close = i; break; }
  }
  if (close === -1) return documentText;
  let refStart = -1;
  for (let i = 1; i < close; i += 1) {
    if (/^references:(\s|$)/.test(stripCr(lines[i] ?? ""))) { refStart = i; break; }
  }
  if (refStart === -1) return documentText;
  let refEnd = close;
  for (let i = refStart + 1; i < close; i += 1) {
    const line = stripCr(lines[i] ?? "");
    if (line !== "" && !/^\s/.test(line)) { refEnd = i; break; }
  }
  return [...lines.slice(0, refStart), ...lines.slice(refEnd)].join("\n");
}

function stripCr(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

const EMPTY_RECORD: FrontMatterRecord = Object.freeze({});

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
