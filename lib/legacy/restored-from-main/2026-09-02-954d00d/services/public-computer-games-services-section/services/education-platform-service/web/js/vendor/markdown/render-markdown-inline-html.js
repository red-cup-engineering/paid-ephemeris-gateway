import { readMarkdownFeatures } from "./read-markdown-features.js";
import { admitMarkdownLinkTarget } from "./admit-markdown-link-target.js";
const escape = (value) => value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");

function bounded(text, delimiter, start) {
  const close = text.indexOf(delimiter, start + delimiter.length);
  return close < 0 ? null : { inner: text.slice(start + delimiter.length, close), next: close + delimiter.length };
}

function linkSpan(text, start) {
  const labelEnd = text.indexOf("]", start + 1);
  if (labelEnd < 0 || text[labelEnd + 1] !== "(") return null;
  const hrefEnd = text.indexOf(")", labelEnd + 2);
  return hrefEnd < 0 ? null : { label: text.slice(start + 1, labelEnd), href: text.slice(labelEnd + 2, hrefEnd), next: hrefEnd + 1 };
}

function renderFeature(feature) {
  if (feature.type === "markdown-link") {
    const href = admitMarkdownLinkTarget(feature.target), label = renderInline(feature.label);
    if (href === null) return label;
    return feature.image ? `<img src="${escape(href)}" alt="${escape(feature.label)}"${feature.title === null ? "" : ` title="${escape(feature.title)}"`}>` : `<a href="${escape(href)}"${feature.title === null ? "" : ` title="${escape(feature.title)}"`}>${label}</a>`;
  }
  if (feature.type === "inline-field") return `<span class="markdown-inline-field" data-key="${escape(feature.key)}"><span class="markdown-inline-field-key">${escape(feature.key)}</span><span class="markdown-inline-field-value">${renderInline(feature.value)}</span></span>`;
  if (feature.type === "citation-group") return `<span class="markdown-citation-group" role="doc-biblioref" data-citation-keys="${escape(feature.keys.join(" "))}" data-citation-suppressed-keys="${escape(feature.suppressedKeys.join(" "))}">${escape(feature.span.text)}</span>`;
  const kind = feature.type === "wikilink" ? "markdown-wikilink" : "markdown-transclusion";
  return `<span class="${kind}" data-target="${escape(feature.target)}">${escape(feature.label ?? feature.target)}</span>`;
}

function renderInline(text) {
  const features = readMarkdownFeatures(text).filter((feature) => feature.type !== "callout");
  let html = "", cursor = 0, featureIndex = 0;
  while (cursor < text.length) {
    const feature = features[featureIndex];
    if (feature?.span.start === cursor) { html += renderFeature(feature); cursor = feature.span.end; featureIndex += 1; continue; }
    const code = text[cursor] === "`" ? bounded(text, "`", cursor) : null;
    if (code !== null) { html += `<code>${escape(code.inner)}</code>`; cursor = code.next; continue; }
    const link = text[cursor] === "[" ? linkSpan(text, cursor) : null;
    if (link !== null) { const href = admitMarkdownLinkTarget(link.href); html += href === null ? renderInline(link.label) : `<a href="${escape(href)}">${renderInline(link.label)}</a>`; cursor = link.next; continue; }
    const emphasis = text.startsWith("***", cursor) ? ["***", "strong-em"] : text.startsWith("**", cursor) ? ["**", "strong"] : text.startsWith("__", cursor) ? ["__", "strong"] : text[cursor] === "*" ? ["*", "em"] : text[cursor] === "_" ? ["_", "em"] : null;
    if (emphasis !== null) { const part = bounded(text, emphasis[0], cursor); if (part !== null) { html += emphasis[1] === "strong-em" ? `<strong><em>${renderInline(part.inner)}</em></strong>` : `<${emphasis[1]}>${renderInline(part.inner)}</${emphasis[1]}>`; cursor = part.next; continue; } }
    html += escape(text[cursor]); cursor += 1;
  }
  return html;
}

export function renderMarkdownInlineHtml(markdown) {
  if (typeof markdown !== "string") throw new TypeError("markdown must be a string");
  return renderInline(markdown);
}
