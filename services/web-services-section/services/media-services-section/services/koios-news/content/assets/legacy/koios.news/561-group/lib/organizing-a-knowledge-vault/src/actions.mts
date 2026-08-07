/**
 * actions  -  knowledge-vault verbs as one relating dispatcher surface.
 *
 * The package owns path admission and vault navigation. Once a region is admitted
 * as resources, @emsenn/knowing supplies the memory, proof, and research readings.
 */
import { action, jsonResource, type Action, type JsonRecord, type JsonValue } from "@emsenn/relating";
import {
  research,
  certified,
  knowing,
  introducing,
  studying,
  explaining,
  learning,
  teaching,
  tutoring,
  type SettledResearch,
} from "@emsenn/knowing/researching";
import {
  projectResearch,
  projectKnowledge,
  projectCell,
  projectSite,
  projectExplanation,
  projectLearning,
  projectCurriculum,
  projectNextStep,
} from "@emsenn/knowing/projecting";
import {
  admitMemory,
  settleMemory,
  observeMemory,
  inspectMemoryHealth,
  inspectMemoryTopic,
  measureMemoryGap,
  conceptMapMemory,
} from "@emsenn/knowing/memory";
import { resolveNode, children, readDocument, listEntries, gatherResources } from "./vault/index.mjs";
import { createDocument, updateFrontmatter } from "./mutating/index.mjs";

/** The vault root for this call: `--path`, else ORGANIZING_KNOWLEDGE_VAULT_PATH, else `content`. */
function vaultRoot(args: JsonRecord): string {
  const fromArg = typeof args["path"] === "string" && args["path"].trim() !== "" ? args["path"].trim() : undefined;
  return fromArg ?? process.env["ORGANIZING_KNOWLEDGE_VAULT_PATH"] ?? "content";
}

/** Admit a topic from the `string` wire or the `json` wire (`{topic}`). */
function admitTopic(input: JsonValue, verb: string): string {
  if (typeof input === "string") {
    const topic = input.trim();
    if (topic === "") throw new TypeError(`${verb}: a topic is required on stdin`);
    return topic;
  }
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const record = input as JsonRecord;
    for (const key of ["topic", "path", "slug", "address"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
  }
  throw new TypeError(`${verb}: expected a topic string or a { topic } object`);
}

function memoryRegion(input: JsonValue, args: JsonRecord): { root: string; region: string; limit: number } {
  const region = typeof input === "string" ? input.trim() : typeof input === "object" && input !== null && !Array.isArray(input) && typeof (input as JsonRecord)["path"] === "string" ? String((input as JsonRecord)["path"]).trim() : "";
  const limit = typeof args["limit"] === "string" ? Math.max(1, Math.min(2000, Number(args["limit"]) || 200)) : 200;
  return { root: vaultRoot(args), region, limit };
}

function regionResearch(input: JsonValue, args: JsonRecord): SettledResearch | null {
  const { root, region, limit } = memoryRegion(input, args);
  return research(admitMemory(root, gatherResources(root, region, limit)));
}

const EMPTY_RESEARCH: JsonValue = Object.freeze({ kind: "organizing.knowledge-vault.empty", reason: "no documents in the region to research" });

function unfoldingAction(verb: string, summary: string, codomain: string, codomainId: string, derive: (research: SettledResearch) => unknown): Action {
  return action({
    verb,
    inputFormat: "string",
    outputFormat: "json",
    options: ["path", "limit"],
    summary,
    description: `Domain: a knowledge-vault region path (string wire, empty = root) or { path }; --path sets the vault root, --limit bounds documents. Codomain: the ${codomain} as JSON (${codomainId}) from @emsenn/knowing.`,
    domainSchema: Object.freeze({ type: "string", description: "a knowledge-vault region path (empty = root)" }),
    codomainSchema: Object.freeze({ $ref: codomainId }),
    run: (input: JsonValue, args: JsonRecord): JsonValue => {
      const settled = regionResearch(input, args);
      return jsonResource(settled === null ? EMPTY_RESEARCH : derive(settled), codomain);
    },
  });
}

export const researchAction: Action = unfoldingAction("research", "Research a vault region as a knowing research act.", "research act", "knowing/researching/research", (settled) => projectResearch(settled, certified(settled)));
export const knowAction: Action = unfoldingAction("know", "Know a vault region: its settled regime, certification, and relations.", "knowledge", "knowing/researching/knowledge", (settled) => projectKnowledge(knowing(settled)));
export const introduceAction: Action = unfoldingAction("introduce", "Introduce a vault region as the settled entry cell.", "introduction", "knowing/researching/cell", (settled) => projectCell(introducing(settled)));
export const studyAction: Action = unfoldingAction("study", "Study a vault region by opening its settling trace.", "study", "knowing/researching/site", (settled) => projectSite(studying(introducing(settled))));
export const explainAction: Action = unfoldingAction("explain", "Explain a vault region as a stepwise derivation.", "explanation", "knowing/researching/explanation", (settled) => projectExplanation(explaining(studying(introducing(settled)))));
export const learnAction: Action = unfoldingAction("learn", "Learn from a vault region: the lessons its trace yields.", "learning", "knowing/researching/learning", (settled) => projectLearning(learning(studying(introducing(settled)))));
export const teachAction: Action = unfoldingAction("teach", "Teach a vault region: its lessons ordered for delivery.", "curriculum", "knowing/researching/curriculum", (settled) => projectCurriculum(teaching(learning(studying(introducing(settled))))));
export const tutorAction: Action = unfoldingAction("tutor", "Tutor over a vault region: the next single lesson.", "next step", "knowing/researching/next-step", (settled) => projectNextStep(tutoring(learning(studying(introducing(settled))))));

export const browseAction: Action = action({
  verb: "browse",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path"],
  summary: "Browse the vault at a topic: the nodes it generates in one step.",
  domainSchema: Object.freeze({ type: "string", description: "a vault topic proof path (empty = root)" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/frontier" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const topic = typeof input === "string" ? input.trim() : admitTopic(input, "browse");
    return jsonResource({ kind: "organizing.knowledge-vault.frontier", topic, nodes: children(vaultRoot(args), topic) }, "frontier");
  },
});

export const locateAction: Action = action({
  verb: "locate",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path"],
  summary: "Locate a topic by vault proof path.",
  domainSchema: Object.freeze({ type: "string", description: "a vault topic proof path" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/node" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const resolved = resolveNode(vaultRoot(args), admitTopic(input, "locate"));
    return jsonResource(resolved === null ? null : resolved.node, "vault node");
  },
});

function admitAddress(input: JsonValue, verb: string): string {
  if (typeof input === "string") return input.trim();
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const value = (input as JsonRecord)["path"];
    if (typeof value === "string") return value.trim();
  }
  throw new TypeError(`${verb}: expected a path string or a { path } object`);
}

export const readAction: Action = action({
  verb: "read",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path"],
  summary: "Read one vault document by address, decoded by the markdown codec.",
  domainSchema: Object.freeze({ type: "string", description: "a vault-relative resource path" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/document" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => jsonResource(readDocument(vaultRoot(args), admitAddress(input, "read")), "document"),
});

export const listAction: Action = action({
  verb: "list",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path"],
  summary: "List immediate entries at a vault address.",
  domainSchema: Object.freeze({ type: "string", description: "a vault-relative directory path (empty = root)" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/listing" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const address = typeof input === "string" ? input.trim() : admitAddress(input, "list");
    return jsonResource(listEntries(vaultRoot(args), address), "listing");
  },
});

export const settleMemoryAction: Action = action({
  verb: "settle-memory",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit"],
  summary: "Admit a vault region as knowing memory and build its proof.",
  domainSchema: Object.freeze({ type: "string", description: "a vault region path (empty = root)" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/proof" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const { root, region, limit } = memoryRegion(input, args);
    return jsonResource(settleMemory(admitMemory(root, gatherResources(root, region, limit))), "memory proof");
  },
});

export const observeAction: Action = action({
  verb: "observe",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit"],
  summary: "Admit a vault region as knowing memory and observe it.",
  domainSchema: Object.freeze({ type: "string", description: "a vault region path (empty = root)" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/observation" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const { root, region, limit } = memoryRegion(input, args);
    return jsonResource(observeMemory(admitMemory(root, gatherResources(root, region, limit))), "memory observation");
  },
});

export const inspectTopicAction: Action = action({
  verb: "inspect-topic",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit", "region"],
  summary: "Inspect a topic across a vault-backed memory.",
  domainSchema: Object.freeze({ type: "string", description: "a topic query" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/topic-inspection" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const topic = typeof input === "string" ? input.trim() : admitTopic(input, "inspect-topic");
    if (topic === "") throw new TypeError("inspect-topic: a topic is required on stdin");
    const root = vaultRoot(args);
    const region = typeof args["region"] === "string" ? args["region"] : "";
    const limit = typeof args["limit"] === "string" ? Math.max(1, Math.min(5000, Number(args["limit"]) || 500)) : 500;
    return jsonResource(inspectMemoryTopic(admitMemory(root, gatherResources(root, region, limit, 80_000)), topic), "topic inspection");
  },
});

export const conceptMapAction: Action = action({
  verb: "concept-map",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit", "region"],
  summary: "Map a topic across a vault-backed memory.",
  domainSchema: Object.freeze({ type: "string", description: "a topic query" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/concept-map" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const topic = typeof input === "string" ? input.trim() : admitTopic(input, "concept-map");
    if (topic === "") throw new TypeError("concept-map: a topic is required on stdin");
    const root = vaultRoot(args);
    const region = typeof args["region"] === "string" ? args["region"] : "";
    const limit = typeof args["limit"] === "string" ? Math.max(1, Math.min(5000, Number(args["limit"]) || 500)) : 500;
    return jsonResource(conceptMapMemory(admitMemory(root, gatherResources(root, region, limit, 80_000)), topic), "concept map");
  },
});

export const measureGapAction: Action = action({
  verb: "measure-gap",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit", "region"],
  summary: "Measure topic coverage and legibility across a vault-backed memory.",
  domainSchema: Object.freeze({ type: "string", description: "a topic query" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/gap" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const topic = typeof input === "string" ? input.trim() : admitTopic(input, "measure-gap");
    if (topic === "") throw new TypeError("measure-gap: a topic is required on stdin");
    const root = vaultRoot(args);
    const region = typeof args["region"] === "string" ? args["region"] : "";
    const limit = typeof args["limit"] === "string" ? Math.max(1, Math.min(5000, Number(args["limit"]) || 500)) : 500;
    return jsonResource(measureMemoryGap(admitMemory(root, gatherResources(root, region, limit, 80_000)), topic), "gap measurement");
  },
});

export const inspectHealthAction: Action = action({
  verb: "inspect-health",
  inputFormat: "string",
  outputFormat: "json",
  options: ["path", "limit"],
  summary: "Admit a vault region as memory and read its frontmatter/conformance health.",
  domainSchema: Object.freeze({ type: "string", description: "a vault region path (empty = root)" }),
  codomainSchema: Object.freeze({ $ref: "knowing/memory/health" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue => {
    const { root, region, limit } = memoryRegion(input, args);
    return jsonResource(inspectMemoryHealth(admitMemory(root, gatherResources(root, region, limit))), "memory health");
  },
});

function admitDocumentSpec(input: JsonValue, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object (e.g. { path, title, tags, body })`);
  }
  return input as JsonRecord;
}

export const createDocumentAction: Action = action({
  verb: "create-document",
  inputFormat: "json",
  outputFormat: "json",
  options: ["path", "write"],
  summary: "Prepare a vault frontmatter document; place it only with --write.",
  domainSchema: Object.freeze({ type: "object", description: "a document spec { path, title?, tags?, body?, frontMatter? }" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/mutating/prepared-document" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue =>
    jsonResource(createDocument(vaultRoot(args), admitDocumentSpec(input, "create-document"), args["write"] === "true" || args["write"] === ""), "prepared document"),
});

export const updateFrontmatterAction: Action = action({
  verb: "update-frontmatter",
  inputFormat: "json",
  outputFormat: "json",
  options: ["path", "write"],
  summary: "Merge a frontmatter patch into a vault document; apply only with --write.",
  domainSchema: Object.freeze({ type: "object", description: "a frontmatter patch spec { path, title?, tags?, frontMatter? }" }),
  codomainSchema: Object.freeze({ $ref: "organizing/knowledge-vault/mutating/prepared-document" }),
  run: (input: JsonValue, args: JsonRecord): JsonValue =>
    jsonResource(updateFrontmatter(vaultRoot(args), admitDocumentSpec(input, "update-frontmatter"), args["write"] === "true" || args["write"] === ""), "prepared document"),
});

export const actions: readonly Action[] = Object.freeze([
  researchAction,
  knowAction,
  introduceAction,
  studyAction,
  explainAction,
  teachAction,
  learnAction,
  tutorAction,
  browseAction,
  locateAction,
  readAction,
  listAction,
  settleMemoryAction,
  observeAction,
  conceptMapAction,
  inspectTopicAction,
  measureGapAction,
  inspectHealthAction,
  createDocumentAction,
  updateFrontmatterAction,
]);
