/**
 * writing/raft - Raft is the coordinated dual of CALM/CRDT joins.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  appendRaftProposals,
  coordinateByCalmOrRaft,
  emptyRaftLog,
  oneValuePerIndex,
  projectRaftState,
  readCalmCovers,
  readCalmFederation,
} from "../dist/index.mjs";

const leadership = {
  kind: "organizing.writing.raft.leadership",
  cluster: "ops",
  term: 7,
  leader: "mara",
};

test("Raft preserves one-value-per-index safety under concurrent appends", () => {
  const result = appendRaftProposals(emptyRaftLog("ops"), leadership, [
    { cluster: "ops", index: 1, term: 7, leader: "mara", command: { set: "budget", value: 10 }, witness: "mara-a" },
    { cluster: "ops", index: 1, term: 7, leader: "sol", command: { set: "budget", value: 11 }, witness: "sol-a" },
    { cluster: "ops", index: 1, term: 7, leader: "mara", command: { set: "budget", value: 12 }, witness: "mara-b" },
    { cluster: "ops", index: 2, term: 7, leader: "mara", command: { set: "window", value: "morning" }, witness: "mara-c" },
  ]);

  assert.equal(result.accepted.length, 2, "the elected leader contributes one command per new index");
  assert.deepEqual(result.rejected.map((entry) => entry.reason).sort(), [
    "leader-conflict",
    "not-current-leader",
  ]);
  assert.equal(oneValuePerIndex(result.log), true);
  assert.deepEqual(result.log.entries.map((entry) => [entry.index, entry.command]), [
    [1, { set: "budget", value: 10 }],
    [2, { set: "window", value: "morning" }],
  ]);

  const state = projectRaftState(result.log);
  assert.equal(Object.keys(state).length, 2, "RWIL projection has one entity per log index");
  assert.equal(state['["organizing","raft","ops",1]'].leader, "mara");
  assert.deepEqual(state['["organizing","raft","ops",1]'].command, { set: "budget", value: 10 });
});

test("CALM/Raft moat: monotone lifts with no round, non-monotone requires leader order", () => {
  const monotone = readCalmCovers([
    { socializing: "mara|treaty-signed" },
    { socializing: "mara|treaty-signed" },
  ]);
  const lifted = coordinateByCalmOrRaft(monotone, { log: emptyRaftLog("ops"), operation: "agreement-only-join" });

  assert.equal(lifted.frontier.monotone, true);
  assert.equal(lifted.frontier.raftRound, "not-required");
  assert.equal(lifted.log.entries.length, 0, "monotone operation does not spend a Raft round");

  const nonMonotone = readCalmFederation({
    kind: "organizing.federation",
    monoidal: "parallel-composition",
    constituents: 2,
    members: 2,
    nameMobility: 0,
    shared: 0,
    contested: 1,
    federationOnly: 1,
    glued: false,
    coordination: "consensus-required",
  });

  assert.throws(
    () => coordinateByCalmOrRaft(nonMonotone, { log: emptyRaftLog("ops"), operation: "retract-prior-value" }),
    /requires leadership/,
    "CALM-rejected operations cannot proceed without a leader term",
  );

  const ordered = coordinateByCalmOrRaft(nonMonotone, {
    log: emptyRaftLog("ops"),
    leadership,
    operation: "retract-prior-value",
    proposals: [
      { cluster: "ops", index: 1, term: 7, leader: "mara", command: { retract: "budget" }, witness: "mara-retract" },
      { cluster: "ops", index: 1, term: 7, leader: "sol", command: { retract: "budget-differently" }, witness: "sol-retract" },
    ],
  });

  assert.equal(ordered.frontier.monotone, false);
  assert.equal(ordered.frontier.raftRound, "required");
  assert.equal(ordered.append.accepted.length, 1);
  assert.equal(ordered.append.rejected[0].reason, "not-current-leader");
  assert.deepEqual(ordered.log.entries.map((entry) => entry.command), [{ retract: "budget" }]);
  assert.equal(oneValuePerIndex(ordered.log), true);
});
