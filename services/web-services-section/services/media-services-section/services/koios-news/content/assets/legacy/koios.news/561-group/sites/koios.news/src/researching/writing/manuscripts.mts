// researching/writing/manuscripts — operator-facing manuscript writes.
//
// This is the first content-management operation for human and agent
// operators. It writes only drafts: the editing and publishing gates remain
// responsible for deciding what can become public.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { encodeFrontMatterDocument, type FrontMatterRecord } from "@emsenn/content/codecs/frontmatter";
import type { CslItem } from "@emsenn/content/codecs/references";
import { newsSlug } from "@emsenn/content/topology/news";

import { KOIOS_EDITOR } from "../../config.mjs";
import { referencesFromSourceUrls } from "../sourcing/reference-normalization.mjs";
import { KOIOS_DEFAULT_LICENSE, KOIOS_DEFAULT_LICENSE_URL, KOIOS_DEFAULT_SYNDICATION_RIGHTS } from "./editing/standards.mjs";

export type CreateDraftManuscriptInput = Readonly<{
  title: string;
  summary: string;
  body: string;
  seoTerm: string;
  beat: string;
  references: readonly CslItem[];
  tags?: readonly string[];
  category?: string;
  slug?: string;
  date?: string;
  license?: string;
  licenseUrl?: string;
  syndicationRights?: string;
  assignmentId?: string;
}>;

export type CreateDraftManuscriptResult = Readonly<{
  kind: "koios.writing.manuscript.created";
  slug: string;
  path: string;
  draft: true;
  title: string;
  wordCount: number;
  referenceCount: number;
  license: string;
  licenseUrl: string;
  syndicationRights: string;
}>;

export type CreateAssignmentDraftInput = Readonly<{
  title: string;
  summary: string;
  body: string;
  references?: readonly CslItem[];
  tags?: readonly string[];
  category?: string;
  slug?: string;
  date?: string;
  license?: string;
  licenseUrl?: string;
  syndicationRights?: string;
}>;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, field);
}

function textArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  const out = value.map((item, index) => requireText(item, `${field}[${index}]`));
  if (out.length === 0) throw new TypeError(`${field} must not be empty`);
  return Object.freeze(out);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalRecordText(record: Readonly<Record<string, unknown>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function referenceUrl(reference: Readonly<Record<string, unknown>>): string | undefined {
  return optionalRecordText(reference, ["URL", "url"]);
}

function referenceRecords(value: unknown, field = "references"): readonly CslItem[] {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} must be a non-empty array of CSL reference objects`);
  return Object.freeze(value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`${field}[${index}] must be a CSL reference object`);
    if (optionalRecordText(item, ["id"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL id`);
    if (optionalRecordText(item, ["type"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL type`);
    if (optionalRecordText(item, ["key", "citation-key", "citation_key"]) !== undefined) throw new TypeError(`${field}[${index}] must use CSL id, not key`);
    const url = referenceUrl(item);
    if (url !== undefined && !URL_PATTERN.test(url)) throw new TypeError(`${field}[${index}] URL must be an http(s) URL`);
    return Object.freeze({ ...item }) as CslItem;
  }));
}

function optionalTextArray(value: unknown, field: string): readonly string[] | undefined {
  if (value === undefined || value === null) return undefined;
  return textArray(value, field);
}

function dayStamp(): string {
  return new Date().toISOString().slice(0, 10); // law-allow: wall-clock-as-data — draft creation witness date
}

function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueSlug(contentDir: string, base: string): string {
  let slug = base || "draft";
  let index = 2;
  while (existsSync(join(contentDir, `${slug}.md`))) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

export function normalizeCreateDraftManuscriptInput(input: unknown): CreateDraftManuscriptInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("draft manuscript input must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  const title = requireText(record["title"], "title");
  const summary = requireText(record["summary"], "summary");
  const body = requireText(record["body"], "body");
  const seoTerm = requireText(record["seoTerm"], "seoTerm");
  const beat = requireText(record["beat"], "beat");
  const references = referenceRecords(record["references"]);
  const tags = optionalTextArray(record["tags"], "tags");
  const category = optionalText(record["category"], "category");
  const slug = optionalText(record["slug"], "slug");
  const date = optionalText(record["date"], "date");
  const license = optionalText(record["license"], "license");
  const licenseUrl = optionalText(record["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(record["syndicationRights"], "syndicationRights");
  const assignmentId = optionalText(record["assignmentId"], "assignmentId");
  return Object.freeze({
    title,
    summary,
    body,
    seoTerm,
    beat,
    references,
    ...(tags === undefined ? {} : { tags }),
    ...(category === undefined ? {} : { category }),
    ...(slug === undefined ? {} : { slug }),
    ...(date === undefined ? {} : { date }),
    ...(license === undefined ? {} : { license }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(syndicationRights === undefined ? {} : { syndicationRights }),
    ...(assignmentId === undefined ? {} : { assignmentId }),
  });
}

export function normalizeCreateAssignmentDraftInput(input: unknown): CreateAssignmentDraftInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("assignment draft input must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  const title = requireText(record["title"], "title");
  const summary = requireText(record["summary"], "summary");
  const body = requireText(record["body"], "body");
  const references = record["references"] === undefined ? undefined : referenceRecords(record["references"]);
  const tags = optionalTextArray(record["tags"], "tags");
  const category = optionalText(record["category"], "category");
  const slug = optionalText(record["slug"], "slug");
  const date = optionalText(record["date"], "date");
  const license = optionalText(record["license"], "license");
  const licenseUrl = optionalText(record["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(record["syndicationRights"], "syndicationRights");
  return Object.freeze({
    title,
    summary,
    body,
    ...(references === undefined ? {} : { references }),
    ...(tags === undefined ? {} : { tags }),
    ...(category === undefined ? {} : { category }),
    ...(slug === undefined ? {} : { slug }),
    ...(date === undefined ? {} : { date }),
    ...(license === undefined ? {} : { license }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(syndicationRights === undefined ? {} : { syndicationRights }),
  });
}

export function createDraftManuscript(contentDir: string, input: CreateDraftManuscriptInput): CreateDraftManuscriptResult {
  const baseSlug = newsSlug(input.slug ?? input.title).split("-").slice(0, 12).join("-");
  const slug = uniqueSlug(contentDir, baseSlug);
  const path = join(contentDir, `${slug}.md`);
  const license = input.license ?? KOIOS_DEFAULT_LICENSE;
  const licenseUrl = input.licenseUrl ?? KOIOS_DEFAULT_LICENSE_URL;
  const syndicationRights = input.syndicationRights ?? KOIOS_DEFAULT_SYNDICATION_RIGHTS;
  const category = input.category ?? "News";
  const tags = input.tags ?? [input.seoTerm];
  const frontMatter: FrontMatterRecord = Object.freeze({
    title: input.title,
    date: input.date ?? dayStamp(),
    draft: true,
    author: KOIOS_EDITOR,
    slug,
    description: input.summary,
    summary: input.summary,
    keywords: Object.freeze([input.seoTerm]),
    categories: Object.freeze([category]),
    tags: Object.freeze(tags),
    references: Object.freeze(input.references),
    license,
    license_url: licenseUrl,
    syndication_rights: syndicationRights,
    koios: Object.freeze({
      seo_term: input.seoTerm,
      beat: input.beat,
      gates_clear: false,
      ...(input.assignmentId === undefined ? {} : { assignment_id: input.assignmentId }),
    }),
  });
  mkdirSync(contentDir, { recursive: true });
  writeFileSync(path, encodeFrontMatterDocument({ frontMatter, body: `${input.body.trim()}\n` }), { encoding: "utf8", flag: "wx" });
  return Object.freeze({
    kind: "koios.writing.manuscript.created",
    slug,
    path,
    draft: true,
    title: input.title,
    wordCount: wordCount(input.body),
    referenceCount: input.references.length,
    license,
    licenseUrl,
    syndicationRights,
  });
}

export const createDraftManuscriptJsonSchema = Object.freeze({
  type: "object",
  required: ["title", "summary", "body", "seoTerm", "beat", "references"],
  properties: Object.freeze({
    title: Object.freeze({ type: "string", minLength: 1 }),
    summary: Object.freeze({ type: "string", minLength: 1 }),
    body: Object.freeze({ type: "string", minLength: 1 }),
    seoTerm: Object.freeze({ type: "string", minLength: 1 }),
    beat: Object.freeze({ type: "string", minLength: 1 }),
    references: Object.freeze({
      type: "array",
      minItems: 1,
      items: Object.freeze({ type: "object" }),
    }),
    tags: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
    category: Object.freeze({ type: "string" }),
    slug: Object.freeze({ type: "string" }),
    date: Object.freeze({ type: "string" }),
    license: Object.freeze({ type: "string" }),
    licenseUrl: Object.freeze({ type: "string", format: "uri" }),
    syndicationRights: Object.freeze({ type: "string" }),
    assignmentId: Object.freeze({ type: "string" }),
  }),
  additionalProperties: false,
});

export const createAssignmentDraftJsonSchema = Object.freeze({
  type: "object",
  required: ["title", "summary", "body"],
  properties: Object.freeze({
    title: Object.freeze({ type: "string", minLength: 1 }),
    summary: Object.freeze({ type: "string", minLength: 1 }),
    body: Object.freeze({ type: "string", minLength: 1 }),
    references: Object.freeze({
      type: "array",
      items: Object.freeze({ type: "object" }),
    }),
    tags: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
    category: Object.freeze({ type: "string" }),
    slug: Object.freeze({ type: "string" }),
    date: Object.freeze({ type: "string" }),
    license: Object.freeze({ type: "string" }),
    licenseUrl: Object.freeze({ type: "string", format: "uri" }),
    syndicationRights: Object.freeze({ type: "string" }),
  }),
  additionalProperties: false,
});

export { referencesFromSourceUrls } from "../sourcing/reference-normalization.mjs";
