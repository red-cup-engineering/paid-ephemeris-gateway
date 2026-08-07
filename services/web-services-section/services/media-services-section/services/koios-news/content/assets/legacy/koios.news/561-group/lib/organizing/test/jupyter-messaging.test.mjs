/**
 * writing/jupyter — organizing's IN-face codec: kernel messaging + notebook-as-witness-
 * ledger. These tests pin the brick:
 *   1. an execute_request is a VIEW of a code cell's source (no second ontology);
 *   2. executing a request settles an execute_reply AND broadcasts iopub outputs;
 *   3. running a sequence of cells produces a notebook whose LOG→RECORDS projection
 *      round-trips (cellsToRecords ∘ recordsToCells = id) — the witness ledger;
 *   4. an execute_reply carries exactly the outputs its cell's iopub broadcast emitted.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  executeRequestCarrier,
  iopubMessageCarrier,
  executeReplyCarrier,
  echoKernel,
  execute,
  runCells,
  cellsToRecords,
  recordsToCells,
  notebookFromRecords,
  streamOutput,
} from "../dist/index.mjs";

test("an execute_request is a VIEW of a code cell's source (no second ontology)", () => {
  const request = executeRequestCarrier.assert({ msgType: "execute_request", code: "organize({})" });
  assert.equal(executeRequestCarrier.validate(request), true);
  assert.equal(executeRequestCarrier.id, "organizing/writing/jupyter/execute_request");
  assert.equal(request.code, "organize({})"); // the same `source` a code cell holds
});

test("executing a request settles an execute_reply AND broadcasts iopub (busy → output → idle)", () => {
  const request = executeRequestCarrier.assert({ msgType: "execute_request", code: "1 + 1" });
  const { reply, iopub } = execute(request, 1, echoKernel);

  // the reply settles the work
  assert.equal(executeReplyCarrier.validate(reply), true);
  assert.equal(reply.msgType, "execute_reply");
  assert.equal(reply.status, "ok"); // echo produced no error output
  assert.equal(reply.executionCount, 1); // the office's monotone counter
  assert.equal(reply.outputs.length, 1);
  assert.equal(reply.outputs[0].output_type, "execute_result");
  assert.equal(reply.outputs[0].data["text/plain"], "1 + 1");

  // the iopub broadcast: status busy, the output, status idle
  assert.equal(iopub.length, 3);
  assert.equal(iopubMessageCarrier.validate(iopub[0]), true);
  assert.equal(iopub[0].msgType, "status");
  assert.equal(iopub[0].executionState, "busy");
  assert.equal(iopub[1].msgType, "execute_result");
  assert.deepEqual(iopub[1].output, reply.outputs[0]); // the broadcast output IS the reply output
  assert.equal(iopub[2].msgType, "status");
  assert.equal(iopub[2].executionState, "idle");
});

test("a silent request executes but witnesses nothing publicly (empty iopub)", () => {
  const request = executeRequestCarrier.assert({ msgType: "execute_request", code: "secret()", silent: true });
  const { reply, iopub } = execute(request, 1, echoKernel);
  assert.equal(reply.executionCount, 1); // still settled
  assert.equal(iopub.length, 0); // but no broadcast
});

test("an error handler settles the reply status as error (the FOUR-shaped outcome)", () => {
  const failing = () => [
    { output_type: "error", ename: "RuntimeError", evalue: "boom", traceback: ["boom"] },
  ];
  const request = executeRequestCarrier.assert({ msgType: "execute_request", code: "throw" });
  const { reply } = execute(request, 1, failing);
  assert.equal(reply.status, "error");
  assert.equal(reply.outputs[0].output_type, "error");
});

test("running a sequence of cells produces a notebook whose code cells ARE the append-only log", () => {
  const notebook = runCells(["a = 1", "b = a + 1", "print(b)"], {
    id: "session:demo",
    title: "Demo Session",
    summary: "A small compute session.",
  });
  assert.equal(notebook.nbformat, 4);
  // the notebook's code cells are the log, in execution order with monotone counts
  const codeCells = notebook.cells.filter((c) => c.cell_type === "code");
  assert.equal(codeCells.length, 3);
  assert.deepEqual(codeCells.map((c) => c.execution_count), [1, 2, 3]);
  assert.equal(codeCells[1].source, "b = a + 1");
  assert.equal(codeCells[1].outputs[0].data["text/plain"], "b = a + 1");
});

test("the witness-ledger projection round-trips: cellsToRecords ∘ recordsToCells = id on the log", () => {
  const notebook = runCells(["x = 1", "y = x * 2"], { id: "session:rt", title: "Round-trip" });

  // F: notebook LOG → RECORD tier (one record per executed code cell)
  const records = cellsToRecords(notebook);
  assert.equal(records.length, 2); // the markdown title cell is content, not log — dropped
  assert.deepEqual(records.map((r) => r.executionCount), [1, 2]);
  assert.equal(records[1].code, "y = x * 2");

  // G ∘ F = id on the code-cell log: re-emitting the records yields the same cells
  const reCells = recordsToCells(records);
  const logCells = notebook.cells.filter((c) => c.cell_type === "code");
  assert.equal(reCells.length, logCells.length);
  for (let i = 0; i < reCells.length; i += 1) {
    assert.equal(reCells[i].cell_type, "code");
    assert.equal(reCells[i].execution_count, logCells[i].execution_count);
    assert.equal(reCells[i].source, logCells[i].source);
    assert.deepEqual(reCells[i].outputs, logCells[i].outputs);
  }

  // and F ∘ G = id at the record tier: rebuild the whole notebook, re-project, recover records
  const rebuilt = notebookFromRecords(records, { id: "session:rt", title: "Round-trip" });
  assert.deepEqual(cellsToRecords(rebuilt), records);
});

test("a stream output is carried as a witness record through the same reply/ledger path", () => {
  const streaming = (code) => [streamOutput("stdout", `ran: ${code}\n`)];
  const request = executeRequestCarrier.assert({ msgType: "execute_request", code: "hello" });
  const { reply, iopub } = execute(request, 1, streaming);
  assert.equal(reply.outputs[0].output_type, "stream");
  assert.equal(reply.outputs[0].text, "ran: hello\n");
  // the stream is broadcast under the `stream` iopub msg_type
  const streamMsg = iopub.find((m) => m.msgType === "stream");
  assert.ok(streamMsg);
  assert.equal(streamMsg.output.name, "stdout");
});
