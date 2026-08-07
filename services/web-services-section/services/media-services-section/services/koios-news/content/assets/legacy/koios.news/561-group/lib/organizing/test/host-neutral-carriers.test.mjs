import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  workspaceCarrier,
  dependencyGraphCarrier,
  coverCarrier,
  resolutionCarrier,
  leanDependencyGraphFromModules,
  leanDependencyGraphH1,
  leanTheoremSpine,
  leanTheoremSpineCoverage,
  topologicalSortLeanModules,
} from "../dist/index.mjs";
import {
  leanEnvironmentFromAdmission,
  readLeanAdmission,
} from "@emsenn/computing";
import { canonical } from "@emsenn/relating/writing";

function roundTrip(carrier, value) {
  const admitted = carrier.assert(value);
  return carrier.assert(JSON.parse(canonical(admitted)));
}

test("organizing host-neutral carriers canonicalize and re-admit", () => {
  const workspace = roundTrip(workspaceCarrier, {
    kind: "organizing.workspace-carrier",
    id: "workspace:561-group",
    name: "561-group",
    packageManager: "pnpm",
    members: [
      { name: "@emsenn/relating", manifest: "computing/manifest-carrier:relating", packageManager: "pnpm" },
      { name: "@emsenn/computing", manifest: "computing/manifest-carrier:computing", packageManager: "pnpm" },
    ],
    mediaType: "application/vnd.pnpm.workspace+json",
  });
  assert.equal(workspace.members.length, 2);

  const dependencyGraph = roundTrip(dependencyGraphCarrier, {
    kind: "organizing.dependency-graph",
    nodes: [
      { id: "@emsenn/relating", workspaceMember: true },
      { id: "@emsenn/computing", workspaceMember: true },
    ],
    edges: [
      { from: "@emsenn/computing", to: "@emsenn/relating", relationship: "runtime", range: "workspace:*", resolvedBy: "pnpm-lock" },
    ],
    cycles: [],
  });
  assert.equal(dependencyGraph.edges[0].to, "@emsenn/relating");

  const cover = roundTrip(coverCarrier, {
    kind: "organizing.cover",
    universe: ["@emsenn/relating", "@emsenn/computing"],
    opens: [
      { id: "relating-open", members: ["@emsenn/relating"], source: "manifest" },
      { id: "computing-open", members: ["@emsenn/computing", "@emsenn/relating"], source: "dependency" },
    ],
    nerveEdges: [{ left: "relating-open", right: "computing-open", intersection: ["@emsenn/relating"] }],
    h1: 0,
    coordinationFree: true,
  });
  assert.equal(cover.coordinationFree, true);

  const resolution = roundTrip(resolutionCarrier, {
    kind: "organizing.resolution",
    decisions: [
      {
        requester: "@emsenn/computing",
        dependency: "@emsenn/relating",
        selected: "@emsenn/relating@workspace:*",
        range: "workspace:*",
        reason: "workspace",
      },
    ],
    unresolved: [],
    conflicts: [],
    h1: 0,
    cover,
  });
  assert.equal(resolution.decisions[0].reason, "workspace");
});

test("organizing reflects Lean modules as proof dependency topology", () => {
  const modules = [
    {
      kind: "computing.lean.module",
      id: "RelMath",
      imports: ["RelMath.Mark", "RelMath.Settling"],
      declarations: [
        { kind: "theorem", name: "RelMath.h1_vanishes_iff_forest", line: 12, proofStatus: "proved" },
      ],
      mediaType: "text/vnd.lean4",
    },
    {
      kind: "computing.lean.module",
      id: "RelMath.Settling",
      imports: ["RelMath.Mark"],
      declarations: [
        { kind: "lemma", name: "RelMath.Settling.tree_coordination_free", line: 4, proofStatus: "proved" },
      ],
      mediaType: "text/vnd.lean4",
    },
  ];

  const graph = leanDependencyGraphFromModules(modules);
  assert.equal(graph.edges.length, 3);
  assert.equal(leanDependencyGraphH1(graph), 1);
  assert.deepEqual(topologicalSortLeanModules(graph).at(0), ["RelMath.Mark"]);

  const spine = leanTheoremSpine(modules, "RelMath", ["RelMath.h1_vanishes_iff_forest"]);
  assert.deepEqual(spine.entries.map((entry) => entry.name), ["RelMath.h1_vanishes_iff_forest"]);
  assert.deepEqual(spine.admitted, []);
});

test("organizing compares the live RelMath theorem spine with blueprint declarations", () => {
  const relmathRoot = fileURLToPath(new URL("../../../sites/relmath.bare-cedar-fog.emsenn.net/", import.meta.url));
  const environment = leanEnvironmentFromAdmission(readLeanAdmission(relmathRoot));
  const graph = leanDependencyGraphFromModules(environment.modules);
  const spine = leanTheoremSpine(environment.modules, environment.rootModule);
  const coverage = leanTheoremSpineCoverage(spine, environment.declarationIndex);

  assert.ok(graph.nodes.length >= 180);
  assert.ok(leanDependencyGraphH1(graph) > 0);
  assert.ok(spine.entries.length >= 2000);
  assert.ok(coverage.declared >= coverage.present);
  assert.ok(coverage.present > 0);
  assert.ok(coverage.admitted.includes("RelMath.Closure.Collatz.everyNonterminalHasCrossing_holds"));
});
