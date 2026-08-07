/**
 * federateGraded - contradiction-aware federation law tests.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { monotonicityCertificateOfFederatedCover, valueOf } from "@emsenn/relating";
import { federateGraded, oneValuePerIndex } from "../dist/index.mjs";

const source = (id, protocol, collection) => ({ id, protocol, collection });
const observed = (cell, value, witness) => ({
  cell,
  value,
  witness,
});
const coverStatements = (sources) => sources.flatMap((entry) => entry.collection.map((cell) => ({
  source: entry.id,
  cell: cell.cell,
  stance: `${cell.polarity ?? "assert"}:${JSON.stringify(cell.value)}`,
  witness: cell.witness,
})));

test("monotone disagreement is held as top and lifts coordination-free with no Raft round", () => {
  const sources = [
    source("at", "atproto", [observed("room.name", "aurora", "at-r1")]),
    source("matrix", "matrix", [observed("room.name", "borealis", "mx-e1")]),
  ];
  const certificate = monotonicityCertificateOfFederatedCover(coverStatements(sources));
  const report = federateGraded(sources);

  assert.equal(certificate.rank.members.length, 0);
  assert.equal(report.h1.rank, 0);
  assert.equal(report.h1.cohomology.kind, "organizing.federate-graded.h1-cohomology");
  assert.equal(report.h1.cohomology.rank, 0);
  assert.equal(report.h1.cohomology.vanishing.kind, "predication.cohomology.rankVanishing:witness");
  assert.equal(report.h1.cohomology.obstructions.length, 0);
  assert.equal(report.contested.length, 1);
  assert.equal(report.needsCoordination.length, 0);
  assert.equal(report.raft.frontier.raftRound, "not-required");
  assert.equal(report.raft.log.entries.length, 0, "monotone held top does not spend Raft");
  assert.equal(report.coherence.every((entry) => entry.ok), true);

  const held = report.contested[0];
  assert.equal(held.standing, "stable");
  assert.equal(valueOf(held.topCharge).name, "stable");
  assert.deepEqual([...held.truthWitnesses, ...held.falsityWitnesses].sort(), ["at-r1", "mx-e1"]);
  assert.deepEqual(held.statements.map((entry) => entry.value).sort(), ["aurora", "borealis"]);
});

test("nonzero cover H1 disagreement routes exactly the cohomology residue through Raft", () => {
  const sources = [
    source("crdt-a", "crdt", [
      observed("budget.cap", 10, "crdt-a1"),
      observed("budget.cap", 11, "crdt-a2"),
    ]),
    source("crdt-b", "crdt", [
      observed("budget.cap", 10, "crdt-b1"),
      observed("budget.cap", 11, "crdt-b2"),
    ]),
  ];
  const certificate = monotonicityCertificateOfFederatedCover(coverStatements(sources));
  const report = federateGraded(sources, { cluster: "ops" });

  assert.equal(certificate.rank.members.length, 1);
  assert.deepEqual(certificate.cells, ["budget.cap"]);
  assert.equal(report.contested.length, 0);
  assert.equal(report.needsCoordination.length, 1);
  assert.equal(report.h1.rank, certificate.rank.members.length);
  assert.deepEqual(report.h1.cells, certificate.cells);
  assert.equal(report.h1.cohomology.rank, certificate.rank.members.length);
  assert.deepEqual(report.h1.cohomology.cells, certificate.cells);
  assert.equal(report.h1.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(report.h1.cohomology.obstructions.length, 1);
  assert.equal(report.h1.cohomology.obstructions[0].cell, "budget.cap");
  assert.equal(report.h1.cohomology.obstructions[0].carrier.firstCohomology.rank.members.length, 1);
  assert.deepEqual(report.needsCoordination.map((entry) => entry.cell), certificate.cells);
  assert.equal(report.raft.frontier.raftRound, "required");
  assert.equal(report.raft.append.accepted.length, 1);
  assert.equal(report.raft.append.rejected.length, 0);
  assert.deepEqual(report.raft.append.accepted.map((entry) => entry.command), [
    report.needsCoordination[0].raftCommand,
  ]);
  assert.equal(report.raft.append.accepted[0].witness, "h1:budget.cap");
  assert.equal(oneValuePerIndex(report.raft.log), true);
});

test("held top retains both witnesses and keeps them readable on the truth axis", () => {
  const report = federateGraded([
    source("left", "activitypub", [observed("policy", { stance: "allow" }, "left-a")]),
    source("right", "activitypub", [observed("policy", { stance: "deny" }, "right-a")]),
  ]);

  const held = report.contested[0];
  assert.equal(valueOf(held.topCharge).name, "stable");
  assert.equal(held.truthWitnesses.length, 1);
  assert.equal(held.falsityWitnesses.length, 1);
  assert.deepEqual(new Set(held.statements.map((entry) => entry.witness)), new Set(["left-a", "right-a"]));
  assert.deepEqual(held.statements.map((entry) => entry.source).sort(), ["left", "right"]);
});

test("shared, contested, and needs-coordination decomposition is exhaustive and disjoint", () => {
  const report = federateGraded([
    source("at", "atproto", [
      observed("topic.status", "open", "at-shared"),
      observed("room.name", "aurora", "at-name"),
      observed("budget.cap", 10, "at-budget-10"),
      observed("budget.cap", 11, "at-budget-11"),
    ]),
    source("matrix", "matrix", [
      observed("topic.status", "open", "mx-shared"),
      observed("room.name", "borealis", "mx-name"),
      observed("budget.cap", 10, "mx-budget-10"),
      observed("budget.cap", 11, "mx-budget-11"),
    ]),
  ], { cluster: "ops" });

  assert.deepEqual(report.decomposition, {
    exhaustive: true,
    disjoint: true,
    shared: 1,
    contested: 1,
    needsCoordination: 1,
  });
  assert.deepEqual(report.shared.map((entry) => entry.cell), ["topic.status"]);
  assert.deepEqual(report.contested.map((entry) => entry.cell), ["room.name"]);
  assert.deepEqual(report.needsCoordination.map((entry) => entry.cell), ["budget.cap"]);
  assert.deepEqual(report.h1.cells, report.needsCoordination.map((entry) => entry.cell));
  assert.deepEqual(report.raft.append.accepted.map((entry) => entry.command), [
    report.needsCoordination[0].raftCommand,
  ]);
});
