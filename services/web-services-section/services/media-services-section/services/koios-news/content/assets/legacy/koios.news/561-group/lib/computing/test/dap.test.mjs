import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluate, step, tm } from "@emsenn/relating";
import {
  DAP_JSONRPC_VERSION,
  DAP_METHODS,
  projectDap,
} from "../dist/dap.mjs";

test("computing DAP next exposes exactly the evaluator's one-step reducts", () => {
  const term = tm.app(tm.lam(tm.var(0)), tm.charge("potential"));
  const dap = projectDap({ sessionId: "dap-step", term });
  const expected = step(term);

  const result = dap.next();

  assert.deepEqual(result.reducts, expected);
  assert.equal(result.reason, "step");
  assert.deepEqual(result.session.term, expected[0]);
});

test("computing DAP continue reaches the evaluator normal form", () => {
  const term = tm.cond(
    tm.leK(tm.charge("absurd"), tm.charge("stable")),
    tm.negate(tm.charge("active")),
    tm.charge("absurd"),
  );
  const dap = projectDap({ sessionId: "dap-continue", term });
  const expected = evaluate(term);

  const result = dap.continue();

  assert.deepEqual(result.normalForm, expected);
  assert.deepEqual(result.session.term, expected);
  assert.equal(result.session.normal, true);
});

test("computing DAP stack and variables read the real focused evaluation context", () => {
  const redex = tm.app(tm.lam(tm.var(0)), tm.charge("potential"));
  const term = tm.lam(tm.pair(redex, tm.var(0)));
  const dap = projectDap({ sessionId: "dap-context", term });

  const stopped = dap.stepIn();
  assert.deepEqual(stopped.focusPath, [1, 1]);
  assert.deepEqual(stopped.reducts, step(redex));

  const stack = dap.stackTrace();
  assert.equal(stack.totalFrames, 3);
  assert.deepEqual(stack.stackFrames.map((frame) => frame.path), [[1, 1], [1], []]);
  assert.deepEqual(stack.stackFrames[0].term, redex);
  assert.deepEqual(stack.stackFrames[1].term, term[1]);

  const variables = dap.variables({ variablesReference: stack.stackFrames[0].id }).variables;
  assert.equal(variables.find((entry) => entry.name === "path")?.value, "/1/1");
  assert.equal(variables.find((entry) => entry.name === "oneStepReducts")?.value, String(step(redex).length));
  assert.ok(variables.some((entry) => entry.name === "$0" && entry.type === "binder"));
  assert.deepEqual(
    variables.filter((entry) => entry.name.startsWith("redex.")).map((entry) => JSON.parse(entry.value)),
    step(redex),
  );

  const out = dap.stepOut();
  assert.deepEqual(out.focusPath, [1]);
  assert.deepEqual(out.currentTerm, term[1]);
});

test("computing DAP handles dependency-free JSON-RPC requests and breakpoint stages", () => {
  const term = tm.negate(tm.charge("potential"));
  const dap = projectDap({ sessionId: "dap-jsonrpc", term });

  const breakpoints = dap.handle({
    jsonrpc: DAP_JSONRPC_VERSION,
    id: "bp",
    method: DAP_METHODS.setBreakpoints,
    params: { breakpoints: [{ line: 1 }] },
  });
  assert.equal(breakpoints.jsonrpc, DAP_JSONRPC_VERSION);
  assert.equal(breakpoints.result.breakpoints[0].message, "RMN settling stage 1");

  const next = dap.handle({
    jsonrpc: DAP_JSONRPC_VERSION,
    id: "next",
    method: DAP_METHODS.next,
    params: {},
  });
  assert.equal(next.id, "next");
  assert.equal(next.result.reason, "breakpoint");
  assert.deepEqual(next.result.reducts, step(term));
});
