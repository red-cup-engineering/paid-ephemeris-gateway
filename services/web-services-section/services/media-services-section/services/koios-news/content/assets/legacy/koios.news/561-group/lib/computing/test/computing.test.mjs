// Tests for computing-as-Eff = Kl(!) over ENRICHED AGENTS (no bare data), run against the
// built dist. computing is to the agent carrier what communicating is to the meme carrier:
// every operation admits a full @emsenn/animating agent and reads/relays it. The corpus's
// "computation = settling" is literal — an agent IS a settled computation, and `compute`
// reads its truth as one of FOUR.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compute, compose, relay, bang, transport, joinKnowledge,
  admitAgent, four, VERIFIED, REFUTED, UNDECIDABLE, CONTRADICTORY,
  computingFace, spectralSociety, computeAction, projectLsp, projectDap,
  observeLabels, projectObservationGame,
  settleBuildDerivation, lightObservation, reconstructFromHashes,
  diffFromBoundaryHashes,
  traceTileFromBuildTerm, traceTileFromAction, traceTileFromLspDocument,
  traceTileFromDapStop, foldTraceTiles,
  provenanceFromBuildTerm, coordinateHolographicCompute, ecosystemInfoTiling, regulateEcosystemCausalWidth, stabilizeEcosystemCausalWidth, readEcosystemRecursiveControl, openEcosystemRecursiveUnit, reconstructEcosystemCone, diffEcosystemCones,
  aperiodicTilesFromEcosystem, readAperiodicPatch, selfOrganizeAperiodicPatch, readAperiodicTheoryAtlas, planAperiodicBridges,
} from "../dist/index.mjs";
import { agent } from "@emsenn/animating";
import { admitSeed } from "@emsenn/animating";
import { tm } from "@emsenn/relating";

// enriched agents (built by animating), NOT bare values
const verifiedAgent = agent("the-sky|is-blue", { identity: "observer", goal: { predicate: "is-blue", charge: "potential" } });
const refutedAgent = agent("the-sky|is-blue", { identity: "observer", goal: { predicate: "is-green", charge: "potential" } });
const contradictedAgent = agent("the-sky|is-blue", { identity: "observer", goal: { predicate: "is-blue", charge: "stable" } });

test("compute reads a settled agent's computational truth as FOUR (computation = settling)", () => {
  const c = compute(verifiedAgent);
  assert.equal(c.kind, "computing.computation");
  // the computation EMBEDS the enriched agent — no bare data
  assert.equal(c.agent.kind, "animating.agent");
  assert.equal(c.members, 1);
  assert.equal(c.halted, verifiedAgent.glued);
  // the goal is carried by the settled individual → verified (t)
  assert.equal(c.standing.value, "verified");
  assert.equal(c.standing.symbol, "t");
  // single agent: aggregate = standing
  assert.deepEqual(c.aggregate, c.standing);
});

test("a settled-but-unsatisfied goal is refuted (f); a held-contradiction goal is contradictory (⊤)", () => {
  assert.equal(compute(refutedAgent).standing.value, "refuted");
  assert.equal(compute(contradictedAgent).standing.value, "contradictory");
  assert.equal(compute(contradictedAgent).standing.symbol, "⊤");
});

test("compose is the Kleisli relay of two agents into one composite agent (agent → agent)", () => {
  const composite = compose(verifiedAgent, refutedAgent);
  assert.equal(composite.kind, "animating.agent"); // codomain is the agent carrier, enriched
  assert.equal(composite.identity, "observer∘observer");
  assert.equal(composite.loop, "perceive->act");
});

test("relay settles a society of agents to its collective ≤_k knowledge (multi-agent)", () => {
  // a society where one agent verifies and another refutes aggregates to ⊤ ('told both')
  const r = relay(verifiedAgent, [verifiedAgent, refutedAgent]);
  assert.equal(r.kind, "computing.computation");
  assert.equal(r.members, 3);
  assert.equal(r.standing.value, "verified"); // the lead's result
  assert.equal(r.aggregate.value, "contradictory"); // the society's collective knowledge (≤_k join)

  // an agreeing society aggregates to its shared standing
  const agreeing = relay(verifiedAgent, [verifiedAgent]);
  assert.equal(agreeing.aggregate.value, "verified");
});

test("spectralSociety exposes agreement H1 as a normalized relating cohomology receipt", () => {
  const society = spectralSociety([verifiedAgent, verifiedAgent, verifiedAgent]);

  assert.equal(society.kind, "computing.spectral-society");
  assert.equal(society.clusters, 1);
  assert.equal(society.robust, true);
  assert.equal(society.irreducible, 1, "the complete three-agent agreement graph has one H1 loop");
  assert.equal(society.cohomology.kind, "computing.spectral-society.cohomology");
  assert.equal(society.cohomology.agents, 3);
  assert.equal(society.cohomology.edges, 3);
  assert.equal(society.cohomology.clusters, society.clusters);
  assert.equal(society.cohomology.h1, society.irreducible);
  assert.equal(society.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(society.cohomology.laplacian.kind, "predication.cohomology.laplacian");
  assert.equal(society.cohomology.laplacian.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
});

test("joinKnowledge is knowing's comonad ≤_k join over FOUR", () => {
  assert.equal(joinKnowledge(UNDECIDABLE, VERIFIED), VERIFIED); // ⊥ is the ≤_k bottom
  assert.equal(joinKnowledge(VERIFIED, REFUTED), CONTRADICTORY); // told both → ⊤
  assert.equal(joinKnowledge(VERIFIED, VERIFIED), VERIFIED); // idempotent
});

test("the faculty edges: bang (playing !A) and transport (communicating meme out)", () => {
  const banged = bang(verifiedAgent);
  assert.equal(banged.kind, "game.logic.prop");
  assert.equal(banged.connective, "ofCourse");

  const admission = transport(verifiedAgent);
  assert.equal(admission.action, "communicating.admit");
  assert.ok(admission.carrier);
});

test("FOUR is the 2×2 of truth × decidability (the image of Ω_Eff under ¬¬)", () => {
  assert.equal(four(true, false), VERIFIED);
  assert.equal(four(false, true), REFUTED);
  assert.equal(four(false, false), UNDECIDABLE);
  assert.equal(four(true, true), CONTRADICTORY);
});

test("computingFace reads the inside/knowledge local section over a membrane SOCIETY (≤_k)", () => {
  // an inter-agent membrane: three distinct members over two concerns (is-blue, is-green).
  const membrane = admitSeed([
    "alice|is-blue",
    "bob|is-blue",
    "carol|is-green",
  ].join("\n"));
  const f = computingFace(membrane);
  assert.equal(f.kind, "computing.face");
  assert.equal(f.faculty, "computing");
  assert.equal(f.direction, "inside");
  assert.equal(f.axis, "knowledge");
  // three members, two distinct concerns → cover of two cells
  assert.equal(f.members, 3);
  assert.equal(f.cover, 2);
  // the thin triad — all integers ≥ 0, nesting contested ≤ held ≤ cover
  assert.ok(Number.isInteger(f.cover) && f.cover >= 0);
  assert.ok(Number.isInteger(f.held) && f.held >= 0);
  assert.ok(Number.isInteger(f.contested) && f.contested >= 0);
  assert.ok(f.contested <= f.held);
  assert.ok(f.held <= f.cover);
  // an agreeing society accumulates each concern above ⊥ (held), with no held
  // contradiction (the corpus fact: a single agreeing membrane never settles to ⊤)
  assert.equal(f.held, 2);
  assert.equal(f.contested, 0);
  // the thick reading is a real relayed ≤_k aggregate over the whole society (a FOUR),
  // with a per-concern Belnap census that sums to the cover
  assert.equal(f.aggregate.kind, "computing.four");
  assert.equal(f.aggregate.value, "verified"); // the agreeing society's collective ≤_k standing
  const census = f.belnap.undecidable + f.belnap.verified + f.belnap.refuted + f.belnap.contradictory;
  assert.equal(census, f.cover);
});

test("computingFace on an empty membrane is the empty local section (⊥ aggregate)", () => {
  const f = computingFace([]);
  assert.equal(f.cover, 0);
  assert.equal(f.held, 0);
  assert.equal(f.contested, 0);
  assert.equal(f.members, 0);
  assert.equal(f.aggregate.value, "undecidable"); // ≤_k bottom
});

test("the boundary refuses bare data — only full agent carriers are admitted", () => {
  assert.throws(() => admitAgent(5, "compute"), /agent carrier/);
  assert.throws(() => admitAgent("the-sky|is-blue", "compute"), /agent carrier/);
  assert.throws(() => admitAgent({ kind: "not-an-agent" }, "compute"), /agent carrier/);
  // a real agent carrier is admitted
  assert.equal(admitAgent(verifiedAgent, "compute").kind, "animating.agent");
});

test("the inside/knowledge face is NEGATION-AWARE: a society told both for and against a concern reads ⊤ (contradictory)", () => {
  const mk = (s) => admitSeed(s);
  // a single member who asserts AND denies one concern HOLDS a contradiction — the ≤_k top ⊤,
  // the held contradiction the all-positive descent (goal.satisfied alone) could never see.
  const self = computingFace(mk("alice|trusts\nalice|not trusts"));
  assert.equal(self.contested, 1, "the self-contradicted concern is ⊤");
  assert.equal(self.belnap.contradictory, 1);
  assert.equal(self.aggregate.value, "contradictory");

  // a society where one member asserts and another DENIES the same concern relays to ⊤ — the
  // concern is grouped negation-aware (a concern and its denial are one concern).
  const society = computingFace(mk("alice|trusts\nbob|not trusts"));
  assert.equal(society.cover, 1, "trusts and not-trusts are one bare concern");
  assert.equal(society.contested, 1, "the society told both for and against → ⊤");
  assert.equal(society.consensus, "stable");

  // an agreeing society is NOT contested (no false positive).
  const agree = computingFace(mk("alice|trusts\nbob|trusts"));
  assert.equal(agree.contested, 0);
  assert.equal(agree.aggregate.value, "verified");

  // a lone denial reads as refuted (f / against-evidence), distinct from absence.
  const deny = computingFace(mk("alice|not trusts"));
  assert.equal(deny.belnap.refuted, 1);
  assert.equal(deny.aggregate.value, "refuted");

  // the agent itself now carries the negation-aware goal.held that this reading rests on.
  assert.equal(agent("alice|trusts\nalice|not trusts").goal.held, "stable", "goal.held is ⊤ for a contradicted goal");
  assert.equal(agent("alice|trusts").goal.held, "potential", "goal.held is t for an asserted goal");
});

import { eventualConsistency } from "../dist/index.mjs";

test("EVENTUAL CONSISTENCY sidesteps FLP: the monotone ≤_k merge is coordination-free (CALM) and converges", () => {
  const mk = (s) => admitSeed(s);
  // an agreeing society DECIDES every concern coordination-free — no consensus, FLP fully escaped.
  const agree = eventualConsistency(mk("alice|trusts\nbob|trusts\ncarol|trusts"));
  assert.equal(agree.kind, "computing.eventual-consistency");
  assert.equal(agree.coordinationFree, true, "CALM: the monotone merge needs no coordination");
  assert.equal(agree.converges, true, "no-periodic-orbit: the merge terminates");
  assert.equal(agree.stochastic.kind, "computing.stochastic-convergence-receipt");
  assert.equal(agree.stochastic.fixedPoint, true);
  assert.equal(agree.stochastic.equivalent, true);
  assert.equal(agree.stochastic.rmnNormalized, true);
  assert.equal(agree.stochastic.regime, "ordinal.closure.regime.finite");
  assert.equal(agree.stochastic.stationaryExists, true);
  assert.equal(agree.decided, 1);
  assert.equal(agree.contested, 0);
  assert.equal(agree.consensusRequired, false);
  assert.equal(agree.flpEscaped, true, "every concern settled by the monotone merge — FLP never invoked");

  // a contested concern is the ISOLATED FLP-hard core: coordination-free everywhere EXCEPT the ⊤
  // cell, which would need (FLP-blocked) consensus to collapse — so the bilattice holds it ⊤.
  const split = eventualConsistency(mk("alice|trusts\nbob|not trusts"));
  assert.equal(split.contested, 1, "the disagreement is held ⊤");
  assert.equal(split.consensusRequired, true, "collapsing the ⊤ to one decision would need consensus");
  assert.equal(split.flpEscaped, false);
  assert.equal(split.coordinationFree, true, "the merge itself is STILL coordination-free (it holds ⊤, no consensus)");

  // mixed: the decided concern is coordination-free; only the contested one is the FLP-hard core.
  const mixed = eventualConsistency(mk("alice|trusts\nbob|trusts\ncarol|helps\ndave|not helps"));
  assert.equal(mixed.decided, 1);
  assert.equal(mixed.contested, 1);
  assert.equal(mixed.flpEscaped, false);
});
test("Nix-as-settling reads derivations as content-addressed tiles and reconstructs from boundary hashes", () => {
  const source = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "source",
    outPath: "/nix/store/11111111111111111111111111111111-source",
    inputs: [],
  });
  assert.equal(source.$id, "11111111111111111111111111111111");
  assert.equal(source.workType, "derivation");

  const result = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "result",
    outPath: "/nix/store/22222222222222222222222222222222-result",
    inputs: [{ hash: source.$id, name: "source", storePath: source.derivation.outPath }],
  });
  assert.deepEqual(result.boundaryHashes, [source.$id]);

  const observed = lightObservation([source, result]);
  assert.equal(observed.kind, "computing.light-observation");
  assert.equal(observed.causalOrder, true);
  assert.equal(observed.h1, 0);
  assert.deepEqual(observed.boundaryHashes, [source.$id]);
  assert.deepEqual(observed.edges, [{ from: source.$id, to: result.$id }]);

  const reconstructed = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: result.$id,
    boundaryHashes: [source.$id],
    tiles: [source, result],
  });
  assert.equal(reconstructed.reconstructible, true);
  assert.equal(reconstructed.cover.h1, 0);
  assert.deepEqual(reconstructed.closureHashes, [source.$id, result.$id]);

  const missing = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: result.$id,
    boundaryHashes: [source.$id],
    tiles: [result],
  });
  assert.equal(missing.reconstructible, false);
  assert.equal(missing.cover.closed, false);
  assert.deepEqual(missing.missingSubderivations, [source.$id]);

  const next = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "next-result",
    outPath: "/nix/store/77777777777777777777777777777777-next-result",
    inputs: [{ hash: result.$id, name: "result", storePath: result.derivation.outPath }],
  });
  const diff = diffFromBoundaryHashes({
    kind: "computing.build-diff-request",
    leftTargetHash: result.$id,
    rightTargetHash: next.$id,
    leftBoundaryHashes: [source.$id],
    rightBoundaryHashes: [source.$id],
    tiles: [source, result, next],
  });
  assert.equal(diff.kind, "computing.build-diff");
  assert.equal(diff.reconstructible, true);
  assert.equal(diff.equivalent, false);
  assert.deepEqual(diff.sharedHashes, [source.$id, result.$id]);
  assert.deepEqual(diff.addedHashes, [next.$id]);
  assert.deepEqual(diff.removedHashes, []);
  assert.deepEqual(diff.boundaryDeltaHashes, []);
  assert.equal(diff.h1, 0);
});

test("trace holography folds build, DAP, LSP, and action tiles into one normal-form tiling", () => {
  const source = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "trace-source",
    outPath: "/nix/store/33333333333333333333333333333333-trace-source",
    inputs: [],
  });
  const buildTile = traceTileFromBuildTerm(source);

  const actionTile = traceTileFromAction(computeAction);
  assert.equal(actionTile.source, "action");
  assert.equal(actionTile.subject, "compute");

  const lsp = projectLsp({ actions: [computeAction] });
  const actionDocument = lsp.documents.find((doc) => doc.kind === "action" && doc.id === "compute");
  assert.ok(actionDocument);
  const lspTile = traceTileFromLspDocument(actionDocument);
  assert.equal(lspTile.source, "lsp");

  const dap = projectDap({ sessionId: "trace", term: tm.app(tm.lam(tm.var(0)), tm.charge("potential")) });
  const dapTile = traceTileFromDapStop(dap.next());
  assert.equal(dapTile.source, "dap");

  const tiling = foldTraceTiles([buildTile, actionTile, lspTile, dapTile]);
  assert.equal(tiling.kind, "computing.trace-tiling");
  assert.equal(tiling.causalOrder, true);
  assert.equal(tiling.closedCover, true);
  assert.equal(tiling.h1, 0);
  assert.equal(tiling.tiles.length, 4);
  assert.equal(tiling.rewriteSteps.length, 4);
  assert.equal(tiling.kumGraph.activeNode, tiling.normalFormHash);
  assert.ok(tiling.boundaryHashes.includes(source.$id));
  assert.match(tiling.theory.kolmogorovUspensky, /graph-machine/);
});

test("derivation provenance gives a build the articulating-to-settling spine and trace fold", () => {
  const build = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "provenance-build",
    outPath: "/nix/store/44444444444444444444444444444444-provenance-build",
    inputs: [],
  });
  const receipt = provenanceFromBuildTerm(build);
  assert.equal(receipt.kind, "computing.derivation-provenance-receipt");
  assert.equal(receipt.source, "build");
  assert.equal(receipt.subject, "provenance-build");
  assert.deepEqual(receipt.stages.map((stage) => stage.stage), ["articulating", "predicating", "positing", "settling"]);
  assert.equal(receipt.stages[0].boundaryHashes.includes(build.$id), true);
  assert.deepEqual(receipt.stages[1].boundaryHashes, [receipt.stages[0].$id]);
  assert.deepEqual(receipt.stages[2].boundaryHashes, [receipt.stages[1].$id]);
  assert.deepEqual(receipt.stages[3].boundaryHashes, [receipt.stages[2].$id]);
  assert.equal(receipt.settledHash, receipt.stages[3].$id);
  assert.equal(receipt.trace.closedCover, true);
  assert.equal(receipt.trace.h1, 0);
  assert.equal(receipt.maturity.tag, "Built+green");
});

test("observation game projection realizes labels as a CGS arena, play, and strategy report", () => {
  const observation = observeLabels([
    { id: "sense", predicate: "observes", charge: "active", object: "compute" },
    { id: "compute", predicate: "settles", charge: "potential" },
    { id: "audit", predicate: "holds", charge: "stable" },
  ]);
  const projected = projectObservationGame(observation);
  assert.equal(projected.kind, "computing.observation-game-projection");
  assert.equal(projected.arena.kind, "game.arena");
  assert.deepEqual(projected.polarityReading.negative, ["sense"]);
  assert.deepEqual(projected.polarityReading.positive, ["compute"]);
  assert.deepEqual(projected.polarityReading.silent, ["audit"]);
  assert.deepEqual(projected.play.moves, ["sense", "compute"]);
  assert.equal(projected.strategy.kind, "game.strategy");
  assert.equal(projected.report.validPlays, true);
  assert.equal(projected.report.prefixClosed.kind, "game.strategy.prefixClosed:witness");
  assert.equal(projected.traceTiles.length, 2);
  assert.match(projected.theory.cgs, /@emsenn\/gaming/);
});

test("coordination spectrum fuses holographic compute readings into one obstruction rank", () => {
  const source = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "spectrum-source",
    outPath: "/nix/store/55555555555555555555555555555555-spectrum-source",
    inputs: [],
  });
  const result = settleBuildDerivation({
    kind: "computing.build-derivation",
    name: "spectrum-result",
    outPath: "/nix/store/66666666666666666666666666666666-spectrum-result",
    inputs: [{ hash: source.$id, name: "source", storePath: source.derivation.outPath }],
  });
  const light = lightObservation([source, result]);
  const provenance = provenanceFromBuildTerm(result);
  const trace = foldTraceTiles([traceTileFromBuildTerm(source), traceTileFromBuildTerm(result), ...provenance.trace.tiles]);
  const observation = observeLabels([
    { id: "sense", predicate: "observes", charge: "active", object: "compute" },
    { id: "compute", predicate: "settles", charge: "potential" },
  ]);
  const game = projectObservationGame(observation);
  const membrane = admitSeed("alice|settles\nbob|settles\ncarol|settles");
  const face = computingFace(membrane);
  const spectral = spectralSociety([verifiedAgent, verifiedAgent, verifiedAgent]);
  const consistency = eventualConsistency(membrane);

  const spectrum = coordinateHolographicCompute({
    kind: "computing.coordination-spectrum-request",
    lightObservation: light,
    trace,
    provenance,
    game,
    face,
    spectralSociety: spectral,
    eventualConsistency: consistency,
  });

  assert.equal(spectrum.kind, "computing.coordination-spectrum");
  assert.equal(spectrum.reconstructible, true);
  assert.equal(spectrum.obstructionRank, 0);
  assert.equal(spectrum.spectrum.causal.nodes, 2);
  assert.equal(spectrum.spectrum.trace.tiles, 6);
  assert.equal(spectrum.spectrum.provenance.stages, 4);
  assert.equal(spectrum.spectrum.coordination.contested, 0);
  assert.equal(spectrum.spectrum.coordination.clusters, 1);
  assert.equal(spectrum.spectrum.game.validStrategy, true);
  assert.ok(spectrum.boundaryHashes.includes(source.$id));
  assert.ok(spectrum.boundaryHashes.includes(game.observationHash));
  assert.match(spectrum.theory.soviet, /Kolmogorov-Uspensky/);
});

test("ecosystem InfoTiling folds a JSNode package graph into content-addressed causal tiles", () => {
  const tiling = ecosystemInfoTiling({
    kind: "jsnode-ick.workspace-dependency-graph",
    nodes: [
      {
        name: "@emsenn/relating",
        version: "0.0.0",
        layer: "lib",
        lifecycle: "active",
        maturity: "stable",
        dependencies: [],
        exports: ["."],
        bins: [],
        scripts: ["build"],
      },
      {
        name: "@emsenn/computing",
        version: "0.0.0",
        layer: "lib",
        lifecycle: "active",
        maturity: "experimental",
        dependencies: ["@emsenn/relating"],
        exports: [".", "./holographic-compute"],
        bins: ["compute"],
        scripts: ["build", "test"],
      },
      {
        name: "@emsenn/jsnode-ick",
        version: "0.0.0",
        layer: "apps",
        lifecycle: "active",
        maturity: "experimental",
        dependencies: ["@emsenn/computing"],
        exports: [".", "./workspace", "./topology"],
        bins: ["jsnode-ick"],
        scripts: ["build"],
      },
    ],
    edges: [
      { from: "@emsenn/computing", to: "@emsenn/relating" },
      { from: "@emsenn/jsnode-ick", to: "@emsenn/computing" },
    ],
  });

  assert.equal(tiling.kind, "computing.ecosystem-infotiling");
  assert.equal(tiling.packages.length, 3);
  assert.equal(tiling.edges.length, 2);
  assert.equal(tiling.causalOrder, true);
  assert.equal(tiling.reconstructible, true);
  assert.equal(tiling.h1, 0);
  assert.equal(tiling.buildTiers.length, 3);
  assert.deepEqual(tiling.residualHashes, []);
  assert.deepEqual(tiling.cycleObstructions, []);
  assert.equal(tiling.petri.transitions.length, 2);
  assert.equal(tiling.petri.frontiers.length, 3);
  assert.equal(tiling.petri.concurrencyWidth, 2);
  assert.equal(tiling.petri.maxBuildTierWidth, 1);
  assert.equal(tiling.petri.pressure, "low");
  assert.deepEqual(tiling.petri.bottlenecks.map((place) => place.package), ["@emsenn/computing"]);
  assert.match(tiling.theory.petri, /Petri/);
  assert.equal(tiling.condensedReconstructible, true);
  assert.equal(tiling.condensedTiles.length, 3);
  assert.equal(tiling.condensedEdges.length, 2);
  assert.equal(tiling.condensedLight.causalOrder, true);
  assert.equal(tiling.trace.tiles.length, 3);
  assert.equal(tiling.trace.closedCover, true);
  assert.equal(tiling.light.edges.length, 2);
  const relating = tiling.packageHashes.find((entry) => entry.name === "@emsenn/relating");
  const computing = tiling.packageHashes.find((entry) => entry.name === "@emsenn/computing");
  assert.ok(relating);
  assert.ok(computing);
  assert.ok(tiling.boundaryHashes.includes(relating.hash));
  assert.deepEqual(tiling.edges[0], {
    from: "@emsenn/relating",
    to: "@emsenn/computing",
    fromHash: relating.hash,
    toHash: computing.hash,
  });
  assert.match(tiling.theory.jsnode, /@emsenn\/jsnode-ick/);

  const jsnode = tiling.packageHashes.find((entry) => entry.name === "@emsenn/jsnode-ick");
  assert.ok(jsnode);
  const cone = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash: jsnode.hash,
    boundaryHashes: [relating.hash],
    tiling,
  });
  assert.equal(cone.kind, "computing.ecosystem-cone-reconstruction");
  assert.equal(cone.mode, "raw");
  assert.equal(cone.reconstructible, true);
  assert.deepEqual(cone.closurePackages, ["@emsenn/computing", "@emsenn/jsnode-ick", "@emsenn/relating"]);
  assert.deepEqual(cone.boundaryHashes, [relating.hash]);
  assert.equal(cone.cover.h1, 0);

  const rawDiff = diffEcosystemCones({
    kind: "computing.ecosystem-cone-diff-request",
    leftTargetHash: computing.hash,
    rightTargetHash: jsnode.hash,
    leftBoundaryHashes: [relating.hash],
    rightBoundaryHashes: [relating.hash],
    tiling,
  });
  assert.equal(rawDiff.kind, "computing.ecosystem-cone-diff");
  assert.equal(rawDiff.mode, "raw");
  assert.equal(rawDiff.reconstructible, true);
  assert.equal(rawDiff.equivalent, false);
  assert.deepEqual(rawDiff.sharedPackages, ["@emsenn/computing", "@emsenn/relating"]);
  assert.deepEqual(rawDiff.addedPackages, ["@emsenn/jsnode-ick"]);
  assert.deepEqual(rawDiff.removedPackages, []);
  assert.deepEqual(rawDiff.boundaryDeltaHashes, []);
  assert.equal(rawDiff.h1, 0);

  const patch = readAperiodicPatch({
    kind: "computing.aperiodic-patch-request",
    tiles: aperiodicTilesFromEcosystem(tiling),
  });
  assert.equal(patch.kind, "computing.aperiodic-patch");
  assert.equal(patch.tiles.length, 3);
  assert.equal(patch.substitution.inflation, 2);
  assert.equal(patch.substitution.tiles.length, 12);
  assert.equal(patch.adjacencies.length, 2);
  assert.equal(patch.matchingLaw, "semantic-incidence");
  assert.equal(patch.locallyConsistent, true);
  assert.equal(patch.defects.length, 0);
  assert.equal(patch.contextuality.globalSection, true);
  assert.equal(patch.contextuality.obstructionRank, 0);
  assert.equal(patch.diffraction.sampleSize, 3);
  assert.equal(patch.automaton.rewarded, 3);
  assert.equal(patch.automaton.penalized, 0);
  assert.match(patch.theory.wang, /colored-edge/);
  assert.match(patch.theory.diffraction, /Fourier/);
  assert.match(patch.theory.contextuality, /sheaf-section/);
  assert.match(patch.theory.soviet, /Kolmogorov-Uspensky/);

  const brokenTiles = aperiodicTilesFromEcosystem(tiling).map((tile) => tile.$id === computing.hash
    ? Object.freeze({
      ...tile,
      boundaryColors: Object.freeze(tile.boundaryColors.map((entry) => entry.neighborHash === relating.hash
        ? Object.freeze({ ...entry, color: "broken-local-color" })
        : entry)),
    })
    : tile);
  const brokenPatch = readAperiodicPatch({
    kind: "computing.aperiodic-patch-request",
    tiles: brokenTiles,
  });
  assert.equal(brokenPatch.locallyConsistent, false);
  assert.equal(brokenPatch.defects.length, 1);

  const organized = selfOrganizeAperiodicPatch({
    kind: "computing.aperiodic-self-organization-request",
    patch: brokenPatch,
    maxSteps: 4,
  });
  assert.equal(organized.kind, "computing.aperiodic-self-organization");
  assert.equal(organized.converged, true);
  assert.equal(organized.outputPatch.defects.length, 0);
  assert.equal(organized.outputPatch.locallyConsistent, true);
  assert.equal(organized.steps[0].rule, "synchronize-boundary-color");
  assert.equal(organized.normalWord, "MM");
  assert.match(organized.theory.markov, /normal-algorithm/);
  assert.match(organized.theory.tsetlin, /Tsetlin/);

  const atlas = readAperiodicTheoryAtlas({
    kind: "computing.aperiodic-theory-atlas-request",
    patch,
  });
  assert.equal(atlas.kind, "computing.aperiodic-theory-atlas");
  assert.equal(atlas.patchHash, patch.$id);
  assert.equal(atlas.measurements.tileCount, 3);
  assert.equal(atlas.measurements.adjacencyCount, 2);
  assert.equal(atlas.measurements.defectCount, 0);
  assert.equal(atlas.measurements.requisiteVarietySatisfied, true);
  assert.ok(atlas.lenses.find((lens) => lens.id === "wang-local-matching" && lens.region === "China/United States" && lens.active));
  assert.ok(atlas.lenses.find((lens) => lens.id === "debruijn-multigrid" && lens.region === "Netherlands" && lens.active));
  assert.ok(atlas.lenses.find((lens) => lens.id === "ashby-requisite-variety" && lens.region === "United Kingdom" && lens.active));
  assert.ok(atlas.lenses.find((lens) => lens.id === "petri-non-sequential-process" && lens.region === "Germany" && lens.active));
  assert.ok(atlas.lenses.find((lens) => lens.id === "tsetlin-learning-automata" && lens.region === "Soviet Union" && lens.active));
  assert.equal(atlas.maturity, "Research-grade");

  const bridgePlan = planAperiodicBridges({
    kind: "computing.aperiodic-bridge-plan-request",
    atlas,
  });
  assert.equal(bridgePlan.kind, "computing.aperiodic-bridge-plan");
  assert.equal(bridgePlan.atlasHash, atlas.$id);
  assert.equal(bridgePlan.coverage.activeLensCount, atlas.lenses.filter((lens) => lens.active).length);
  assert.equal(bridgePlan.coverage.unbridgedLenses.length, 0);
  assert.ok(bridgePlan.bridges.find((bridge) => bridge.id === "wang-to-self-organization" && bridge.toVerb === "aperiodic-self-organize"));
  assert.ok(bridgePlan.bridges.find((bridge) => bridge.id === "diffraction-to-coordination-spectrum" && bridge.toVerb === "coordinate-holographic-compute"));
  assert.ok(bridgePlan.bridges.find((bridge) => bridge.id === "debruijn-to-boundary-coordinates" && bridge.toVerb === "reconstruct-ecosystem-cone"));
  assert.ok(bridgePlan.bridges.find((bridge) => bridge.id === "petri-to-causal-width" && bridge.toVerb === "ecosystem-infotiling"));
  assert.ok(bridgePlan.bridges.find((bridge) => bridge.id === "tsetlin-to-reward-policy" && bridge.maturity === "Built+green"));

  const regulation = regulateEcosystemCausalWidth({
    kind: "computing.ecosystem-causal-regulation-request",
    tiling,
    targetWidth: 1,
  });
  assert.equal(regulation.kind, "computing.ecosystem-causal-regulation");
  assert.equal(regulation.tilingHash, tiling.$id);
  assert.equal(regulation.currentWidth, 2);
  assert.equal(regulation.targetWidth, 1);
  assert.equal(regulation.disturbanceVariety, 1);
  assert.equal(regulation.requisiteVarietySatisfied, true);
  assert.ok(regulation.actions.find((action) => action.kind === "audit-cone" && action.targetVerb === "reconstruct-ecosystem-cone"));
  assert.ok(regulation.actions.find((action) => action.kind === "publish-contract" && action.targetVerb === "ecosystem-infotiling"));
  assert.match(regulation.theory.ashby, /regulator variety/);

  const stabilization = stabilizeEcosystemCausalWidth({
    kind: "computing.ecosystem-causal-stabilization-request",
    tiling,
    regulation,
  });
  assert.equal(stabilization.kind, "computing.ecosystem-causal-stabilization");
  assert.equal(stabilization.tilingHash, tiling.$id);
  assert.equal(stabilization.regulationHash, regulation.$id);
  assert.deepEqual(stabilization.acceptedSubstrates, []);
  assert.equal(stabilization.condensedCycles.length, 0);
  assert.equal(stabilization.residualControllableWidth, 2);
  assert.equal(stabilization.controlH1, 0);
  assert.match(stabilization.theory.petri, /quotient/);

  const recursive = readEcosystemRecursiveControl({
    kind: "computing.ecosystem-recursive-control-request",
    stabilization,
    targetWidth: 1,
  });
  assert.equal(recursive.kind, "computing.ecosystem-recursive-control");
  assert.equal(recursive.units.length, 1);
  assert.equal(recursive.units[0].packages[0], "@emsenn/computing");
  assert.equal(recursive.units[0].nextVerb, "regulate-ecosystem-causal-width");
  assert.match(recursive.theory.beer, /viable-system/);
  assert.match(recursive.theory.kautilya, /mandala/);

  const opened = openEcosystemRecursiveUnit({
    kind: "computing.ecosystem-recursive-unit-request",
    tiling,
    recursive,
    unitId: recursive.units[0].id,
  });
  assert.equal(opened.kind, "computing.ecosystem-recursive-unit");
  assert.equal(opened.role, "controlled");
  assert.deepEqual(opened.packages, ["@emsenn/computing"]);
  assert.equal(opened.internalEdges.length, 0);
  assert.equal(opened.boundaryEdges.length, 2);
  assert.equal(opened.internalPetri.places, 1);
  assert.equal(opened.internalPetri.transitions, 0);
  assert.equal(opened.internalPetri.h1, 0);
  assert.equal(opened.reconstruction.mode, "raw");
  assert.equal(opened.reconstruction.reconstructible, true);
  assert.ok(opened.nextActions.find((next) => next.verb === "regulate-ecosystem-causal-width"));
  assert.match(opened.theory.kolmogorovUspensky, /graph-machine/);
});

test("ecosystem InfoTiling exposes cycle obstructions as package and hash witnesses", () => {
  const tiling = ecosystemInfoTiling({
    kind: "computing.ecosystem-graph",
    nodes: [
      {
        name: "@emsenn/cycle-a",
        version: "0.0.0",
        layer: "lib",
        lifecycle: "active",
        maturity: "experimental",
        dependencies: ["@emsenn/cycle-b"],
      },
      {
        name: "@emsenn/cycle-b",
        version: "0.0.0",
        layer: "lib",
        lifecycle: "active",
        maturity: "experimental",
        dependencies: ["@emsenn/cycle-a"],
      },
    ],
    edges: [
      { from: "@emsenn/cycle-a", to: "@emsenn/cycle-b" },
      { from: "@emsenn/cycle-b", to: "@emsenn/cycle-a" },
    ],
  });

  assert.equal(tiling.causalOrder, false);
  assert.equal(tiling.reconstructible, false);
  assert.equal(tiling.h1, 1);
  assert.deepEqual(tiling.buildTiers, []);
  assert.equal(tiling.residualHashes.length, 2);
  assert.equal(tiling.cycleObstructions.length, 1);
  assert.deepEqual(tiling.cycleObstructions[0].packages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.deepEqual(tiling.cycleObstructions[0].hashes, tiling.residualHashes);
  assert.equal(tiling.petri.transitions.length, 2);
  assert.equal(tiling.petri.concurrencyWidth, 2);
  assert.equal(tiling.petri.maxBuildTierWidth, 0);
  assert.equal(tiling.petri.pressure, "low");
  const regulation = regulateEcosystemCausalWidth({
    kind: "computing.ecosystem-causal-regulation-request",
    tiling,
    targetWidth: 1,
  });
  assert.ok(regulation.actions.find((action) => action.kind === "condense-cycle" && action.targetVerb === "reconstruct-ecosystem-cone"));
  assert.equal(regulation.requisiteVarietySatisfied, true);
  const stabilization = stabilizeEcosystemCausalWidth({
    kind: "computing.ecosystem-causal-stabilization-request",
    tiling,
    regulation,
  });
  assert.equal(stabilization.condensedCycles.length, 1);
  assert.deepEqual(stabilization.condensedCycles[0].packages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.equal(stabilization.quotientPlaces.length, 1);
  assert.equal(stabilization.quotientPlaces[0].role, "cycle-supertile");
  assert.equal(stabilization.residualControllableWidth, 0);
  assert.equal(stabilization.controlH1, 0);
  const recursive = readEcosystemRecursiveControl({
    kind: "computing.ecosystem-recursive-control-request",
    stabilization,
    targetWidth: 1,
  });
  assert.equal(recursive.units.length, 1);
  assert.equal(recursive.units[0].role, "cycle-supertile");
  assert.equal(recursive.units[0].nextVerb, "reconstruct-ecosystem-cone");
  assert.match(recursive.theory.ibnKhaldun, /asabiyyah/);
  const opened = openEcosystemRecursiveUnit({
    kind: "computing.ecosystem-recursive-unit-request",
    tiling,
    recursive,
    unitId: recursive.units[0].id,
  });
  assert.equal(opened.role, "cycle-supertile");
  assert.deepEqual(opened.packages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.equal(opened.internalEdges.length, 2);
  assert.equal(opened.boundaryEdges.length, 0);
  assert.equal(opened.internalPetri.places, 2);
  assert.equal(opened.internalPetri.transitions, 2);
  assert.equal(opened.internalPetri.h1, 1);
  assert.equal(opened.reconstruction.mode, "condensed");
  assert.equal(opened.reconstruction.reconstructible, true);
  assert.ok(opened.nextActions.find((next) => next.verb === "reconstruct-ecosystem-cone"));
  assert.match(opened.theory.markov, /normal-algorithm/);
  assert.equal(tiling.condensedReconstructible, true);
  assert.equal(tiling.condensedTiles.length, 1);
  assert.equal(tiling.condensedTiles[0].cyclic, true);
  assert.deepEqual(tiling.condensedTiles[0].packages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.deepEqual(tiling.condensedTiles[0].hashes, tiling.residualHashes);
  assert.deepEqual(tiling.condensedEdges, []);
  assert.equal(tiling.condensedLight.causalOrder, true);
  assert.equal(tiling.condensedLight.h1, 0);

  const supertile = tiling.condensedTiles[0];
  const cone = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash: supertile.hash,
    boundaryHashes: [supertile.hash],
    mode: "condensed",
    tiling,
  });
  assert.equal(cone.mode, "condensed");
  assert.equal(cone.reconstructible, true);
  assert.deepEqual(cone.closureHashes, [supertile.hash]);
  assert.deepEqual(cone.closurePackages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.deepEqual(cone.boundaryHashes, [supertile.hash]);
  assert.equal(cone.cover.h1, 0);

  const diff = diffEcosystemCones({
    kind: "computing.ecosystem-cone-diff-request",
    leftTargetHash: supertile.hash,
    rightTargetHash: supertile.hash,
    leftBoundaryHashes: [supertile.hash],
    rightBoundaryHashes: [supertile.hash],
    mode: "condensed",
    tiling,
  });
  assert.equal(diff.mode, "condensed");
  assert.equal(diff.reconstructible, true);
  assert.equal(diff.equivalent, true);
  assert.deepEqual(diff.sharedPackages, ["@emsenn/cycle-a", "@emsenn/cycle-b"]);
  assert.deepEqual(diff.addedPackages, []);
  assert.deepEqual(diff.removedPackages, []);
  assert.equal(diff.h1, 0);
});
