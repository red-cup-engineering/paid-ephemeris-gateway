/**
 * host-neutral-carriers - workspace governance carriers.
 *
 * These carriers organize package-manager and resolver facts without importing a
 * host reader. npm, pnpm, Git, Rust, or Guile emit the same bounded shapes.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";

const idSchema = { type: "string", minLength: 1 } as const;
const stringArraySchema = { type: "array", items: idSchema } as const;

const workspaceMemberSchema = {
  type: "object",
  required: ["name", "manifest"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    manifest: idSchema,
    locator: { type: "string" },
    packageManager: { enum: ["npm", "pnpm", "git", "mixed", "unknown"] },
  },
} as const;

export const WorkspaceCarrierSchema = {
  $id: "organizing/workspace-carrier",
  title: "WorkspaceCarrier",
  description: "A host-neutral workspace as a governed set of manifest carriers.",
  type: "object",
  required: ["kind", "id", "members"],
  additionalProperties: false,
  properties: {
    kind: { const: "organizing.workspace-carrier" },
    id: idSchema,
    name: { type: "string" },
    packageManager: { enum: ["npm", "pnpm", "git", "mixed", "unknown"] },
    members: { type: "array", items: workspaceMemberSchema },
    mediaType: { type: "string" },
  },
} as const;

export type WorkspaceCarrier = FromSchema<typeof WorkspaceCarrierSchema>;
export const workspaceCarrier = carrierFrom(WorkspaceCarrierSchema);

const dependencyNodeSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    manifest: { type: "string" },
    workspaceMember: { type: "boolean" },
  },
} as const;

const dependencyEdgeSchema = {
  type: "object",
  required: ["from", "to", "relationship"],
  additionalProperties: false,
  properties: {
    from: idSchema,
    to: idSchema,
    relationship: { enum: ["runtime", "development", "peer", "optional", "bundled", "workspace", "build"] },
    range: { type: "string" },
    resolvedBy: { type: "string" },
  },
} as const;

export const DependencyGraphSchema = {
  $id: "organizing/dependency-graph",
  title: "DependencyGraph",
  description: "A governed dependency graph over workspace and registry nodes.",
  type: "object",
  required: ["kind", "nodes", "edges"],
  additionalProperties: false,
  properties: {
    kind: { const: "organizing.dependency-graph" },
    nodes: { type: "array", items: dependencyNodeSchema },
    edges: { type: "array", items: dependencyEdgeSchema },
    cycles: { type: "array", items: stringArraySchema },
  },
} as const;

export type DependencyGraph = FromSchema<typeof DependencyGraphSchema>;
export const dependencyGraphCarrier = carrierFrom(DependencyGraphSchema);

const coverOpenSchema = {
  type: "object",
  required: ["id", "members"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    members: stringArraySchema,
    source: { type: "string" },
  },
} as const;

const nerveEdgeSchema = {
  type: "object",
  required: ["left", "right", "intersection"],
  additionalProperties: false,
  properties: {
    left: idSchema,
    right: idSchema,
    intersection: stringArraySchema,
  },
} as const;

export const CoverSchema = {
  $id: "organizing/cover",
  title: "Cover",
  description: "A finite cover and nerve summary for workspace coordination.",
  type: "object",
  required: ["kind", "universe", "opens", "nerveEdges", "h1", "coordinationFree"],
  additionalProperties: false,
  properties: {
    kind: { const: "organizing.cover" },
    universe: stringArraySchema,
    opens: { type: "array", items: coverOpenSchema },
    nerveEdges: { type: "array", items: nerveEdgeSchema },
    h1: { type: "integer", minimum: 0 },
    coordinationFree: { type: "boolean" },
  },
} as const;

export type Cover = FromSchema<typeof CoverSchema>;
export const coverCarrier = carrierFrom(CoverSchema);

const resolutionDecisionSchema = {
  type: "object",
  required: ["requester", "dependency", "selected", "reason"],
  additionalProperties: false,
  properties: {
    requester: idSchema,
    dependency: idSchema,
    selected: idSchema,
    range: { type: "string" },
    reason: { enum: ["workspace", "lockfile", "registry", "override", "git", "unresolved"] },
  },
} as const;

const resolutionConflictSchema = {
  type: "object",
  required: ["dependency", "requesters", "candidates"],
  additionalProperties: false,
  properties: {
    dependency: idSchema,
    requesters: stringArraySchema,
    candidates: stringArraySchema,
  },
} as const;

export const ResolutionSchema = {
  $id: "organizing/resolution",
  title: "Resolution",
  description: "A resolver's governed decisions, unresolved requests, and conflict cover.",
  type: "object",
  required: ["kind", "decisions", "unresolved", "conflicts", "h1"],
  additionalProperties: false,
  properties: {
    kind: { const: "organizing.resolution" },
    decisions: { type: "array", items: resolutionDecisionSchema },
    unresolved: stringArraySchema,
    conflicts: { type: "array", items: resolutionConflictSchema },
    h1: { type: "integer", minimum: 0 },
    cover: CoverSchema,
  },
} as const;

export type Resolution = FromSchema<typeof ResolutionSchema>;
export const resolutionCarrier = carrierFrom(ResolutionSchema);
