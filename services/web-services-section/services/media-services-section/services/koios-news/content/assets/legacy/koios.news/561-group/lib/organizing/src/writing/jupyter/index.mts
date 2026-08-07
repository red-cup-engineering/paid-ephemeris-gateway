/**
 * writing/jupyter — organizing's IN-face standards codec: the Jupyter kernel
 * messaging protocol and the NOTEBOOK projected AS a witness ledger. The scale-2,
 * shared-compute (`computing`) half of the interior face: a stateful kernel an agent
 * drives, streaming outputs onto an append-only record.
 *
 * The thesis (protocols-as-faculty-projections.md): Jupyter is the wire-projection of
 * organizing's shared-compute math. The kernel = the OFFICE OF EXECUTION; a session =
 * active work; the NOTEBOOK = the witness ledger — cells are the append-only LOG,
 * kernel state is state, outputs are RECORDS, and the rendered `.ipynb` is content.
 * iopub broadcast (status/stream/execute_result) is the office's `broadcast` of what
 * it witnessed while executing.
 *
 * No second ontology (the gate): the messaging carriers are VIEWS of `jupyter.mts`'s
 * existing notebook carriers. An `execute_request` carries the SAME `source` a code
 * cell holds; an iopub `execute_result`/`stream` IS a `JupyterOutput` (jupyter.mts'
 * `JupyterOutputSchema`) wrapped in a message header; an `execute_reply` reports the
 * `execution_count` a code cell records and carries the outputs it broadcast. The
 * notebook this codec builds is `jupyter.mts`'s `JupyterNotebook` verbatim — the cells
 * ARE the log, so the log→records projection is a READING of the notebook, not a copy.
 *
 * The load-bearing brick (mirrors animating's RWIL `ledger.mts`): executing a sequence
 * of cells produces a notebook whose LOG (its code cells, in order) projects to RECORDS
 * (one record per cell: its execution_count, source, and the outputs it broadcast), and
 * that projection ROUND-TRIPS — `recordsToCells ∘ cellsToRecords = id` on the code-cell
 * log. An `execute_reply` carries exactly the outputs its cell's broadcast emitted.
 *
 * Layering: organizing → relating; reuses `../../jupyter.mjs` (organizing's own seed)
 * and only relating's root carrier kernel. Bare descent-path `$id`. See
 * dev/docs/notes/2026-06-25-jupyter-as-computing-in-face.md.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";
import {
  JupyterOutputSchema,
  JupyterSourceSchema,
  type JupyterOutput,
  type JupyterNotebook,
  type JupyterCell,
  type JupyterJsonRecord,
  jupyterNotebookCarrier,
  organizingNotebook,
} from "../../jupyter.mjs";

// ── kernel messaging carriers — VIEWS of the existing notebook carriers ───────────────

/**
 * An `execute_request` — the client driving the office to execute one cell. `code` is
 * the SAME `source` a code cell holds (reused via `JupyterSourceSchema`); `silent`
 * suppresses the iopub broadcast (the office executes but witnesses nothing publicly).
 * No second ontology: this is a code cell's source, addressed to the kernel.
 */
const executeRequestShape = {
  $id: "organizing/writing/jupyter/execute_request",
  title: "JupyterExecuteRequest",
  description:
    "A Jupyter execute_request: the client driving the office of execution to run one cell. `code` is the same source a code cell holds — a view of the notebook carrier, not a second model. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["msgType", "code"],
  properties: {
  msgType: { const: "execute_request" },
  code: JupyterSourceSchema,
  silent: { type: "boolean" },
  },
} as const;

export type JupyterExecuteRequest = FromSchema<typeof executeRequestShape>;
export const executeRequestCarrier = carrierFrom(executeRequestShape);

/**
 * An iopub message — what the office BROADCASTS while executing. `status` reports the
 * kernel's execution state (busy/idle — the office occupied/free); `stream`,
 * `execute_result`, and `display_data` carry a `JupyterOutput` verbatim (the witness
 * record the office produced). No second ontology: the `output` field IS jupyter.mts'
 * `JupyterOutput`.
 */
const iopubMessageShape = {
  $id: "organizing/writing/jupyter/iopub",
  title: "JupyterIopubMessage",
  description:
    "A Jupyter iopub broadcast from the office of execution: a status (busy/idle) or an output (stream/execute_result/display_data). The output is a JupyterOutput verbatim — the witness record. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["msgType"],
  properties: {
    msgType: { enum: ["status", "stream", "execute_result", "display_data"] },
    executionState: { enum: ["busy", "idle"] },
    output: JupyterOutputSchema,
  },
} as const;

export type JupyterIopubMessage = FromSchema<typeof iopubMessageShape>;
export const iopubMessageCarrier = carrierFrom(iopubMessageShape);

/**
 * An `execute_reply` — the office's settlement of one request. `status` is ok/error/
 * abort (the FOUR-shaped outcome of the work); `executionCount` is the office's
 * monotone counter (the cell's `execution_count`); `outputs` are the records the
 * iopub broadcast emitted, carried back so the reply is self-contained. No second
 * ontology: `outputs` are `JupyterOutput`s and `executionCount` is the cell field.
 */
const executeReplyShape = {
  $id: "organizing/writing/jupyter/execute_reply",
  title: "JupyterExecuteReply",
  description:
    "A Jupyter execute_reply: the office settling one execute_request with an outcome (ok/error/abort), the monotone execution_count, and the outputs its iopub broadcast emitted. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["msgType", "status", "executionCount", "outputs"],
  properties: {
    msgType: { const: "execute_reply" },
    status: { enum: ["ok", "error", "abort"] },
    executionCount: { type: "integer", minimum: 1 },
    outputs: { type: "array", items: JupyterOutputSchema },
  },
} as const;

export type JupyterExecuteReply = FromSchema<typeof executeReplyShape>;
export const executeReplyCarrier = carrierFrom(executeReplyShape);

// ── the office of execution: drive a sequence of requests onto one notebook ───────────

/**
 * The kernel handler an office runs: given one request's code and its execution count,
 * produce the outputs that request witnesses. This is the office's *work* — the only
 * thing a downstream binding supplies; everything else (counting, broadcast, the
 * ledger) is the codec. A pure default echoes the code as an `execute_result`, which is
 * enough to prove the messaging/ledger projection round-trips.
 */
export type KernelHandler = (code: string, executionCount: number) => readonly JupyterOutput[];

/** The default handler — a pure kernel that echoes its input as one execute_result
 *  output. Real kernels (a JSNode ICK kernel binding, an agent session)
 *  replace this; the codec law holds for any handler. */
export const echoKernel: KernelHandler = (code, executionCount) =>
  Object.freeze([
    Object.freeze({
      output_type: "execute_result" as const,
      data: Object.freeze({ "text/plain": code }),
      metadata: Object.freeze({}),
      execution_count: executionCount,
    }),
  ]);

/** Normalize a `source` (string | string[]) to one string — the office sees one code. */
function codeOf(source: string | readonly string[]): string {
  return typeof source === "string" ? source : source.join("");
}

/**
 * execute — the office of execution running ONE request: it occupies (busy), runs the
 * handler to get the witness outputs, broadcasts them on iopub (status busy → outputs
 * → status idle), and settles an execute_reply. Returns the reply AND the iopub
 * broadcast, so a caller can both record the settlement and observe the stream. This
 * is one settle of the work; `runCells` folds it over a sequence.
 */
export function execute(
  request: JupyterExecuteRequest,
  executionCount: number,
  handler: KernelHandler = echoKernel,
): Readonly<{ reply: JupyterExecuteReply; iopub: readonly JupyterIopubMessage[] }> {
  const code = codeOf(request.code);
  const outputs = handler(code, executionCount);
  const silent = request.silent === true;
  const hasError = outputs.some((o) => o.output_type === "error");
  const reply = executeReplyCarrier.assert(
    {
      msgType: "execute_reply" as const,
      status: hasError ? ("error" as const) : ("ok" as const),
      executionCount,
      outputs: [...outputs],
    },
    "execute",
  );
  const broadcast: JupyterIopubMessage[] = silent
    ? []
    : [
        iopubMessageCarrier.assert({ msgType: "status" as const, executionState: "busy" as const }, "execute"),
        ...outputs.map((output) =>
          iopubMessageCarrier.assert(
            { msgType: iopubMsgTypeOf(output), output },
            "execute",
          ),
        ),
        iopubMessageCarrier.assert({ msgType: "status" as const, executionState: "idle" as const }, "execute"),
      ];
  return Object.freeze({ reply, iopub: Object.freeze(broadcast) });
}

/** The iopub msg_type an output broadcasts under — its output_type, with stream and
 *  display_data/execute_result mapping to their own message types. */
function iopubMsgTypeOf(output: JupyterOutput): JupyterIopubMessage["msgType"] {
  if (output.output_type === "stream") return "stream";
  if (output.output_type === "display_data") return "display_data";
  return "execute_result";
}

/**
 * runCells — drive a sequence of code sources through the office, accumulating one
 * notebook whose code cells ARE the append-only log of the session. Each source is an
 * execute_request; the office runs it with a monotone execution_count (the office's
 * counter); the cell appended carries the source, its count, and the outputs the
 * broadcast emitted. This is the session's witness ledger built one settle at a time.
 */
export function runCells(
  sources: readonly (string | readonly string[])[],
  options: Readonly<{ id: string; title: string; summary?: string; handler?: KernelHandler; metadata?: JupyterJsonRecord }>,
): JupyterNotebook {
  const handler = options.handler ?? echoKernel;
  const cells = sources.map((source, index) => {
    const executionCount = index + 1;
    const request = executeRequestCarrier.assert({ msgType: "execute_request" as const, code: source }, "runCells");
    const { reply } = execute(request, executionCount, handler);
    return {
      kind: "code" as const,
      source,
      executionCount: reply.executionCount,
      outputs: reply.outputs,
    };
  });
  return organizingNotebook({
    id: options.id,
    title: options.title,
    ...(options.summary === undefined ? {} : { summary: options.summary }),
    ...(options.metadata === undefined ? {} : { metadata: options.metadata }),
    cells,
  });
}

// ── the witness ledger: notebook ⇄ records (the load-bearing projection) ──────────────

/**
 * One LEDGER RECORD of the session — what one code cell of the notebook witnessed: the
 * office's monotone count, the code it ran, and the outputs it broadcast. This is the
 * RECORD tier of the witness ledger; the code cell is its LOG row. (Markdown/raw cells
 * are not execution records — they are content, not log, so the projection skips them.)
 */
export interface NotebookRecord {
  /** the office's monotone counter for this execution (the cell's execution_count). */
  readonly executionCount: number;
  /** the code the office ran (the cell's source, normalized to one string). */
  readonly code: string;
  /** the outputs the office's iopub broadcast emitted (the cell's outputs). */
  readonly outputs: readonly JupyterOutput[];
}

/**
 * F — project a notebook's LOG (its code cells, in order) to the RECORD tier. This is
 * the witness-ledger reading of the notebook: each executed code cell becomes one
 * record of what the office witnessed. Non-code cells are content, not log, and are
 * dropped. (Mirrors animating's `activityCell`: a reading of the wire form into the
 * source-symbol tier — here cells→records.)
 */
export function cellsToRecords(notebook: JupyterNotebook): readonly NotebookRecord[] {
  const records: NotebookRecord[] = [];
  for (const cell of notebook.cells) {
    if (cell.cell_type !== "code") continue;
    const code = codeOf(cell.source as string | readonly string[]);
    const outputs = (cell.outputs ?? []) as readonly JupyterOutput[];
    const executionCount = typeof cell.execution_count === "number" ? cell.execution_count : 0;
    records.push(Object.freeze({ executionCount, code, outputs: Object.freeze([...outputs]) }));
  }
  return Object.freeze(records);
}

/**
 * G — re-emit a record tier as the LOG (code cells) it projects from. `G ∘ F = id` on
 * a notebook's code-cell log: the round-trip is the witness-ledger isomorphism (the
 * notebook IS its records, viewed as a literate document). Builds a code cell per
 * record carrying its source, count, and outputs. (Mirrors animating's
 * `activityFromCell`: the inverse functor back to the wire form.)
 */
export function recordsToCells(records: readonly NotebookRecord[]): readonly JupyterCell[] {
  return Object.freeze(
    records.map((record) =>
      Object.freeze({
        cell_type: "code" as const,
        metadata: Object.freeze({}),
        source: record.code,
        execution_count: record.executionCount,
        outputs: [...record.outputs],
      }),
    ),
  );
}

/**
 * notebookFromRecords — rebuild a whole notebook from a record tier (the inverse of
 * `cellsToRecords` at the document level). Reuses `jupyterNotebookCarrier` so the
 * result is the SAME notebook carrier the session produced; the cells are exactly
 * `recordsToCells(records)`. This makes the ledger ⇄ notebook round-trip total at the
 * code-cell log: `cellsToRecords(notebookFromRecords(r)) ≡ r`.
 */
export function notebookFromRecords(
  records: readonly NotebookRecord[],
  options: Readonly<{ id: string; title: string; summary?: string; metadata?: JupyterJsonRecord }>,
): JupyterNotebook {
  const cells = recordsToCells(records);
  return jupyterNotebookCarrier.assert(
    {
      nbformat: 4 as const,
      nbformat_minor: 5,
      metadata: {
        ...(options.metadata ?? {}),
        organizing: {
          id: options.id,
          title: options.title,
          ...(options.summary === undefined ? {} : { summary: options.summary }),
        },
      },
      cells,
    },
    "notebookFromRecords",
  );
}

/** A stream output is a witness record too — convenience for handlers that emit text
 *  to stdout/stderr rather than a rich execute_result. Returns jupyter.mts' verbatim
 *  `JupyterOutput` (no second ontology). */
export function streamOutput(name: "stdout" | "stderr", text: string): JupyterOutput {
  return Object.freeze({ output_type: "stream", name, text }) as JupyterOutput;
}

/** A rich execute_result output (a display_data/execute_result record). */
export function resultOutput(data: JupyterJsonRecord, executionCount: number): JupyterOutput {
  return Object.freeze({
    output_type: "execute_result",
    data,
    metadata: Object.freeze({}),
    execution_count: executionCount,
  }) as JupyterOutput;
}
