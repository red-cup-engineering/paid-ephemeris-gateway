import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEavt } from "@emsenn/relating/writing";

import {
  evaluateChronicleLedgerQuery,
  evaluateDatalog,
  evaluateSparql,
  masksOfSessionQuery,
  sessionsAssignedToQuery,
  sparqlVariable,
  triplePattern,
  variable,
} from "../dist/index.mjs";

const s = sparqlVariable("s");
const o = sparqlVariable("o");
const value = sparqlVariable("value");

const x = variable("s");
const y = variable("o");
const t = variable("t");

const rows = Object.freeze([
  Object.freeze({ e: "urn:node:a", a: "urn:edge", v: "urn:node:b", t: "t1" }),
  Object.freeze({ e: "urn:node:b", a: "urn:edge", v: "urn:node:c", t: "t2" }),
  Object.freeze({ e: "urn:claim:top", a: "urn:truth", v: "true", t: "t3" }),
  Object.freeze({ e: "urn:claim:top", a: "urn:truth", v: "false", t: "t4" }),
]);

test("SPARQL BGP SELECT returns exactly the bindings of its derived Datalog read", () => {
  const sparql = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["s", "o"]),
    where: Object.freeze([triplePattern(s, "urn:edge", o)]),
  }));

  const datalog = evaluateDatalog(rows, Object.freeze({
    kind: "knowing.datalog.query",
    rules: Object.freeze([Object.freeze({
      head: Object.freeze({ predicate: "answer", terms: Object.freeze([x, y]) }),
      body: Object.freeze([Object.freeze({ predicate: "eavt", terms: Object.freeze([x, "urn:edge", y, t]) })]),
    })]),
    find: Object.freeze({ predicate: "answer", terms: Object.freeze([x, y]) }),
  }));

  assert.deepEqual(
    sparql.bindings,
    datalog.answer.tuples.map(([subject, object]) => Object.freeze({ s: subject, o: object })),
  );
});

test("SPARQL ASK and CONSTRUCT are projections of the same BGP evaluation", () => {
  const ask = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "ask",
    where: Object.freeze([triplePattern("urn:node:a", "urn:edge", "urn:node:b")]),
  }));
  assert.equal(ask.ask, true);

  const construct = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "construct",
    where: Object.freeze([triplePattern(s, "urn:edge", o)]),
    construct: Object.freeze([triplePattern(s, "urn:derivedEdge", o)]),
  }));

  assert.deepEqual(construct.triples, [
    { s: "urn:node:a", p: "urn:derivedEdge", o: "urn:node:b" },
    { s: "urn:node:b", p: "urn:derivedEdge", o: "urn:node:c" },
  ]);
  assert.equal(
    construct.turtle,
    "<urn:node:a> <urn:derivedEdge> <urn:node:b> .\n<urn:node:b> <urn:derivedEdge> <urn:node:c> .\n",
  );
});

test("a knowledge-top cell is query-complete: both witnessed sides surface as bindings", () => {
  const result = evaluateSparql(rows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["value"]),
    where: Object.freeze([triplePattern("urn:claim:top", "urn:truth", value)]),
  }));

  assert.deepEqual(result.bindings, [
    { value: "false" },
    { value: "true" },
  ]);
});

test("hub chronicle ledger SELECT and ASK questions run as SPARQL BGP through Datalog", () => {
  const fixture = readFileSync(join("test", "fixtures", "hub-chronicle-ledger.jsonl"), "utf8");
  const ledgerRows = parseEavt(fixture);
  const relatingSessions = evaluateChronicleLedgerQuery(Object.freeze({
    kind: "knowing.sparql.chronicle-ledger-query",
    rows: ledgerRows,
    query: sessionsAssignedToQuery("lib/relating"),
  }));
  assert.deepEqual(relatingSessions.bindings, [
    { session: "session:019f01ed-935c-76a0-b63c-8d60fd73708b" },
  ]);

  const masks = evaluateChronicleLedgerQuery(Object.freeze({
    kind: "knowing.sparql.chronicle-ledger-query",
    rows: ledgerRows,
    query: masksOfSessionQuery("session:019f01ed-935c-76a0-b63c-8d60fd73708b"),
  }));
  assert.deepEqual(masks.bindings, [
    { mask: "mask:harness:codex" },
  ]);

  const ask = evaluateSparql(ledgerRows, Object.freeze({
    kind: "knowing.sparql.query",
    type: "ask",
    where: Object.freeze([triplePattern(
      "session:019f01ed-935c-76a0-b63c-8d60fd73708b",
      "hub.assignment",
      "lib/relating",
    )]),
  }));
  assert.equal(ask.ask, true);
});
