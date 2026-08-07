/**
 * @emsenn/content/markdown — CommonMark markdown encoder.
 *
 * Codec law: zero runtime dependencies; pure functions over values;
 * no network, no filesystem, no clock.
 *
 * Supported input: paragraphs, ATX headings, fenced code blocks,
 * blockquotes, unordered lists, ordered lists, inline code, bold,
 * italic, and links. Raw HTML in the source is escaped, not passed
 * through — this encoder produces safe output from untrusted input.
 */

function escHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  const repls = new Map<string, string>();
  let i = 0;
  const mark = (html: string): string => {
    const key = `\x00${i++}\x00`;
    repls.set(key, html);
    return key;
  };
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) =>
    mark(`<code>${escHtml(code)}</code>`));
  text = text.replace(/\[([^\]\n]*)\]\(([^)\n]*)\)/g, (_, label: string, href: string) =>
    mark(`<a href="${escHtml(href)}">${escHtml(label)}</a>`));
  text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, (_, s: string) =>
    mark(`<strong><em>${escHtml(s)}</em></strong>`));
  text = text.replace(/\*\*([^*\n]+)\*\*/g, (_, s: string) =>
    mark(`<strong>${escHtml(s)}</strong>`));
  text = text.replace(/\*([^*\n]+)\*/g, (_, s: string) =>
    mark(`<em>${escHtml(s)}</em>`));
  text = escHtml(text);
  for (const [key, html] of repls) text = text.split(key).join(html);
  return text;
}

function renderBlock(block: string, codeRepls: ReadonlyMap<string, string>): string {
  block = block.trim();
  if (!block) return "";
  if (/^\x00FENCE\d+\x00$/.test(block)) return codeRepls.get(block) ?? block;
  const hm = /^(#{1,6})\s+(.+)$/.exec(block);
  if (hm) return `<h${hm[1]!.length}>${renderInline(hm[2]!)}</h${hm[1]!.length}>`;
  if (block.startsWith(">")) {
    return `<blockquote>${markdownToHtml(block.replace(/^>[ \t]?/gm, ""))}</blockquote>`;
  }
  if (/^[-*]\s/.test(block)) {
    const lis = block
      .split(/\n(?=[-*]\s)/)
      .map((item) => `<li>${renderInline(item.replace(/^[-*]\s/, "").replace(/\n\s+/g, " ").trim())}</li>`)
      .join("");
    return `<ul>${lis}</ul>`;
  }
  if (/^\d+\.\s/.test(block)) {
    const lis = block
      .split(/\n(?=\d+\.\s)/)
      .map((item) => `<li>${renderInline(item.replace(/^\d+\.\s/, "").replace(/\n\s+/g, " ").trim())}</li>`)
      .join("");
    return `<ol>${lis}</ol>`;
  }
  return `<p>${renderInline(block.replace(/\n/g, " "))}</p>`;
}

/**
 * Encodes CommonMark markdown source into safe HTML: splits on blank lines into
 * blocks, renders ATX headings, fenced code blocks, blockquotes, unordered and
 * ordered lists, and paragraphs, with inline code, bold, italic, and links -
 * escaping all raw HTML so the output is safe from untrusted input.
 */
export function markdownToHtml(md: string): string {
  const codeRepls = new Map<string, string>();
  let i = 0;
  md = md.replace(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*(?:\n|$)/gm, (_full, lang: string, code: string) => {
    const key = `\x00FENCE${i++}\x00`;
    const langAttr = lang.trim() ? ` class="language-${escHtml(lang.trim())}"` : "";
    codeRepls.set(key, `<pre><code${langAttr}>${escHtml(code)}</code></pre>`);
    return `${key}\n`;
  });
  return md
    .split(/\n{2,}/)
    .map((block) => renderBlock(block, codeRepls))
    .filter(Boolean)
    .join("\n");
}

/**
 * Strips markdown markup from source to produce plain text: removes fenced code
 * blocks, heading markers, list markers, blockquote markers, and inline
 * code/bold/italic/link syntax, then collapses whitespace and trims.
 */
export function markdownToText(md: string): string {
  return md
    .replace(/^```[\s\S]*?^```[ \t]*(?:\n|$)/gm, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>[ \t]?/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
