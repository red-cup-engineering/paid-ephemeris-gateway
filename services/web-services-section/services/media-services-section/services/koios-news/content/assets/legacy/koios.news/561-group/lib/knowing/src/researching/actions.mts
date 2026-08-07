/**
 * Action projections for the researching spine.
 *
 * The executable morphisms live in the nested researching modules. These actions
 * only admit a memory carrier at the wire and project the real codomain carriers
 * to bounded JSON-safe forms.
 */
import { action, jsonResource, type Action, type JsonRecord, type JsonValue } from "@emsenn/relating";
import type { MemoryCarrier } from "../memory/index.mjs";
import { projectCurriculum, projectLearning, projectResearch } from "../projecting/index.mjs";
import { introducing, studying, learning, teaching } from "./introducing/index.mjs";
import { certified, research, type SettledResearch } from "./researching.mjs";

const memoryDomainSchema = Object.freeze({
  type: "object",
  required: ["kind", "root", "documents"],
  properties: {
    kind: { const: "knowing.memory" },
    root: { type: "string" },
    documents: { type: "array" },
    utterances: { type: "array" },
  },
  additionalProperties: true,
});

function admitMemory(input: JsonValue, verb: string): MemoryCarrier {
  const value = jsonResource(input, `${verb} memory`);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${verb}: expected a knowing.memory carrier`);
  }
  const record = value as JsonRecord;
  if (record["kind"] !== "knowing.memory") throw new TypeError(`${verb}: expected kind "knowing.memory"`);
  if (typeof record["root"] !== "string") throw new TypeError(`${verb}: memory.root must be a string`);
  if (!Array.isArray(record["documents"])) throw new TypeError(`${verb}: memory.documents must be an array`);
  return record as unknown as MemoryCarrier;
}

function settledResearch(input: JsonValue, verb: string): SettledResearch {
  const settled = research(admitMemory(input, verb));
  if (settled === null) throw new TypeError(`${verb}: no memory documents to research`);
  return settled;
}

export const researchAction: Action = action({
  verb: "research",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory into its settled topology and certification judgment.",
  description: "Domain: knowing.memory. Codomain: the projected SettledResearch carrier: closure regime, on-shell judgment, certification, and stage count.",
  domainSchema: memoryDomainSchema,
  codomainSchema: Object.freeze({ $ref: "knowing/researching/research" }),
  run: (input: unknown): JsonValue => {
    const settled = settledResearch(input as JsonValue, "research");
    return jsonResource(projectResearch(settled, certified(settled)), "research projection");
  },
});

export const learningAction: Action = action({
  verb: "learning",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory and project the learning lessons its trace yields.",
  description: "Domain: knowing.memory. Codomain: the projected learning carrier induced by research -> introducing -> studying -> learning.",
  domainSchema: memoryDomainSchema,
  codomainSchema: Object.freeze({ $ref: "knowing/researching/learning" }),
  run: (input: unknown): JsonValue => {
    const settled = settledResearch(input as JsonValue, "learning");
    return jsonResource(projectLearning(learning(studying(introducing(settled)))), "learning projection");
  },
});

export const curriculumAction: Action = action({
  verb: "curriculum",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Research memory and project its curriculum.",
  description: "Domain: knowing.memory. Codomain: the projected curriculum carrier induced by research -> introducing -> studying -> learning -> teaching.",
  domainSchema: memoryDomainSchema,
  codomainSchema: Object.freeze({ $ref: "knowing/researching/curriculum" }),
  run: (input: unknown): JsonValue => {
    const settled = settledResearch(input as JsonValue, "curriculum");
    return jsonResource(projectCurriculum(teaching(learning(studying(introducing(settled))))), "curriculum projection");
  },
});

export const researchActions: readonly Action[] = Object.freeze([
  researchAction,
  learningAction,
  curriculumAction,
]);
