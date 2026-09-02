/**
 * `markdown` -- a deliberately tiny, safe (escape-first) renderer for exactly the subset of
 * Markdown lesson prose uses: headings (#/##), paragraphs, bold/italic/inline-code,
 * fenced code blocks (non-exercise ones -- those are stripped by the caller before this
 * ever sees the body), unordered lists, and pipe tables. Not a general Markdown engine, and not
 * meant to become one -- house pattern for a corpus whose authoring surface is fixed and known,
 * matching the same "write exactly what the content needs, nothing speculative" discipline as
 * the rest of this build.
 */
import { renderMarkdownInlineHtml } from './vendor/markdown/render-markdown-inline-html.js';

export function renderMarkdown(body) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      out.push(`<p>${renderMarkdownInlineHtml(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }
  function flushList() {
    if (list.length > 0) {
      out.push(`<ul>${list.map((li) => `<li>${renderMarkdownInlineHtml(li)}</li>`).join('')}</ul>`);
      list = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushParagraph();
      flushList();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(`<pre><code>${codeLines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</code></pre>`);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^(#{1,3})/)[1].length;
      out.push(`<h${level + 1}>${renderMarkdownInlineHtml(line.replace(/^#{1,3}\s+/, ''))}</h${level + 1}>`);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      i++;
      continue;
    }

    if (/^\|/.test(line)) {
      flushParagraph();
      flushList();
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !/^\|[\s-]*\|[-|\s]*$/.test(l)).map((l) =>
        l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()),
      );
      if (rows.length > 0) {
        const [head, ...body_] = rows;
        out.push('<table><thead><tr>' + head.map((c) => `<th>${renderMarkdownInlineHtml(c)}</th>`).join('') + '</tr></thead><tbody>' +
          body_.map((r) => '<tr>' + r.map((c) => `<td>${renderMarkdownInlineHtml(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      }
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}

/** Strip the adapter-declared exercise fences while preserving ordinary code blocks. */
export function stripExerciseFences(body, labels) {
  if (!Array.isArray(labels) || labels.length === 0) return body.trim();
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return body.replace(new RegExp('```(?:' + escaped + ')\\s*\\n[\\s\\S]*?```', 'g'), '').trim();
}
