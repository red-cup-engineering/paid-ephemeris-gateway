/**
 * repair-packets - the farm compost read as an operator repair backlog.
 *
 * A content farm run trace already records withheld gates and intake
 * obstructions. This module names the generic carrier that turns those records
 * into repair packets. Site packages may supply local candidate-state readers
 * and constraint text, but the packet vocabulary belongs to producing-content.
 */
import { Type, type Static } from "@sinclair/typebox";
import { carrierFrom, carrierToTerm, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";

const RepairTaskKindSchema = Type.Union([
  Type.Literal("source-alignment"),
  Type.Literal("seo-revision"),
  Type.Literal("reference-enrichment"),
  Type.Literal("copy-edit"),
  Type.Literal("warrant-review"),
  Type.Literal("structure-repair"),
]);

export const ContentFarmRepairTaskSchema = Type.Object({
  kind: RepairTaskKindSchema,
  gate: Type.String({ minLength: 1 }),
  priority: Type.Number(),
  evidence: Type.String({ minLength: 1 }),
  instruction: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export const ContentFarmCandidateStateSchema = Type.Object({
  status: Type.Union([
    Type.Literal("missing"),
    Type.Literal("draft"),
    Type.Literal("published"),
  ]),
  path: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
}, { additionalProperties: false });

export const ContentFarmRepairPacketSchema = Type.Object({
  kind: Type.Literal("producing-content.farm.repair-packet"),
  slug: Type.String({ minLength: 1 }),
  term: Type.String(),
  beat: Type.String(),
  t: Type.Optional(Type.String()),
  shipped: Type.Boolean(),
  story: Type.Optional(Type.Object({
    title: Type.Optional(Type.String()),
    url: Type.Optional(Type.String()),
  }, { additionalProperties: false })),
  usage: Type.Optional(Type.Object({
    calls: Type.Optional(Type.Number()),
    tokens: Type.Optional(Type.Number()),
  }, { additionalProperties: false })),
  candidate: ContentFarmCandidateStateSchema,
  failedGateCount: Type.Number(),
  highestPriority: Type.Number(),
  taskCount: Type.Number(),
  tasks: Type.Array(ContentFarmRepairTaskSchema),
}, {
  $id: "producing-content/content-farm/repair-packet",
  title: "ContentFarmRepairPacket",
  additionalProperties: false,
});

export const ContentFarmRepairPacketsReadingSchema = Type.Object({
  kind: Type.Literal("producing-content.farm.repair-packets"),
  packetCount: Type.Number(),
  openPacketCount: Type.Number(),
  taskCount: Type.Number(),
  byCandidate: Type.Array(ContentFarmRepairPacketSchema),
  constraints: Type.Array(Type.String()),
}, {
  $id: "producing-content/content-farm/repair-packets",
  title: "ContentFarmRepairPacketsReading",
  additionalProperties: false,
});

export type ContentFarmRepairTaskKind = Static<typeof RepairTaskKindSchema>;
export type ContentFarmRepairTask = Static<typeof ContentFarmRepairTaskSchema>;
export type ContentFarmCandidateState = Static<typeof ContentFarmCandidateStateSchema>;
export type ContentFarmRepairPacket = Static<typeof ContentFarmRepairPacketSchema>;
export type ContentFarmRepairPacketsReading = Static<typeof ContentFarmRepairPacketsReadingSchema>;

export const contentFarmRepairPacketCarrier = carrierFrom(ContentFarmRepairPacketSchema);

export const contentFarmRepairPacketsReadingCarrier = carrierFrom(ContentFarmRepairPacketsReadingSchema);

type JsonRecord = Record<string, unknown>;

export type ContentFarmRepairPacketsOptions = Readonly<{
  runs: readonly unknown[];
  limit?: number;
  candidateState?: (slug: string, run: Readonly<Record<string, unknown>>) => ContentFarmCandidateState;
  constraints?: readonly string[];
}>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function runString(run: Readonly<Record<string, unknown>>, key: string): string {
  return stringValue(run[key]);
}

function runBoolean(run: Readonly<Record<string, unknown>>, key: string): boolean {
  return run[key] === true;
}

function slugFromTerm(term: string): string {
  return term.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "content-farm-obstruction";
}

function runUsage(run: Readonly<Record<string, unknown>>): ContentFarmRepairPacket["usage"] | undefined {
  const usage = run["usage"];
  if (!isRecord(usage)) return undefined;
  const calls = typeof usage["calls"] === "number" && Number.isFinite(usage["calls"]) ? usage["calls"] : undefined;
  const tokens = typeof usage["tokens"] === "number" && Number.isFinite(usage["tokens"]) ? usage["tokens"] : undefined;
  if (calls === undefined && tokens === undefined) return undefined;
  return Object.freeze({
    ...(calls === undefined ? {} : { calls }),
    ...(tokens === undefined ? {} : { tokens }),
  });
}

function runStory(run: Readonly<Record<string, unknown>>): ContentFarmRepairPacket["story"] | undefined {
  const story = run["story"];
  if (!isRecord(story)) return undefined;
  const title = stringValue(story["title"]);
  const url = stringValue(story["url"]);
  if (title === "" && url === "") return undefined;
  return Object.freeze({
    ...(title === "" ? {} : { title }),
    ...(url === "" ? {} : { url }),
  });
}

function failedRunGates(run: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] {
  const gates = run["gates"];
  if (!Array.isArray(gates)) return Object.freeze([]);
  return Object.freeze(gates.filter((gate): gate is Readonly<Record<string, unknown>> =>
    isRecord(gate) && stringValue(gate["charge"]) !== "pass"));
}

function repairTaskForGate(gate: Readonly<Record<string, unknown>>): ContentFarmRepairTask {
  const name = stringValue(gate["gate"], "unknown-gate");
  const evidence = stringValue(gate["evidence"], "The gate failed without structured evidence.");
  if (name === "seo-subheader") {
    return Object.freeze({
      kind: "seo-revision" as const,
      gate: name,
      priority: 86,
      evidence,
      instruction: "Revise one natural H2 so the selected SEO term appears once without making the heading read like a stamped keyword.",
    });
  }
  if (name === "seo-frequency") {
    return Object.freeze({
      kind: "seo-revision" as const,
      gate: name,
      priority: 84,
      evidence,
      instruction: "Reduce repeated SEO phrasing and reconsider the term if the witnessed story is being forced into the wrong demand bucket.",
    });
  }
  if (name === "citations") {
    return Object.freeze({
      kind: "reference-enrichment" as const,
      gate: name,
      priority: 90,
      evidence,
      instruction: "Add or repair references and body citations for the witnessed intake cut; keep intake sources distinct from published references.",
    });
  }
  if (name === "numbers-faithfulness") {
    return Object.freeze({
      kind: "warrant-review" as const,
      gate: name,
      priority: 88,
      evidence,
      instruction: "Remove unsupported figures or cite witnessed intake that actually carries the number before publication.",
    });
  }
  if (name === "no-prophecy") {
    return Object.freeze({
      kind: "copy-edit" as const,
      gate: name,
      priority: 82,
      evidence,
      instruction: "Rewrite future-certainty language as contingent analysis grounded in the available sources.",
    });
  }
  if (name === "length") {
    return Object.freeze({
      kind: "structure-repair" as const,
      gate: name,
      priority: 80,
      evidence,
      instruction: "Extend the manuscript with sourced context, warranted analysis, and article structure rather than filler.",
    });
  }
  if (name === "summary-length") {
    return Object.freeze({
      kind: "copy-edit" as const,
      gate: name,
      priority: 58,
      evidence,
      instruction: "Adjust summary and description lengths while preserving the factual warrant of the manuscript.",
    });
  }
  return Object.freeze({
    kind: "copy-edit" as const,
    gate: name,
    priority: 70,
    evidence,
    instruction: "Review the failed gate evidence and revise the draft only where the manuscript warrants it.",
  });
}

function repairTaskForObstruction(run: Readonly<Record<string, unknown>>): ContentFarmRepairTask | null {
  const obstruction = runString(run, "obstruction");
  if (obstruction === "") return null;
  const evidence = runString(run, "evidence") || `Content farm obstruction: ${obstruction}`;
  return Object.freeze({
    kind: "source-alignment" as const,
    gate: obstruction,
    priority: 92,
    evidence,
    instruction: "Repair the intake path or choose a demand row with witnessed local source evidence before spending model calls.",
  });
}

function missingCandidate(): ContentFarmCandidateState {
  return Object.freeze({ status: "missing" as const });
}

function contentFarmRepairPacket(
  runValue: unknown,
  candidateState: NonNullable<ContentFarmRepairPacketsOptions["candidateState"]>,
): ContentFarmRepairPacket | null {
  if (!isRecord(runValue)) return null;
  const gates = failedRunGates(runValue);
  const obstruction = repairTaskForObstruction(runValue);
  const tasks = Object.freeze([
    ...gates.map(repairTaskForGate),
    ...(obstruction === null ? [] : [obstruction]),
  ].sort((left, right) => right.priority - left.priority || left.gate.localeCompare(right.gate)));
  if (tasks.length === 0) return null;
  const term = runString(runValue, "term");
  const beat = runString(runValue, "beat");
  const slug = runString(runValue, "slug") || slugFromTerm(term || beat);
  const highestPriority = tasks.reduce((max, task) => Math.max(max, task.priority), 0);
  const t = runString(runValue, "t");
  const story = runStory(runValue);
  const usage = runUsage(runValue);
  return contentFarmRepairPacketCarrier.assert({
    kind: "producing-content.farm.repair-packet" as const,
    slug,
    term,
    beat,
    ...(t === "" ? {} : { t }),
    shipped: runBoolean(runValue, "shipped"),
    ...(story === undefined ? {} : { story }),
    ...(usage === undefined ? {} : { usage }),
    candidate: candidateState(slug, runValue),
    failedGateCount: gates.length,
    highestPriority,
    taskCount: tasks.length,
    tasks: [...tasks],
  }, "content farm repair packet");
}

export function contentFarmRepairPacketsReading(input: ContentFarmRepairPacketsOptions): ContentFarmRepairPacketsReading {
  const candidateState = input.candidateState ?? (() => missingCandidate());
  const seen = new Set<string>();
  const packets: ContentFarmRepairPacket[] = [];
  for (const run of [...input.runs].reverse()) {
    const packet = contentFarmRepairPacket(run, candidateState);
    if (packet === null) continue;
    const key = `${packet.slug}\n${packet.term}\n${packet.beat}`;
    if (seen.has(key)) continue;
    seen.add(key);
    packets.push(packet);
    if (packets.length >= (input.limit ?? 50)) break;
  }
  const ordered = Object.freeze(packets.sort((left, right) => {
    const leftOpen = left.candidate.status !== "published";
    const rightOpen = right.candidate.status !== "published";
    return Number(rightOpen) - Number(leftOpen)
      || right.highestPriority - left.highestPriority
      || (right.t ?? "").localeCompare(left.t ?? "")
      || left.slug.localeCompare(right.slug);
  }));
  return contentFarmRepairPacketsReadingCarrier.assert({
    kind: "producing-content.farm.repair-packets" as const,
    packetCount: ordered.length,
    openPacketCount: ordered.filter((packet) => packet.candidate.status !== "published").length,
    taskCount: ordered.reduce((sum, packet) => sum + packet.taskCount, 0),
    byCandidate: [...ordered],
    constraints: [...(input.constraints ?? [
      "This is a read-only operator backlog over farm run traces.",
      "Repair packets do not rewrite, publish, or silently normalize manuscripts.",
      "Intake sources remain research material; published citations remain manuscript references.",
      "A published candidate stays visible as historical friction but is not counted as open.",
    ])],
  }, "content farm repair packets reading");
}

export function contentFarmRepairPacketTerm(input: ContentFarmRepairPacket): Tm {
  return carrierToTerm(jsonResource(contentFarmRepairPacketCarrier.assert(input), "content farm repair packet"));
}

export function contentFarmRepairPacketsReadingTerm(input: ContentFarmRepairPacketsReading): Tm {
  return carrierToTerm(jsonResource(contentFarmRepairPacketsReadingCarrier.assert(input), "content farm repair packets reading"));
}
