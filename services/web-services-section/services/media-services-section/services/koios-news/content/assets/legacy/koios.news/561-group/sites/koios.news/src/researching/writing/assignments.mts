// researching/writing/assignments — durable newsroom assignments.
//
// Research demand becomes editorial work here before it becomes a manuscript.
// The log is append-only; the records file is only the current projection used
// by human and agent operators.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { newsSlug } from "@emsenn/content/topology/news";
import { parseLines } from "@emsenn/relating/codecs";

import type { KoiosPost } from "../../content.mjs";
import type { DemandEntry } from "../../demand.mjs";

export type AssignmentStatus = "assigned" | "drafted" | "published" | "completed";

export type AssignmentEvidence = Readonly<{
  views: number;
  impressions: number;
  clicks: number;
  covered: boolean;
}>;

export type AssignmentReading = Readonly<{
  kind: "koios.newsroom.assignment";
  assignmentId: string;
  term: string;
  beat: string;
  status: AssignmentStatus;
  createdAt: string;
  completedAt?: string;
  priority: number;
  summary?: string;
  angle?: string;
  assignee?: string;
  dueAt?: string;
  sourceUrls: readonly string[];
  evidence?: AssignmentEvidence;
  manuscriptSlug?: string;
  manuscriptUrl?: string;
}>;

export type CreateAssignmentInput = Readonly<{
  term: string;
  beat: string;
  summary?: string;
  angle?: string;
  assignee?: string;
  dueAt?: string;
  priority?: number;
  sourceUrls?: readonly string[];
  evidence?: AssignmentEvidence;
}>;

export type CreateAssignmentResult = Readonly<{
  kind: "koios.newsroom.assignment.created";
  created: boolean;
  assignment: AssignmentReading;
}>;

export type CompleteAssignmentResult = Readonly<{
  kind: "koios.newsroom.assignment.completed";
  completed: boolean;
  assignment: AssignmentReading;
}>;

export type CreateAssignmentNoteInput = Readonly<{
  body: string;
  author?: string;
}>;

export type AssignmentNoteReading = Readonly<{
  body: string;
  author?: string;
}>;

export type CreateAssignmentNoteResult = Readonly<{
  kind: "koios.newsroom.assignment.noted";
  recorded: boolean;
  assignment: AssignmentReading;
  note: AssignmentNoteReading;
}>;

export type AssignmentCreatedEvent = Readonly<{
  kind: "koios.newsroom.assignment.created";
  at: string;
  assignment: Omit<AssignmentReading, "status" | "completedAt" | "manuscriptSlug" | "manuscriptUrl">;
}>;

export type AssignmentCompletedEvent = Readonly<{
  kind: "koios.newsroom.assignment.completed";
  at: string;
  assignmentId: string;
}>;

export type AssignmentNotedEvent = Readonly<{
  kind: "koios.newsroom.assignment.noted";
  at: string;
  assignmentId: string;
  note: AssignmentNoteReading;
}>;

export type AssignmentLogEvent = AssignmentCreatedEvent | AssignmentCompletedEvent | AssignmentNotedEvent;

export type AssignmentActivityEvent = Readonly<{
  kind: "created" | "completed" | "noted" | "drafted" | "published";
  at: string;
  label: string;
  origin: "log" | "artifact";
  event?: AssignmentLogEvent;
  artifact?: Readonly<{
    manuscriptSlug: string;
    manuscriptUrl: string;
  }>;
}>;

export type AssignmentActivityReading = Readonly<{
  kind: "koios.newsroom.assignment.activity";
  assignmentId: string;
  assignment: AssignmentReading;
  events: readonly AssignmentActivityEvent[];
  artifacts: Readonly<{
    manuscriptSlug?: string;
    manuscriptUrl?: string;
  }>;
}>;

const URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;

function assignmentLogPath(dataDir: string): string {
  return join(dataDir, "logs", "assignments.jsonl");
}

function assignmentRecordPath(dataDir: string): string {
  return join(dataDir, "records", "assignments.json");
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

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

function optionalUrls(value: unknown): readonly string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new TypeError("sourceUrls must be an array");
  const urls = value.map((item, index) => requireText(item, `sourceUrls[${index}]`));
  for (const [index, url] of urls.entries()) {
    if (!URL_PATTERN.test(url)) throw new TypeError(`sourceUrls[${index}] must be an http(s) URL`);
  }
  return Object.freeze(urls);
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
  return Object.freeze({ views, impressions, clicks, covered });
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
  return Object.freeze({
    term,
    beat,
    ...(summary === undefined ? {} : { summary }),
    ...(angle === undefined ? {} : { angle }),
    ...(assignee === undefined ? {} : { assignee }),
    ...(dueAt === undefined ? {} : { dueAt }),
    ...(priority === undefined ? {} : { priority }),
    ...(sourceUrls === undefined ? {} : { sourceUrls }),
    ...(evidence === undefined ? {} : { evidence }),
  });
}

export function normalizeCreateAssignmentNoteInput(input: unknown): CreateAssignmentNoteInput {
  if (!isRecord(input)) throw new TypeError("assignment note input must be a JSON object");
  const body = requireText(input["body"], "body");
  const author = optionalText(input["author"], "author");
  return Object.freeze({
    body,
    ...(author === undefined ? {} : { author }),
  });
}

export function createAssignmentInputFromDemand(entry: DemandEntry): CreateAssignmentInput {
  return Object.freeze({
    term: entry.term,
    beat: entry.beat,
    priority: entry.score,
    summary: `Report the ${entry.term} story for the ${entry.beat} beat.`,
    evidence: Object.freeze({
      views: entry.evidence.views,
      impressions: entry.evidence.impressions,
      clicks: entry.evidence.clicks,
      covered: entry.evidence.covered > 0,
    }),
  });
}

function assignmentBaseId(input: Pick<CreateAssignmentInput, "term" | "beat">): string {
  const slug = newsSlug(`${input.beat}-${input.term}`).split("-").slice(0, 10).join("-");
  const hash = createHash("sha256").update(`${input.beat}\n${input.term}`).digest("hex").slice(0, 8);
  return `${slug}-${hash}`;
}

function ensureParents(dataDir: string): void {
  mkdirSync(dirname(assignmentLogPath(dataDir)), { recursive: true });
  mkdirSync(dirname(assignmentRecordPath(dataDir)), { recursive: true });
}

function assignmentLogEvents(dataDir: string): readonly AssignmentLogEvent[] {
  const path = assignmentLogPath(dataDir);
  if (!existsSync(path)) return Object.freeze([]);
  const events: AssignmentLogEvent[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    if (isRecord(parsed) && parsed["kind"] === "koios.newsroom.assignment.created" && isRecord(parsed["assignment"])) {
      events.push(parsed as unknown as AssignmentCreatedEvent);
    } else if (isRecord(parsed) && parsed["kind"] === "koios.newsroom.assignment.completed" && typeof parsed["assignmentId"] === "string" && typeof parsed["at"] === "string") {
      events.push(parsed as unknown as AssignmentCompletedEvent);
    } else if (isRecord(parsed) && parsed["kind"] === "koios.newsroom.assignment.noted" && typeof parsed["assignmentId"] === "string" && typeof parsed["at"] === "string" && isRecord(parsed["note"])) {
      events.push(parsed as unknown as AssignmentNotedEvent);
    }
  }
  return Object.freeze(events);
}

function assignmentEvents(dataDir: string): readonly AssignmentCreatedEvent[] {
  return Object.freeze(assignmentLogEvents(dataDir).filter((event): event is AssignmentCreatedEvent => event.kind === "koios.newsroom.assignment.created"));
}

function assignmentCompletionEvents(dataDir: string): readonly AssignmentCompletedEvent[] {
  return Object.freeze(assignmentLogEvents(dataDir).filter((event): event is AssignmentCompletedEvent => event.kind === "koios.newsroom.assignment.completed"));
}

function koiosFrontMatter(post: KoiosPost): Readonly<Record<string, unknown>> {
  const value = post.document.frontMatter["koios"];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function manuscriptByAssignment(posts: readonly KoiosPost[]): ReadonlyMap<string, KoiosPost> {
  const byAssignment = new Map<string, KoiosPost>();
  for (const post of posts) {
    const assignmentId = maybeString(koiosFrontMatter(post)["assignment_id"]);
    if (assignmentId !== undefined) byAssignment.set(assignmentId, post);
  }
  return byAssignment;
}

function statusFor(post: KoiosPost | undefined): AssignmentStatus {
  if (post === undefined) return "assigned";
  return post.document.frontMatter["draft"] === true || post.document.frontMatter["draft"] === "true"
    ? "drafted"
    : "published";
}

function postDate(post: KoiosPost | undefined): string | undefined {
  return post === undefined ? undefined : maybeString(post.document.frontMatter["date"]);
}

function activityOrder(kind: AssignmentActivityEvent["kind"]): number {
  if (kind === "created") return 0;
  if (kind === "drafted") return 1;
  if (kind === "published") return 2;
  if (kind === "noted") return 3;
  return 4;
}

function projectAssignments(dataDir: string, posts: readonly KoiosPost[] = []): readonly AssignmentReading[] {
  const byAssignment = manuscriptByAssignment(posts);
  const completedAt = new Map(assignmentCompletionEvents(dataDir).map((event) => [event.assignmentId, event.at]));
  return Object.freeze(assignmentEvents(dataDir).map((event) => {
    const post = byAssignment.get(event.assignment.assignmentId);
    const manuscriptSlug = post?.slug;
    const completion = completedAt.get(event.assignment.assignmentId);
    const manuscriptStatus = statusFor(post);
    return Object.freeze({
      ...event.assignment,
      status: completion === undefined || manuscriptStatus === "published" ? manuscriptStatus : "completed",
      ...(completion === undefined ? {} : { completedAt: completion }),
      ...(manuscriptSlug === undefined ? {} : {
        manuscriptSlug,
        manuscriptUrl: `/posts/${encodeURIComponent(manuscriptSlug)}`,
      }),
    });
  }));
}

function writeProjection(dataDir: string, assignments: readonly AssignmentReading[]): void {
  ensureParents(dataDir);
  writeFileSync(assignmentRecordPath(dataDir), `${JSON.stringify(assignments, null, 2)}\n`, "utf8");
}

export function readAssignments(dataDir: string, posts: readonly KoiosPost[] = []): readonly AssignmentReading[] {
  return projectAssignments(dataDir, posts);
}

export function readAssignment(dataDir: string, assignmentId: string, posts: readonly KoiosPost[] = []): AssignmentReading {
  const assignment = readAssignments(dataDir, posts).find((item) => item.assignmentId === assignmentId);
  if (assignment === undefined) throw new Error(`no such assignment: ${assignmentId}`);
  return assignment;
}

export function readAssignmentActivity(dataDir: string, assignmentId: string, posts: readonly KoiosPost[] = []): AssignmentActivityReading {
  const assignment = readAssignment(dataDir, assignmentId, posts);
  const manuscript = manuscriptByAssignment(posts).get(assignmentId);
  const manuscriptArtifact = assignment.manuscriptSlug === undefined || assignment.manuscriptUrl === undefined
    ? undefined
    : Object.freeze({ manuscriptSlug: assignment.manuscriptSlug, manuscriptUrl: assignment.manuscriptUrl });
  const logEvents = assignmentLogEvents(dataDir)
    .filter((event) => event.kind === "koios.newsroom.assignment.created"
      ? event.assignment.assignmentId === assignmentId
      : event.assignmentId === assignmentId)
    .map((event): AssignmentActivityEvent => {
      if (event.kind === "koios.newsroom.assignment.created") return Object.freeze({
        kind: "created" as const,
        at: event.at,
        label: `Assignment created for ${event.assignment.beat}: ${event.assignment.term}`,
        origin: "log" as const,
        event,
      });
      if (event.kind === "koios.newsroom.assignment.completed") return Object.freeze({
        kind: "completed" as const,
        at: event.at,
        label: "Assignment marked complete by an operator.",
        origin: "log" as const,
        event,
      });
      const author = event.note.author ?? "operator";
      return Object.freeze({
        kind: "noted" as const,
        at: event.at,
        label: `Note from ${author}: ${event.note.body}`,
        origin: "log" as const,
        event,
      });
    });
  const manuscriptEvents: AssignmentActivityEvent[] = [];
  if (manuscriptArtifact !== undefined && manuscript !== undefined) {
    const manuscriptStatus = statusFor(manuscript);
    const manuscriptDate = postDate(manuscript);
    const artifactAt = manuscriptDate !== undefined && manuscriptDate > assignment.createdAt ? manuscriptDate : assignment.createdAt;
    manuscriptEvents.push(Object.freeze({
      kind: manuscriptStatus === "published" ? "published" as const : "drafted" as const,
      at: artifactAt,
      label: manuscriptStatus === "published"
        ? `Linked manuscript published: ${manuscript.slug}`
        : `Linked draft manuscript: ${manuscript.slug}`,
      origin: "artifact" as const,
      artifact: manuscriptArtifact,
    }));
  }
  const events = Object.freeze([...logEvents, ...manuscriptEvents].sort((left, right) =>
    left.at.localeCompare(right.at) || activityOrder(left.kind) - activityOrder(right.kind)));
  return Object.freeze({
    kind: "koios.newsroom.assignment.activity" as const,
    assignmentId,
    assignment,
    events,
    artifacts: Object.freeze({
      ...(assignment.manuscriptSlug === undefined ? {} : { manuscriptSlug: assignment.manuscriptSlug }),
      ...(assignment.manuscriptUrl === undefined ? {} : { manuscriptUrl: assignment.manuscriptUrl }),
    }),
  });
}

export function recordAssignmentNote(dataDir: string, assignmentId: string, input: CreateAssignmentNoteInput, posts: readonly KoiosPost[] = []): CreateAssignmentNoteResult {
  const assignment = readAssignment(dataDir, assignmentId, posts);
  const note = Object.freeze({
    body: input.body,
    ...(input.author === undefined ? {} : { author: input.author }),
  });
  const event: AssignmentNotedEvent = Object.freeze({
    kind: "koios.newsroom.assignment.noted" as const,
    at: new Date().toISOString(),
    assignmentId,
    note,
  });
  ensureParents(dataDir);
  writeFileSync(assignmentLogPath(dataDir), `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
  return Object.freeze({ kind: "koios.newsroom.assignment.noted" as const, recorded: true, assignment, note });
}

function isOpen(assignment: AssignmentReading): boolean {
  return assignment.status === "assigned" || assignment.status === "drafted";
}

export function createAssignment(dataDir: string, input: CreateAssignmentInput, posts: readonly KoiosPost[] = []): CreateAssignmentResult {
  const existingAssignments = readAssignments(dataDir, posts);
  const existing = existingAssignments.find((assignment) =>
    isOpen(assignment) && assignment.term.toLowerCase() === input.term.toLowerCase() && assignment.beat.toLowerCase() === input.beat.toLowerCase());
  if (existing !== undefined) {
    return Object.freeze({ kind: "koios.newsroom.assignment.created" as const, created: false, assignment: existing });
  }
  const baseId = assignmentBaseId(input);
  const existingIds = new Set(existingAssignments.map((assignment) => assignment.assignmentId));
  let assignmentId = baseId;
  let suffix = 2;
  while (existingIds.has(assignmentId)) {
    assignmentId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const assignment: Omit<AssignmentReading, "status" | "manuscriptSlug" | "manuscriptUrl"> = Object.freeze({
    kind: "koios.newsroom.assignment" as const,
    assignmentId,
    term: input.term,
    beat: input.beat,
    createdAt: new Date().toISOString(),
    priority: input.priority ?? 0,
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.angle === undefined ? {} : { angle: input.angle }),
    ...(input.assignee === undefined ? {} : { assignee: input.assignee }),
    ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
    sourceUrls: Object.freeze(input.sourceUrls ?? []),
    ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
  });
  const event: AssignmentCreatedEvent = Object.freeze({
    kind: "koios.newsroom.assignment.created" as const,
    at: assignment.createdAt,
    assignment,
  });
  ensureParents(dataDir);
  writeFileSync(assignmentLogPath(dataDir), `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
  const assignments = projectAssignments(dataDir, posts);
  writeProjection(dataDir, assignments);
  const created = assignments.find((item) => item.assignmentId === assignment.assignmentId) ?? Object.freeze({ ...assignment, status: "assigned" as const });
  return Object.freeze({ kind: "koios.newsroom.assignment.created" as const, created: true, assignment: created });
}

export function completeAssignment(dataDir: string, assignmentId: string, posts: readonly KoiosPost[] = []): CompleteAssignmentResult {
  const before = readAssignment(dataDir, assignmentId, posts);
  if (before.status === "completed" || before.status === "published") {
    return Object.freeze({ kind: "koios.newsroom.assignment.completed" as const, completed: false, assignment: before });
  }
  const event: AssignmentCompletedEvent = Object.freeze({
    kind: "koios.newsroom.assignment.completed" as const,
    at: new Date().toISOString(),
    assignmentId,
  });
  ensureParents(dataDir);
  writeFileSync(assignmentLogPath(dataDir), `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
  const assignments = projectAssignments(dataDir, posts);
  writeProjection(dataDir, assignments);
  const completed = assignments.find((item) => item.assignmentId === assignmentId);
  if (completed === undefined) throw new Error(`no such assignment: ${assignmentId}`);
  return Object.freeze({ kind: "koios.newsroom.assignment.completed" as const, completed: true, assignment: completed });
}

export const createAssignmentJsonSchema = Object.freeze({
  type: "object",
  required: Object.freeze(["term", "beat"]),
  properties: Object.freeze({
    term: Object.freeze({ type: "string", minLength: 1 }),
    beat: Object.freeze({ type: "string", minLength: 1 }),
    summary: Object.freeze({ type: "string" }),
    angle: Object.freeze({ type: "string" }),
    assignee: Object.freeze({ type: "string" }),
    dueAt: Object.freeze({ type: "string" }),
    priority: Object.freeze({ type: "number", minimum: 0 }),
    sourceUrls: Object.freeze({
      type: "array",
      items: Object.freeze({ type: "string", format: "uri" }),
    }),
    evidence: Object.freeze({
      type: "object",
      properties: Object.freeze({
        views: Object.freeze({ type: "number", minimum: 0 }),
        impressions: Object.freeze({ type: "number", minimum: 0 }),
        clicks: Object.freeze({ type: "number", minimum: 0 }),
        covered: Object.freeze({ type: "boolean" }),
      }),
      additionalProperties: false,
    }),
  }),
  additionalProperties: false,
});

export const createAssignmentNoteJsonSchema = Object.freeze({
  type: "object",
  required: Object.freeze(["body"]),
  properties: Object.freeze({
    body: Object.freeze({ type: "string", minLength: 1 }),
    author: Object.freeze({ type: "string", minLength: 1 }),
  }),
  additionalProperties: false,
});
