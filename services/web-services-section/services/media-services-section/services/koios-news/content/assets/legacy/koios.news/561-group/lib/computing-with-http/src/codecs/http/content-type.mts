// content-type.mts — the Content-Type field (RFC 9110 §8.3).
//
// Semantic value: a media type with its parameters. Wire form: the
// field text. The pair is a RETRACTION: parseContentType lowercases
// the type and parameter names and forgets quoting style, so
// parseContentType ∘ serializeContentType = id on parsed values.

import { firstHeader, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue, type HeaderValue } from "./header-value.mjs";

export type ContentType = Readonly<{
  type: string;
  params: Readonly<Record<string, string>>;
}>;

export function parseContentType(value: HeaderValue): ContentType | null {
  const raw = firstHeader(value)?.trim();
  if (!raw) return null;
  const parts = splitHeaderParameters(raw);
  const type = (parts.shift() ?? "").trim().toLowerCase();
  if (!type) return null;
  const params: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    if (!key) continue;
    params[key] = unquoteHeaderValue(part.slice(eq + 1).trim());
  }
  return Object.freeze({ type, params: Object.freeze(params) });
}

const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function serializeContentType(contentType: ContentType): string {
  const params = Object.entries(contentType.params)
    .map(([key, value]) => `${key}=${TOKEN_RE.test(value) ? value : quoteHeaderValue(value)}`);
  return [contentType.type, ...params].join("; ");
}
