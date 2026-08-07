import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, valueOf } from "@emsenn/relating";
import {
  admitAction,
  broadcastMembershipView,
  emptyField,
  failureComplete,
  hyParViewOverlay,
  livenessOf,
  membershipView,
  meshLivenessObservation,
  mergeMembershipViews,
  plumtreeGossipPlan,
  sameMembershipView,
  swimRound,
} from "../dist/index.mjs";

const viewOf = (observer, observations, round = 0) => membershipView(observer, observations, round);

test("SWIM suspect then refute converges to alive while the membership witness grows in <=k", () => {
  const initial = viewOf("alice", [
    meshLivenessObservation({ observer: "alice", member: "bob", status: "alive", round: 0, incarnation: 0 }),
  ]);
  const suspected = swimRound(initial, {
    observer: "alice",
    round: 1,
    members: ["alice", "bob"],
    responsive: [],
    suspicionRounds: 2,
  });
  assert.equal(livenessOf(suspected, "bob").status, "suspect");

  const refuted = swimRound(suspected, {
    observer: "alice",
    round: 2,
    members: ["alice", "bob"],
    responsive: ["bob"],
    suspicionRounds: 2,
  });
  const reading = livenessOf(refuted, "bob");

  assert.equal(reading.status, "alive", "a higher-incarnation ack refutes the suspicion");
  assert.equal(valueOf(reading.accumulatedCharge).name, "stable", "the view retained both witnesses as accumulated knowledge");
  assert.ok(reading.witnesses.length >= 3, "no suspicion witness was erased");
});

test("SWIM failure detection is eventually complete in the round model", () => {
  let view = viewOf("alice", [
    meshLivenessObservation({ observer: "alice", member: "bob", status: "alive", round: 0, incarnation: 0 }),
  ]);

  view = swimRound(view, {
    observer: "alice",
    round: 1,
    members: ["alice", "bob"],
    responsive: [],
    suspicionRounds: 2,
  });
  assert.equal(livenessOf(view, "bob").status, "suspect");
  assert.equal(failureComplete(view, "bob"), false);

  view = swimRound(view, {
    observer: "alice",
    round: 3,
    members: ["alice", "bob"],
    responsive: [],
    suspicionRounds: 2,
  });

  assert.equal(livenessOf(view, "bob").status, "dead");
  assert.equal(failureComplete(view, "bob"), true);
});

test("membership views merge conflict-free and HyParView/Plumtree gossip broadcasts over the field", () => {
  const alice = viewOf("alice", [
    meshLivenessObservation({ observer: "alice", member: "carol", status: "alive", round: 1 }),
  ], 1);
  const bob = viewOf("bob", [
    meshLivenessObservation({ observer: "bob", member: "carol", status: "suspect", round: 1 }),
  ], 1);

  const left = mergeMembershipViews(alice, bob);
  const right = mergeMembershipViews(bob, alice);
  assert.equal(sameMembershipView(left, right), true, "membership view merge delegates to the CRDT join");
  assert.equal(canonical(left.state), canonical(right.state));

  const overlay = hyParViewOverlay("alice", ["alice", "bob", "carol", "dana"], { activeFanout: 2 });
  const plan = plumtreeGossipPlan(overlay, "membership:1");
  assert.deepEqual(plan.eager, ["bob", "carol"]);
  assert.deepEqual(plan.lazy, ["dana"]);

  let field = emptyField();
  field = admitAction.run(field, { agent: "alice|exists" });
  field = admitAction.run(field, { agent: "bob|exists" });
  const broadcasted = broadcastMembershipView(field, { from: 0, to: 1, view: left });
  assert.equal(broadcasted.members[1].memes.length, 1, "gossip dissemination is socializing.broadcast over the mesh");
});
