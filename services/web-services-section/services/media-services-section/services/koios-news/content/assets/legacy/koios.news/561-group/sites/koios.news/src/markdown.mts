// markdown.mts — deterministic rendering of the Koios.News markdown subset to HTML.
//
// This is the rendering edge: the content store keeps markdown (the trace of
// what was written); HTML is a reading of it. The subset is what the corpus
// actually uses — ATX headings, paragraphs, lists, blockquotes, links, strong,
// emphasis, inline code, fenced code, horizontal rules. All text is escaped;
// raw HTML is never passed through.

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^(https?:\/\/|\/|#|mailto:)/i.test(trimmed)) return "#";
  return escapeHtml(trimmed);
}

export type MarkdownRenderOptions = Readonly<{
  citation?: (ids: readonly string[], raw: string) => string;
}>;

const CITATION_PATTERN = /\[(?:cite:)?@([A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*(?:\s*;\s*@[A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*)*)\]/g;

function renderCitations(html: string, options: MarkdownRenderOptions): string {
  if (options.citation === undefined) return html;
  return html.replace(CITATION_PATTERN, (raw: string, keys: string) => {
    const ids = keys.split(/\s*;\s*@/).map((key) => key.trim()).filter(Boolean);
    return ids.length === 0 ? raw : options.citation?.(ids, raw) ?? raw;
  });
}

/** Inline spans: code, citations, strong, emphasis, links. Applied after escaping. */
export function renderInline(text: string, options: MarkdownRenderOptions = {}): string {
  let out = escapeHtml(text);
  // Inline code first so its contents are not styled further.
  out = out.replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`);
  out = renderCitations(out, options);
  // Links: [text](url). The url was escaped with the rest of the text.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) =>
    `<a href="${escapeUrl(url.replaceAll("&amp;", "&"))}">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return out;
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "blockquote"; lines: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "hr" };

function parseBlocks(markdown: string): readonly Block[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") { index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2]!.trim() });
      index += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", lines: code });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith(">")) {
        quote.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "blockquote", lines: quote });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (current.trim() === "" || /^(#{1,6})\s/.test(current) || /^\s*[-*]\s+/.test(current) ||
        /^\s*\d+[.)]\s+/.test(current) || current.startsWith(">") || current.startsWith("```")) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }
  return blocks;
}

function renderBlock(block: Block, options: MarkdownRenderOptions): string {
  switch (block.kind) {
    case "heading":
      return `<h${block.level}>${renderInline(block.text, options)}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.lines.join(" "), options)}</p>`;
    case "ul":
      return `<ul>${block.items.map((item) => `<li>${renderInline(item, options)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${block.items.map((item) => `<li>${renderInline(item, options)}</li>`).join("")}</ol>`;
    case "blockquote":
      return `<blockquote><p>${renderInline(block.lines.join(" "), options)}</p></blockquote>`;
    case "code":
      return `<pre><code>${block.lines.map(escapeHtml).join("\n")}</code></pre>`;
    case "hr":
      return "<hr>";
  }
}

/** Render the markdown subset to HTML. Deterministic; all text escaped. */
export function renderMarkdown(markdown: string, options: MarkdownRenderOptions = {}): string {
  return parseBlocks(markdown).map((block) => renderBlock(block, options)).join("\n");
}
