/**
 * assignments - durable editorial work orders as producing-content carriers.
 *
 * Demand, repair packets, and operator judgment become assignments before they
 * become manuscripts. This module owns the reusable assignment vocabulary and
 * JSON admission; a site may still own persistence, manuscript projection, and
 * operator routing.
 */
import { createHash } from "node:crypto";

import { Type, type Static } from "@sinclair/typebox";
import { newsSlug } from "@emsenn/content/topology/news";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

import type { DemandEntry } from "./demand.mjs";

export const AssignmentStatusSchema = Type.Union([
  Type.Literal("assigned"),
  Type.Literal("drafted"),
  Type.Literal("published"),
  Type.Literal("completed"),
]);

export const AssignmentEvidenceSchema = Type.Object({
  views: Type.Number(),
  impressions: Type.Number(),
  clicks: Type.Number(),
  covered: Type.Boolean(),
}, { additionalProperties: false });

export const AssignmentReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.assignment"),
  assignmentId: Type.String({ minLength: 1 }),
  term: Type.String({ minLength: 1 }),
  beat: Type.String({ minLength: 1 }),
  status: AssignmentStatusSchema,
  createdAt: Type.String({ minLength: 1 }),
  completedAt: Type.Optional(Type.String()),
  priority: Type.Number(),
  summary: Type.Optional(Type.String()),
  angle: Type.Optional(Type.String()),
  assignee: Type.Optional(Type.String()),
  dueAt: Type.Optional(Type.String()),
  sourceUrls: Type.Array(Type.String()),
  evidence: Type.Optional(AssignmentEvidenceSchema),
  manuscriptSlug: Type.Optional(Type.String()),
  manuscriptUrl: Type.Optional(Type.String()),
}, {
  $id: "producing-content/content-farm/assignment",
  title: "AssignmentReading",
  additionalProperties: false,
});

export const CreateAssignmentInputSchema = Type.Object({
  term: Type.String({ minLength: 1 }),
  beat: Type.String({ minLength: 1 }),
  summary: Type.Optional(Type.String()),
  angle: Type.Optional(Type.String()),
  assignee: Type.Optional(Type.String()),
  dueAt: Type.Optional(Type.String()),
  priority: Type.Optional(Type.Number()),
  sourceUrls: Type.Optional(Type.Array(Type.String())),
  evidence: Type.Optional(AssignmentEvidenceSchema),
}, {
  $id: "producing-content/content-farm/assignment/create-input",
  title: "CreateAssignmentInput",
  additionalProperties: false,
});

export const AssignmentNoteSchema = Type.Object({
  body: Type.String({ minLength: 1 }),
  author: Type.Optional(Type.String()),
}, {
  $id: "producing-content/content-farm/assignment/note",
  title: "AssignmentNoteReading",
  additionalProperties: false,
});

export const CreateAssignmentResultSchema = Type.Object({
  kind: Type.Literal("producing-content.assignment.created"),
  created: Type.Boolean(),
  assignment: AssignmentReadingSchema,
}, {
  $id: "producing-content/content-farm/assignment/created",
  title: "CreateAssignmentResult",
  additionalProperties: false,
});

export const CompleteAssignmentResultSchema = Type.Object({
  kind: Type.Literal("producing-content.assignment.completed"),
  completed: Type.Boolean(),
  assignment: AssignmentReadingSchema,
}, {
  $id: "producing-content/content-farm/assignment/completed",
  title: "CompleteAssignmentResult",
  additionalProperties: false,
});

export const CreateAssignmentNoteResultSchema = Type.Object({
  kind: Type.Literal("producing-content.assignment.noted"),
  recorded: Type.Boolean(),
  assignment: AssignmentReadingSchema,
  note: AssignmentNoteSchema,
}, {
  $id: "producing-content/content-farm/assignment/noted",
  title: "CreateAssignmentNoteResult",
  additionalProperties: false,
});

export type AssignmentStatus = Static<typeof AssignmentStatusSchema>;
export type AssignmentEvidence = Static<typeof AssignmentEvidenceSchema>;
export type AssignmentReading = Static<typeof AssignmentReadingSchema>;
export type CreateAssignmentInput = Static<typeof CreateAssignmentInputSchema>;
export type AssignmentNoteReading = Static<typeof AssignmentNoteSchema>;
export type CreateAssignmentNoteInput = AssignmentNoteReading;
export type CreateAssignmentResult = Static<typeof CreateAssignmentResultSchema>;
export type CompleteAssignmentResult = Static<typeof CompleteAssignmentResultSchema>;
export type CreateAssignmentNoteResult = Static<typeof CreateAssignmentNoteResultSchema>;

export const assignmentCarrier = carrierFrom(AssignmentReadingSchema);

export const createAssignmentInputCarrier = carrierFrom(CreateAssignmentInputSchema);

export const assignmentNoteCarrier = carrierFrom(AssignmentNoteSchema);

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

function optionalUrls(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new TypeError("sourceUrls must be an array");
  const urls = value.map((item, index) => requireText(item, `sourceUrls[${index}]`));
  for (const [index, url] of urls.entries()) {
    if (!URL_PATTERN.test(url)) throw new TypeError(`sourceUrls[${index}] must be an http(s) URL`);
  }
  return urls;
}

function optionalPriority(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const priority = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(priority) || priority < 0) throw new TypeError("priority must be a non-negative number");
  return priority;
}

function optionalEvidence(value: unknown): AssignmentEvidence | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new TypeError("evidence must be an object");
  const views = Number(value["views"] ?? 0);
  const impressions = Number(value["impressions"] ?? 0);
  const clicks = Number(value["clicks"] ?? 0);
  const covered = value["covered"] === true;
  if (![views, impressions, clicks].every((number) => Number.isFinite(number) && number >= 0)) {
    throw new TypeError("evidence counts must be non-negative numbers");
  }
  return { views, impressions, clicks, covered };
}

export function normalizeCreateAssignmentInput(input: unknown): CreateAssignmentInput {
  if (!isRecord(input)) throw new TypeError("assignment input must be a JSON object");
  const term = requireText(input["term"], "term");
  const beat = requireText(input["beat"], "beat");
  const summary = optionalText(input["summary"], "summary");
  const angle = optionalText(input["angle"], "angle");
  const assignee = optionalText(input["assignee"], "assignee");
  const dueAt = optionalText(input["dueAt"], "dueAt");
  const priority = optionalPriority(input["priority"]);
  const sourceUrls = optionalUrls(input["sourceUrls"]);
  const evidence = optionalEvidence(input["evidence"]);
  return createAssignmentInputCarrier.assert({
    term,
    beat,
    ...(summary === undefined ? {} : { summary }),
    ...(angle === undefined ? {} : { angle }),
    ...(assignee === undefined ? {} : { assignee }),
    ...(dueAt === undefined ? {} : { dueAt }),
    ...(priority === undefined ? {} : { priority }),
    ...(sourceUrls === undefined ? {} : { sourceUrls }),
    ...(evidence === undefined ? {} : { evidence }),
  }, "create assignment input");
}

export function normalizeCreateAssignmentNoteInput(input: unknown): CreateAssignmentNoteInput {
  if (!isRecord(input)) throw new TypeError("assignment note input must be a JSON object");
  const body = requireText(input["body"], "body");
  const author = optionalText(input["author"], "author");
  return assignmentNoteCarrier.assert({
    body,
    ...(author === undefined ? {} : { author }),
  }, "assignment note");
}

export function createAssignmentInputFromDemand(entry: DemandEntry): CreateAssignmentInput {
  return createAssignmentInputCarrier.assert({
    term: entry.term,
    beat: entry.beat,
    priority: entry.score,
    summary: `Report the ${entry.term} story for the ${entry.beat} beat.`,
    evidence: {
      views: entry.evidence.views,
      impressions: entry.evidence.impressions,
      clicks: entry.evidence.clicks,
      covered: entry.evidence.covered > 0,
    },
  }, "assignment from demand");
}

export function assignmentBaseId(input: Pick<CreateAssignmentInput, "term" | "beat">): string {
  const slug = newsSlug(`${input.beat}-${input.term}`).split("-").slice(0, 10).join("-");
  const hash = createHash("sha256").update(`${input.beat}\n${input.term}`).digest("hex").slice(0, 8);
  return `${slug}-${hash}`;
}

export const createAssignmentJsonSchema = CreateAssignmentInputSchema;
export const createAssignmentNoteJsonSchema = AssignmentNoteSchema;

export function assignmentTerm(input: AssignmentReading): Tm {
  return carrierToTerm(jsonResource(assignmentCarrier.assert(input), "assignment"));
}

export function createAssignmentInputTerm(input: CreateAssignmentInput): Tm {
  return carrierToTerm(jsonResource(createAssignmentInputCarrier.assert(input), "create assignment input"));
}
