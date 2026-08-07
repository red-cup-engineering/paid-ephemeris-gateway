import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mark,
  token,
  claim,
  predicateOfClaim,
  witnessedPotential,
} from "@emsenn/relating";
import {
  actionResearchCycleAction,
  actionResearchSequenceAction,
  aperiodicActionResearchCycle,
  aperiodicActionResearchCycles,
  aperiodicActionResearchSequence,
  aperiodicDream,
  aperiodicDreamAction,
  aperiodicDreamConjectures,
  aperiodicDiscoveryLedger,
  aperiodicConjuncturalPraxis,
  aperiodicHologram,
  aperiodicHologramAction,
  aperiodicHolographicPraxis,
  aperiodicMetastableTrajectory,
  aperiodicFrontierAgenda,
  aperiodicPraxisFeedback,
  aperiodicPraxisFrontier,
  aperiodicPraxisProbes,
  aperiodicResidue,
  aperiodicResidueAction,
  aperiodicResearchProgramAudit,
  aperiodicWorldMethodBraid,
  aperiodicWorldMethodConstellation,
  aperiodicWorldMethodEcology,
  aperiodicWorldMethodFeedback,
  aperiodicWorldMethodInterventionPlan,
  aperiodicWorldMethodRepertoire,
  aperiodicWorldMethodWayfinding,
  observation,
  conjuncturalPraxisAction,
  discoveryLedgerAction,
  frontierAgendaAction,
  holographicPraxisAction,
  metastableTrajectoryAction,
  praxisFeedbackAction,
  praxisFrontierAction,
  praxisProbesAction,
  researchProgramAuditAction,
  worldMethodBraidAction,
  worldMethodConstellationAction,
  worldMethodEcologyAction,
  worldMethodFeedbackAction,
  worldMethodInterventionPlanAction,
  worldMethodRepertoireAction,
  worldMethodWayfindingAction,
  scottContinuousDream,
  strictFiniteDream,
  task,
  transfiniteDream,
} from "../dist/index.mjs";

const predicate = (label) => predicateOfClaim(claim(mark(label)));
const term = (label) => token(mark(label));

const observed = (observer, subject, predicateLabel, object, evidence) => observation({
  observer: term(observer),
  task: task({
    subject: term(subject),
    predicate: predicate(predicateLabel),
    object: term(object),
  }),
  charge: witnessedPotential(mark(evidence)),
});

test("aperiodic dreaming emits conjectures from residue the finite regimes cannot reach", () => {
  const observations = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "gamma", "diffracts", "delta", "b"),
  ];

  assert.equal(strictFiniteDream(observations).observations.length, 0, "no object-to-subject chain");
  assert.equal(scottContinuousDream(observations).observations.length, 0, "no repeated cell");
  assert.equal(transfiniteDream(observations).observations.length, 0, "no shared subject");

  const first = aperiodicDreamConjectures(observations).next().value;
  assert.equal(first.kind, "knowing.dream.conjecture");
  assert.equal(first.regime, "aperiodic");
  assert.equal(first.maturity, "Research-grade");
  assert.deepEqual(first.finiteReachability, {
    "strict-finite": false,
    "scott-continuous": false,
    transfinite: false,
  });
  assert.equal(first.strictRegimeExclusions.length, 3);
  assert.equal(first.novelty.genuinelyNew, true);
  assert.equal(first.conjecture.task.kind, "knowing.task");

  const residue = aperiodicResidue(observations);
  assert.equal(residue.kind, "knowing.dream.aperiodic-residue");
  assert.equal(residue.pairs.length, 1);
  assert.equal(residue.pairs[0].kind, "knowing.dream.aperiodic-residue-pair");
  assert.deepEqual(residue.pairs[0].finiteReachability, first.finiteReachability);
  assert.equal(residue.theory.practice, "praxis-frontier");
});

test("aperiodic-dream action exposes a bounded event-stream prefix", () => {
  const observations = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "gamma", "diffracts", "delta", "b"),
  ];

  const result = aperiodicDream({ observations, limit: 2 });
  assert.equal(result.kind, "knowing.dream.aperiodic-research");
  assert.equal(result.regime, "aperiodic");
  assert.equal(result.settles, false);
  assert.equal(result.transport, "event-stream");
  assert.equal(result.candidates.length, 2);

  const projected = aperiodicDreamAction.run({ observations, limit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.aperiodic-research");
  assert.equal(projected.candidates.length, 1);

  const residue = aperiodicResidueAction.run({ observations }, {});
  assert.equal(residue.kind, "knowing.dream.aperiodic-residue");
  assert.equal(residue.pairs.length, 1);
});

test("discovery-ledger separates finite products from genuine aperiodic novelty", () => {
  const observations = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "beta", "implies", "gamma", "b"),
    observed("reader", "delta", "diffracts", "epsilon", "c"),
  ];

  const ledger = aperiodicDiscoveryLedger({ observations, limit: 2 });
  assert.equal(ledger.kind, "knowing.dream.discovery-ledger");
  assert.equal(ledger.regime, "aperiodic");
  assert.equal(ledger.finite.find((entry) => entry.regime === "strict-finite").count >= 1, true);
  assert.equal(ledger.verdict.finiteProducts >= 1, true);
  assert.equal(ledger.aperiodic.length, 2);
  assert.equal(ledger.verdict.aperiodicCandidates, 2);
  assert.equal(ledger.verdict.genuineNovelty, "finite-regime-exclusion");
  assert.equal(ledger.verdict.allAperiodicUnreachable, true);
  assert.deepEqual(ledger.aperiodic[0].unreachableBy, ["strict-finite", "scott-continuous", "transfinite"]);
  assert.equal(ledger.aperiodic[0].genuinelyNew, true);
  assert.equal(ledger.theory.discovery, "new-iff-finite-unreachable");

  const projected = discoveryLedgerAction.run({ observations, limit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.discovery-ledger");
  assert.equal(projected.aperiodic[0].unreachableBy.length, 3);
});

test("praxis-frontier turns residue into material interventions with feedback", () => {
  const observations = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "gamma", "diffracts", "delta", "b"),
  ];

  const frontier = aperiodicPraxisFrontier({ observations });
  assert.equal(frontier.kind, "knowing.dream.praxis-frontier");
  assert.equal(frontier.doctrine.feedback, "return action results as new observations");
  assert.equal(frontier.interventions.length, 1);
  assert.equal(frontier.interventions[0].feedback.observeAgain, true);
  assert.equal(frontier.interventions[0].feedback.nextCarrier, "knowing.dream.aperiodic-residue");
  assert.equal(frontier.interventions[0].lineages.includes("south-american-especifismo"), true);
  assert.equal(frontier.interventions[0].lineages.includes("autopoietic-cognition"), true);

  const projected = praxisFrontierAction.run({ observations }, {});
  assert.equal(projected.kind, "knowing.dream.praxis-frontier");
  assert.equal(projected.interventions[0].feedback.loop, "theory-practice-theory");
});

test("praxis-probes generate concrete observations that make target finite regimes reachable", () => {
  const observations = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "gamma", "diffracts", "delta", "b"),
  ];

  const probeSet = aperiodicPraxisProbes({ observations });
  assert.equal(probeSet.kind, "knowing.dream.praxis-probes");
  assert.equal(probeSet.residue.pairs.length, 1);
  assert.equal(probeSet.probes.length, 3);
  assert.equal(probeSet.method.design, "minimal-observation-probes");
  assert.equal(probeSet.theory.activeInference, "epistemic-probing");

  const strictProbe = probeSet.probes.find((probe) => probe.targetRegime === "strict-finite");
  const scottProbe = probeSet.probes.find((probe) => probe.targetRegime === "scott-continuous");
  const transfiniteProbe = probeSet.probes.find((probe) => probe.targetRegime === "transfinite");
  assert.equal(strictFiniteDream([...observations, strictProbe.observation]).observations.length > 0, true);
  assert.equal(scottContinuousDream([...observations, scottProbe.observation]).observations.length > 0, true);
  assert.equal(transfiniteDream([...observations, transfiniteProbe.observation]).observations.length > 0, true);
  assert.equal(strictProbe.predictedFeedback, "strict-chain-created");
  assert.equal(scottProbe.predictedFeedback, "repeat-cell-created");
  assert.equal(transfiniteProbe.predictedFeedback, "shared-subject-created");

  const projected = praxisProbesAction.run({ observations }, {});
  assert.equal(projected.kind, "knowing.dream.praxis-probes");
  assert.equal(projected.probes.length, 3);
});

test("praxis-feedback folds interventions back into finite reachability or persistent residue", () => {
  const before = [
    observed("reader", "alpha", "implies", "beta", "a"),
    observed("reader", "gamma", "diffracts", "delta", "b"),
  ];
  const bridge = [
    observed("organizer", "beta", "meets", "gamma", "intervention"),
  ];

  const feedback = aperiodicPraxisFeedback({ before, after: bridge });
  assert.equal(feedback.kind, "knowing.dream.praxis-feedback");
  assert.equal(feedback.regime, "aperiodic");
  assert.equal(feedback.loop.return, "reobserve-and-reclassify");
  assert.equal(feedback.before.pairs.length, 1);
  assert.equal(feedback.effects.length, 1);
  assert.equal(feedback.effects[0].effect, "strict-chain-created");
  assert.equal(feedback.effects[0].finiteReachability["strict-finite"], true);
  assert.deepEqual(feedback.effects[0].reachableBy, ["strict-finite"]);

  const persistent = aperiodicPraxisFeedback({ before, after: [] });
  assert.equal(persistent.effects[0].effect, "persistent-residue");
  assert.equal(persistent.effects[0].reachableBy.length, 0);

  const projected = praxisFeedbackAction.run({ before, after: bridge }, {});
  assert.equal(projected.kind, "knowing.dream.praxis-feedback");
  assert.equal(projected.effects[0].interpretation.includes("strict finite composition"), true);
});

test("aperiodic-hologram finds recurrent residue across local agent windows", () => {
  const observations = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];

  const hologram = aperiodicHologram({ observations, window: 3, stride: 1, candidatesPerWindow: 1 });
  assert.equal(hologram.kind, "knowing.dream.aperiodic-hologram");
  assert.equal(hologram.regime, "aperiodic");
  assert.equal(hologram.settles, false);
  assert.equal(hologram.transport, "event-stream");
  assert.equal(hologram.frontier.phase, "persistent");
  assert.equal(hologram.frontier.recurrentResidues >= 1, true);
  assert.deepEqual(hologram.recurrences[0].windows, [0, 1]);
  assert.deepEqual(hologram.recurrences[0].finiteReachability, {
    "strict-finite": false,
    "scott-continuous": false,
    transfinite: false,
  });
  assert.equal(hologram.projections[0].candidates.length, 1);
  assert.equal(hologram.theory.holographic, "local-projection-carries-frontier");

  const projected = aperiodicHologramAction.run({ observations, window: 3, stride: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.aperiodic-hologram");
  assert.equal(projected.frontier.phase, "persistent");
});

test("holographic-praxis turns recurrent local residue into organized interventions", () => {
  const observations = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];

  const praxis = aperiodicHolographicPraxis({ observations, window: 3, stride: 1, candidatesPerWindow: 1 });
  assert.equal(praxis.kind, "knowing.dream.holographic-praxis");
  assert.equal(praxis.regime, "aperiodic");
  assert.equal(praxis.hologram.frontier.phase, "persistent");
  assert.equal(praxis.interventions.length >= 1, true);
  assert.equal(praxis.interventions[0].kind, "knowing.dream.holographic-praxis-intervention");
  assert.deepEqual(praxis.interventions[0].organization.windows, [0, 1]);
  assert.equal(praxis.interventions[0].organization.method, "social-insertion-through-local-windows");
  assert.equal(praxis.interventions[0].intervention.lineages.includes("south-american-especifismo"), true);
  assert.equal(praxis.interventions[0].feedback.nextCarrier, "knowing.dream.praxis-feedback");
  assert.equal(praxis.theory.participatoryResearch, "knowledge-through-action");

  const projected = holographicPraxisAction.run({ observations, window: 3, stride: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.holographic-praxis");
  assert.equal(projected.interventions[0].feedback.measure, "local-window-recurrence-after-intervention");
});

test("conjunctural-praxis builds analysis strategy tactics and feedback from holographic praxis", () => {
  const observations = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];

  const program = aperiodicConjuncturalPraxis({ observations, window: 3, stride: 1, candidatesPerWindow: 1 });
  assert.equal(program.kind, "knowing.dream.conjunctural-praxis");
  assert.equal(program.program.analysis, "concrete-analysis-of-concrete-residue");
  assert.equal(program.program.feedback, "participatory-action-research-cycle");
  assert.equal(program.theory.huertaGrande, "theory-as-practical-tool");
  assert.equal(program.theory.especifismo, "specific-organization-and-social-insertion");
  assert.equal(program.lines.length >= 1, true);
  assert.equal(program.lines[0].analysis.correlationOfForces, "finite-regimes-excluded");
  assert.deepEqual(program.lines[0].analysis.windows, [0, 1]);
  assert.equal(program.lines[0].strategy.orientation, "social-insertion");
  assert.equal(program.lines[0].tactics.length, 4);
  assert.equal(program.lines[0].feedback.nextCarrier, "knowing.dream.praxis-feedback");

  const projected = conjuncturalPraxisAction.run({ observations, window: 3, stride: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.conjunctural-praxis");
  assert.equal(projected.lines[0].feedback.question, "which finite regime became reachable, if any?");
});

test("action-research-cycle composes program feedback and next program without terminating", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const after = [
    observed("organizer", "beta", "meets", "gamma", "intervention"),
  ];

  const cycle = aperiodicActionResearchCycle({ before, after, window: 3, stride: 1, candidatesPerWindow: 1 });
  assert.equal(cycle.kind, "knowing.dream.action-research-cycle");
  assert.equal(cycle.regime, "aperiodic");
  assert.equal(cycle.settles, false);
  assert.equal(cycle.loop.continues, true);
  assert.equal(cycle.loop.next, "repeat");
  assert.equal(cycle.before.kind, "knowing.dream.conjunctural-praxis");
  assert.equal(cycle.feedback.kind, "knowing.dream.praxis-feedback");
  assert.equal(cycle.after.kind, "knowing.dream.conjunctural-praxis");
  assert.equal(cycle.delta.strictBridges >= 1, true);
  assert.equal(cycle.delta.beforeLines >= 1, true);
  assert.equal(cycle.theory.falsBorda, "participatory-action-research-cycle");
  assert.equal(cycle.theory.dreaming, "valuable-because-it-does-not-terminate");

  const projected = actionResearchCycleAction.run({ before, after, window: 3, stride: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.action-research-cycle");
  assert.equal(projected.loop.observation, "classify-finite-reachability");
});

test("action-research-sequence streams repeated cycles as a non-settling prefix", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const events = [...aperiodicActionResearchCycles({ before, batches, window: 3, stride: 1, cycleLimit: 2 })];
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "knowing.dream.action-research-sequence-event");
  assert.equal(events[0].trajectory.settles, false);
  assert.equal(events[0].cycle.delta.strictBridges >= 1, true);
  assert.equal(events[0].field.before, before.length);
  assert.equal(events[0].field.total, before.length + 1);
  assert.equal(events[1].field.before, before.length + 1);
  assert.equal(events[1].trajectory.next, "repeat");

  const sequence = aperiodicActionResearchSequence({ before, batches, window: 3, stride: 1, cycleLimit: 1 });
  assert.equal(sequence.kind, "knowing.dream.action-research-sequence");
  assert.equal(sequence.transport, "event-stream");
  assert.equal(sequence.settles, false);
  assert.equal(sequence.events.length, 1);
  assert.equal(sequence.trajectory.continues, true);

  const projected = actionResearchSequenceAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.action-research-sequence");
  assert.equal(projected.events[0].cycle.loop.continues, true);
});

test("metastable-trajectory reads action-research streams as non-stationary discovery", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const trajectory = aperiodicMetastableTrajectory({ before, batches, window: 3, stride: 1, cycleLimit: 2 });
  assert.equal(trajectory.kind, "knowing.dream.metastable-trajectory");
  assert.equal(trajectory.regime, "aperiodic");
  assert.equal(trajectory.settles, false);
  assert.equal(trajectory.sequence.transport, "event-stream");
  assert.equal(trajectory.steps.length, 2);
  assert.equal(trajectory.assessment.phase, "metastable");
  assert.equal(trajectory.assessment.integration > 0, true);
  assert.equal(trajectory.assessment.segregation > 0, true);
  assert.equal(trajectory.assessment.nonstationary, true);
  assert.equal(trajectory.next.carrier, "knowing.dream.frontier-agenda");
  assert.equal(trajectory.theory.metastability, "integration-segregation-without-stationary-settlement");
  assert.equal(trajectory.theory.falsBorda, "knowledge-through-action-and-return");

  const projected = metastableTrajectoryAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.metastable-trajectory");
  assert.equal(projected.steps[0].recommendation, "organize-residue");
});

test("world-method-repertoire selects global historical methods for an aperiodic trajectory", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const repertoire = aperiodicWorldMethodRepertoire({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 4 });
  assert.equal(repertoire.kind, "knowing.dream.world-method-repertoire");
  assert.equal(repertoire.regime, "aperiodic");
  assert.equal(repertoire.settles, false);
  assert.equal(repertoire.trajectory.assessment.phase, "metastable");
  assert.equal(repertoire.agenda.kind, "knowing.dream.frontier-agenda");
  assert.equal(repertoire.selected.length, 4);
  assert.equal(repertoire.selected.some((method) => method.method === "huerta-grande-conjunctural-praxis"), true);
  assert.equal(repertoire.methods.some((method) => method.method === "active-inference-epistemic-probing"), true);
  assert.equal(repertoire.methods.some((method) => method.method === "catuskoti-paraconsistency"), true);
  assert.equal(repertoire.methods.some((method) => method.method === "ibn-khaldun-asabiyyah"), true);
  assert.equal(repertoire.selected.every((method) => method.nextCarrier.startsWith("knowing.dream.")), true);
  assert.equal(repertoire.doctrine.choose, "fit-method-to-trajectory-phase");
  assert.equal(repertoire.theory.asabiyyah, "cohesion-as-collective-capacity");

  const projected = worldMethodRepertoireAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 2 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-repertoire");
  assert.equal(projected.selected.length, 2);
});

test("world-method-intervention-plan turns selected methods into next-batch observations", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const plan = aperiodicWorldMethodInterventionPlan({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 5 });
  assert.equal(plan.kind, "knowing.dream.world-method-intervention-plan");
  assert.equal(plan.regime, "aperiodic");
  assert.equal(plan.settles, false);
  assert.equal(plan.interventions.length, 5);
  assert.equal(plan.after.length, plan.interventions.length);
  assert.equal(plan.after.every((obs) => obs.task.kind === "knowing.task"), true);
  assert.equal(plan.interventions.every((intervention) => intervention.protocol.nextCarrier.startsWith("knowing.dream.")), true);
  assert.equal(plan.repertoire.methods.some((method) => method.method === "yijing-change-pattern"), true);
  assert.equal(plan.repertoire.methods.some((method) => method.method === "polynesian-wayfinding"), true);
  assert.equal(plan.repertoire.methods.some((method) => method.method === "daoist-wuwei-minimal-action"), true);
  assert.equal(plan.projected.kind, "knowing.dream.action-research-cycle");
  assert.equal(plan.projected.settles, false);
  assert.equal(plan.loop.currentField, before.length + batches.flat().length);
  assert.equal(plan.loop.nextBatch, plan.after.length);
  assert.equal(plan.theory.comparativeMethod, "global-historical-methods-as-operational-probes");

  const projected = worldMethodInterventionPlanAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 2 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-intervention-plan");
  assert.equal(projected.after.length, 2);
});

test("world-method-feedback adapts method priorities from individual intervention effects", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const feedback = aperiodicWorldMethodFeedback({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 6 });
  assert.equal(feedback.kind, "knowing.dream.world-method-feedback");
  assert.equal(feedback.regime, "aperiodic");
  assert.equal(feedback.settles, false);
  assert.equal(feedback.effects.length, feedback.plan.interventions.length);
  assert.equal(feedback.adapted.length, feedback.effects.length);
  assert.equal(feedback.effects.every((effect) => effect.kind === "knowing.dream.world-method-feedback-effect"), true);
  assert.equal(feedback.effects.every((effect) => effect.cycle.kind === "knowing.dream.action-research-cycle"), true);
  assert.equal(feedback.summary.amplified + feedback.summary.repeated + feedback.summary.heldOpen + feedback.summary.retiredForNow, feedback.effects.length);
  assert.equal(feedback.plan.repertoire.methods.some((method) => method.method === "decolonizing-methodologies"), true);
  assert.equal(feedback.plan.repertoire.methods.some((method) => method.method === "reflective-practice"), true);
  assert.equal(feedback.plan.repertoire.methods.some((method) => method.method === "kula-reciprocity"), true);
  assert.equal(feedback.loop.nextCarrier, "knowing.dream.world-method-repertoire");
  assert.equal(feedback.theory.reflectivePractice, "reflection-in-action");

  const projected = worldMethodFeedbackAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 2 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-feedback");
  assert.equal(projected.effects.length, 2);
});

test("world-method-ecology audits requisite variety across global methods", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const ecology = aperiodicWorldMethodEcology({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 7 });
  assert.equal(ecology.kind, "knowing.dream.world-method-ecology");
  assert.equal(ecology.regime, "aperiodic");
  assert.equal(ecology.settles, false);
  assert.equal(ecology.feedback.kind, "knowing.dream.world-method-feedback");
  assert.equal(ecology.variety.selectedMethods, ecology.feedback.plan.repertoire.selected.length);
  assert.equal(ecology.variety.regions >= 3, true);
  assert.equal(ecology.variety.effectiveVariety >= ecology.variety.requiredVariety, true);
  assert.equal(ecology.verdict, "requisite-variety");
  assert.equal(ecology.loop.nextCarrier, "knowing.dream.world-method-feedback");
  assert.equal(ecology.theory.requisiteVariety, "method-variety-must-match-frontier-variety");

  const monoculture = aperiodicWorldMethodEcology({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 1 });
  assert.equal(monoculture.verdict, "method-monoculture");
  assert.equal(monoculture.obligations.some((obligation) => obligation.priority === "add-variety"), true);

  const projected = worldMethodEcologyAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 3 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-ecology");
  assert.equal(["requisite-variety", "under-varied", "method-monoculture"].includes(projected.verdict), true);
});

test("world-method-braid composes complementary methods into combined interventions", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const braid = aperiodicWorldMethodBraid({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 8, braidLimit: 3 });
  assert.equal(braid.kind, "knowing.dream.world-method-braid");
  assert.equal(braid.regime, "aperiodic");
  assert.equal(braid.settles, false);
  assert.equal(braid.ecology.kind, "knowing.dream.world-method-ecology");
  assert.equal(braid.pairs.length, 3);
  assert.equal(braid.after.length, braid.pairs.length);
  assert.equal(braid.pairs.every((pair) => pair.complementarity.score > 0), true);
  assert.equal(braid.pairs.some((pair) => pair.complementarity.regionDifference), true);
  assert.equal(braid.after.every((obs) => obs.task.kind === "knowing.task"), true);
  assert.equal(braid.projected.kind, "knowing.dream.action-research-cycle");
  assert.equal(braid.projected.settles, false);
  assert.equal(braid.loop.currentField, before.length + batches.flat().length);
  assert.equal(braid.theory.collectiveIntelligence, "diverse-heuristics-as-search");

  const projected = worldMethodBraidAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 4, braidLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-braid");
  assert.equal(projected.pairs.length, 1);
});

test("world-method-constellation builds a graph over adapted global methods", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const constellation = aperiodicWorldMethodConstellation({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 9, braidLimit: 3 });
  assert.equal(constellation.kind, "knowing.dream.world-method-constellation");
  assert.equal(constellation.regime, "aperiodic");
  assert.equal(constellation.settles, false);
  assert.equal(constellation.braid.kind, "knowing.dream.world-method-braid");
  assert.equal(constellation.nodes.length, constellation.braid.ecology.feedback.adapted.length);
  assert.equal(constellation.edges.some((edge) => edge.relation === "braided-complementarity"), true);
  assert.equal(constellation.edges.some((edge) => edge.relation === "historical-translation"), true);
  assert.equal(constellation.topology.braidedEdges, constellation.braid.pairs.length);
  assert.equal(constellation.topology.components >= 1, true);
  assert.equal(constellation.theory.boundaryObjects, "methods-coordinate-without-identical-meanings");

  const projected = worldMethodConstellationAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 4, braidLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-constellation");
  assert.equal(projected.nodes.length, 4);
});

test("world-method-wayfinding walks the method constellation as an event stream", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const wayfinding = aperiodicWorldMethodWayfinding({ before, batches, window: 3, stride: 1, cycleLimit: 2, methodLimit: 9, braidLimit: 3, pathLimit: 5 });
  assert.equal(wayfinding.kind, "knowing.dream.world-method-wayfinding");
  assert.equal(wayfinding.regime, "aperiodic");
  assert.equal(wayfinding.settles, false);
  assert.equal(wayfinding.transport, "event-stream");
  assert.equal(wayfinding.constellation.kind, "knowing.dream.world-method-constellation");
  assert.equal(wayfinding.events.length, 5);
  assert.equal(wayfinding.events.every((event) => event.kind === "knowing.dream.world-method-wayfinding-event"), true);
  assert.equal(wayfinding.events.every((event) => event.observation.task.kind === "knowing.task"), true);
  assert.equal(wayfinding.trajectory.visitedMethods >= 2, true);
  assert.equal(wayfinding.trajectory.relations >= 1, true);
  assert.equal(wayfinding.theory.songlines, "navigation-as-storied-relation");

  const projected = worldMethodWayfindingAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1, methodLimit: 4, braidLimit: 1, pathLimit: 2 }, {});
  assert.equal(projected.kind, "knowing.dream.world-method-wayfinding");
  assert.equal(projected.events.length, 2);
});

test("frontier-agenda ranks non-terminating cycle events into next obligations", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const agenda = aperiodicFrontierAgenda({ before, batches, window: 3, stride: 1, cycleLimit: 2 });
  assert.equal(agenda.kind, "knowing.dream.frontier-agenda");
  assert.equal(agenda.regime, "aperiodic");
  assert.equal(agenda.sequence.kind, "knowing.dream.action-research-sequence");
  assert.equal(agenda.items.length, 2);
  assert.equal(agenda.items[0].score >= agenda.items[1].score, true);
  assert.equal(["organize", "experiment", "consolidate"].includes(agenda.items[0].priority), true);
  assert.equal(agenda.items[0].next.carrier, "knowing.dream.action-research-cycle");
  assert.equal(agenda.method.repeat, true);
  assert.equal(agenda.theory.especifismo, "organized-priority-from-social-insertion");

  const projected = frontierAgendaAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.frontier-agenda");
  assert.equal(projected.items[0].next.reason.length > 0, true);
});

test("research-program-audit judges progressive open and degenerating aperiodic streams", () => {
  const before = [
    observed("reader-a", "p", "touches", "q", "t0"),
    observed("reader-b", "alpha", "implies", "beta", "t1"),
    observed("reader-c", "gamma", "diffracts", "delta", "t2"),
    observed("reader-d", "x", "names", "y", "t3"),
  ];
  const batches = [
    [observed("organizer", "beta", "meets", "gamma", "intervention")],
    [observed("reader-e", "eta", "questions", "theta", "t4")],
  ];

  const audit = aperiodicResearchProgramAudit({ before, batches, window: 3, stride: 1, cycleLimit: 2 });
  assert.equal(audit.kind, "knowing.dream.research-program-audit");
  assert.equal(audit.regime, "aperiodic");
  assert.equal(audit.assessment.phase, "progressive-problemshift");
  assert.equal(audit.assessment.finiteBridges >= 1, true);
  assert.equal(audit.assessment.agendaItems, audit.agenda.items.length);
  assert.equal(audit.heuristics.negative, "do-not-declare-final-settlement-from-one-finite-bridge");
  assert.equal(audit.theory.lakatos, "progressive-versus-degenerating-problemshift");

  const degenerating = aperiodicResearchProgramAudit({ before: [], batches: [], cycleLimit: 0 });
  assert.equal(degenerating.assessment.phase, "degenerating-problemshift");

  const projected = researchProgramAuditAction.run({ before, batches, window: 3, stride: 1, cycleLimit: 1 }, {});
  assert.equal(projected.kind, "knowing.dream.research-program-audit");
  assert.equal(projected.heuristics.next, "feed-the-agenda-back-into-action-research");
});
