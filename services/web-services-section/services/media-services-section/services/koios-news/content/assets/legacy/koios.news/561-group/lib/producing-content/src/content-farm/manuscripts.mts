/**
 * manuscripts - draft-manuscript operator packets.
 *
 * The farm owns the reusable admission/result vocabulary for creating draft
 * manuscripts. A site still owns how that packet is projected into its local
 * content store and front-matter dialect.
 */
import { Type, type Static } from "@sinclair/typebox";
import type { CslItem } from "@emsenn/content/codecs/references";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

export const CslReferenceRecordSchema = Type.Record(Type.String(), Type.Any(), {
  title: "CslReferenceRecord",
});

export const CreateDraftManuscriptInputSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  summary: Type.String({ minLength: 1 }),
  body: Type.String({ minLength: 1 }),
  seoTerm: Type.String({ minLength: 1 }),
  beat: Type.String({ minLength: 1 }),
  references: Type.Array(CslReferenceRecordSchema, { minItems: 1 }),
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  category: Type.Optional(Type.String({ minLength: 1 })),
  slug: Type.Optional(Type.String({ minLength: 1 })),
  date: Type.Optional(Type.String({ minLength: 1 })),
  license: Type.Optional(Type.String({ minLength: 1 })),
  licenseUrl: Type.Optional(Type.String({ minLength: 1 })),
  syndicationRights: Type.Optional(Type.String({ minLength: 1 })),
  assignmentId: Type.Optional(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-farm/draft-manuscript/create-input",
  title: "CreateDraftManuscriptInput",
  additionalProperties: false,
});

export const CreateAssignmentDraftInputSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  summary: Type.String({ minLength: 1 }),
  body: Type.String({ minLength: 1 }),
  references: Type.Optional(Type.Array(CslReferenceRecordSchema)),
  tags: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
  category: Type.Optional(Type.String({ minLength: 1 })),
  slug: Type.Optional(Type.String({ minLength: 1 })),
  date: Type.Optional(Type.String({ minLength: 1 })),
  license: Type.Optional(Type.String({ minLength: 1 })),
  licenseUrl: Type.Optional(Type.String({ minLength: 1 })),
  syndicationRights: Type.Optional(Type.String({ minLength: 1 })),
}, {
  $id: "producing-content/content-farm/assignment-draft/create-input",
  title: "CreateAssignmentDraftInput",
  additionalProperties: false,
});

export const CreateDraftManuscriptResultSchema = Type.Object({
  kind: Type.Literal("producing-content.draft-manuscript.created"),
  slug: Type.String({ minLength: 1 }),
  path: Type.String({ minLength: 1 }),
  draft: Type.Literal(true),
  title: Type.String({ minLength: 1 }),
  wordCount: Type.Number({ minimum: 0 }),
  referenceCount: Type.Number({ minimum: 0 }),
  license: Type.String({ minLength: 1 }),
  licenseUrl: Type.String({ minLength: 1 }),
  syndicationRights: Type.String({ minLength: 1 }),
}, {
  $id: "producing-content/content-farm/draft-manuscript/created",
  title: "CreateDraftManuscriptResult",
  additionalProperties: false,
});

export type CslReferenceRecord = CslItem;
export type CreateDraftManuscriptInput = Readonly<Omit<Static<typeof CreateDraftManuscriptInputSchema>, "references" | "tags"> & {
  references: readonly CslItem[];
  tags?: readonly string[];
}>;
export type CreateAssignmentDraftInput = Readonly<Omit<Static<typeof CreateAssignmentDraftInputSchema>, "references" | "tags"> & {
  references?: readonly CslItem[];
  tags?: readonly string[];
}>;
export type CreateDraftManuscriptResult = Static<typeof CreateDraftManuscriptResultSchema>;

export const createDraftManuscriptInputCarrier = carrierFrom(CreateDraftManuscriptInputSchema);

export const createAssignmentDraftInputCarrier = carrierFrom(CreateAssignmentDraftInputSchema);

export const createDraftManuscriptResultCarrier = carrierFrom(CreateDraftManuscriptResultSchema);

export const createDraftManuscriptJsonSchema = CreateDraftManuscriptInputSchema;
export const createAssignmentDraftJsonSchema = CreateAssignmentDraftInputSchema;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireText(value, field);
}

function textArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  const out = value.map((item, index) => requireText(item, `${field}[${index}]`));
  if (out.length === 0) throw new TypeError(`${field} must not be empty`);
  return out;
}

function optionalTextArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  return textArray(value, field);
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

function referenceRecords(value: unknown, field = "references", minimum = 1): CslReferenceRecord[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new TypeError(minimum > 0
      ? `${field} must be a non-empty array of CSL reference objects`
      : `${field} must be an array of CSL reference objects`);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`${field}[${index}] must be a CSL reference object`);
    if (optionalRecordText(item, ["id"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL id`);
    if (optionalRecordText(item, ["type"]) === undefined) throw new TypeError(`${field}[${index}] must carry a CSL type`);
    if (optionalRecordText(item, ["key", "citation-key", "citation_key"]) !== undefined) throw new TypeError(`${field}[${index}] must use CSL id, not key`);
    const url = referenceUrl(item);
    if (url !== undefined && !URL_PATTERN.test(url)) throw new TypeError(`${field}[${index}] URL must be an http(s) URL`);
    return { ...item } as CslItem;
  });
}

export function normalizeCreateDraftManuscriptInput(input: unknown): CreateDraftManuscriptInput {
  if (!isRecord(input)) throw new TypeError("draft manuscript input must be a JSON object");
  const title = requireText(input["title"], "title");
  const summary = requireText(input["summary"], "summary");
  const body = requireText(input["body"], "body");
  const seoTerm = requireText(input["seoTerm"], "seoTerm");
  const beat = requireText(input["beat"], "beat");
  const references = referenceRecords(input["references"]);
  const tags = optionalTextArray(input["tags"], "tags");
  const category = optionalText(input["category"], "category");
  const slug = optionalText(input["slug"], "slug");
  const date = optionalText(input["date"], "date");
  const license = optionalText(input["license"], "license");
  const licenseUrl = optionalText(input["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(input["syndicationRights"], "syndicationRights");
  const assignmentId = optionalText(input["assignmentId"], "assignmentId");
  return createDraftManuscriptInputCarrier.assert({
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
  }, "create draft manuscript input") as unknown as CreateDraftManuscriptInput;
}

export function normalizeCreateAssignmentDraftInput(input: unknown): CreateAssignmentDraftInput {
  if (!isRecord(input)) throw new TypeError("assignment draft input must be a JSON object");
  const title = requireText(input["title"], "title");
  const summary = requireText(input["summary"], "summary");
  const body = requireText(input["body"], "body");
  const references = input["references"] === undefined ? undefined : referenceRecords(input["references"], "references", 0);
  const tags = optionalTextArray(input["tags"], "tags");
  const category = optionalText(input["category"], "category");
  const slug = optionalText(input["slug"], "slug");
  const date = optionalText(input["date"], "date");
  const license = optionalText(input["license"], "license");
  const licenseUrl = optionalText(input["licenseUrl"], "licenseUrl");
  if (licenseUrl !== undefined && !URL_PATTERN.test(licenseUrl)) throw new TypeError("licenseUrl must be an http(s) URL");
  const syndicationRights = optionalText(input["syndicationRights"], "syndicationRights");
  return createAssignmentDraftInputCarrier.assert({
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
  }, "create assignment draft input") as unknown as CreateAssignmentDraftInput;
}

export function draftManuscriptCreated(input: Omit<CreateDraftManuscriptResult, "kind" | "draft">): CreateDraftManuscriptResult {
  return createDraftManuscriptResultCarrier.assert({
    ...input,
    kind: "producing-content.draft-manuscript.created" as const,
    draft: true as const,
  }, "created draft manuscript result");
}

export function createDraftManuscriptInputTerm(input: CreateDraftManuscriptInput): Tm {
  return carrierToTerm(jsonResource(createDraftManuscriptInputCarrier.assert(input), "create draft manuscript input"));
}

export function createAssignmentDraftInputTerm(input: CreateAssignmentDraftInput): Tm {
  return carrierToTerm(jsonResource(createAssignmentDraftInputCarrier.assert(input), "create assignment draft input"));
}

export function createDraftManuscriptResultTerm(input: CreateDraftManuscriptResult): Tm {
  return carrierToTerm(jsonResource(createDraftManuscriptResultCarrier.assert(input), "created draft manuscript result"));
}
