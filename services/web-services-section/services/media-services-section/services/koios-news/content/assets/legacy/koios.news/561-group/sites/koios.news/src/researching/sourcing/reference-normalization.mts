// researching/sourcing/reference-normalization — promotion from research source
// URLs into canonical CSL reference records.
//
// Sources are intake/research material. References are the cited publication
// layer. This module is the narrow bridge used when old manuscripts or generic
// farm candidates need their cited source URLs promoted into CSL records.

import type { CslItem } from "@emsenn/content/codecs/references";

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const NON_CSL_REFERENCE_KEYS = new Set(["key", "citation-key", "citation_key", "source_kind", "source-kind", "publisher_category", "publisher-category", "site_kind", "site-kind"]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalText(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function referenceIdFromUrl(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `${domain || "reference"}${index + 1}`;
  } catch {
    return `reference${index + 1}`;
  }
}

function referenceTitleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function referencesFromSourceUrls(sourceUrls: readonly string[]): readonly CslItem[] {
  const urls = Object.freeze([...new Set(sourceUrls)]);
  for (const [index, url] of urls.entries()) {
    if (!URL_PATTERN.test(url)) throw new TypeError(`sourceUrls[${index}] must be an http(s) URL`);
  }
  return Object.freeze(urls.map((url, index): CslItem => Object.freeze({
    id: referenceIdFromUrl(url, index),
    type: "webpage",
    title: referenceTitleFromUrl(url),
    URL: url,
  }) as CslItem));
}

export function normalizeCslReferenceRecords(rawReferences: unknown): readonly CslItem[] {
  if (!Array.isArray(rawReferences)) return Object.freeze([]);
  return Object.freeze(rawReferences.flatMap((rawReference, index): CslItem[] => {
    if (!isRecord(rawReference)) return [];
    const url = optionalText(rawReference, ["URL", "url"]);
    const id = optionalText(rawReference, ["id", "key", "citation-key", "citation_key"]) ?? (url === undefined ? `reference${index + 1}` : referenceIdFromUrl(url, index));
    const type = optionalText(rawReference, ["type"]) ?? (url === undefined ? "document" : "webpage");
    const title = optionalText(rawReference, ["title"]) ?? (url === undefined ? `Reference ${index + 1}` : referenceTitleFromUrl(url));
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawReference)) {
      if (NON_CSL_REFERENCE_KEYS.has(key)) continue;
      if (key === "url") continue;
      record[key] = value;
    }
    record["id"] = id;
    record["type"] = type;
    record["title"] = title;
    if (url !== undefined) {
      if (!URL_PATTERN.test(url)) throw new TypeError(`references[${index}] URL must be an http(s) URL`);
      record["URL"] = url;
    }
    return [Object.freeze(record) as CslItem];
  }));
}
