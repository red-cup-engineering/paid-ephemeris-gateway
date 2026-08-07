/**
 * memory/normalization - normal forms for knowledge-bearing Markdown documents.
 *
 * This is deliberately pure: callers own filesystem discovery, Git state, and writes.
 */

const ABBREVIATIONS = new Set([
  "adj", "adm", "adv", "al", "app", "apr", "aug", "ave", "capt", "cf", "ch",
  "co", "col", "corp", "dec", "dept", "dr", "e.g", "ed", "eds", "etc",
  "feb", "fig", "gen", "gov", "i.e", "inc", "jan", "jr", "jul", "jun",
  "ltd", "mar", "mr", "mrs", "ms", "mt", "no", "nov", "oct", "op",
  "pl", "prof", "rep", "rev", "sec", "sen", "sep", "sr", "st", "u.k",
  "u.s", "vs",
]);

export interface MarkdownLinefeedFinding {
  readonly rule: "semantic-linefeeds";
  readonly severity: "info";
  readonly message: string;
}

export interface MarkdownLinefeedNormalization {
  readonly kind: "knowing.memory.markdown-normalization";
  readonly normalForm: "semantic-linefeeds";
  readonly changed: boolean;
  readonly text: string;
  readonly findings: readonly MarkdownLinefeedFinding[];
  readonly path?: string;
}

export interface MarkdownLinefeedOptions {
  readonly path?: string;
}

function isFenceStart(line: string): boolean {
  return /^ {0,3}(```+|~~~+)/.test(line);
}

function isBlank(line: string): boolean {
  return /^\s*$/.test(line);
}

function isPreservedBlock(lines: readonly string[]): boolean {
  if (lines.length === 0) return true;
  if (lines.some((line) => /^\t| {4,}\S/.test(line))) return true;
  if (lines.some((line) => /^\|.*\|$/.test(line))) return true;
  if (lines.some((line) => /^ {0,3}[-:| ]+\|[-:| ]+$/.test(line))) return true;
  if (lines.every((line) => /^ {0,3}(#{1,6}\s|#{1,6}$)/.test(line))) return true;
  if (lines.every((line) => /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line))) return true;
  if (lines.some((line) => /^ {0,3}(\[[^\]]+\]:|<[^>]+>|<!--|-->|{{|}})/.test(line))) return true;
  return false;
}

function normalizeSpaces(text: string): string {
  let normalized = text.trim().replace(/\s+/g, " ");
  while (/(^|[^A-Za-z])([A-Za-z])\. (?=[A-Za-z]\.)/.test(normalized)) {
    normalized = normalized.replace(/(^|[^A-Za-z])([A-Za-z])\. (?=[A-Za-z]\.)/g, "$1$2.");
  }
  return normalized;
}

function isClosingPunctuation(char: string): boolean {
  return char === "\"" || char === "'" || char === ")" || char === "]" || char === "}";
}

function wordBefore(text: string, index: number): string {
  const left = text.slice(0, index + 1);
  const match = left.match(/([A-Za-z](?:[A-Za-z]|\.)*)\.$/);
  return match === null ? "" : match[1]!.toLowerCase();
}

function isAbbreviation(text: string, index: number): boolean {
  const word = wordBefore(text, index);
  if (!word) return false;
  if (ABBREVIATIONS.has(word)) return true;
  return /^[a-z](?:\.[a-z])+$/.test(word);
}

function shouldSplitAt(text: string, index: number, end: number): boolean {
  const char = text[index];
  if (char !== "." && char !== "!" && char !== "?") return false;
  if (char === "." && isAbbreviation(text, index)) return false;
  if (/\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? "")) return false;
  let next = end + 1;
  while (next < text.length && /\s/.test(text[next]!)) next += 1;
  if (next >= text.length) return true;
  if (/^[A-Za-z]$/.test(wordBefore(text, index)) && /^[A-Za-z]\./.test(text.slice(next))) return false;
  return /["'([`A-Z0-9]/.test(text[next]!);
}

function splitSentences(text: string): string[] {
  const normalized = normalizeSpaces(text);
  if (!normalized) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < normalized.length; index++) {
    let end = index;
    if (normalized[index] !== "." && normalized[index] !== "!" && normalized[index] !== "?") continue;
    while (end + 1 < normalized.length && isClosingPunctuation(normalized[end + 1]!)) end += 1;
    if (!shouldSplitAt(normalized, index, end)) continue;
    sentences.push(normalized.slice(start, end + 1).trim());
    start = end + 1;
    index = end;
  }
  const tail = normalized.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences.length === 0 ? [normalized] : sentences;
}

function formatParagraph(lines: readonly string[]): readonly string[] {
  return splitSentences(lines.join(" "));
}

function listMarker(line: string): RegExpMatchArray | null {
  return line.match(/^(\s*)([-+*]|\d+[.)])\s+((?:\[[ xX]\]\s+)?)?(.*)$/);
}

function formatListBlock(lines: readonly string[]): readonly string[] | null {
  const items: { baseIndent: string; prefix: string; indent: string; text: string }[] = [];
  let current: { baseIndent: string; prefix: string; indent: string; text: string } | null = null;
  for (const line of lines) {
    const marker = listMarker(line);
    if (marker !== null) {
      const text = current?.text.trimEnd() ?? "";
      if (
        current !== null &&
        marker[1]!.length > current.baseIndent.length &&
        text.endsWith(".") &&
        isAbbreviation(text, text.length - 1)
      ) {
        current.text += ` ${line.trim()}`;
        continue;
      }
      if (current !== null) items.push(current);
      current = {
        baseIndent: marker[1]!,
        prefix: `${marker[1]!}${marker[2]!} ${marker[3] ?? ""}`,
        indent: `${marker[1]!}  `,
        text: marker[4]!,
      };
      continue;
    }
    if (current === null) return null;
    if (/^\s*$/.test(line) || /^\s{4,}\S/.test(line)) return null;
    current.text += ` ${line.trim()}`;
  }
  if (current !== null) items.push(current);
  const output: string[] = [];
  for (const item of items) {
    const sentences = splitSentences(item.text);
    if (sentences.length === 0) {
      output.push(item.prefix.trimEnd());
      continue;
    }
    output.push(`${item.prefix}${sentences[0]!}`);
    for (const sentence of sentences.slice(1)) output.push(`${item.indent}${sentence}`);
  }
  return output;
}

function formatBlockquote(lines: readonly string[]): readonly string[] | null {
  if (!lines.every((line) => /^ {0,3}>/.test(line))) return null;
  const text = lines.map((line) => line.replace(/^ {0,3}>\s?/, "")).join(" ");
  return splitSentences(text).map((line) => `> ${line}`);
}

function formatBlock(lines: readonly string[]): readonly string[] {
  if (isPreservedBlock(lines)) return lines;
  const list = formatListBlock(lines);
  if (list !== null) return list;
  const quote = formatBlockquote(lines);
  if (quote !== null) return quote;
  return formatParagraph(lines);
}

export function markdownSemanticLinefeedText(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const output: string[] = [];
  let block: string[] = [];
  let inFence = false;
  let inFrontmatter = lines[0] === "---";

  function pushBlank(): void {
    if (output.length > 0 && output.at(-1) !== "") output.push("");
  }

  function flushBlock(): void {
    if (block.length === 0) return;
    output.push(...formatBlock(block));
    block = [];
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;

    if (inFrontmatter) {
      output.push(line);
      if (index > 0 && line === "---") inFrontmatter = false;
      continue;
    }

    if (inFence) {
      output.push(line);
      if (isFenceStart(line)) inFence = false;
      continue;
    }

    if (isFenceStart(line)) {
      flushBlock();
      output.push(line);
      inFence = true;
      continue;
    }

    if (isBlank(line)) {
      flushBlock();
      pushBlank();
      continue;
    }

    block.push(line);
  }
  flushBlock();
  while (output.at(-1) === "") output.pop();
  return `${output.join("\n")}\n`;
}

export function normalizeMarkdownLinefeeds(
  text: string,
  options: MarkdownLinefeedOptions = {},
): MarkdownLinefeedNormalization {
  const normalized = markdownSemanticLinefeedText(text);
  const changed = normalized !== text;
  return Object.freeze({
    kind: "knowing.memory.markdown-normalization" as const,
    normalForm: "semantic-linefeeds" as const,
    changed,
    text: normalized,
    findings: Object.freeze(changed
      ? [Object.freeze({
        rule: "semantic-linefeeds" as const,
        severity: "info" as const,
        message: "Markdown prose was projected to semantic linefeed normal form.",
      })]
      : []),
    ...(options.path === undefined ? {} : { path: options.path }),
  });
}
