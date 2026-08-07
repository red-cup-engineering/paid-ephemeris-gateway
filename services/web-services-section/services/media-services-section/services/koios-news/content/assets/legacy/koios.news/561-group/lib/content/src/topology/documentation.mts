/**
 * documentation — the pure documentation-production surface: the per-symbol
 * prompt, the minimal-reply parser, the doc gates, and the markdown formatter.
 *
 * This is the production cycle of ./production and the editorial gates of
 * ./gates, turned on CODE instead of news. A package's introspected surface
 * (each exported symbol's signature and JSDoc) is the intake; the model is
 * asked for the SMALLEST prose it can give — a one-line summary, a short
 * description, an optional example — and OUR code does every bit of formatting
 * (the heading, the fenced signature, the example framing) and every bit of
 * verification (the gates). The keystone is `hallucinatedApiFindings`: an LLM
 * autodoc is only trustworthy if it cannot invent API that does not exist, so
 * every call-shaped and type-shaped reference in the reply is checked against
 * the surface's own vocabulary before the doc is allowed to ship.
 *
 * Everything here is pure over its inputs. The I/O (reading the surface, calling
 * the model, writing the file, running the revise loop) is the consumer's — the
 * @emsenn/jsnode-content-computer app binds it to the filesystem and a provider.
 * Per the same split content-farm uses, the PROMPT lives with the cycle that
 * owns it (the app), but the parse/gate/format primitives are domain-neutral and
 * live here beside the news ones.
 */

import { proseLintErrors, wordCount } from "./gates.mjs";

// ---------- the documentable symbol ----------

/** What kind of declaration a documented symbol is. Mirrors the TypeScript
 *  declaration forms; matches @emsenn/javascript-computer's DocSymbolKind so a
 *  read surface is structurally a DocumentableSymbol without a conversion. */
export type DocSymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type-alias"
  | "const"
  | "variable";

/** The minimum a documenter needs about one exported symbol: its name, what it
 *  is, its verbatim signature, and any existing doc-comment. Deliberately a
 *  structural subset of the app's richer SurfaceSymbol, so this module never
 *  depends on the I/O that read it. */
export interface DocumentableSymbol {
  readonly name: string;
  readonly kind: DocSymbolKind;
  readonly signature: string;
  readonly doc: string;
}

// ---------- the model's minimal reply ----------

/** The three prose surfaces a documenter asks the model for — nothing more.
 *  `summary` is one sentence; `details` is a short paragraph; `example` is an
 *  optional code snippet (absent when the model judged none worth showing). */
export interface DocReply {
  readonly summary: string;
  readonly details: string;
  readonly example?: string;
}

/** Parse a minimal documentation reply into its surfaces. A reply with no
 *  SUMMARY is a malformed shape (thrown); a missing or "none" EXAMPLE is a
 *  legitimate absence, not an error. */
export function parseDocReply(reply: string): DocReply {
  const text = String(reply ?? "").replaceAll("\r\n", "\n");
  const grab = (label: string): string => {
    const match = text.match(new RegExp(`^${label}:\\s*(.*)$`, "im"));
    return (match?.[1] ?? "").trim();
  };
  const summary = grab("SUMMARY");
  if (summary === "") throw new TypeError("documentation reply has no SUMMARY");

  const detailsStart = markerEnd(text, "DETAILS");
  const exampleStart = text.search(/^EXAMPLE:/im);
  const details = detailsStart < 0
    ? ""
    : text.slice(detailsStart, exampleStart >= 0 ? exampleStart : undefined).trim();

  let example: string | undefined;
  if (exampleStart >= 0) {
    const raw = stripFence(text.slice(text.indexOf(":", exampleStart) + 1).trim());
    if (raw !== "" && !/^none\.?$/i.test(raw)) example = raw;
  }

  return Object.freeze({
    summary: oneLine(summary),
    details,
    ...(example === undefined ? {} : { example }),
  });
}

function markerEnd(text: string, label: string): number {
  const at = text.search(new RegExp(`^${label}:`, "im"));
  return at < 0 ? -1 : text.indexOf(":", at) + 1;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Strip a single surrounding ``` fence (optionally language-tagged) from a
 *  code block, leaving the code. Leaves un-fenced text untouched. */
function stripFence(value: string): string {
  const fence = value.match(/^```[\w-]*\n([\s\S]*?)\n?```$/);
  return fence ? (fence[1] ?? "").trim() : value;
}

// ---------- the gates ----------

/** One gate's reading of a documentation reply: a charge with its evidence. */
export interface DocGate {
  readonly gate: string;
  readonly charge: "pass" | "fail";
  readonly evidence: string;
}

/** JavaScript / TypeScript names a documenter may reference without the
 *  surface vouching for them: globals, utility types, and the like. Method
 *  calls (`x.map(...)`) are excluded from the hallucination scan by the
 *  leading-dot rule, so this list need only carry *bare* call/type names. */
const BUILTINS: ReadonlySet<string> = new Set([
  "Object", "Array", "Map", "Set", "WeakMap", "WeakSet", "Promise", "String",
  "Number", "Boolean", "Symbol", "BigInt", "JSON", "Math", "Date", "Error",
  "TypeError", "RangeError", "RegExp", "console", "Reflect", "Proxy", "Function",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent",
  "decodeURIComponent", "structuredClone", "fetch", "require", "import",
  "Uint8Array", "ArrayBuffer", "DataView", "Iterable", "AsyncIterable",
  "Iterator", "Generator", "Readonly", "ReadonlyArray", "ReadonlySet",
  "ReadonlyMap", "Record", "Partial", "Required", "Pick", "Omit", "Exclude",
  "Extract", "NonNullable", "Parameters", "ReturnType", "Awaited",
]);

/** JS keywords that take a `(` but are not function references. */
const KEYWORDS: ReadonlySet<string> = new Set([
  "if", "for", "while", "switch", "catch", "return", "function", "await",
  "typeof", "new", "throw", "void", "in", "of", "do", "else", "yield",
  "delete", "instanceof", "case", "with", "super", "this",
]);

/** API-shaped references in `text` that the known vocabulary does not vouch
 *  for — the model's inventions. Two shapes are checked, both high-signal:
 *  a bare call `name(` (a claimed function/constructor, never a method, since
 *  a leading `.` excludes it), and a backticked PascalCase `` `TypeName` ``
 *  (a claimed type). Lowercase backticked words are left alone — they read as
 *  prose far more often than as API, and the call form already catches invented
 *  functions. */
export function hallucinatedApiFindings(text: string, known: ReadonlySet<string>): readonly string[] {
  const vouched = (name: string): boolean => known.has(name) || BUILTINS.has(name) || KEYWORDS.has(name);
  const findings = new Set<string>();
  for (const match of text.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = match[1] ?? "";
    if (!vouched(name)) findings.add(`${name}() — no such function in the surface`);
  }
  for (const match of text.matchAll(/`([A-Z][A-Za-z0-9_$]*)`/g)) {
    const name = match[1] ?? "";
    if (!vouched(name)) findings.add(`\`${name}\` — no such type in the surface`);
  }
  return Object.freeze([...findings]);
}

/** Names bound locally inside an example: `const/let/var/function/class NAME`
 *  declarations. These are the example's own vocabulary — calling them is not a
 *  hallucination. (Arrow parameters are omitted: a parameter is rarely *called*,
 *  so the declaration forms cover the real cases without parsing param lists.) */
function localBindings(code: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const match of code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)\b/g)) {
    names.add(match[1] ?? "");
  }
  return names;
}

function union(a: ReadonlySet<string>, b: ReadonlySet<string>): ReadonlySet<string> {
  const out = new Set(a);
  for (const item of b) out.add(item);
  return out;
}

/** Defects in an example code block: a `const/let/var NAME = …` that shadows a
 *  runtime VALUE EXPORT the example would import (e.g. `const jsFn = jsFn(...)`,
 *  a TDZ ReferenceError the smaller models reliably emit), and an example that
 *  never actually calls the documented symbol. `valueExports` must be the set
 *  of runtime export bindings only — never parameter or type names, which are
 *  safe to reuse as local variables. */
export function exampleFindings(example: string, symbolName: string, valueExports: ReadonlySet<string>): readonly string[] {
  const findings: string[] = [];
  for (const match of example.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[1] ?? "";
    if (valueExports.has(name)) findings.push(`the example binds \`${name}\`, shadowing the export of the same name — name the local variable differently`);
  }
  if (!new RegExp(`\\b${symbolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(example)) {
    findings.push(`the example never calls \`${symbolName}\` — show it in use`);
  }
  return Object.freeze(findings);
}

/** Gate a documentation reply for one symbol against the surface's vocabulary.
 *  The keystone is `no-hallucinated-api`; the rest enforce that the doc is
 *  about THIS symbol, is the right size, carries a faithful example, and is
 *  clean prose. `vocabulary` is the may-reference set (exports + types +
 *  builtins; over-admitting is safe). `valueExports` is the narrower set of
 *  runtime export bindings whose shadowing is a real TDZ hazard — when omitted
 *  it defaults to just the documented symbol, the most common offender. */
export function judgeDoc(
  symbol: DocumentableSymbol,
  reply: DocReply,
  vocabulary: ReadonlySet<string>,
  valueExports: ReadonlySet<string> = new Set([symbol.name]),
): readonly DocGate[] {
  const gates: DocGate[] = [];
  const judge = (gate: string, pass: boolean, evidence: string): void => {
    gates.push(Object.freeze({ gate, charge: pass ? "pass" : "fail", evidence }));
  };

  const prose = `${reply.summary}\n${reply.details}`;
  // Prose is held strictly to the surface vocabulary. The example is CODE: it
  // legitimately declares and then calls its own locals, so it is scanned
  // against the vocabulary widened by its own bindings — an invented helper is
  // still caught, but `const r = f(); r(x)` is not a false positive.
  const proseHallucinations = hallucinatedApiFindings(prose, vocabulary);
  const exampleHallucinations = reply.example === undefined
    ? []
    : hallucinatedApiFindings(reply.example, union(vocabulary, localBindings(reply.example)));
  const hallucinations = [...proseHallucinations, ...exampleHallucinations];
  judge(
    "no-hallucinated-api",
    hallucinations.length === 0,
    hallucinations.length === 0
      ? "every API reference is vouched for by the surface"
      : `${hallucinations.length} invented reference(s): ${hallucinations.join("; ")} — only name symbols that exist in this package`,
  );

  const mentioned = prose.includes(symbol.name);
  judge("mentions-symbol", mentioned, mentioned ? `names "${symbol.name}"` : `the prose never names "${symbol.name}" — the doc must be about it`);

  const summaryWords = wordCount(reply.summary);
  judge("summary-length", summaryWords >= 4 && summaryWords <= 40, `summary ${summaryWords} words (needs 4-40 — one full sentence)`);

  const detailWords = wordCount(reply.details);
  judge("details-length", detailWords >= 15 && detailWords <= 160, `details ${detailWords} words (needs 15-160 — a short paragraph, not an essay)`);

  if (reply.example !== undefined) {
    const exampleProblems = exampleFindings(reply.example, symbol.name, valueExports);
    judge("example-fidelity", exampleProblems.length === 0, exampleProblems.length === 0 ? "the example calls the symbol and shadows nothing" : exampleProblems.join("; "));
  }

  const errors = proseLintErrors(prose);
  judge("prose", errors.length === 0, errors.length === 0 ? "no prose-lint errors" : `${errors.length} prose-lint error(s): ${errors.slice(0, 3).join(" | ")}`);

  return Object.freeze(gates);
}

/** Fold failing gates into revision findings for the revise prompt. */
export function docFindings(gates: readonly DocGate[]): readonly string[] {
  return Object.freeze(gates.filter((gate) => gate.charge === "fail").map((gate) => `${gate.gate}: ${gate.evidence}`));
}

// ---------- the prompt ----------

/** A documentation voice: audience and house notes spliced into the prompt.
 *  Kept tiny and optional — the craft laws below are universal. */
export interface DocVoice {
  readonly audience?: string;
  readonly notes?: readonly string[];
}

/**
 * The inputs to symbolDocPrompt: the package name and description, the one
 * DocumentableSymbol being documented, optional sibling export names and
 * DocVoice, and the optional previous reply and findings that drive a revision
 * pass.
 */
export interface SymbolPromptInput {
  readonly packageName: string;
  readonly packageDescription: string;
  readonly symbol: DocumentableSymbol;
  /** Sibling export names, so the model can reference real neighbours and is
   *  reminded what vocabulary actually exists. */
  readonly siblings?: readonly string[];
  readonly voice?: DocVoice;
  readonly previous?: string;
  readonly findings?: readonly string[];
}

/** The per-symbol prompt: the model sees ONLY this symbol's surface (its
 *  signature, its JSDoc, the package's purpose, the sibling names) — careful
 *  context spacesuiting — and is asked for three small prose fields. Our code
 *  formats the markdown; the model never produces structure. */
export function symbolDocPrompt(input: SymbolPromptInput): string {
  const { symbol } = input;
  const head = [
    `You are writing one reference-documentation entry for an exported ${kindWord(symbol.kind)} in the TypeScript package "${input.packageName}".`,
    input.packageDescription === "" ? "" : `The package: ${input.packageDescription}`,
    input.voice?.audience ? `Audience: ${input.voice.audience}.` : "Audience: a developer who will call this symbol and wants to know what it does and when to use it.",
    "",
    `SYMBOL: ${symbol.name}`,
    `SIGNATURE: ${symbol.signature}`,
    symbol.doc === "" ? "(the symbol carries no doc-comment; infer its purpose from the signature and name)" : `EXISTING DOC-COMMENT: ${symbol.doc}`,
    ...(input.siblings && input.siblings.length > 0
      ? ["", `OTHER EXPORTS IN THIS PACKAGE (the ONLY other names you may reference): ${input.siblings.join(", ")}`]
      : []),
    ...(input.voice?.notes ?? []),
  ].filter((line) => line !== "");

  const laws = [
    "",
    "Write the entry under these laws:",
    `- name "${symbol.name}" in the summary or the details — the entry is about it`,
    "- NEVER invent API: reference only the symbol itself, the other exports listed above, and standard JavaScript — if you are unsure a function exists, do not name it",
    "- do not restate the signature in prose; it is shown above the entry verbatim",
    "- describe what it does and when a developer reaches for it; be concrete, not promotional",
    "- stay within what the signature and doc-comment support; do not invent use-cases, domains, or callers the surface does not show",
    "- the summary is ONE full sentence (4-40 words); the details are one short paragraph (15-160 words)",
    "- the example, if you give one, is real, minimal, runnable TypeScript that calls the symbol — never pseudocode; write 'none' if no example clarifies it",
    `- in the example, never shadow "${symbol.name}" with a local variable of the same name; bind the result to a differently named variable`,
    "- plain declarative prose; no marketing, no rhetorical questions",
  ];

  const revision = input.previous === undefined ? [] : [
    "",
    "This is a REVISION. Your previous entry failed these checks:",
    ...(input.findings ?? []).map((finding) => `- ${finding}`),
    "Fix every one. Keep what worked.",
    "",
    "PREVIOUS ENTRY:",
    input.previous,
  ];

  const format = [
    "",
    "Output EXACTLY this structure, nothing else (no preamble, no headings, no backtick fence around the whole reply):",
    "SUMMARY: <one sentence>",
    "DETAILS: <one short paragraph>",
    "EXAMPLE:",
    "<a fenced ```ts code block, or the single word none>",
  ];

  return [...head, ...laws, ...revision, ...format].join("\n");
}

function kindWord(kind: DocSymbolKind): string {
  switch (kind) {
    case "function": return "function";
    case "class": return "class";
    case "interface": return "interface";
    case "type-alias": return "type";
    case "const": return "constant";
    case "variable": return "value";
  }
}

// ---------- the formatter (our code, never the model) ----------

/** Render a documented symbol into a markdown reference entry. The model
 *  supplied only the three prose fields in `reply`; everything structural —
 *  the heading, the fenced signature, the example framing — is ours. */
export function formatReferenceEntry(symbol: DocumentableSymbol, reply: DocReply): string {
  const lines = [
    `### \`${symbol.name}\``,
    "",
    "```ts",
    symbol.signature,
    "```",
    "",
    reply.summary,
  ];
  if (reply.details !== "") lines.push("", reply.details);
  if (reply.example !== undefined) lines.push("", "**Example**", "", "```ts", reply.example, "```");
  return lines.join("\n");
}

/** A whole reference document: the package heading, a one-line intent, and one
 *  entry per documented symbol in load-bearing order. */
export function formatReference(packageName: string, intro: string, entries: readonly string[]): string {
  return [`# \`${packageName}\` reference`, "", intro, "", ...interleave(entries)].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function interleave(entries: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (const entry of entries) out.push(entry, "");
  return out;
}

// ---------- composition: the package overview and README ----------

/** A symbol distilled to its one-line summary — the spacesuited context the
 *  higher rungs compose from. The overview prompt sees these, never raw code. */
export interface SymbolSummary {
  readonly name: string;
  readonly summary: string;
}

/**
 * The inputs to overviewPrompt: the package name and description, the
 * per-symbol one-line summaries the overview is composed from, an optional
 * DocVoice, and the optional previous overview and findings for a revision
 * pass.
 */
export interface OverviewPromptInput {
  readonly packageName: string;
  readonly packageDescription: string;
  /** The already-documented symbols, distilled to summaries (load-bearing
   *  first). The model composes the gestalt from these — never from source. */
  readonly summaries: readonly SymbolSummary[];
  readonly voice?: DocVoice;
  readonly previous?: string;
  readonly findings?: readonly string[];
}

/** The package-overview prompt: the model sees the package's purpose and the
 *  one-line summary of each documented symbol — the distilled surface, not the
 *  code — and writes the two-or-three-sentence overview that opens a README.
 *  Context spacesuiting at the next rung up: summaries compose, source does
 *  not re-enter. */
export function overviewPrompt(input: OverviewPromptInput): string {
  const head = [
    `You are writing the opening overview of the README for the TypeScript package "${input.packageName}".`,
    input.packageDescription === "" ? "" : `Stated purpose: ${input.packageDescription}`,
    input.voice?.audience ? `Audience: ${input.voice.audience}.` : "Audience: a developer deciding whether this package solves their problem.",
    "",
    "Its exported surface, each symbol with a one-line summary:",
    ...input.summaries.map((s) => `- ${s.name}: ${s.summary}`),
    ...(input.voice?.notes ?? []),
    "",
    "Write the overview under these laws:",
    "- two or three sentences (25-90 words): what the package is for and what its surface lets a developer do",
    "- synthesize across the symbols — name the throughline, do not list them one by one",
    "- reference only names that appear in the surface above; invent no API",
    "- plain declarative prose; no marketing, no rhetorical questions, no headings",
  ].filter((line) => line !== "");

  const revision = input.previous === undefined ? [] : [
    "",
    "This is a REVISION. Your previous overview failed these checks:",
    ...(input.findings ?? []).map((finding) => `- ${finding}`),
    "Fix every one. Keep what worked.",
    "",
    "PREVIOUS OVERVIEW:",
    input.previous,
  ];

  const format = ["", "Output EXACTLY this structure, nothing else:", "OVERVIEW: <the overview prose>"];
  return [...head, ...revision, ...format].join("\n");
}

/** Parse the overview reply: the prose after the OVERVIEW: marker, or the whole
 *  reply when the model omitted the marker. Throws on empty output. */
export function parseOverview(reply: string): string {
  const text = String(reply ?? "").replaceAll("\r\n", "\n").trim();
  const marker = text.match(/^OVERVIEW:\s*([\s\S]*)$/im);
  const prose = (marker ? marker[1] ?? "" : text).trim();
  if (prose === "") throw new TypeError("overview reply is empty");
  return prose.replace(/\s+/g, " ").trim();
}

/** Gate a package overview: faithful to the surface vocabulary and the right
 *  length. The keystone no-hallucinated-api applies here too. */
export function judgeOverview(overview: string, vocabulary: ReadonlySet<string>): readonly DocGate[] {
  const gates: DocGate[] = [];
  const judge = (gate: string, pass: boolean, evidence: string): void => {
    gates.push(Object.freeze({ gate, charge: pass ? "pass" : "fail", evidence }));
  };
  const hallucinations = hallucinatedApiFindings(overview, vocabulary);
  judge("no-hallucinated-api", hallucinations.length === 0, hallucinations.length === 0 ? "every API reference is vouched for by the surface" : `invented: ${hallucinations.join("; ")}`);
  const words = wordCount(overview);
  judge("overview-length", words >= 20 && words <= 110, `overview ${words} words (needs 20-110)`);
  const errors = proseLintErrors(overview);
  judge("prose", errors.length === 0, errors.length === 0 ? "no prose-lint errors" : `${errors.length} error(s): ${errors.slice(0, 3).join(" | ")}`);
  return Object.freeze(gates);
}

/**
 * The inputs to formatReadme: the package name, the LLM-written overview
 * paragraph, each symbol's one-line summary for the API section, an optional
 * usage block inserted before the API, and an optional relative path to a
 * separate full-reference file.
 */
export interface ReadmeInput {
  readonly packageName: string;
  /** The LLM-written overview paragraph (our code frames it). */
  readonly overview: string;
  /** Each symbol with its one-line summary, for the API section. */
  readonly symbols: readonly SymbolSummary[];
  /** An optional usage block (e.g. the CLI invocation) inserted before the API. */
  readonly usage?: string;
  /** When the full reference lives in its own file, the relative link to it. */
  readonly referencePath?: string;
}

/** Assemble a README from the composed parts. Our code owns every line of
 *  structure — the title, the section headings, the API list, the reference
 *  link — and the model contributes only the overview prose. This is the
 *  LLM-WRITTEN README the plan asked for, not a manifest skeleton. */
export function formatReadme(input: ReadmeInput): string {
  const lines = [`# ${input.packageName}`, "", input.overview];
  if (input.usage !== undefined && input.usage.trim() !== "") {
    lines.push("", "## Usage", "", "```sh", input.usage.trim(), "```");
  }
  if (input.symbols.length > 0) {
    lines.push("", "## API", "");
    for (const sym of input.symbols) lines.push(`- \`${sym.name}\` — ${sym.summary}`);
  }
  if (input.referencePath !== undefined) {
    lines.push("", `Full reference: [\`${input.referencePath}\`](${input.referencePath}).`);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
