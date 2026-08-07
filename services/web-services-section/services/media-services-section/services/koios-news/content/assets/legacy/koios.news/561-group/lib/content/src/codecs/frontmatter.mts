// Front-matter content codec: the Hugo convention of a `---`-fenced YAML head
// over a markdown body, as used by the koios.news content store.
//
// Vocabulary: FrontMatterDocument (the carrier: a frozen record of front-matter
// entries plus the markdown body, verbatim). Morphisms: decodeFrontMatterDocument
// (text → document) and encodeFrontMatterDocument (document → canonical text).
//
// The codec covers the YAML subset the corpus uses: string scalars
// (double-quoted, single-quoted, bare), numbers, booleans, dates (kept as ISO
// strings — never Date objects), inline arrays `["a", "b"]` and CSL scalar
// tuples `[[2026, 6, 19]]`, block arrays (`- item` lines, including map items),
// and nested maps. Full-line and trailing `#` comments are recognized and
// dropped. Anything outside the subset is a malformed shape and throws
// TypeError — the only thing this codec throws for. Zero runtime dependencies;
// pure text ↔ record; no filesystem.
//
// Laws: decode(encode(doc)) = doc for every document in the subset, and
// decode(encode(decode(text))) = decode(text) for conforming texts (the
// canonical serialization may normalize quoting and drop comments; it never
// loses an entry or a body byte).

/**
 * A leaf front-matter value: a string (including dates kept as ISO strings),
 * number, or boolean.
 */
export type FrontMatterScalar = string | number | boolean;

/**
 * A front-matter entry value: a scalar, a readonly array, or a nested map - the
 * full value shape the codec's YAML subset admits.
 */
export type FrontMatterValue =
  | FrontMatterScalar
  | FrontMatterArray
  | FrontMatterMap;

export interface FrontMatterArray extends ReadonlyArray<FrontMatterValue> {}

export interface FrontMatterMap {
  readonly [key: string]: FrontMatterValue;
}

/**
 * The decoded front-matter head: a frozen, readonly record keyed by
 * front-matter key, with values widened to unknown.
 */
export type FrontMatterRecord = Readonly<Record<string, unknown>>;

/**
 * A parsed front-matter document: the leading YAML-ish record and the body text
 * that follows it.
 */
export type FrontMatterDocument = Readonly<{
  frontMatter: FrontMatterRecord;
  body: string;
}>;

const KEY_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?)?$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;
const FLOAT_PATTERN = /^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Parses a `---`-fenced front-matter document into a frozen FrontMatterDocument
 * of the decoded head record and the verbatim body that follows the closing
 * fence. Throws TypeError if the text is not a string or its fences are
 * missing.
 */
export function decodeFrontMatterDocument(text: string): FrontMatterDocument {
  if (typeof text !== "string") throw new TypeError("front-matter document must be a string");
  const lines = text.split("\n");
  if (stripCr(lines[0] ?? "") !== "---") {
    throw new TypeError("front-matter document must open with a `---` fence on line 1");
  }
  let fenceClose = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (stripCr(lines[i] ?? "") === "---") {
      fenceClose = i;
      break;
    }
  }
  if (fenceClose === -1) throw new TypeError("front-matter document has no closing `---` fence");
  const head = lines.slice(1, fenceClose).map((line) => stripCr(line));
  const body = lines.slice(fenceClose + 1).join("\n");
  return Object.freeze({ frontMatter: decodeHead(head), body });
}

/**
 * Serializes a FrontMatterDocument to canonical `---`-fenced text: the
 * front-matter entries (normalizing quoting, dropping comments) followed by the
 * body. Throws TypeError if the document, its body, or its frontMatter record
 * is malformed.
 */
export function encodeFrontMatterDocument(doc: FrontMatterDocument): string {
  if (doc === null || typeof doc !== "object") throw new TypeError("front-matter document must be an object");
  if (typeof doc.body !== "string") throw new TypeError("front-matter body must be a string");
  if (!isPlainRecord(doc.frontMatter)) throw new TypeError("frontMatter must be a plain record");
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(doc.frontMatter)) {
    requireKey(key, "front-matter key");
    encodeMapEntry(lines, key, value, "", key);
  }
  lines.push("---");
  return `${lines.join("\n")}\n${doc.body}`;
}

// — decoding the fenced head —

function decodeHead(head: readonly string[]): FrontMatterRecord {
  const record: Record<string, unknown> = {};
  let i = 0;
  while (i < head.length) {
    const line = head[i] ?? "";
    if (isBlankOrComment(line)) {
      i += 1;
      continue;
    }
    if (/^\s/.test(line)) {
      throw new TypeError(`front-matter line ${i + 2}: unexpected indentation outside a block`);
    }
    const entry = splitKeyLine(line, i + 2);
    if (entry.rest.trim() === "" || isBlankOrComment(entry.rest)) {
      const block = decodeBlock(head, i + 1, entry.key, "");
      record[entry.key] = block.value;
      i = block.next;
    } else {
      record[entry.key] = decodeFlowValue(entry.rest, `front-matter key ${entry.key}`);
      i += 1;
    }
  }
  return Object.freeze(record);
}

type Block = Readonly<{ value: FrontMatterValue; next: number }>;

function decodeBlock(head: readonly string[], start: number, key: string, parentIndent = ""): Block {
  let i = start;
  while (i < head.length && isBlankOrComment(head[i] ?? "")) i += 1;
  const first = head[i];
  if (first === undefined) {
    throw new TypeError(`front-matter key ${key}: a bare key must open a block array or nested map`);
  }
  const indent = /^(\s*)/.exec(first)?.[1] ?? "";
  const afterIndent = first.slice(indent.length);
  const isSequenceLine = afterIndent.startsWith("- ") || afterIndent === "-";
  if (indent.length <= parentIndent.length && !isSequenceLine) {
    throw new TypeError(`front-matter key ${key}: a bare key must open a block array or nested map`);
  }
  // A YAML block sequence may sit at the same column as its key (zero indent) —
  // `key:` then `- item` lines at column 0 — or be indented beneath it. The
  // corpus uses the zero-indent form heavily, so both are accepted.
  if (isSequenceLine) {
    return decodeBlockArray(head, i, indent, key, indent.length <= parentIndent.length);
  }
  // A nested map must be indented; a zero-indent, non-dash line is the next
  // sibling key, meaning the bare key opened no block at all.
  if (indent === "") {
    throw new TypeError(`front-matter key ${key}: a bare key must open a block array or nested map`);
  }
  return decodeNestedMap(head, i, indent, key);
}

function decodeBlockArray(
  head: readonly string[],
  start: number,
  indent: string,
  key: string,
  sameIndentSiblingEnds = false,
): Block {
  const items: FrontMatterValue[] = [];
  let i = start;
  while (i < head.length) {
    const line = head[i] ?? "";
    if (isBlankOrComment(line)) {
      i += 1;
      continue;
    }
    if (indent === "") {
      // Zero-indent sequence: a line that is not a `- item` is the next sibling
      // key (the block has ended), not a malformed item.
      if (!line.startsWith("- ")) break;
    } else {
      // Indented sequence: a dedent ends the block; a same-indent line that is
      // not a `- item` is malformed.
      if (!line.startsWith(indent) || !/^\s/.test(line)) break;
      if (!line.slice(indent.length).startsWith("- ")) {
        if (sameIndentSiblingEnds) break;
        throw new TypeError(`front-matter key ${key}: block array items must be \`- item\` lines at one indent`);
      }
    }
    const rest = line.slice(indent.length + 1).trimStart();
    if (rest === "") {
      const block = decodeBlock(head, i + 1, `${key}[]`, indent);
      items.push(block.value);
      i = block.next;
      continue;
    }
    const inlineEntry = trySplitKeyLine(rest);
    if (inlineEntry !== undefined) {
      const map: Record<string, FrontMatterValue> = {};
      let next = i + 1;
      if (inlineEntry.rest.trim() === "" || isBlankOrComment(inlineEntry.rest)) {
        const block = decodeBlock(head, next, `${key}[].${inlineEntry.key}`, `${indent}  `);
        map[inlineEntry.key] = block.value;
        next = block.next;
      } else {
        map[inlineEntry.key] = decodeFlowValue(inlineEntry.rest, `front-matter key ${key}[].${inlineEntry.key}`);
      }
      const continuation = decodeMapAt(head, next, `${indent}  `, `${key}[]`, map);
      items.push(continuation.value);
      i = continuation.next;
      continue;
    }
    const item = decodeFlowValue(rest, `front-matter key ${key}[]`);
    items.push(item);
    i += 1;
  }
  return Object.freeze({ value: Object.freeze(items), next: i });
}

function decodeNestedMap(head: readonly string[], start: number, indent: string, key: string): Block {
  return decodeMapAt(head, start, indent, key, {});
}

function decodeMapAt(
  head: readonly string[],
  start: number,
  indent: string,
  key: string,
  seed: Record<string, FrontMatterValue>,
): Block {
  const map: Record<string, FrontMatterValue> = seed;
  let i = start;
  while (i < head.length) {
    const line = head[i] ?? "";
    if (isBlankOrComment(line)) {
      i += 1;
      continue;
    }
    if (!/^\s/.test(line)) break;
    const actualIndent = /^(\s*)/.exec(line)?.[1] ?? "";
    if (actualIndent.length < indent.length) break;
    if (actualIndent !== indent) {
      throw new TypeError(`front-matter key ${key}: nested map entries must sit at one consistent indent`);
    }
    const entry = splitKeyLine(line.slice(indent.length), i + 2);
    if (entry.rest.trim() === "" || isBlankOrComment(entry.rest)) {
      const block = decodeBlock(head, i + 1, `${key}.${entry.key}`, indent);
      map[entry.key] = block.value;
      i = block.next;
      continue;
    }
    const value = decodeFlowValue(entry.rest, `front-matter key ${key}.${entry.key}`);
    map[entry.key] = value;
    i += 1;
  }
  return Object.freeze({ value: Object.freeze(map), next: i });
}

type KeyLine = Readonly<{ key: string; rest: string }>;

function splitKeyLine(line: string, lineNumber: number): KeyLine {
  const colon = line.indexOf(":");
  if (colon === -1) throw new TypeError(`front-matter line ${lineNumber}: expected \`key: value\``);
  const key = line.slice(0, colon).trim();
  requireKey(key, `front-matter line ${lineNumber} key`);
  return Object.freeze({ key, rest: line.slice(colon + 1) });
}

function trySplitKeyLine(line: string): KeyLine | undefined {
  const colon = line.indexOf(":");
  if (colon === -1) return undefined;
  const key = line.slice(0, colon).trim();
  const afterColon = line[colon + 1] ?? "";
  if (!KEY_PATTERN.test(key) || (afterColon !== "" && !/\s/.test(afterColon))) return undefined;
  return Object.freeze({ key, rest: line.slice(colon + 1) });
}

// — flow values: scalars and inline arrays —

function decodeFlowValue(raw: string, where: string): FrontMatterValue {
  const text = raw.trim();
  if (text.startsWith("[")) return decodeInlineArray(text, where);
  if (text.startsWith('"') || text.startsWith("'")) {
    const quoted = decodeQuoted(text, 0, where);
    requireOnlyTrailingComment(text.slice(quoted.end), where);
    return quoted.value;
  }
  return decodeBareScalar(stripTrailingComment(text), where);
}

type InlineArray = Readonly<{ value: readonly FrontMatterValue[]; end: number }>;

function decodeInlineArray(text: string, where: string): readonly FrontMatterValue[] {
  const decoded = decodeInlineArrayAt(text, 0, where);
  requireOnlyTrailingComment(text.slice(decoded.end), where);
  return decoded.value;
}

function decodeInlineArrayAt(text: string, start: number, where: string): InlineArray {
  if (text[start] !== "[") throw new TypeError(`${where}: inline array must start with \`[\``);
  const items: FrontMatterValue[] = [];
  let i = start + 1;
  let expectItem = true;
  for (;;) {
    while (i < text.length && /\s/.test(text[i] ?? "")) i += 1;
    if (i >= text.length) throw new TypeError(`${where}: inline array is missing its closing \`]\``);
    if (text[i] === "]") {
      if (expectItem && items.length > 0) throw new TypeError(`${where}: inline array has a trailing comma`);
      return Object.freeze({ value: Object.freeze(items), end: i + 1 });
    }
    if (!expectItem) {
      if (text[i] !== ",") throw new TypeError(`${where}: inline array items must be comma-separated`);
      i += 1;
      expectItem = true;
      continue;
    }
    const char = text[i] ?? "";
    if (char === "{") {
      // Flow maps (`{ key: value }`) are outside this codec's YAML subset; a
      // bare `{` would otherwise be comma-split into corrupt scalars. Reject it
      // loudly so the writer uses a block map instead of silently shipping junk.
      throw new TypeError(`${where}[${items.length}]: inline flow maps ({ ... }) are not supported; use a block map (indented "key: value" lines) instead`);
    }
    if (char === "[") {
      const nested = decodeInlineArrayAt(text, i, `${where}[${items.length}]`);
      items.push(nested.value);
      i = nested.end;
    } else if (char === '"' || char === "'") {
      const quoted = decodeQuoted(text, i, where);
      items.push(quoted.value);
      i = quoted.end;
    } else {
      let j = i;
      while (j < text.length && text[j] !== "," && text[j] !== "]") j += 1;
      const token = text.slice(i, j).trim();
      const scalar = decodeBareScalar(token, where);
      items.push(scalar);
      i = j;
    }
    expectItem = false;
  }
}

type Quoted = Readonly<{ value: string; end: number }>;

function decodeQuoted(text: string, start: number, where: string): Quoted {
  const quote = text[start];
  if (quote === "'") {
    let value = "";
    let i = start + 1;
    while (i < text.length) {
      if (text[i] === "'") {
        if (text[i + 1] === "'") {
          value += "'";
          i += 2;
          continue;
        }
        return Object.freeze({ value, end: i + 1 });
      }
      value += text[i] ?? "";
      i += 1;
    }
    throw new TypeError(`${where}: unterminated single-quoted string`);
  }
  let value = "";
  let i = start + 1;
  while (i < text.length) {
    const char = text[i] ?? "";
    if (char === '"') return Object.freeze({ value, end: i + 1 });
    if (char === "\\") {
      const escaped = text[i + 1];
      if (escaped === undefined) throw new TypeError(`${where}: dangling escape in double-quoted string`);
      if (escaped === "n") value += "\n";
      else if (escaped === "t") value += "\t";
      else if (escaped === "r") value += "\r";
      else if (escaped === '"' || escaped === "\\") value += escaped;
      else throw new TypeError(`${where}: unsupported escape \\${escaped} in double-quoted string`);
      i += 2;
      continue;
    }
    value += char;
    i += 1;
  }
  throw new TypeError(`${where}: unterminated double-quoted string`);
}

function decodeBareScalar(token: string, where: string): FrontMatterScalar {
  if (token === "") throw new TypeError(`${where}: empty value (quote empty strings as "")`);
  if (token === "true") return true;
  if (token === "false") return false;
  if (DATE_PATTERN.test(token)) return token;
  if (INTEGER_PATTERN.test(token)) return Number(token);
  if (FLOAT_PATTERN.test(token)) return Number(token);
  return token;
}

// — encoding —

function encodeFlowValue(value: unknown, where: string): string {
  if (Array.isArray(value)) {
    const items = value.map((item, index) => {
      if (isPlainRecord(item)) throw new TypeError(`${where}[${index}]: arrays hold scalars or scalar arrays only`);
      if (Array.isArray(item)) return encodeFlowValue(item, `${where}[${index}]`);
      return encodeScalar(item, `${where}[${index}]`);
    });
    return `[${items.join(", ")}]`;
  }
  return encodeScalar(value, where);
}

function encodeMapEntry(lines: string[], key: string, value: unknown, indent: string, where: string): void {
  requireKey(key, `${where} key`);
  if (isPlainRecord(value)) {
    lines.push(`${indent}${key}:`);
    encodeMapEntries(lines, value, `${indent}  `, where);
    return;
  }
  if (Array.isArray(value) && value.some((item) => isPlainRecord(item))) {
    lines.push(`${indent}${key}:`);
    encodeBlockArray(lines, value, `${indent}  `, where);
    return;
  }
  lines.push(`${indent}${key}: ${encodeFlowValue(value, where)}`);
}

function encodeMapEntries(
  lines: string[],
  record: Readonly<Record<string, unknown>>,
  indent: string,
  where: string,
): void {
  const entries = Object.entries(record);
  if (entries.length === 0) throw new TypeError(`${where}: nested maps must have at least one entry`);
  for (const [key, value] of entries) {
    encodeMapEntry(lines, key, value, indent, `${where}.${key}`);
  }
}

function encodeBlockArray(lines: string[], value: readonly unknown[], indent: string, where: string): void {
  for (const [index, item] of value.entries()) {
    const itemWhere = `${where}[${index}]`;
    if (!isPlainRecord(item)) {
      if (Array.isArray(item)) throw new TypeError(`${itemWhere}: block array items cannot be arrays`);
      lines.push(`${indent}- ${encodeScalar(item, itemWhere)}`);
      continue;
    }
    const entries = Object.entries(item);
    if (entries.length === 0) throw new TypeError(`${itemWhere}: nested maps must have at least one entry`);
    const first = entries[0];
    if (first === undefined) throw new TypeError(`${itemWhere}: nested maps must have at least one entry`);
    const [firstKey, firstValue] = first;
    const rest = entries.slice(1);
    requireKey(firstKey, `${itemWhere} key`);
    if (isPlainRecord(firstValue)) {
      lines.push(`${indent}- ${firstKey}:`);
      encodeMapEntries(lines, firstValue, `${indent}    `, `${itemWhere}.${firstKey}`);
    } else if (Array.isArray(firstValue) && firstValue.some((child) => isPlainRecord(child))) {
      lines.push(`${indent}- ${firstKey}:`);
      encodeBlockArray(lines, firstValue, `${indent}    `, `${itemWhere}.${firstKey}`);
    } else {
      lines.push(`${indent}- ${firstKey}: ${encodeFlowValue(firstValue, `${itemWhere}.${firstKey}`)}`);
    }
    for (const [key, child] of rest) {
      encodeMapEntry(lines, key, child, `${indent}  `, `${itemWhere}.${key}`);
    }
  }
}

function encodeScalar(value: unknown, where: string): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${where}: numbers must be finite`);
    return String(value);
  }
  if (typeof value === "string") {
    if (DATE_PATTERN.test(value)) return value;
    return quoteString(value);
  }
  throw new TypeError(`${where}: front-matter values are strings, numbers, booleans, arrays, or maps`);
}

function quoteString(value: string): string {
  let out = '"';
  for (const char of value) {
    if (char === "\\" || char === '"') out += `\\${char}`;
    else if (char === "\n") out += "\\n";
    else if (char === "\t") out += "\\t";
    else if (char === "\r") out += "\\r";
    else out += char;
  }
  return `${out}"`;
}

// — small shapes —

function stripCr(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

function stripTrailingComment(token: string): string {
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === "#" && (i === 0 || /\s/.test(token[i - 1] ?? ""))) {
      return token.slice(0, i).trim();
    }
  }
  return token.trim();
}

function requireOnlyTrailingComment(rest: string, where: string): void {
  const trimmed = rest.trim();
  if (trimmed !== "" && !trimmed.startsWith("#")) {
    throw new TypeError(`${where}: unexpected trailing content \`${trimmed}\``);
  }
}

function requireKey(key: string, where: string): void {
  if (!KEY_PATTERN.test(key)) throw new TypeError(`${where}: \`${key}\` is not a bare front-matter key`);
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
