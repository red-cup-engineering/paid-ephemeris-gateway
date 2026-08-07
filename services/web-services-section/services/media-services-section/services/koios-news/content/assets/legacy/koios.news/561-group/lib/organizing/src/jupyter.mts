/**
 * jupyter - organizing-owned standards boundary for notebook/runtime projection.
 *
 * Relating owns generic HTTP, OpenAPI, MCP, and codec law. This module owns the
 * Jupyter-shaped carriers that only make sense as organizing runtime projections:
 * notebooks as work records, kernels as offices of execution, sessions as active
 * work, and contents as organized workspace resources.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";

export type JupyterJson =
  | null
  | boolean
  | number
  | string
  | readonly JupyterJson[]
  | { readonly [key: string]: JupyterJson };

export type JupyterJsonRecord = Readonly<Record<string, JupyterJson>>;

export const JupyterJsonSchema = {} as const;
export const JupyterJsonRecordSchema = { type: "object", additionalProperties: true } as const;
export const JupyterSourceSchema = { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] } as const;

export const JupyterStreamOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "name", "text"],
  properties: {
    output_type: { const: "stream" },
    name: { enum: ["stdout", "stderr"] },
    text: JupyterSourceSchema,
  },
} as const;

export const JupyterDisplayOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "data", "metadata"],
  properties: {
    output_type: { enum: ["display_data", "execute_result"] },
    data: JupyterJsonRecordSchema,
    metadata: JupyterJsonRecordSchema,
    execution_count: { type: ["number", "null"] },
  },
} as const;

export const JupyterErrorOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "ename", "evalue", "traceback"],
  properties: {
    output_type: { const: "error" },
    ename: { type: "string" },
    evalue: { type: "string" },
    traceback: { type: "array", items: { type: "string" } },
  },
} as const;

export const JupyterOutputSchema = { anyOf: [JupyterStreamOutputSchema, JupyterDisplayOutputSchema, JupyterErrorOutputSchema] } as const;

export const JupyterMarkdownCellSchema = {
  type: "object",
  additionalProperties: true,
  required: ["cell_type", "metadata", "source"],
  properties: {
    cell_type: { enum: ["markdown", "raw"] },
    id: { type: "string", minLength: 1 },
    metadata: JupyterJsonRecordSchema,
    source: JupyterSourceSchema,
  },
} as const;

export const JupyterCodeCellSchema = {
  type: "object",
  additionalProperties: true,
  required: ["cell_type", "metadata", "source", "execution_count", "outputs"],
  properties: {
    cell_type: { const: "code" },
    id: { type: "string", minLength: 1 },
    metadata: JupyterJsonRecordSchema,
    source: JupyterSourceSchema,
    execution_count: { type: ["number", "null"] },
    outputs: { type: "array", items: JupyterOutputSchema },
  },
} as const;

export const JupyterCellSchema = { anyOf: [JupyterMarkdownCellSchema, JupyterCodeCellSchema] } as const;

export const JupyterNotebookSchema = {
  $id: "organizing/jupyter/notebook",
  title: "Jupyter notebook",
  description: "An organizing-owned nbformat 4 notebook projection.",
  type: "object",
  additionalProperties: true,
  required: ["nbformat", "nbformat_minor", "metadata", "cells"],
  properties: {
    nbformat: { const: 4 },
    nbformat_minor: { type: "number", minimum: 0 },
    metadata: JupyterJsonRecordSchema,
    cells: { type: "array", items: JupyterCellSchema },
  },
} as const;

export const JupyterKernelSpecSchema = {
  $id: "organizing/jupyter/kernelspec",
  title: "Jupyter kernelspec",
  description: "A Jupyter kernelspec projected from an organizing execution office.",
  type: "object",
  additionalProperties: true,
  required: ["argv", "display_name", "language"],
  properties: {
    argv: { type: "array", minItems: 1, items: { type: "string" } },
    display_name: { type: "string", minLength: 1 },
    language: { type: "string", minLength: 1 },
    env: JupyterJsonRecordSchema,
    metadata: JupyterJsonRecordSchema,
  },
} as const;

export const JupyterKernelModelSchema = {
  $id: "organizing/jupyter/kernel",
  title: "Jupyter kernel model",
  description: "A Jupyter Server kernel model projected from organizing runtime state.",
  type: "object",
  additionalProperties: true,
  required: ["id", "name"],
  properties: {
    id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    last_activity: { type: "string" },
    execution_state: { enum: ["starting", "idle", "busy", "restarting", "dead", "unknown"] },
    connections: { type: "number", minimum: 0 },
  },
} as const;

export const JupyterSessionModelSchema = {
  $id: "organizing/jupyter/session",
  title: "Jupyter session model",
  description: "A Jupyter Server session model projected from organizing active work.",
  type: "object",
  additionalProperties: true,
  required: ["id", "path", "name", "type", "kernel"],
  properties: {
    id: { type: "string", minLength: 1 },
    path: { type: "string" },
    name: { type: "string" },
    type: { enum: ["notebook", "console", "file", "terminal"] },
    kernel: JupyterKernelModelSchema,
  },
} as const;

export const JupyterContentsModelSchema = {
  $id: "organizing/jupyter/contents",
  title: "Jupyter contents model",
  description: "A Jupyter Server contents model projected over an organized workspace.",
  type: "object",
  additionalProperties: true,
  required: ["name", "path", "type", "writable", "created", "last_modified", "mimetype", "content", "format"],
  properties: {
    name: { type: "string" },
    path: { type: "string" },
    type: { enum: ["file", "directory", "notebook"] },
    writable: { type: "boolean" },
    created: { type: "string" },
    last_modified: { type: "string" },
    mimetype: { type: ["string", "null"] },
    content: JupyterJsonSchema,
    format: { enum: ["json", "text", "base64", null] },
  },
} as const;

export const jupyterNotebookCarrier = carrierFrom(JupyterNotebookSchema);
export const jupyterKernelSpecCarrier = carrierFrom(JupyterKernelSpecSchema);
export const jupyterKernelModelCarrier = carrierFrom(JupyterKernelModelSchema);
export const jupyterSessionModelCarrier = carrierFrom(JupyterSessionModelSchema);
export const jupyterContentsModelCarrier = carrierFrom(JupyterContentsModelSchema);

export type JupyterCellType = "code" | "markdown" | "raw";
export type JupyterOutput = FromSchema<typeof JupyterOutputSchema>;
export type JupyterCell = FromSchema<typeof JupyterCellSchema>;
export type JupyterNotebook = FromSchema<typeof JupyterNotebookSchema>;
export type JupyterKernelSpec = FromSchema<typeof JupyterKernelSpecSchema>;
export type JupyterKernelModel = FromSchema<typeof JupyterKernelModelSchema>;
export type JupyterSessionModel = FromSchema<typeof JupyterSessionModelSchema>;
export type JupyterContentsModel = FromSchema<typeof JupyterContentsModelSchema>;

export interface OrganizingNotebookCell {
  readonly kind: JupyterCellType;
  readonly source: string | readonly string[];
  readonly metadata?: JupyterJsonRecord;
  readonly executionCount?: number | null;
  readonly outputs?: readonly JupyterOutput[];
}

export interface OrganizingNotebookInput {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly cells?: readonly OrganizingNotebookCell[];
  readonly metadata?: JupyterJsonRecord;
}

export interface OrganizingJupyterCodec<T> {
  readonly name: string;
  readonly mediaType: string;
  readonly decode: (text: string) => T;
  readonly encode: (value: T) => string;
}

export const ORGANIZING_JUPYTER_METADATA_KEY = "organizing";

export const organizingIpynbCodec: OrganizingJupyterCodec<JupyterNotebook> = Object.freeze({
  name: "organizing.ipynb",
  mediaType: "application/x-ipynb+json",
  decode: decodeIpynb,
  encode: encodeIpynb,
});

export function organizingNotebook(input: OrganizingNotebookInput): JupyterNotebook {
  const cells = input.cells === undefined || input.cells.length === 0
    ? defaultNotebookCells(input)
    : input.cells.map(jupyterCell);
  return jupyterNotebookCarrier.assert(Object.freeze({
    nbformat: 4 as const,
    nbformat_minor: 5,
    metadata: Object.freeze({
      ...(input.metadata ?? {}),
      [ORGANIZING_JUPYTER_METADATA_KEY]: Object.freeze({
        id: input.id,
        title: input.title,
        ...(input.summary === undefined ? {} : { summary: input.summary }),
      }),
    }),
    cells: Object.freeze(cells),
  }), "organizingNotebook");
}

export function encodeIpynb(notebook: JupyterNotebook): string {
  const admitted = jupyterNotebookCarrier.assert(notebook, "ipynb");
  return `${JSON.stringify(admitted, null, 2)}\n`;
}

export function decodeIpynb(text: string): JupyterNotebook {
  const parsed: unknown = JSON.parse(text);
  return jupyterNotebookCarrier.assert(parsed, "ipynb");
}

export function organizingKernelSpec(input: Readonly<{
  argv: readonly string[];
  displayName: string;
  language: string;
  env?: JupyterJsonRecord;
  metadata?: JupyterJsonRecord;
}>): JupyterKernelSpec {
  if (input.argv.length === 0) throw new TypeError("organizingKernelSpec: argv must contain at least one command");
  return jupyterKernelSpecCarrier.assert(Object.freeze({
    argv: Object.freeze([...input.argv]),
    display_name: input.displayName,
    language: input.language,
    ...(input.env === undefined ? {} : { env: input.env }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  }), "organizingKernelSpec");
}

export function organizingKernelModel(input: Readonly<{
  id: string;
  name: string;
  lastActivity?: string;
  executionState?: JupyterKernelModel["execution_state"];
  connections?: number;
}>): JupyterKernelModel {
  return jupyterKernelModelCarrier.assert(Object.freeze({
    id: input.id,
    name: input.name,
    ...(input.lastActivity === undefined ? {} : { last_activity: input.lastActivity }),
    ...(input.executionState === undefined ? {} : { execution_state: input.executionState }),
    ...(input.connections === undefined ? {} : { connections: input.connections }),
  }), "organizingKernelModel");
}

export function organizingSessionModel(input: Readonly<{
  id: string;
  path: string;
  name: string;
  type?: JupyterSessionModel["type"];
  kernel: JupyterKernelModel;
}>): JupyterSessionModel {
  return jupyterSessionModelCarrier.assert(Object.freeze({
    id: input.id,
    path: input.path,
    name: input.name,
    type: input.type ?? "notebook",
    kernel: input.kernel,
  }), "organizingSessionModel");
}

export function organizingContentsModel(input: Readonly<{
  name: string;
  path: string;
  type: JupyterContentsModel["type"];
  writable?: boolean;
  created: string;
  lastModified: string;
  mimetype?: string | null;
  content?: JupyterJson | string | null;
  format?: JupyterContentsModel["format"];
}>): JupyterContentsModel {
  return jupyterContentsModelCarrier.assert(Object.freeze({
    name: input.name,
    path: input.path,
    type: input.type,
    writable: input.writable ?? true,
    created: input.created,
    last_modified: input.lastModified,
    mimetype: input.mimetype ?? null,
    content: input.content ?? null,
    format: input.format ?? null,
  }), "organizingContentsModel");
}

function defaultNotebookCells(input: OrganizingNotebookInput): readonly JupyterCell[] {
  return Object.freeze([
    jupyterCell({
      kind: "markdown",
      source: [`# ${input.title}\n`, "\n", input.summary ?? "Organizing notebook projection."],
      metadata: Object.freeze({ [ORGANIZING_JUPYTER_METADATA_KEY]: "title" }),
    }),
  ]);
}

function jupyterCell(cell: OrganizingNotebookCell): JupyterCell {
  const metadata = cell.metadata ?? Object.freeze({});
  if (cell.kind === "code") {
    return Object.freeze({
      cell_type: "code" as const,
      metadata,
      source: sourceValue(cell.source),
      execution_count: cell.executionCount ?? null,
      outputs: [...(cell.outputs ?? [])],
    });
  }
  return Object.freeze({
    cell_type: cell.kind,
    metadata,
    source: sourceValue(cell.source),
  });
}

function sourceValue(source: string | readonly string[]): string | string[] {
  return typeof source === "string" ? source : [...source];
}
