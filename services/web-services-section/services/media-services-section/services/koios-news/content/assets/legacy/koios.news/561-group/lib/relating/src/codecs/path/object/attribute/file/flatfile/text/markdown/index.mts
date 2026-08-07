/**
 * codecs/path/object/attribute/file/flatfile/text/markdown
 *
 * Markdown flatfiles with optional frontmatter, projected into EAVT-shaped
 * assertions. Filesystem reads/writes are outside this codec; callers provide
 * the markdown text and witness.
 */
import { extname } from "node:path";
import { restrict, type Projector } from "../../../../../../../../holography/index.mjs";
import { canonical, parse as parseJson, requireJsonValue, type JsonValue } from "../../serialization/json/index.mjs";
import { type JsonSchema, type SchemaAssertion, unfoldSchema } from "../../serialization/json/schema/index.mjs";
import { textProjector } from "../index.mjs";

export type MarkdownFrontmatterFormat = "yaml" | "toml" | null;
export type FrontmatterModality = "MUST" | "SHOULD" | "MAY";
export type FrontmatterCharge = "potential" | "active" | "absurd";

export type MarkdownAssertion = Readonly<{
  readonly [key: string]: JsonValue;
  readonly e: string;
  readonly a: string;
  readonly v: JsonValue;
  readonly t: string;
}>;

export type FrontmatterChargeEntry = Readonly<{
  readonly predicate: "has-frontmatter" | "yaml-frontmatter" | "toml-frontmatter";
  readonly modality: FrontmatterModality;
  readonly depth: number;
  readonly value: FrontmatterCharge;
  readonly evidence: readonly [readonly string[], readonly string[]];
}>;

export type FrontmatterConformance = Readonly<{
  readonly settled: true;
  readonly conformant: boolean;
  readonly format: MarkdownFrontmatterFormat;
  readonly charges: readonly FrontmatterChargeEntry[];
  readonly notes: readonly string[];
}>;

export type MarkdownParseResult = Readonly<{
  readonly frontmatter: Readonly<Record<string, JsonValue>> | null;
  readonly format: MarkdownFrontmatterFormat;
  readonly body: string;
}>;

export type MarkdownDataform = Readonly<{
  readonly subject: string;
  readonly format: MarkdownFrontmatterFormat;
  readonly conformant: boolean;
  readonly verdict: FrontmatterConformance;
  readonly frontmatter: Readonly<Record<string, JsonValue>>;
  readonly body: string;
  readonly assertions: readonly MarkdownAssertion[];
  readonly cells: readonly Readonly<{
    readonly cell: Readonly<{ readonly subject: string; readonly predicate: string; readonly object: JsonValue }>;
    readonly charge: Readonly<{ readonly value: readonly [true, false]; readonly evidence: readonly [readonly string[], readonly string[]] }>;
  }>[];
}>;

export type DocumentTypeDefinition = Readonly<{
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly filename: string;
  readonly placement: string;
  readonly bodySkeleton: string;
  readonly schemaFragment?: JsonSchema;
}>;

export const DOC_TYPE_STAMP = "tx-document-types";

export const markdownProjector: Projector<unknown> = restrict(textProjector, {
  type: "markdown",
  recognize: (resource) => [".md", ".markdown"].includes(extname(resource.path).toLowerCase()),
});

export const markdownDocumentSchemaFragment: JsonSchema = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: Object.freeze(["name", "description"]),
  properties: Object.freeze({
    name: Object.freeze({ type: "string", minLength: 1 }),
    description: Object.freeze({ type: "string", minLength: 1, maxLength: 300 }),
  }),
});

export const documentTypeDefinitions: readonly DocumentTypeDefinition[] = Object.freeze([
  Object.freeze({
    slug: "readme",
    title: "README",
    description: "A human-facing markdown-document named exactly README.md at a directory root.",
    filename: "^README\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "agents-guide",
    title: "Agents Guide",
    description: "An agent-facing markdown-document named exactly AGENTS.md at a directory root.",
    filename: "^AGENTS\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# AGENTS.md\n",
  }),
  Object.freeze({
    slug: "claude-memory",
    title: "Claude Memory",
    description: "A markdown-document at a CLAUDE.md or CLAUDE.local.md location for project instruction memory.",
    filename: "^CLAUDE(\\.local)?\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# CLAUDE.md\n",
  }),
  Object.freeze({
    slug: "heartbeat",
    title: "Heartbeat",
    description: "A markdown-document named exactly HEARTBEAT.md at a repository or package root.",
    filename: "^HEARTBEAT\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# HEARTBEAT.md\n",
  }),
  Object.freeze({
    slug: "specification",
    title: "Specification",
    description: "A markdown-document named specification.md at {thing}/docs/dev/ for normative development specification.",
    filename: "^specification\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "development-journal-entry",
    title: "Development Journal Entry",
    description: "A date-stamped markdown-document at {thing}/docs/dev/journal/<YYYY-MM-DD>[-slug].md carrying historical narrative about the parent thing on the named date.",
    filename: "^\\d{4}-\\d{2}-\\d{2}(-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)?\\.md$",
    placement: "{thing}/docs/dev/journal/",
    bodySkeleton: "# {title}\n",
    schemaFragment: Object.freeze({
      properties: Object.freeze({
        "entry-date": Object.freeze({ type: "string", format: "date" }),
        "session-of": Object.freeze({ type: "string" }),
        "superseded-by": Object.freeze({ type: "string" }),
      }),
    }),
  }),
  Object.freeze({
    slug: "development-document",
    title: "Development Document",
    description: "A markdown-document at {thing}/docs/dev/{slug}.md carrying development-stage prose.",
    filename: "^(?!specification\\.md$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n\n## Key Terms\n",
  }),
]);

export function parseMarkdown(text: string): MarkdownParseResult {
  const yamlMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (yamlMatch) {
    return Object.freeze({
      frontmatter: Object.freeze(parseYamlFrontmatter(yamlMatch[1] ?? "")),
      format: "yaml" as const,
      body: text.slice(yamlMatch[0].length),
    });
  }
  const tomlMatch = text.match(/^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/);
  if (tomlMatch) {
    return Object.freeze({ frontmatter: Object.freeze({}), format: "toml" as const, body: text.slice(tomlMatch[0].length) });
  }
  return Object.freeze({ frontmatter: null, format: null, body: text });
}

export function frontmatterConformance(text: string, opts: { readonly witness?: string } = {}): FrontmatterConformance {
  const witness = opts.witness ?? "frontmatter";
  const yaml = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.test(text);
  const toml = /^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/.test(text);
  const present = yaml || toml;
  const charge = (predicate: FrontmatterChargeEntry["predicate"], modality: FrontmatterModality, depth: number, value: FrontmatterCharge): FrontmatterChargeEntry =>
    Object.freeze({
      predicate,
      modality,
      depth,
      value,
      evidence: value === "potential"
        ? Object.freeze([Object.freeze([witness]), Object.freeze([])] as const)
        : value === "active"
          ? Object.freeze([Object.freeze([]), Object.freeze([witness])] as const)
          : Object.freeze([Object.freeze([]), Object.freeze([])] as const),
    });
  const charges = Object.freeze([
    charge("has-frontmatter", "MUST", 0, present ? "potential" : "active"),
    charge("yaml-frontmatter", "SHOULD", 1, yaml ? "potential" : present ? "active" : "absurd"),
    charge("toml-frontmatter", "MAY", 2, toml ? "potential" : "absurd"),
  ]);
  const notes = charges
    .filter((entry) => entry.modality === "SHOULD" && entry.value === "active")
    .map((entry) => `SHOULD ${entry.predicate} (depth ${entry.depth})`);
  return Object.freeze({
    settled: true as const,
    conformant: charges.filter((entry) => entry.modality === "MUST").every((entry) => entry.value !== "active"),
    format: yaml ? "yaml" as const : toml ? "toml" as const : null,
    charges,
    notes: Object.freeze(notes),
  });
}

export function markdownDataform(text: string, opts: { readonly witness: string; readonly subject?: string }): MarkdownDataform {
  const parsed = parseMarkdown(text);
  const verdict = frontmatterConformance(text, { witness: opts.witness });
  const frontmatter = parsed.frontmatter ?? {};
  const subject = opts.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"] ? frontmatter["slug"] : opts.witness);
  const assertions: MarkdownAssertion[] = [];
  const push = (a: string, v: JsonValue): void => {
    assertions.push(Object.freeze({ e: subject, a, v, t: opts.witness }));
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) for (const item of value) push(key, frontmatterRowValue(item));
    else push(key, frontmatterRowValue(value));
  }
  push("body", parsed.body);
  const cells = assertions.map((assertion) => Object.freeze({
    cell: Object.freeze({ subject: assertion.e, predicate: assertion.a, object: assertion.v }),
    charge: Object.freeze({ value: Object.freeze([true, false] as const), evidence: Object.freeze([Object.freeze([opts.witness]), Object.freeze([])] as const) }),
  }));
  return Object.freeze({
    subject,
    format: parsed.format,
    conformant: verdict.conformant,
    verdict,
    frontmatter: Object.freeze(frontmatter),
    body: parsed.body,
    assertions: Object.freeze(assertions),
    cells: Object.freeze(cells),
  });
}

export function documentTypeFragment(definition: DocumentTypeDefinition): JsonSchema {
  return Object.freeze({
    title: definition.title,
    description: definition.description,
    "x-trc-type": definition.slug,
    "x-trc-filename": definition.filename,
    "x-trc-placement": definition.placement,
    "x-trc-body-skeleton": definition.bodySkeleton,
    ...(definition.schemaFragment ?? {}),
  });
}

export function documentTypeAssertions(definition: DocumentTypeDefinition, opts: {
  readonly base?: string;
  readonly t?: string;
} = {}): SchemaAssertion[] {
  const options = { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t ?? DOC_TYPE_STAMP };
  return [
    ...unfoldSchema(markdownDocumentSchemaFragment, options),
    ...unfoldSchema(documentTypeFragment(definition), options),
  ];
}

export function allDocumentTypeAssertions(opts: { readonly base?: string; readonly t?: string } = {}): readonly SchemaAssertion[] {
  return Object.freeze(documentTypeDefinitions.flatMap((definition) => documentTypeAssertions(definition, opts)));
}

function frontmatterRowValue(value: JsonValue): JsonValue {
  if (value !== null && typeof value === "object") return canonical(value);
  return value;
}

function parseYamlFrontmatter(src: string): Record<string, JsonValue> {
  const lines = src.split(/\r?\n/);
  const out: Record<string, JsonValue> = {};
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    if (line.trim() === "") {
      index++;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) throw new TypeError(`frontmatter: expected key at line ${index + 1}`);
    const key = match[1]!;
    const rest = match[2] ?? "";
    if (rest.trim() !== "") {
      out[key] = parseScalar(rest);
      index++;
      continue;
    }
    const block = collectIndented(lines, index + 1);
    out[key] = parseYamlBlock(block.lines);
    index = block.next;
  }
  return requireJsonValue(out, "frontmatter") as Record<string, JsonValue>;
}

function collectIndented(lines: readonly string[], start: number): { readonly lines: readonly string[]; readonly next: number } {
  const block: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      block.push(line);
      index++;
      continue;
    }
    if (!line.startsWith("  ")) break;
    block.push(line);
    index++;
  }
  return { lines: block, next: index };
}

function parseYamlBlock(lines: readonly string[]): JsonValue {
  const meaningful = lines.filter((line) => line.trim() !== "");
  if (meaningful.length === 0) return {};
  return parseYamlNode(meaningful, lineIndent(meaningful[0]!));
}

function parseYamlNode(lines: readonly string[], indent: number): JsonValue {
  const meaningful = lines.filter((line) => line.trim() !== "");
  if (meaningful.length === 0) return {};
  return meaningful[0]!.slice(indent).startsWith("- ")
    ? parseYamlArray(meaningful, indent)
    : parseYamlMapping(meaningful, indent);
}

function parseYamlArray(lines: readonly string[], indent: number): JsonValue {
  const items: JsonValue[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    if (lineIndent(line) !== indent || !line.slice(indent).startsWith("- ")) {
      throw new TypeError("frontmatter: expected array item");
    }
    const rest = line.slice(indent + 2);
    const itemLines: string[] = [];
    index++;
    while (index < lines.length && !(lineIndent(lines[index]!) === indent && lines[index]!.slice(indent).startsWith("- "))) {
      itemLines.push(lines[index]!);
      index++;
    }
    if (rest.trim() === "") {
      items.push(parseYamlNode(itemLines, indent + 2));
      continue;
    }
    if (/^[A-Za-z0-9_-]+:\s*/.test(rest)) {
      items.push(parseYamlNode([`${" ".repeat(indent + 2)}${rest}`, ...itemLines], indent + 2));
      continue;
    }
    if (itemLines.length > 0) throw new TypeError("frontmatter: scalar array item cannot have nested fields");
    items.push(parseScalar(rest));
  }
  return requireJsonValue(items, "frontmatter array");
}

function parseYamlMapping(lines: readonly string[], indent: number): JsonValue {
  const record: Record<string, JsonValue> = {};
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    const prefix = " ".repeat(indent);
    if (!line.startsWith(prefix) || lineIndent(line) !== indent) throw new TypeError("frontmatter: expected nested mapping field");
    const match = line.slice(indent).match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) throw new TypeError("frontmatter: expected nested mapping field");
    const key = match[1]!;
    const rest = match[2] ?? "";
    index++;
    if (rest.trim() !== "") {
      record[key] = parseScalar(rest);
      continue;
    }
    const child: string[] = [];
    while (index < lines.length && lineIndent(lines[index]!) > indent) {
      child.push(lines[index]!);
      index++;
    }
    record[key] = parseYamlNode(child, indent + 2);
  }
  return requireJsonValue(record, "frontmatter nested mapping");
}

function lineIndent(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function parseScalar(raw: string): JsonValue {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  try {
    return requireJsonValue(parseJson(trimmed), "frontmatter scalar");
  } catch {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed.replace(/^["']|["']$/g, "");
  }
}
