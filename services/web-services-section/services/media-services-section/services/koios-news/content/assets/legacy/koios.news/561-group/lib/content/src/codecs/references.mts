// References codec: the bibliographic layer of a markdown vault, normalized.
//
// The research corpus carries citations under a `references:` front-matter key in
// TWO mutually-incompatible shapes:
//
//   1. CSL/citeproc — a block SEQUENCE of maps, each a CSL-JSON item:
//        references:
//          - id: Smith2020
//            type: article-journal
//            title: …
//            author: [ { family: Smith, given: A } ]
//            issued: [ { year: 2020 } ]
//
//   2. A bespoke CITEKEY-MAP — a map of citekey → flat citation record:
//        references:
//          smith2020:
//            authors: ["A. Smith"]
//            title: …
//            publication: …
//            year: 2020
//
// Form (1) is the standard; form (2) is the dominant populated shape in this
// corpus but is NOT citeproc. This module reads BOTH and normalizes them to one
// target: valid CSL-JSON. The citekey-map → CSL transform is fully deterministic
// — author strings become `{ literal }` (always-valid CSL; family/given
// splitting is optional downstream enrichment, never required for validity).
//
// Vocabulary: CslItem (a CSL-JSON reference), ReferenceDialect (which shape a
// record used), DecodedReferences (dialect + normalized items). Morphisms are
// pure functions over text/records; no filesystem, no clock, no network. Codec
// law (L4) holds: TypeError only for malformed shapes; absences decode to empty.

// — CSL-JSON shapes —

/**
 * A CSL-JSON name: a personal name as family/given parts, or a single literal
 * string for unstructured or institutional names.
 */
export type CslName = Readonly<{ family?: string; given?: string; literal?: string }>;
/**
 * A CSL-JSON date: a date-parts array whose single inner tuple holds the
 * numeric year, optional month, and optional day.
 */
export type CslDate = Readonly<{ "date-parts": readonly (readonly number[])[] }>;

/**
 * A CSL-JSON reference item: a single bibliographic record with a required type
 * and the standard optional CSL fields (id, title, author, dates, identifiers),
 * open to any further string-keyed CSL fields.
 */
export type CslItem = Readonly<{
  id?: string;
  type: string;
  title?: string;
  author?: readonly CslName[];
  "container-title"?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  issued?: CslDate;
  DOI?: string;
  URL?: string;
  note?: string;
}> &
  Readonly<Record<string, unknown>>;

/**
 * The shape a document's references block was found in: "csl" (CSL sequence of
 * maps), "citekey-map" (bespoke citekey-to-record map), "empty" (a present but
 * empty block), "none" (no references key), or "mixed" (an unrecognized shape).
 */
export type ReferenceDialect = "csl" | "citekey-map" | "empty" | "none" | "mixed";

/**
 * The result of decoding a references block: the detected source dialect plus
 * the references normalized to CSL-JSON items.
 */
export type DecodedReferences = Readonly<{
  dialect: ReferenceDialect;
  items: readonly CslItem[];
}>;

// — public API —

/** Decode and normalize a document's `references:` block to CSL-JSON. Accepts the
 *  full markdown document text (front matter fence + body); reads only the front
 *  matter. Returns the detected dialect and the normalized CSL items. Pure. */
export function decodeReferences(documentText: string): DecodedReferences {
  if (typeof documentText !== "string") throw new TypeError("references document must be a string");
  const head = frontMatterHead(documentText);
  if (head === null) return EMPTY;
  return decodeReferencesFromHead(head);
}

/** As decodeReferences, but over the already-extracted front-matter head text
 *  (the lines between the `---` fences, no fences). */
export function decodeReferencesFromHead(headText: string): DecodedReferences {
  const lines = headText.split("\n").map(stripCr);
  const start = lines.findIndex((line) => /^references:(\s|$)/.test(line));
  if (start === -1) return { dialect: "none", items: [] };
  const opener = lines[start] ?? "";
  const inline = opener.slice("references:".length).trim();
  if (inline !== "") {
    // `references: []` or an inline array — empty or rare inline form.
    if (inline === "[]" || inline === "[ ]") return EMPTY_PRESENT;
    const value = parseInline(inline);
    const items = Array.isArray(value) ? normalizeSequence(value) : [];
    return { dialect: items.length > 0 ? "csl" : "empty", items };
  }
  // Block form: collect indented lines until the next column-0 line.
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      body.push(line);
      continue;
    }
    if (!/^\s/.test(line)) break;
    body.push(line);
  }
  const lexed = lex(body);
  if (lexed.length === 0) return EMPTY_PRESENT;
  const isSequence = (lexed[0]?.text ?? "").startsWith("- ") || lexed[0]?.text === "-";
  const parsed = parseNode(lexed, { pos: 0 }, lexed[0]?.indent ?? 0);
  if (isSequence && Array.isArray(parsed)) {
    return { dialect: "csl", items: normalizeSequence(parsed) };
  }
  if (!isSequence && isRecord(parsed)) {
    return { dialect: "citekey-map", items: normalizeCitekeyMap(parsed) };
  }
  return { dialect: "mixed", items: [] };
}

/** The CSL-JSON serialization of decoded references (a plain array the caller
 *  JSON-stringifies). */
export function encodeCslJson(items: readonly CslItem[]): readonly CslItem[] {
  return items.map((item) => ({ ...item }));
}

/** Normalize the document's `references:` block in place. Any readable
 *  references dialect is rewritten to the canonical CSL sequence-of-maps block;
 *  documents without a references key are returned unchanged. */
export function normalizeReferencesDocument(documentText: string): string {
  const decoded = decodeReferences(documentText);
  if (decoded.dialect === "none") return documentText;
  return setReferences(documentText, decoded.items);
}

const EMPTY: DecodedReferences = Object.freeze({ dialect: "none", items: Object.freeze([]) });
const EMPTY_PRESENT: DecodedReferences = Object.freeze({ dialect: "empty", items: Object.freeze([]) });

// — front-matter head extraction —

function frontMatterHead(text: string): string | null {
  const lines = text.split("\n");
  if (stripCr(lines[0] ?? "") !== "---") return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (stripCr(lines[i] ?? "") === "---") return lines.slice(1, i).map(stripCr).join("\n");
  }
  return null;
}

// — indentation-driven recursive parser (the references subtree only) —

type Lexed = Readonly<{ indent: number; text: string }>;
type Cursor = { pos: number };
type Parsed = string | number | boolean | null | Parsed[] | { [key: string]: Parsed };

function lex(rawLines: readonly string[]): Lexed[] {
  const out: Lexed[] = [];
  for (const raw of rawLines) {
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    out.push({ indent, text: raw.slice(indent) });
  }
  return out;
}

function parseNode(lines: readonly Lexed[], cur: Cursor, indent: number): Parsed {
  const first = lines[cur.pos];
  if (first === undefined) return null;
  if (first.text.startsWith("- ") || first.text === "-") return parseSequence(lines, cur, indent);
  return parseMapping(lines, cur, indent);
}

function parseSequence(lines: readonly Lexed[], cur: Cursor, indent: number): Parsed[] {
  const arr: Parsed[] = [];
  while (cur.pos < lines.length) {
    const line = lines[cur.pos];
    if (line === undefined || line.indent !== indent) break;
    if (!(line.text.startsWith("- ") || line.text === "-")) break;
    const after = line.text === "-" ? "" : line.text.slice(2);
    cur.pos += 1;
    if (after === "") {
      arr.push(parseNode(lines, cur, deeperIndent(lines, cur, indent)));
    } else if (isMapEntry(after)) {
      arr.push(parseInlineMap(lines, cur, indent, after));
    } else {
      arr.push(parseScalar(after));
    }
  }
  return arr;
}

// A `- key: value` item: the dash line begins a map whose remaining entries are
// indented deeper than the dash.
function parseInlineMap(lines: readonly Lexed[], cur: Cursor, seqIndent: number, firstEntry: string): Parsed {
  const obj: { [key: string]: Parsed } = {};
  absorbEntry(lines, cur, obj, firstEntry, seqIndent + 2);
  while (cur.pos < lines.length) {
    const line = lines[cur.pos];
    if (line === undefined || line.indent <= seqIndent) break;
    cur.pos += 1;
    absorbEntry(lines, cur, obj, line.text, line.indent);
  }
  return obj;
}

function parseMapping(lines: readonly Lexed[], cur: Cursor, indent: number): Parsed {
  const obj: { [key: string]: Parsed } = {};
  while (cur.pos < lines.length) {
    const line = lines[cur.pos];
    if (line === undefined || line.indent !== indent) break;
    if (line.text.startsWith("- ")) break;
    cur.pos += 1;
    absorbEntry(lines, cur, obj, line.text, indent);
  }
  return obj;
}

// Apply one `key: value` (or `key:` opening a nested block) into a map.
function absorbEntry(lines: readonly Lexed[], cur: Cursor, obj: { [key: string]: Parsed }, entry: string, entryIndent: number): void {
  const colon = entry.indexOf(":");
  if (colon === -1) return; // not a map entry; ignore stray line
  const key = entry.slice(0, colon).trim();
  const rest = entry.slice(colon + 1).trim();
  if (key === "") return;
  if (rest !== "") {
    obj[key] = parseScalarOrInline(rest);
    return;
  }
  const next = lines[cur.pos];
  if (next !== undefined) {
    const nextIsSequence = next.text.startsWith("- ") || next.text === "-";
    // A block SEQUENCE value may sit at the key's own column (YAML allows the
    // dashes un-indented under the key); a nested MAP must be indented deeper.
    if ((nextIsSequence && next.indent >= entryIndent) || next.indent > entryIndent) {
      obj[key] = parseNode(lines, cur, next.indent);
      return;
    }
  }
  obj[key] = null;
}

function deeperIndent(lines: readonly Lexed[], cur: Cursor, fallback: number): number {
  const next = lines[cur.pos];
  return next !== undefined && next.indent > fallback ? next.indent : fallback + 2;
}

function isMapEntry(text: string): boolean {
  const colon = text.indexOf(":");
  if (colon === -1) return false;
  return /^[A-Za-z0-9_-]+$/.test(text.slice(0, colon).trim());
}

// — scalars and inline arrays —

function parseScalarOrInline(text: string): Parsed {
  if (text.startsWith("[")) return parseInline(text);
  return parseScalar(text);
}

function parseInline(text: string): Parsed {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return parseScalar(trimmed);
  const inner = trimmed.slice(1, -1).trim();
  if (inner === "") return [];
  const items: Parsed[] = [];
  let buf = "";
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i] ?? "";
    if (quote !== null) {
      if (ch === quote) quote = null;
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ",") {
      items.push(parseScalar(buf.trim()));
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== "") items.push(parseScalar(buf.trim()));
  return items;
}

function parseScalar(token: string): Parsed {
  let t = token.trim();
  if (t === "") return "";
  if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) || (t.startsWith("'") && t.endsWith("'") && t.length >= 2)) {
    return t.slice(1, -1);
  }
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null" || t === "~") return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  return t;
}

// — normalization to CSL-JSON —

const CSL_TYPES: ReadonlySet<string> = new Set([
  "article-journal", "article-magazine", "article-newspaper", "book", "chapter",
  "paper-conference", "report", "webpage", "thesis", "manuscript", "dataset",
  "entry-encyclopedia", "entry-dictionary", "post", "post-weblog", "speech",
  "document", "broadcast", "interview", "legislation", "patent", "review",
]);
const TYPE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  article: "article-journal",
  journal: "article-journal",
  paper: "paper-conference",
  conference: "paper-conference",
  website: "webpage",
  web: "webpage",
  blog: "post-weblog",
  misc: "document",
  repository: "report",
  techreport: "report",
});

function toCslType(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") return "document";
  const t = raw.trim().toLowerCase();
  if (CSL_TYPES.has(t)) return t;
  return TYPE_ALIASES[t] ?? "document";
}

function toCslDate(value: Parsed | undefined): CslDate | undefined {
  // bespoke `year: 2020` → number; CSL `issued: [{year, month, day}]`.
  if (typeof value === "number") return { "date-parts": [[value]] };
  if (typeof value === "string" && /^\d{4}$/.test(value.trim())) return { "date-parts": [[Number(value.trim())]] };
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (isRecord(first)) {
      const parts = ["year", "month", "day"]
        .map((k) => first[k])
        .filter((n): n is number => typeof n === "number");
      if (parts.length > 0) return { "date-parts": [parts] };
    }
    if (typeof first === "number") return { "date-parts": [[first]] };
  }
  if (isRecord(value) && Array.isArray(value["date-parts"])) return value as unknown as CslDate;
  return undefined;
}

function toCslNames(value: Parsed | undefined): readonly CslName[] | undefined {
  const raw = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const names: CslName[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim() !== "") {
      names.push({ literal: entry.trim() });
    } else if (isRecord(entry)) {
      const name: { family?: string; given?: string; literal?: string } = {};
      if (typeof entry["family"] === "string") name.family = entry["family"];
      if (typeof entry["given"] === "string") name.given = entry["given"];
      if (typeof entry["literal"] === "string") name.literal = entry["literal"];
      if (name.family === undefined && name.given === undefined && name.literal === undefined) continue;
      names.push(name);
    }
  }
  return names.length > 0 ? names : undefined;
}

function str(value: Parsed | undefined): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

const NAME_FIELDS: readonly string[] = ["author", "editor", "translator", "container-author", "collection-editor", "director", "recipient"];
const DATE_FIELDS: readonly string[] = ["issued", "accessed", "original-date", "submitted", "event-date"];

// CSL form: items are already CSL-shaped, so PRESERVE every field — only fix up
// the shapes that the YAML-as-CSL convention writes differently from CSL-JSON
// (dates as `[{year}]` → date-parts; string names → literal). Cherry-picking a
// field allowlist here would silently drop valid CSL (editor, edition, ISBN, …),
// degrading the very standard this normalizer claims to emit.
function normalizeSequence(parsed: readonly Parsed[]): readonly CslItem[] {
  const items: CslItem[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const item: { [key: string]: unknown } = { ...entry };
    item["type"] = toCslType(entry["type"]);
    if (str(entry["id"]) !== undefined) item["id"] = str(entry["id"]);
    for (const field of NAME_FIELDS) {
      const names = toCslNames(entry[field]);
      if (names !== undefined) item[field] = names;
    }
    for (const field of DATE_FIELDS) {
      const date = toCslDate(entry[field]);
      if (date !== undefined) item[field] = date;
    }
    items.push(Object.freeze(item) as CslItem);
  }
  return items;
}

// Bespoke citekey-map: each citekey → flat record; key becomes the CSL id. This
// IS a translation (bespoke field names → CSL), so an explicit mapping is right.
function normalizeCitekeyMap(parsed: { [key: string]: Parsed }): readonly CslItem[] {
  const items: CslItem[] = [];
  for (const [citekey, entry] of Object.entries(parsed)) {
    if (!isRecord(entry)) continue;
    items.push(cslFromCitekeyRecord(entry, citekey));
  }
  return items;
}

// The bespoke field names that get RENAMED to CSL equivalents; every other field
// is preserved as-is (it may be valid CSL the bespoke records also carry, e.g.
// edition, ISBN, collection-title, volume, issue, title, note).
const CITEKEY_RENAMED: readonly string[] = ["authors", "author", "publication", "journal", "pages", "page", "year", "issued", "doi", "DOI", "url", "URL", "type", "class"];

function cslFromCitekeyRecord(entry: { [key: string]: Parsed }, id: string | undefined): CslItem {
  // Preserve every field by default, then apply the bespoke→CSL renames — so a
  // citekey record that happens to carry valid CSL fields (edition, ISBN, …)
  // keeps them rather than being cherry-picked down to an allowlist.
  const item: { [key: string]: unknown } = { ...entry };
  for (const field of CITEKEY_RENAMED) delete item[field];

  // Deterministic type, in order: an explicit `type`; the bespoke `class` field
  // (this corpus writes `class: book` under a reference to mean its type); a
  // cheap structural inference (a volume/issue implies a journal article); else
  // the "document" default. Precise typing of the rest is left to NIM.
  const explicitType = str(entry["type"]) ?? str(entry["class"]);
  const inferred = entry["volume"] !== undefined || entry["issue"] !== undefined ? "article-journal" : "document";
  item["type"] = explicitType !== undefined ? toCslType(explicitType) : inferred;
  if (id !== undefined && id !== "") item["id"] = id;
  const author = toCslNames(entry["author"] ?? entry["authors"]);
  if (author !== undefined) item["author"] = author;
  // container / venue: CSL container-title; bespoke `publication`/`journal`.
  const container = str(entry["container-title"]) ?? str(entry["publication"]) ?? str(entry["journal"]);
  if (container !== undefined) item["container-title"] = container;
  const page = str(entry["page"]) ?? str(entry["pages"]);
  if (page !== undefined) item["page"] = page;
  const issued = toCslDate(entry["issued"] ?? entry["year"] ?? null);
  if (issued !== undefined) item["issued"] = issued;
  const doi = str(entry["DOI"]) ?? str(entry["doi"]);
  if (doi !== undefined) item["DOI"] = doi;
  const url = str(entry["URL"]) ?? str(entry["url"]);
  if (url !== undefined) item["URL"] = url;
  return Object.freeze(item) as CslItem;
}

// — encoding references back to a `references:` YAML block (CSL dialect) —
//
// The inverse of the decoder: a CSL-JSON item array becomes the canonical CSL
// sequence-of-maps block the corpus's `references:` key carries, so reference
// information can be written *into* a markdown document, not only read out.
// Round-trips: decodeReferencesFromHead(encodeReferencesBlock(items)) yields the
// same items (modulo the normalization the decoder always applies). This is the
// write side the migration scaffold deferred — `encodeReferencesBlock` emits the
// block text; `setReferences` splices it into a whole document, preserving every
// other front-matter entry and the body verbatim.

/** Encode CSL-JSON items as a `references:` block (key line included), in the
 *  corpus's canonical 2-space sequence-of-maps style. Pure; total. An empty
 *  list encodes to `references: []`. */
export function encodeReferencesBlock(items: readonly CslItem[]): string {
  const lines: string[] = [];
  for (const item of items) {
    if (isRecord(item)) encodeItemInto(lines, item);
  }
  if (lines.length === 0) return "references: []\n";
  return `references:\n${lines.join("\n")}\n`;
}

/** The CSL fields whose order leads an emitted item (`id`, then `type`); every
 *  other field follows in its own order. */
const LEADING_FIELDS: readonly string[] = Object.freeze(["id", "type"]);

function orderedItemKeys(item: Readonly<Record<string, unknown>>): readonly string[] {
  const rest = Object.keys(item).filter((k) => !LEADING_FIELDS.includes(k));
  return [...LEADING_FIELDS.filter((k) => item[k] !== undefined), ...rest];
}

function encodeItemInto(lines: string[], item: Readonly<Record<string, unknown>>): void {
  let first = true;
  for (const key of orderedItemKeys(item)) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    const prefix = first ? "  - " : "    ";
    if (NAME_FIELDS.includes(key) && Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const name of value) encodeNameInto(lines, name);
    } else if (DATE_FIELDS.includes(key)) {
      const dateLines = encodeDateLines(value);
      if (dateLines.length === 0) continue;
      lines.push(`${prefix}${key}:`);
      lines.push(...dateLines);
    } else {
      lines.push(`${prefix}${key}: ${yamlScalar(value)}`);
    }
    first = false;
  }
  if (first) lines.push("  - type: document"); // a bare item still needs a node
}

function encodeNameInto(lines: string[], name: unknown): void {
  if (!isRecord(name)) {
    if (typeof name === "string" && name.trim() !== "") lines.push(`      - literal: ${yamlScalar(name.trim())}`);
    return;
  }
  const entries = Object.entries(name).filter(([, v]) => typeof v === "string" && (v as string).trim() !== "");
  entries.forEach(([key, value], index) => {
    const prefix = index === 0 ? "      - " : "        ";
    lines.push(`${prefix}${key}: ${yamlScalar(value)}`);
  });
}

function encodeDateLines(value: unknown): readonly string[] {
  const parts = isRecord(value) && Array.isArray(value["date-parts"]) ? value["date-parts"][0] : undefined;
  if (!Array.isArray(parts) || parts.length === 0) return [];
  const labels = ["year", "month", "day"];
  return parts
    .filter((n): n is number => typeof n === "number")
    .map((n, index) => `${index === 0 ? "      - " : "        "}${labels[index] ?? `part-${index}`}: ${n}`);
}

// YAML scalar emission tuned to what the references decoder reads back: bare for
// the common case (titles, URLs with `:` and `/`, bare words — the decoder
// splits a key on its FIRST colon only, so interior colons are safe), quoted
// only when a bare token would mis-parse (a YAML indicator start, a
// number/bool/null look-alike, or surrounding whitespace).
function yamlScalar(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = value === null || value === undefined ? "" : String(value);
  return needsQuote(text) ? quoteYaml(text) : text;
}

function needsQuote(text: string): boolean {
  if (text === "") return true;
  if (text !== text.trim()) return true;
  if (/^[[\]{}"'>|*&!?@%#-]/.test(text)) return true;
  if (/^(true|false|null|~)$/i.test(text)) return true;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) return true;
  return false;
}

function quoteYaml(text: string): string {
  let out = '"';
  for (const char of text) {
    if (char === "\\" || char === '"') out += `\\${char}`;
    else if (char === "\n") out += "\\n";
    else if (char === "\t") out += "\\t";
    else out += char;
  }
  return `${out}"`;
}

/** Write `items` into a document's front matter as a `references:` block,
 *  replacing an existing block or inserting one before the closing fence (and
 *  creating a front matter head if the document has none). Every other entry and
 *  the body are preserved verbatim. Pure; total over well-fenced documents. */
export function setReferences(documentText: string, items: readonly CslItem[]): string {
  if (typeof documentText !== "string") throw new TypeError("references document must be a string");
  const block = encodeReferencesBlock(items).replace(/\n$/, "");
  const blockLines = block.split("\n");
  const lines = documentText.split("\n");
  if (stripCr(lines[0] ?? "") !== "---") {
    return `---\n${block}\n---\n${documentText}`;
  }
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (stripCr(lines[i] ?? "") === "---") { close = i; break; }
  }
  if (close === -1) throw new TypeError("references document has no closing front-matter fence");
  let refStart = -1;
  for (let i = 1; i < close; i += 1) {
    if (/^references:(\s|$)/.test(stripCr(lines[i] ?? ""))) { refStart = i; break; }
  }
  if (refStart === -1) {
    return [...lines.slice(0, close), ...blockLines, ...lines.slice(close)].join("\n");
  }
  let refEnd = close;
  for (let i = refStart + 1; i < close; i += 1) {
    const line = stripCr(lines[i] ?? "");
    if (line !== "" && !/^\s/.test(line)) { refEnd = i; break; }
  }
  return [...lines.slice(0, refStart), ...blockLines, ...lines.slice(refEnd)].join("\n");
}

// — internal cross-references (pieces that reference our own pieces) —
//
// Beyond external citations, the corpus links documents to one another through
// front-matter fields carrying slugs or relative paths. These split by meaning:
// CITATION fields are bibliographic ("see / draws on this piece") and project
// cleanly to CSL references with an internal URL; RELATION fields are a typed
// concept graph ("depends on / contrasts with") and must NOT be flattened into a
// bibliography — their predicate is the information. Resolution of a target slug
// or path to an actual document is the caller's job (it needs the whole corpus);
// this module supplies the field taxonomy, the extraction, and the CSL builder.

/**
 * The front-matter field names treated as bibliographic citations to other
 * corpus pieces (see-also, derives-from, cites, and the like) - the fields that
 * project cleanly to CSL references.
 */
export const CITATION_FIELDS: readonly string[] = Object.freeze([
  "see-also", "derived_from", "derives-from", "related", "discusses", "recaps", "cites", "sources",
]);
/**
 * The front-matter field names treated as typed concept-graph relations between
 * corpus pieces (depends-on, part-of, contrasts-with, and the like) - fields
 * whose predicate is information and so are NOT flattened into a bibliography.
 */
export const RELATION_FIELDS: readonly string[] = Object.freeze([
  "depends-on", "requires", "part-of", "component-of", "contrasts-with", "enables", "extends", "realizes", "instantiated-by",
]);

/**
 * Which class an internal cross-reference field belongs to: "citation"
 * (bibliographic) or "relation" (typed concept-graph link).
 */
export type InternalReferenceKind = "citation" | "relation";

/**
 * One extracted internal cross-reference: the front-matter field it came from,
 * its kind (citation or relation), and the raw slug or relative path written as
 * the target value.
 */
export type InternalReferenceTarget = Readonly<{
  field: string;
  kind: InternalReferenceKind;
  /** The raw slug or relative path as written in the front matter. */
  value: string;
}>;

/** Extract every internal cross-reference target from a decoded record, tagged
 *  by field and whether the field is bibliographic (citation) or a typed
 *  relation. Pure; total. Does not resolve targets — that needs the corpus. */
export function internalReferenceTargets(record: Readonly<Record<string, unknown>>): readonly InternalReferenceTarget[] {
  const out: InternalReferenceTarget[] = [];
  const collect = (field: string, kind: InternalReferenceKind): void => {
    const value = record[field];
    if (value === undefined || value === null) return;
    const arr = Array.isArray(value) ? value : [value];
    for (const item of arr) {
      if (typeof item === "string" && item.trim() !== "") {
        out.push(Object.freeze({ field, kind, value: item.trim() }));
      }
    }
  };
  for (const field of CITATION_FIELDS) collect(field, "citation");
  for (const field of RELATION_FIELDS) collect(field, "relation");
  return Object.freeze(out);
}

/** The slug a target resolves *by*: the last path segment without `.md`, or the
 *  bare slug. (Resolution itself — slug → document — is the caller's.) */
export function referenceSlug(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, "");
  const last = trimmed.includes("/") ? (trimmed.split("/").pop() ?? trimmed) : trimmed;
  return last.replace(/\.md$/i, "");
}

/** Build a CSL-JSON reference that links to one of our own pieces. The target
 *  document has been resolved by the caller to a repo path and (optionally) a
 *  title; `base` is the public site origin. Pure; total. */
export function internalCitationItem(
  resolved: Readonly<{ slug: string; repoPath: string; title?: string }>,
  base: string,
): CslItem {
  const origin = base.replace(/\/+$/, "");
  const item: { [key: string]: unknown } = {
    id: resolved.slug,
    type: "document",
    URL: `${origin}/file/${resolved.repoPath.split("/").map(encodeURIComponent).join("/")}`,
    "container-title": "561 Group Research Library",
  };
  if (resolved.title !== undefined && resolved.title.trim() !== "") item["title"] = resolved.title.trim();
  return Object.freeze(item) as CslItem;
}

// — small shapes —

function isRecord(value: unknown): value is { [key: string]: Parsed } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripCr(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}
