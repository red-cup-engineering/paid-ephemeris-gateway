import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateDatalog, variable } from "../dist/index.mjs";

const x = variable("x");
const y = variable("y");
const z = variable("z");
const t = variable("t");

const rows = Object.freeze([
  Object.freeze({ e: "a", a: "edge", v: "b", t: "t1" }),
  Object.freeze({ e: "b", a: "edge", v: "c", t: "t2" }),
  Object.freeze({ e: "c", a: "edge", v: "d", t: "t3" }),
]);

const query = Object.freeze({
  kind: "knowing.datalog.query",
  rules: Object.freeze([
    Object.freeze({
      head: Object.freeze({ predicate: "edge", terms: Object.freeze([x, y]) }),
      body: Object.freeze([
        Object.freeze({ predicate: "eavt", terms: Object.freeze([x, "edge", y, t]) }),
      ]),
    }),
    Object.freeze({
      head: Object.freeze({ predicate: "reachable", terms: Object.freeze([x, y]) }),
      body: Object.freeze([
        Object.freeze({ predicate: "edge", terms: Object.freeze([x, y]) }),
      ]),
    }),
    Object.freeze({
      head: Object.freeze({ predicate: "reachable", terms: Object.freeze([x, z]) }),
      body: Object.freeze([
        Object.freeze({ predicate: "reachable", terms: Object.freeze([x, y]) }),
        Object.freeze({ predicate: "edge", terms: Object.freeze([y, z]) }),
      ]),
    }),
  ]),
  find: Object.freeze({ predicate: "reachable", terms: Object.freeze([x, y]) }),
});

test("Datalog over EAVT witnesses settles recursive reachability to the least fixed point", () => {
  const result = evaluateDatalog(rows, query);

  assert.equal(result.kind, "knowing.datalog.evaluation");
  assert.equal(result.settled, true);
  assert.deepEqual(result.answer.tuples, [
    ["a", "b"],
    ["a", "c"],
    ["a", "d"],
    ["b", "c"],
    ["b", "d"],
    ["c", "d"],
  ]);
});

test("Datalog evaluation is idempotent on re-evaluation of the same witness ledger", () => {
  const once = evaluateDatalog(rows, query);
  const twice = evaluateDatalog(rows, query);

  assert.deepEqual(twice, once);
});
