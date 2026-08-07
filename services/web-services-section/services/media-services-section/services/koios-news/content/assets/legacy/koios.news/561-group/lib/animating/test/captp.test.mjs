// CapTP — the OCapN object-capability transport realized through the OUT/playing
// face. These are falsifiable, value-level witnesses that the first green brick
// holds the two load-bearing claims of the assignment:
//
//   (1) PROMISE PIPELINING composes via the playing CUT before resolution: a
//       delivery sent to the still-unresolved promise of a prior delivery (call
//       .foo() then .bar() on the promised result in ONE round) produces a
//       NON-EMPTY composite design — the *-autonomous composition is defined, so
//       the follow-on was delivered without waiting for a settle.
//   (2) An UNHELD capability cannot be delivered: `admit` gates on the holder's
//       affordances (authority by MOVE), so an unforgeable sturdyref naming a
//       locus the holder does not hold is undeliverable even with the bytes.
//
// No assertion is weakened to pass; the cut is @emsenn/playing's genuine `cut`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grant,
  refOf,
  deliver,
  pipeline,
  composePipeline,
  composeSequentialCut,
  pipelineSequentialCutLaw,
  refOfMacaroon,
  pipelineAuthorityGraph,
  authorityBa,
  captpWitnessLog,
  captpStandingKey,
  turnTraceFromAuthorityGraph,
  turnTraceWitnessLog,
  vectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  causalFrontierFromTurnTraces,
  causalFrontierWitnessLog,
  baCausalFrame,
  baCausalFrameWitnessLog,
  capTpEventsIndependent,
  concurrentTraceFromCausalFrontier,
  concurrentTraceWitnessLog,
  causalCutFromClock,
  causalCutFromSelection,
  causalCutWitnessLog,
  causalCutQuiescence,
  causalCutQuiescenceWitnessLog,
  invocationSettlement,
  invocationSettlementWitnessLog,
  promiseRetirementCertificate,
  promiseRetirementWitnessLog,
  vatFromAuthorityGraph,
  dropPresence,
  resolvePromise,
  breakPromise,
  vatCanInvoke,
  vatWitnessLog,
  exportTable,
  trackExport,
  applyGcExports,
  exportTableWitnessLog,
  exportGcWitnessLog,
  handoffTable,
  offerHandoffGift,
  depositHandoffGift,
  withdrawHandoffGift,
  handoffWitnessLog,
  importObjectDesc,
  importPromiseDesc,
  exportDesc,
  answerDesc,
  sigEnvelope,
  handoffGiveDesc,
  handoffReceiveDesc,
  descriptorStandingKey,
  joinReferences,
  refJoinStandingKey,
  refJoinWitnessLog,
  openSession,
  receiveStartSession,
  startSessionOp,
  captpPublicIdentifier,
  captpSessionIdentifier,
  deliverOp,
  resolveCrossedHellos,
  listenOp,
  fulfillResolverOp,
  breakResolverOp,
  getOp,
  indexOp,
  untagOp,
  bootstrapFetchOp,
  bootstrapDepositGiftOp,
  bootstrapWithdrawGiftOp,
  gcAnswersOp,
  gcExportsOp,
  abortOp,
  abortSession,
  operationStandingKey,
  operationWitnessLog,
  foldSessionTranscript,
  sessionTranscriptWitnessLog,
  commitSessionTranscript,
  transcriptCommitWitnessLog,
  foldAnswerTable,
  answerTableWitnessLog,
  foldPromiseTrace,
  promiseTraceWitnessLog,
  foldProjectionTrace,
  projectionTraceWitnessLog,
  sessionWitnessLog,
  crossedHelloWitnessLog,
  admit,
} from "../dist/index.mjs";

// A held root capability: alice may play the locus "carol#greeter".
const greeterCap = grant("https://vat.example/alice", "carol#greeter", "urn:cap:greeter:1");
const greeterRef = refOf(greeterCap);

test("the CapTP writing face is importable as a package subpath", async () => {
  const captp = await import("@emsenn/animating/writing/captp");
  assert.equal(typeof captp.deliver, "function");
  assert.equal(typeof captp.pipelineSequentialCutLaw, "function");
  assert.equal(typeof captp.foldSessionTranscript, "function");
  assert.equal(typeof captp.causalFrontierFromTurnTraces, "function");
  assert.equal(typeof captp.baCausalFrame, "function");
  assert.equal(typeof captp.concurrentTraceFromCausalFrontier, "function");
  assert.equal(typeof captp.causalCutFromClock, "function");
  assert.equal(typeof captp.causalCutQuiescence, "function");
  assert.equal(typeof captp.invocationSettlement, "function");
  assert.equal(typeof captp.promiseRetirementCertificate, "function");
  assert.equal(captp.captpPublicIdentifier("alice-pubkey"), "a1b45b7f68a35a1cb6d8fd970ce7326ea0a291006e61b82d6749ed48e5dd85db");
});

// --- (1) promise pipelining composes via the cut before resolution ---------

test("pipelined invocation (.foo() then .bar() on the promise) composes via the playing cut in one round", () => {
  // Round 1: deliver .foo() to the held object → a promise (unresolved answer).
  const foo = deliver(greeterRef, "foo", [], "p:foo");
  // Round 1, same trip: deliver .bar() to foo's PROMISE — no settle in between.
  const bar = pipeline(foo, "bar", [], "p:bar");

  // The follow-on is genuinely targeted at the prior, unresolved promise.
  assert.equal(bar.target, foo.answer, "bar must be delivered to foo's promise, not a settled ref");
  assert.equal(bar.pipelinedOn, foo.answer, "bar must record it is pipelined on foo's promise");

  const result = composePipeline(foo, bar);
  // The cut is DEFINED before resolution: a non-empty composite design + ≥1 play.
  assert.ok(result.composed, "promise pipelining must compose via the cut before resolution");
  assert.ok(result.composite.entries.length > 0, "the cut must yield a non-empty composite design");
  assert.ok(result.plays >= 1, "the answer-interface dispute must produce a converging play");

  const sequential = composeSequentialCut(foo, bar);
  assert.ok(sequential.composed, "the explicit sequential cut must also converge");
  assert.equal(sequential.follow.target, foo.answer, "sequential follow targets the settled answer ref");
  assert.equal(sequential.follow.pipelinedOn, undefined, "sequential follow waits, so it is not marked pipelined");

  const law = pipelineSequentialCutLaw(foo, bar);
  assert.equal(law.kind, "animating.captp.pipeline-sequential-cut:witness");
  assert.equal(law.pipelined.plays, law.sequential.plays);
});

test("a delivery NOT pipelined on the prior promise does not compose (no answer to pipeline against)", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo2");
  // An independent delivery to the settled ref — not pipelined on foo.
  const independent = deliver(greeterRef, "bar", [], "p:bar2");
  const result = composePipeline(foo, independent);
  assert.equal(result.composed, false, "an unrelated delivery must not compose against foo's promise");
  assert.equal(result.composite.entries.length, 0, "no shared answer interface ⇒ the empty composite");
});

test("a branched promise pipeline forms an authority graph with one-turn compression", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:graph");
  const bar = pipeline(foo, "bar", [], "p:bar:graph");
  const baz = pipeline(foo, "baz", [], "p:baz:graph");
  const qux = pipeline(bar, "qux", [], "p:qux:graph");

  const graph = pipelineAuthorityGraph(
    [greeterRef],
    [foo, bar, baz, qux],
    ["carol#greeter"],
  );

  assert.equal(graph.kind, "animating.captp.pipeline-authority-graph");
  assert.deepEqual(graph.reachablePromises.sort(), ["p:bar:graph", "p:baz:graph", "p:foo:graph", "p:qux:graph"].sort());
  assert.equal(graph.blocked.length, 0);
  assert.equal(graph.compression.sequentialRoundTrips, 3, "foo -> bar -> qux is the sequential depth");
  assert.equal(graph.compression.pipelinedRoundTrips, 1, "the whole graph can be sent before promise resolution");
  assert.equal(graph.compression.savedRoundTrips, 2);
  assert.equal(graph.edges.filter((edge) => edge.kind === "captp.promise-cut").every((edge) => edge.composed), true);

  const ba = authorityBa("https://vat.example/alice", [greeterRef], [foo, bar, baz, qux], ["carol#greeter"]);
  assert.equal(ba.place, "captp:https://vat.example/alice");
  assert.deepEqual(ba.heldRefs.map((ref) => ref.id), [greeterRef.id]);
  assert.deepEqual(ba.reachablePromises.sort(), graph.reachablePromises.sort());
});

test("a promise authority graph folds into a ba-local turn trace with saved sequential turns", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:turn");
  const bar = pipeline(foo, "bar", [], "p:bar:turn");
  const qux = pipeline(bar, "qux", [], "p:qux:turn");
  const graph = pipelineAuthorityGraph([greeterRef], [foo, bar, qux], ["carol#greeter"]);
  const trace = turnTraceFromAuthorityGraph("session:alice-carol", "vat:alice", graph, "ba:alice-carol");

  assert.equal(trace.kind, "animating.captp.turn-trace");
  assert.equal(trace.ba, "ba:alice-carol");
  assert.equal(trace.compression.savedRoundTrips, 2);
  assert.deepEqual(trace.events.map((event) => event.turn), [0, 0, 0]);
  assert.deepEqual(trace.events.map((event) => event.sequentialTurn), [0, 1, 2]);
  assert.deepEqual(trace.events.map((event) => event.savedTurns), [0, 1, 2]);
  assert.deepEqual(trace.events.map((event) => event.status), ["admitted", "composed", "composed"]);

  const rows = turnTraceWitnessLog(trace, "2026-06-27T00:04:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["admitted", "composed", "composed"]);
  assert.ok(rows[2].a.includes("ba=ba:alice-carol"));
  assert.ok(rows[2].a.includes("turn=0"));
  assert.ok(rows[2].a.includes("sequentialTurn=2"));
  assert.ok(rows[2].a.includes("savedTurns=2"));
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:04:00.000Z"), true);
});

test("turn traces lift into vector-clock causal frontiers without totalizing independent vats", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:vc");
  const bar = pipeline(foo, "bar", [], "p:bar:vc");
  const aliceGraph = pipelineAuthorityGraph([greeterRef], [foo, bar], ["carol#greeter"]);
  const aliceTrace = turnTraceFromAuthorityGraph("session:alice-carol:vc", "vat:alice", aliceGraph, "ba:alice-carol");

  const bobRef = { id: "urn:cap:greeter:bob:vc", locus: greeterRef.locus, holder: "https://vat.example/bob" };
  const ping = deliver(bobRef, "ping", [], "p:bob:ping:vc");
  const bobGraph = pipelineAuthorityGraph([bobRef], [ping], ["carol#greeter"]);
  const bobTrace = turnTraceFromAuthorityGraph("session:bob-carol:vc", "vat:bob", bobGraph, "ba:bob-carol");

  const frontier = causalFrontierFromTurnTraces([aliceTrace, bobTrace]);

  assert.equal(frontier.kind, "animating.captp.causal-frontier");
  assert.deepEqual(frontier.events.map((entry) => entry.clock), [
    { "vat:alice": 1 },
    { "vat:alice": 2 },
    { "vat:bob": 1 },
  ]);
  assert.equal(compareVectorClocks(frontier.events[0].clock, frontier.events[1].clock), "before");
  assert.equal(compareVectorClocks(frontier.events[1].clock, frontier.events[2].clock), "concurrent");
  assert.deepEqual(mergeVectorClocks(frontier.events[1].clock, frontier.events[2].clock), { "vat:alice": 2, "vat:bob": 1 });
  assert.throws(() => vectorClock({ "vat:bad": -1 }), /non-negative/);

  const rows = causalFrontierWitnessLog(frontier, "2026-06-27T00:10:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["causal", "causal", "causal"]);
  assert.ok(rows[1].a.includes("clock=vat:alice:2"));
  assert.ok(rows[2].a.includes("frontier=vat:alice:2,vat:bob:1"));

  const ba = authorityBa("https://vat.example/alice", [greeterRef], [foo, bar], ["carol#greeter"]);
  const frame = baCausalFrame(ba, frontier);
  assert.equal(frame.kind, "animating.captp.ba-causal-frame");
  assert.equal(frame.holder, "https://vat.example/alice");
  assert.deepEqual(frame.events.map((entry) => entry.status), ["situated", "situated", "outside"]);
  assert.deepEqual(frame.observed.map((entry) => entry.event.to), [foo.answer, bar.answer]);
  assert.deepEqual(frame.outside.map((entry) => entry.event.to), [ping.answer]);
  assert.deepEqual(frame.clock, { "vat:alice": 2 });

  const frameRows = baCausalFrameWitnessLog(frame, "2026-06-27T00:11:00.000Z");
  assert.deepEqual(frameRows.map((row) => row.v), ["causal", "causal", "blocked"]);
  assert.ok(frameRows[0].a.includes("place=captp:https://vat.example/alice"));
  assert.ok(frameRows[1].a.includes("observedClock=vat:alice:2"));
  assert.ok(frameRows[2].a.includes("outside the ba's held refs"));

  assert.equal(capTpEventsIndependent(frontier.events[0], frontier.events[2]), true);
  assert.equal(capTpEventsIndependent(frontier.events[0], frontier.events[1]), false);
  const trace = concurrentTraceFromCausalFrontier(frontier);
  assert.equal(trace.kind, "animating.captp.concurrent-trace");
  assert.equal(trace.width, 2);
  assert.equal(trace.depth, 2);
  assert.deepEqual(trace.layers.map((layer) => layer.events.map((entry) => entry.event.to)), [
    [foo.answer, ping.answer],
    [bar.answer],
  ]);
  assert.deepEqual(trace.layers.map((layer) => layer.clock), [
    { "vat:alice": 1, "vat:bob": 1 },
    { "vat:alice": 2 },
  ]);

  const traceRows = concurrentTraceWitnessLog(trace, "2026-06-27T00:12:00.000Z");
  assert.deepEqual(traceRows.map((row) => row.v), ["causal", "causal", "causal"]);
  assert.ok(traceRows[0].a.includes("layer=0"));
  assert.ok(traceRows[1].a.includes("width=2"));
  assert.ok(traceRows[2].a.includes("layer=1"));

  const cut = causalCutFromClock(frontier, vectorClock({ "vat:alice": 1, "vat:bob": 1 }));
  assert.equal(cut.kind, "animating.captp.causal-cut");
  assert.equal(cut.status, "consistent");
  assert.deepEqual(cut.included.map((entry) => entry.event.to), [foo.answer, ping.answer]);
  assert.deepEqual(cut.excluded.map((entry) => entry.event.to), [bar.answer]);
  assert.deepEqual(cut.violations, []);

  const badCut = causalCutFromSelection(frontier, [bar.answer]);
  assert.equal(badCut.status, "inconsistent");
  assert.deepEqual(badCut.included.map((entry) => entry.event.to), [bar.answer]);
  assert.deepEqual(badCut.violations.map((violation) => violation.missing.map((entry) => entry.event.to)), [[foo.answer]]);

  const cutRows = causalCutWitnessLog(badCut, "2026-06-27T00:13:00.000Z");
  assert.deepEqual(cutRows.map((row) => row.v), ["causal", "blocked"]);
  assert.ok(cutRows[1].a.includes("role=violation"));
  assert.ok(cutRows[1].a.includes(`missing=${foo.answer}`));

  const aliceCut = causalCutFromClock(frontier, vectorClock({ "vat:alice": 1 }));
  const aliceVat = vatFromAuthorityGraph("vat:alice", aliceGraph);
  const active = causalCutQuiescence(aliceCut, aliceVat);
  assert.equal(active.kind, "animating.captp.cut-quiescence");
  assert.equal(active.status, "active");
  assert.deepEqual(active.pending.map((state) => state.id), [foo.answer]);

  const activeSettlement = invocationSettlement(aliceCut, aliceVat, foo.answer);
  assert.equal(activeSettlement.kind, "animating.captp.invocation-settlement");
  assert.equal(activeSettlement.status, "active");
  assert.deepEqual(activeSettlement.debts.map((debt) => debt.id), [foo.answer]);
  assert.deepEqual(activeSettlement.terminal, []);
  const activeRetirement = promiseRetirementCertificate(activeSettlement);
  assert.equal(activeRetirement.status, "retained");
  assert.deepEqual(activeRetirement.retained.map((item) => item.id), [foo.answer]);
  assert.ok(activeRetirement.retained[0].blockers.includes("promise has not reached terminal settlement"));

  const resolvedRef = { id: "urn:cap:resolved:vc", locus: "carol#greeter.session", holder: greeterRef.holder };
  const resolved = resolvePromise(aliceVat, foo.answer, resolvedRef);
  const quiet = causalCutQuiescence(aliceCut, resolved.vat);
  assert.equal(quiet.status, "quiescent");
  assert.deepEqual(quiet.terminal.map((state) => state.id), [foo.answer]);
  assert.deepEqual(quiet.pending, []);

  const quietRows = causalCutQuiescenceWitnessLog(quiet, "2026-06-27T00:14:00.000Z");
  assert.deepEqual(quietRows.map((row) => row.v), ["quiescent", "quiescent"]);
  assert.ok(quietRows[0].a.includes("status=quiescent"));
  assert.ok(quietRows[1].a.includes("presenceStatus=settled"));

  const terminated = invocationSettlement(aliceCut, resolved.vat, foo.answer);
  assert.equal(terminated.status, "terminated");
  assert.deepEqual(terminated.terminal.map((state) => state.id), [foo.answer]);
  assert.deepEqual(terminated.failed, []);
  const retainedAfterCut = promiseRetirementCertificate(terminated);
  assert.equal(retainedAfterCut.kind, "animating.captp.promise-retirement-certificate");
  assert.equal(retainedAfterCut.status, "retained");
  assert.deepEqual(retainedAfterCut.retained.map((item) => item.id), [foo.answer]);
  assert.ok(retainedAfterCut.retained[0].blockers.some((blocker) => blocker.includes(bar.answer)));

  const fullCut = causalCutFromClock(frontier, vectorClock({ "vat:alice": 2 }));
  const resolvedFull = resolvePromise(resolved.vat, bar.answer, { id: "urn:cap:resolved:bar:vc", locus: "carol#greeter.session.bar", holder: greeterRef.holder });
  const fullSettlement = invocationSettlement(fullCut, resolvedFull.vat, foo.answer);
  assert.equal(fullSettlement.status, "terminated");
  const retired = promiseRetirementCertificate(fullSettlement);
  assert.equal(retired.status, "retirable");
  assert.deepEqual(retired.retirable.map((item) => item.id), [foo.answer, bar.answer]);
  assert.deepEqual(retired.retained, []);

  const broken = breakPromise(aliceVat, foo.answer, "remote exception");
  const failed = invocationSettlement(aliceCut, broken.vat, foo.answer);
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.failed.map((state) => state.id), [foo.answer]);

  const settlementRows = invocationSettlementWitnessLog(terminated, "2026-06-27T00:15:00.000Z");
  assert.deepEqual(settlementRows.map((row) => row.v), ["terminated", "settled"]);
  assert.ok(settlementRows[0].a.includes("status=terminated"));
  assert.ok(settlementRows[1].a.includes("presenceStatus=settled"));

  const retirementRows = promiseRetirementWitnessLog(retired, "2026-06-27T00:16:00.000Z");
  assert.deepEqual(retirementRows.map((row) => row.v), ["retired", "retired", "retired"]);
  assert.ok(retirementRows[0].a.includes("status=retirable"));
  assert.ok(retirementRows[1].a.includes("presenceStatus=settled"));
  assert.ok(retirementRows[2].a.includes("presenceStatus=settled"));
});

test("an unheld root ref blocks the whole promise authority branch", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:blocked");
  const bar = pipeline(foo, "bar", [], "p:bar:blocked");
  const graph = pipelineAuthorityGraph([greeterRef], [foo, bar], ["carol#logger"]);

  assert.deepEqual(graph.reachablePromises, []);
  assert.equal(graph.blocked.length, 2);
  assert.equal(graph.edges[0].reason, "target ref locus is not held");
  assert.equal(graph.edges[1].reason, "prior promise is not reachable");
  assert.equal(graph.compression.sequentialRoundTrips, 0);
  assert.equal(graph.compression.pipelinedRoundTrips, 0);
});

test("CapTP authority graphs project to RWIL-shaped witness rows, including blocked power", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:witness");
  const bar = pipeline(foo, "bar", [], "p:bar:witness");
  const admitted = pipelineAuthorityGraph([greeterRef], [foo, bar], ["carol#greeter"]);
  const admittedLog = captpWitnessLog(admitted, "2026-06-26T00:00:00.000Z");

  assert.deepEqual(admittedLog.map((row) => row.v), ["admitted", "composed"]);
  assert.equal(admittedLog.every((row) => row.t === "2026-06-26T00:00:00.000Z"), true);
  assert.ok(admittedLog[1].a.includes("captp.promise-cut"));
  assert.ok(captpStandingKey(admittedLog[1]).includes("composed"));

  const blocked = pipelineAuthorityGraph([greeterRef], [foo, bar], ["carol#logger"]);
  const blockedLog = captpWitnessLog(blocked);
  assert.deepEqual(blockedLog.map((row) => row.v), ["blocked", "blocked"]);
  assert.equal(blockedLog[0].e, greeterRef.id, "root edge is witnessed at the ref");
  assert.equal(blockedLog[1].e, foo.answer, "descendant edge is witnessed at the unreachable promise");
});

test("a vat table materializes held refs and live promises from the authority graph", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:vat");
  const bar = pipeline(foo, "bar", [], "p:bar:vat");
  const graph = pipelineAuthorityGraph([greeterRef], [foo, bar], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);

  assert.equal(vat.kind, "animating.captp.vat");
  assert.equal(vatCanInvoke(vat, greeterRef.id), true);
  assert.equal(vatCanInvoke(vat, foo.answer), true);
  assert.equal(vatCanInvoke(vat, bar.answer), true);
  assert.deepEqual(vat.presences.map((presence) => presence.table).sort(), ["import", "promise", "promise"].sort());
  assert.equal(vat.presences.find((presence) => presence.id === bar.answer).parent, foo.answer);
});

test("dropping a root presence releases every dependent promise presence", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:drop");
  const bar = pipeline(foo, "bar", [], "p:bar:drop");
  const baz = pipeline(bar, "baz", [], "p:baz:drop");
  const graph = pipelineAuthorityGraph([greeterRef], [foo, bar, baz], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const dropped = dropPresence(vat, greeterRef.id);

  assert.deepEqual([...dropped.dropped].sort(), [greeterRef.id, foo.answer, bar.answer, baz.answer].sort());
  assert.equal(vatCanInvoke(dropped.vat, greeterRef.id), false);
  assert.equal(vatCanInvoke(dropped.vat, baz.answer), false);
  assert.equal(dropped.vat.presences.every((presence) => presence.status === "dropped"), true);
});

test("resolving a promise settles it into an invocable sturdyref presence", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:resolve");
  const graph = pipelineAuthorityGraph([greeterRef], [foo], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const resolvedRef = { id: "urn:cap:resolved:greeter-session", locus: "carol#greeter.session", holder: greeterRef.holder };
  const resolved = resolvePromise(vat, foo.answer, resolvedRef);
  const presence = resolved.vat.presences.find((entry) => entry.id === foo.answer);

  assert.equal(resolved.kind, "animating.captp.promise-resolution");
  assert.equal(presence.status, "settled");
  assert.equal(presence.resolvedTo, resolvedRef.id);
  assert.equal(presence.locus, resolvedRef.locus);
  assert.equal(vatCanInvoke(resolved.vat, foo.answer), true);

  const witness = vatWitnessLog(resolved.vat).find((row) => row.e === foo.answer);
  assert.equal(witness.v, "settled");
  assert.ok(witness.a.includes(`resolvedTo=${resolvedRef.id}`));
});

test("breaking a promise propagates through pipelined descendants and is witnessed", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:break");
  const bar = pipeline(foo, "bar", [], "p:bar:break");
  const baz = pipeline(bar, "baz", [], "p:baz:break");
  const graph = pipelineAuthorityGraph([greeterRef], [foo, bar, baz], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const broken = breakPromise(vat, foo.answer, "remote exception");

  assert.deepEqual([...broken.broken].sort(), [foo.answer, bar.answer, baz.answer].sort());
  assert.equal(vatCanInvoke(broken.vat, foo.answer), false);
  assert.equal(vatCanInvoke(broken.vat, baz.answer), false);
  assert.equal(broken.vat.presences.filter((presence) => presence.table === "promise").every((presence) => presence.status === "broken"), true);

  const rows = vatWitnessLog(broken.vat).filter((row) => row.v === "broken");
  assert.deepEqual(rows.map((row) => row.e).sort(), [foo.answer, bar.answer, baz.answer].sort());
});

test("three-party handoff deposits a live gift and withdraws it as the receiver's import", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:handoff");
  const graph = pipelineAuthorityGraph([greeterRef], [foo], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const exporterTable = handoffTable("vat:carol");

  const gift = offerHandoffGift(vat, {
    id: "gift:greeter:1",
    exporter: "vat:carol",
    exporterLocation: "ocapn://carol.example",
    gifter: "https://vat.example/alice",
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    gifterExporterSession: "session:alice-carol",
    presence: greeterRef.id,
  });
  const offered = depositHandoffGift(exporterTable, gift);
  const offerRows = handoffWitnessLog(offered);

  assert.equal(gift.status, "offered");
  assert.equal(gift.ref.id, greeterRef.id);
  assert.deepEqual(offerRows.map((row) => row.v), ["offered"]);

  const claimed = withdrawHandoffGift(offered, {
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "receiver",
    handoffCount: 0,
  });

  assert.equal(claimed.claim.status, "claimed");
  assert.equal(claimed.ref.holder, "https://vat.example/bob");
  assert.equal(claimed.ref.locus, greeterRef.locus);
  assert.equal(claimed.presence.status, "live");
  assert.equal(claimed.presence.parent, greeterRef.id);

  const rows = handoffWitnessLog(claimed.table);
  assert.deepEqual(rows.map((row) => row.v), ["claimed", "claimed"]);
  assert.ok(rows[1].a.includes("handoffCount=0"));
});

test("a handoff gift cannot be withdrawn by the wrong receiver or replayed count", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:handoff:deny")], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const gift = offerHandoffGift(vat, {
    id: "gift:greeter:wrong-recipient",
    exporter: "vat:carol",
    exporterLocation: "ocapn://carol.example",
    gifter: "https://vat.example/alice",
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    gifterExporterSession: "session:alice-carol",
    presence: greeterRef.id,
  });
  const table = depositHandoffGift(handoffTable("vat:carol"), gift);
  const denied = withdrawHandoffGift(table, {
    giftId: gift.id,
    receiver: "https://vat.example/mallory",
    receiverKey: "mallory-key-1",
    receivingSession: "session:mallory-carol",
    receivingSide: "receiver",
    handoffCount: 0,
  });

  assert.equal(denied.claim.status, "blocked");
  assert.equal(denied.ref, undefined);
  assert.equal(denied.presence, undefined);
  assert.equal(denied.claim.reason, "receiver is not the designated gift recipient");

  const claimed = withdrawHandoffGift(table, {
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "receiver",
    handoffCount: 0,
  });
  const replay = withdrawHandoffGift(claimed.table, {
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "receiver",
    handoffCount: 0,
  });

  assert.equal(replay.claim.status, "blocked");
  assert.equal(replay.claim.reason, "gift is not offered");
  assert.ok(handoffWitnessLog(denied.table).some((row) => row.v === "blocked"));
});

test("a dropped presence cannot be deposited as a handoff gift", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:handoff:dropped")], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const dropped = dropPresence(vat, greeterRef.id);
  const gift = offerHandoffGift(dropped.vat, {
    id: "gift:greeter:dropped",
    exporter: "vat:carol",
    exporterLocation: "ocapn://carol.example",
    gifter: "https://vat.example/alice",
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    gifterExporterSession: "session:alice-carol",
    presence: greeterRef.id,
  });
  const table = depositHandoffGift(handoffTable("vat:carol"), gift);
  const claim = withdrawHandoffGift(table, {
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "receiver",
    handoffCount: 1,
  });

  assert.equal(gift.status, "blocked");
  assert.equal(gift.reason, "presence is not live");
  assert.equal(claim.claim.status, "blocked");
  assert.equal(claim.ref, undefined);
  assert.deepEqual(handoffWitnessLog(table).map((row) => row.v), ["blocked"]);
});

test("CapTP descriptors distinguish imported objects, exports, and answer promises", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:desc");
  const imported = importObjectDesc(5, greeterRef);
  const exportedBootstrap = exportDesc(0);
  const answer = answerDesc(foo, 3);

  assert.deepEqual(imported, { kind: "desc:import-object", position: 5, ref: greeterRef.id });
  assert.deepEqual(exportedBootstrap, { kind: "desc:export", position: 0 });
  assert.deepEqual(answer, { kind: "desc:answer", position: 3, answer: foo.answer });
  assert.equal(descriptorStandingKey(answer), "desc:answer:3:p:foo:desc");
  assert.throws(() => importObjectDesc(0, greeterRef), /positive integers/);
});

test("handoff descriptors derive the signed give and receive records from a deposited gift", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:desc-handoff")], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const gift = offerHandoffGift(vat, {
    id: "gift:greeter:descriptor",
    exporter: "vat:carol",
    exporterLocation: "ocapn://carol.example",
    gifter: "https://vat.example/alice",
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    gifterExporterSession: "session:alice-carol",
    gifterSide: "alice-side-1",
    presence: greeterRef.id,
  });
  const give = handoffGiveDesc(gift);
  const signedGive = sigEnvelope(give, "alice-side-1", "sig:alice-give");
  const receive = handoffReceiveDesc({
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "bob-side-1",
    handoffCount: 0,
  }, signedGive);

  assert.deepEqual(give, {
    kind: "desc:handoff-give",
    receiverKey: "bob-key-1",
    exporterLocation: "ocapn://carol.example",
    session: "session:alice-carol",
    gifterSide: "alice-side-1",
    giftId: "gift:greeter:descriptor",
  });
  assert.equal(receive.kind, "desc:handoff-receive");
  assert.equal(receive.signedGive.payload.giftId, gift.id);
  assert.equal(descriptorStandingKey(receive), "desc:handoff-receive:session:bob-carol:bob-side-1:0:sig:alice-give");
  assert.throws(() => handoffReceiveDesc({ ...receive, giftId: gift.id, receiver: "https://vat.example/bob", receiverKey: "bob-key-1", handoffCount: -1 }, signedGive), /non-negative integer/);
});

test("reference joining verifies same-locus refs held across vats", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:join")], ["carol#greeter"]);
  const aliceVat = vatFromAuthorityGraph("vat:alice", graph);
  const bobRef = { id: "urn:cap:greeter:bob", locus: greeterRef.locus, holder: "https://vat.example/bob" };
  const bobVat = {
    kind: "animating.captp.vat",
    id: "vat:bob",
    presences: [{
      kind: "animating.captp.vat-presence",
      table: "import",
      id: bobRef.id,
      holder: bobRef.holder,
      locus: bobRef.locus,
      status: "live",
    }],
  };

  const join = joinReferences([
    { ref: greeterRef, descriptor: exportDesc(1, greeterRef), via: "alice-carol" },
    { ref: bobRef, descriptor: exportDesc(2, bobRef), via: "bob-carol" },
  ], [aliceVat, bobVat]);

  assert.equal(join.status, "joined");
  assert.equal(join.locus, "carol#greeter");
  assert.deepEqual([...join.joinedRefs].sort(), [greeterRef.id, bobRef.id].sort());
  assert.ok(refJoinStandingKey(join).includes("captp.reference-join|joined|carol#greeter"));

  const rows = refJoinWitnessLog(join, "2026-06-27T00:00:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["joined", "joined"]);
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:00:00.000Z"), true);
  assert.ok(rows[0].a.includes("descriptor=desc:export:1"));
});

test("reference joining blocks mismatched loci and dropped presences", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:join:block")], ["carol#greeter"]);
  const aliceVat = vatFromAuthorityGraph("vat:alice", graph);
  const loggerRef = { id: "urn:cap:logger:1", locus: "carol#logger", holder: "https://vat.example/alice" };
  const mismatch = joinReferences([
    { ref: greeterRef },
    { ref: loggerRef },
  ], [aliceVat]);

  assert.equal(mismatch.status, "blocked");
  assert.equal(mismatch.reason, "references do not share a locus");
  assert.deepEqual(refJoinWitnessLog(mismatch).map((row) => row.v), ["blocked", "blocked"]);

  const dropped = dropPresence(aliceVat, greeterRef.id);
  const bobRef = { id: "urn:cap:greeter:bob:dropped", locus: greeterRef.locus, holder: "https://vat.example/bob" };
  const bobVat = {
    kind: "animating.captp.vat",
    id: "vat:bob",
    presences: [{
      kind: "animating.captp.vat-presence",
      table: "import",
      id: bobRef.id,
      holder: bobRef.holder,
      locus: bobRef.locus,
      status: "live",
    }],
  };
  const unheld = joinReferences([{ ref: greeterRef }, { ref: bobRef }], [dropped.vat, bobVat]);

  assert.equal(unheld.status, "blocked");
  assert.equal(unheld.reason, `reference is not live in the supplied vat tables: ${greeterRef.id}`);
});

test("CapTP sessions become live only after a valid remote start-session", () => {
  const opened = openSession({
    id: "session:alice-carol",
    localLocation: "ocapn://alice.example",
    localPublicKey: "alice-pubkey",
    localSide: "alice-side",
    acceptableLocationSig: "sig:alice-location",
  });

  assert.equal(opened.session.status, "starting");
  assert.deepEqual(opened.operation, {
    kind: "op:start-session",
    captpVersion: "1.0",
    sessionPubkey: "alice-pubkey",
    acceptableLocation: "ocapn://alice.example",
    acceptableLocationSig: "sig:alice-location",
  });

  const remote = startSessionOp("carol-pubkey", "ocapn://carol.example", "sig:carol-location");
  const live = receiveStartSession(opened.session, remote, "carol-side");
  assert.equal(live.status, "live");
  assert.equal(live.remotePublicKey, "carol-pubkey");
  assert.equal(live.remoteLocation, "ocapn://carol.example");

  const rows = sessionWitnessLog(live, "2026-06-27T00:01:00.000Z");
  assert.equal(rows[0].v, "started");
  assert.ok(rows[0].a.includes("status=live"));

  const bad = receiveStartSession(opened.session, startSessionOp("old-key", "ocapn://old.example", "sig", "0.9"));
  assert.equal(bad.status, "aborted");
  assert.equal(bad.abortReason, "unsupported CapTP version");
});

test("crossed hellos derive public identifiers and keep the higher identifier session", () => {
  const alice = openSession({
    id: "session:alice-outbound",
    localLocation: "ocapn://alice.example",
    localPublicKey: "alice-pubkey",
    localSide: "alice-side",
    acceptableLocationSig: "sig:alice-location",
  }).session;
  const carol = openSession({
    id: "session:carol-outbound",
    localLocation: "ocapn://carol.example",
    localPublicKey: "carol-pubkey",
    localSide: "carol-side",
    acceptableLocationSig: "sig:carol-location",
  }).session;
  const aliceIdentifier = captpPublicIdentifier(alice.localPublicKey);
  const carolIdentifier = captpPublicIdentifier(carol.localPublicKey);

  assert.equal(aliceIdentifier, "a1b45b7f68a35a1cb6d8fd970ce7326ea0a291006e61b82d6749ed48e5dd85db");
  assert.equal(carolIdentifier, "96a0b80218f5d8b8ebf98d76cd0a39d049d36718200396604e161c23a754f755");
  assert.equal(captpSessionIdentifier(aliceIdentifier, carolIdentifier), "e343b5783e26a54a8a9c9bea9ec9332ae1c77258ff18131db92d8f4f5a3f22c3");
  assert.equal(captpSessionIdentifier(carolIdentifier, aliceIdentifier), "e343b5783e26a54a8a9c9bea9ec9332ae1c77258ff18131db92d8f4f5a3f22c3");

  const resolution = resolveCrossedHellos(alice, carol, aliceIdentifier, carolIdentifier);
  assert.equal(resolution.kind, "animating.captp.crossed-hello-resolution");
  assert.equal(resolution.winner, "local");
  assert.equal(resolution.kept.id, "session:alice-outbound");
  assert.equal(resolution.kept.status, "live");
  assert.equal(resolution.kept.remoteLocation, "ocapn://carol.example");
  assert.equal(resolution.kept.remotePublicKey, "carol-pubkey");
  assert.equal(resolution.dropped.status, "aborted");
  assert.ok(resolution.dropped.abortReason.includes("higher public identifier"));

  const rows = crossedHelloWitnessLog(resolution, "2026-06-27T00:06:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["started", "aborted"]);
  assert.ok(rows[0].a.includes("winner=local"));
  assert.ok(rows[0].a.includes(`localIdentifier=${aliceIdentifier}`));
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:06:00.000Z"), true);

  const remoteWins = resolveCrossedHellos(alice, carol, "00", "ff");
  assert.equal(remoteWins.winner, "remote");
  assert.equal(remoteWins.kept.id, "session:carol-outbound");

  const tie = resolveCrossedHellos(alice, carol, aliceIdentifier, aliceIdentifier);
  assert.equal(tie.winner, "tie");
  assert.equal(tie.kept.status, "aborted");
  assert.equal(tie.dropped.status, "aborted");
});

test("CapTP operation values encode ordinary, bootstrap, GC, and abort wire moves", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:op");
  const ordinary = deliverOp(exportDesc(1, greeterRef), ["foo"], 7, importObjectDesc(5, greeterRef));
  const pipelined = deliverOp(answerDesc(foo, 7), ["bar"], 8, false);
  const fetch = bootstrapFetchOp("swiss:greeter", 3, 5);
  const gc = gcAnswersOp([8, 7]);

  assert.equal(ordinary.kind, "op:deliver");
  assert.equal(ordinary.answerPos, 7);
  assert.equal(pipelined.toDesc.kind, "desc:answer");
  assert.deepEqual(fetch.args, ["fetch", "swiss:greeter"]);
  assert.equal(fetch.toDesc.position, 0);
  assert.deepEqual([...gc.answerPositions], [8, 7]);
  assert.equal(operationStandingKey(gc), "op:gc-answers:7,8");
  assert.throws(() => gcAnswersOp([0]), /positive integers/);

  const aborted = abortSession({
    kind: "animating.captp.session",
    id: "session:alice-carol:abort",
    version: "1.0",
    localLocation: "ocapn://alice.example",
    localPublicKey: "alice-pubkey",
    localSide: "alice-side",
    acceptableLocationSig: "sig",
    status: "live",
  }, "network disconnected");
  assert.equal(aborted.operation.kind, "op:abort");
  assert.equal(aborted.session.status, "aborted");

  const rows = operationWitnessLog([ordinary, pipelined, fetch, gc, aborted.operation]);
  assert.deepEqual(rows.map((row) => row.v), ["sent", "sent", "sent", "gc", "aborted"]);
});

test("op:abort seals the session transcript and blocks later operations", () => {
  const before = deliverOp(exportDesc(1, greeterRef), ["foo"], 7, importObjectDesc(5, greeterRef));
  const abort = abortOp("network disconnected");
  const after = deliverOp(exportDesc(1, greeterRef), ["late"], 8, false);
  const transcript = foldSessionTranscript("session:alice-carol:abort-fold", [before, abort, after]);

  assert.equal(transcript.kind, "animating.captp.session-transcript");
  assert.equal(transcript.status, "aborted");
  assert.equal(transcript.abort, abort);
  assert.deepEqual(transcript.operations.map((operation) => operation.kind), ["op:deliver", "op:abort"]);
  assert.deepEqual(transcript.blocked.map((entry) => entry.reason), ["session already aborted"]);
  assert.ok(transcript.blocked[0].operation.includes("late"));

  const rows = sessionTranscriptWitnessLog(transcript, "2026-06-27T00:07:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["sent", "aborted", "blocked"]);
  assert.ok(rows[2].a.includes("captp.session-transcript.blocked"));
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:07:00.000Z"), true);
});

test("accepted session operations commit to a causal transcript hash chain", () => {
  const before = deliverOp(exportDesc(1, greeterRef), ["foo"], 7, importObjectDesc(5, greeterRef));
  const abort = abortOp("network disconnected");
  const after = deliverOp(exportDesc(1, greeterRef), ["late"], 8, false);
  const transcript = foldSessionTranscript("session:alice-carol:commit", [before, abort, after]);
  const chain = commitSessionTranscript(transcript, "seed:alice-carol");

  assert.equal(chain.kind, "animating.captp.transcript-commit-chain");
  assert.equal(chain.seed, "seed:alice-carol");
  assert.equal(chain.commits.length, 2);
  assert.equal(chain.commits[0].previous, "seed:alice-carol");
  assert.equal(chain.commits[1].previous, chain.commits[0].hash);
  assert.equal(chain.head, chain.commits[1].hash);
  assert.equal(chain.commits.every((commit) => commit.operation.includes("late") === false), true);

  const same = commitSessionTranscript(foldSessionTranscript("session:alice-carol:commit", [before, abort, after]), "seed:alice-carol");
  const reordered = commitSessionTranscript(foldSessionTranscript("session:alice-carol:commit", [abort, before, after]), "seed:alice-carol");
  const reseeded = commitSessionTranscript(transcript, "seed:other");
  assert.equal(same.head, chain.head);
  assert.notEqual(reordered.head, chain.head);
  assert.notEqual(reseeded.head, chain.head);

  const rows = transcriptCommitWitnessLog(chain, "2026-06-27T00:09:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["committed", "committed"]);
  assert.ok(rows[1].a.includes(`previous=${chain.commits[0].hash}`));
  assert.ok(rows[1].a.includes(`head=${chain.head}`));
});

test("op:gc-exports spends counted export references until the object is dropped", () => {
  const table = trackExport(trackExport(exportTable("session:alice-carol"), 5, greeterRef), 5, greeterRef);
  assert.equal(table.exports[0].count, 2);
  assert.equal(table.exports[0].status, "live");

  const decrement = gcExportsOp([5], [1]);
  const retained = applyGcExports(table, decrement);
  assert.equal(operationStandingKey(decrement), "op:gc-exports:5:1");
  assert.equal(retained.table.exports[0].count, 1);
  assert.equal(retained.table.exports[0].status, "live");
  assert.deepEqual([...retained.dropped], []);
  assert.deepEqual(operationWitnessLog([decrement]).map((row) => row.v), ["gc"]);

  const terminal = applyGcExports(retained.table, gcExportsOp([5], [1]));
  assert.equal(terminal.table.exports[0].count, 0);
  assert.equal(terminal.table.exports[0].status, "dropped");
  assert.deepEqual([...terminal.dropped], [5]);
  assert.equal(exportTableWitnessLog(terminal.table)[0].v, "dropped");
  assert.ok(exportTableWitnessLog(terminal.table)[0].a.includes("count=0"));
  assert.equal(exportGcWitnessLog(terminal)[0].v, "gc");

  const missing = applyGcExports(terminal.table, gcExportsOp([9], [1]));
  assert.deepEqual([...missing.blocked], ["missing export position: 9"]);
  assert.equal(exportGcWitnessLog(missing)[0].v, "blocked");
  assert.throws(() => gcExportsOp([5], []), /same length/);
  assert.throws(() => trackExport(table, 0, greeterRef), /positive integers/);
});

test("answer positions fold as affine session loci and gc makes them unavailable", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:answer-table");
  const first = deliverOp(exportDesc(1, greeterRef), ["foo"], 7, importObjectDesc(5, greeterRef));
  const follow = deliverOp(answerDesc(foo, 7), ["bar"], 8, false);
  const table = foldAnswerTable("session:alice-carol", [first, follow, gcAnswersOp([7]), gcAnswersOp([8])]);

  assert.equal(table.kind, "animating.captp.answer-table");
  assert.deepEqual(table.answers.map((slot) => [slot.position, slot.status]), [[7, "dropped"], [8, "dropped"]]);
  assert.deepEqual([...table.blocked], []);

  const rows = answerTableWitnessLog(table, "2026-06-27T00:05:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["dropped", "dropped"]);
  assert.ok(rows[0].a.includes("createdBy=op:deliver:desc:export:1:urn:cap:greeter:1:7:desc:import-object:5:urn:cap:greeter:1:foo"));
  assert.ok(rows[0].a.includes("droppedBy=op:gc-answers:7"));
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:05:00.000Z"), true);
});

test("answer-table discipline blocks duplicate creation and post-gc desc:answer use", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:answer-table:block");
  const first = deliverOp(exportDesc(1, greeterRef), ["foo"], 7, importObjectDesc(5, greeterRef));
  const duplicate = deliverOp(exportDesc(1, greeterRef), ["again"], 7, false);
  const afterGc = deliverOp(answerDesc(foo, 7), ["late"], 9, false);
  const missing = listenOp(answerDesc(foo, 12), importObjectDesc(14));
  const table = foldAnswerTable("session:alice-carol", [first, duplicate, gcAnswersOp([7]), afterGc, missing]);

  assert.deepEqual(table.answers.map((slot) => [slot.position, slot.status]), [[7, "dropped"], [9, "blocked"]]);
  assert.deepEqual(table.blocked.map((entry) => entry.reason), [
    "answer position was already created",
    "answer position was already garbage-collected",
    "answer position has not been created",
  ]);

  const rows = answerTableWitnessLog(table);
  assert.equal(rows.filter((row) => row.v === "blocked").length, 4);
  assert.ok(rows.some((row) => row.a.includes("reason=answer position was already garbage-collected")));
  assert.ok(rows.some((row) => row.a.includes("operation=op:listen:desc:answer:12:p:foo:answer-table:block:desc:import-object:14:")));
});

test("op:listen installs a resolver and folds fulfill settlement into a promise trace", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:listen");
  const answer = answerDesc(foo, 9);
  const resolver = importPromiseDesc(12, foo.answer);
  const listen = listenOp(answer, resolver);
  const fulfill = fulfillResolverOp(exportDesc(12), { ok: true, ref: greeterRef.id });
  const trace = foldPromiseTrace([listen, fulfill]);

  assert.deepEqual(listen, {
    kind: "op:listen",
    toDesc: answer,
    listenDesc: resolver,
  });
  assert.equal(operationStandingKey(listen), "op:listen:desc:answer:9:p:foo:listen:desc:import-promise:12:p:foo:listen");
  assert.equal(fulfill.args[0], "fulfill");
  assert.equal(trace.length, 1);
  assert.equal(trace[0].promise, "desc:answer:9:p:foo:listen");
  assert.equal(trace[0].resolverPosition, 12);
  assert.equal(trace[0].status, "fulfilled");
  assert.deepEqual(trace[0].value, { ok: true, ref: greeterRef.id });

  const rows = promiseTraceWitnessLog(trace);
  assert.deepEqual(rows.map((row) => row.v), ["settled"]);
  assert.ok(rows[0].a.includes("status=fulfilled"));
});

test("resolver break settlement folds into a broken promise trace", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:listen:break");
  const listen = listenOp(answerDesc(foo, 10), importObjectDesc(13));
  const broken = breakResolverOp(exportDesc(13), "remote exception");
  const trace = foldPromiseTrace([listen, broken]);

  assert.equal(broken.args[0], "break");
  assert.equal(trace.length, 1);
  assert.equal(trace[0].status, "broken");
  assert.equal(trace[0].reason, "remote exception");

  const rows = promiseTraceWitnessLog(trace, "2026-06-27T00:02:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["broken"]);
  assert.equal(rows[0].t, "2026-06-27T00:02:00.000Z");
});

test("session abort breaks unresolved promise listeners", () => {
  const foo = deliver(greeterRef, "foo", [], "p:foo:listen:abort");
  const listen = listenOp(answerDesc(foo, 11), importObjectDesc(15));
  const trace = foldPromiseTrace([listen, abortOp("vat disconnected")]);

  assert.equal(trace.length, 1);
  assert.equal(trace[0].status, "broken");
  assert.equal(trace[0].reason, "vat disconnected");

  const rows = promiseTraceWitnessLog(trace, "2026-06-27T00:08:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["broken"]);
  assert.ok(rows[0].a.includes("status=broken"));
});

test("get/index/untag operations fold structural promise projections into witness rows", () => {
  const root = deliver(greeterRef, "profile", [], "p:profile");
  const profile = answerDesc(root, 20);
  const address = getOp(profile, "addresses", 21);
  const firstAddress = indexOp(answerDesc({ ...root, answer: "p:addresses" }, 21), 0, 22);
  const verified = untagOp(answerDesc({ ...root, answer: "p:first-address" }, 22), "VerifiedAddress", 23);
  const trace = foldProjectionTrace([address, firstAddress, verified]);

  assert.equal(address.kind, "op:get");
  assert.equal(firstAddress.kind, "op:index");
  assert.equal(verified.kind, "op:untag");
  assert.equal(operationStandingKey(address), "op:get:desc:answer:20:p:profile:addresses:21");
  assert.throws(() => indexOp(profile, -1, 24), /non-negative integers/);

  assert.deepEqual(trace.map((entry) => entry.selector), ["field", "index", "tag"]);
  assert.deepEqual(trace.map((entry) => entry.answerPos), [21, 22, 23]);
  assert.equal(trace[0].value, "addresses");
  assert.equal(trace[1].value, 0);
  assert.equal(trace[2].value, "VerifiedAddress");

  const rows = projectionTraceWitnessLog(trace, "2026-06-27T00:03:00.000Z");
  assert.deepEqual(rows.map((row) => row.v), ["projected", "projected", "projected"]);
  assert.equal(rows.every((row) => row.t === "2026-06-27T00:03:00.000Z"), true);
  assert.ok(rows[0].a.includes("selector=field"));
  assert.ok(rows[1].a.includes("value=0"));
  assert.ok(rows[2].a.includes("selector=tag"));
});

test("bootstrap gift operations are descriptor-bearing deliveries to export zero", () => {
  const graph = pipelineAuthorityGraph([greeterRef], [deliver(greeterRef, "foo", [], "p:foo:bootstrap-gift")], ["carol#greeter"]);
  const vat = vatFromAuthorityGraph("vat:alice", graph);
  const gift = offerHandoffGift(vat, {
    id: "gift:greeter:bootstrap",
    exporter: "vat:carol",
    exporterLocation: "ocapn://carol.example",
    gifter: "https://vat.example/alice",
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    gifterExporterSession: "session:alice-carol",
    gifterSide: "alice-side-1",
    presence: greeterRef.id,
  });
  const deposit = bootstrapDepositGiftOp(gift, 5);

  assert.equal(deposit.toDesc.kind, "desc:export");
  assert.equal(deposit.toDesc.position, 0);
  assert.equal(deposit.answerPos, false);
  assert.equal(deposit.args[0], "deposit-gift");
  assert.equal(deposit.args[1], gift.id);
  assert.equal(deposit.args[2].kind, "desc:import-object");

  const give = sigEnvelope(handoffGiveDesc(gift), "alice-side-1", "sig:alice-give");
  const receive = handoffReceiveDesc({
    giftId: gift.id,
    receiver: "https://vat.example/bob",
    receiverKey: "bob-key-1",
    receivingSession: "session:bob-carol",
    receivingSide: "bob-side-1",
    handoffCount: 2,
  }, give);
  const signedReceive = sigEnvelope(receive, "bob-key-1", "sig:bob-receive");
  const withdraw = bootstrapWithdrawGiftOp(signedReceive, 4, 6);

  assert.equal(withdraw.toDesc.position, 0);
  assert.equal(withdraw.args[0], "withdraw-gift");
  assert.equal(withdraw.args[1].kind, "desc:sig-envelope");
  assert.equal(withdraw.answerPos, 4);
  assert.equal(withdraw.resolveMeDesc.position, 6);
  assert.throws(() => bootstrapDepositGiftOp({ ...gift, status: "blocked", reason: "not live" }, 5), /not live/);
});

// --- (2) an unheld capability cannot be delivered --------------------------

test("a held locus is admitted: authority by move, the holder holds it", () => {
  const affordances = ["carol#greeter", "carol#logger"];
  const admission = admit(affordances, greeterRef);
  assert.ok(admission.admitted, "a sturdyref to a held move must be deliverable");
  assert.equal(admission.locus, "carol#greeter");
});

test("an UNHELD capability cannot be delivered even with the unforgeable ref bytes", () => {
  // The holder's open affordances do NOT include the greeter locus.
  const affordances = ["carol#logger", "carol#clock"];
  const admission = admit(affordances, greeterRef);
  assert.equal(admission.admitted, false, "possessing the bytes must not deliver a move the holder lacks");
});

// --- the sturdyref is a VIEW of the Capability (no second ontology) --------

test("refOf projects the Capability onto its sturdyref without a second authority model", () => {
  assert.equal(greeterRef.id, greeterCap.id, "ref bytes = the capability id");
  assert.equal(greeterRef.locus, greeterCap.grants, "ref locus = the capability grant");
  assert.equal(greeterRef.holder, greeterCap.holder, "ref holder = the capability holder");
});

test("refOfMacaroon projects the attenuated token as the narrowed sturdyref power", () => {
  const token = {
    kind: "playing.macaroons.token",
    id: "urn:macaroon:greeter:read",
    capability: {
      id: "urn:cap:greeter:read",
      grants: "carol#greeter.read",
      holder: "https://vat.example/alice",
      parent: greeterCap.id,
    },
    caveats: [],
    signature: "hmac-model(root -> read)",
  };

  const ref = refOfMacaroon(token);
  assert.equal(ref.id, token.id, "ref bytes = the attenuated token id");
  assert.equal(ref.locus, "carol#greeter.read", "ref locus = the narrowed token grant");
  assert.equal(ref.holder, "https://vat.example/alice");
});
