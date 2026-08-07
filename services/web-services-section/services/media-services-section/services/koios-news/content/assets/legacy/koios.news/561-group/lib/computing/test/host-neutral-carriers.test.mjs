import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  manifestCarrier,
  moduleGraphCarrier,
  binSurfaceCarrier,
  exportSurfaceCarrier,
  typeGraphCarrier,
  leanToolchainCarrier,
  lakefileCarrier,
  leanModuleCarrier,
  leanBuildOracleCarrier,
  decodeLeanToolchain,
  decodeLakefileToml,
  decodeLeanModule,
  decodeLeanBuildOracle,
  leanEnvironmentFromAdmission,
  readLeanAdmission,
  reflectLeanModuleGraph,
} from "../dist/index.mjs";
import { canonical } from "@emsenn/relating/writing";

function roundTrip(carrier, value) {
  const admitted = carrier.assert(value);
  return carrier.assert(JSON.parse(canonical(admitted)));
}

test("computing host-neutral carriers canonicalize and re-admit", () => {
  const manifest = roundTrip(manifestCarrier, {
    kind: "computing.manifest-carrier",
    name: "@emsenn/computing",
    version: "0.0.0",
    packageManager: "pnpm@11.5.0",
    moduleKind: "module",
    dependencies: [
      { name: "@emsenn/relating", relationship: "runtime", range: "workspace:*", protocol: "workspace" },
    ],
    exports: [".", "./holographic-compute"],
    bins: ["compute"],
    mediaType: "application/vnd.npm.manifest+json",
  });
  assert.equal(manifest.kind, "computing.manifest-carrier");

  const bins = roundTrip(binSurfaceCarrier, {
    kind: "computing.bin-surface",
    packageName: "@emsenn/computing",
    commands: [{ name: "compute", target: "./dist/scripts/cli.mjs", conditions: ["node"] }],
    mediaType: "application/vnd.npm.bin-surface+json",
  });
  assert.deepEqual(bins.commands.map((command) => command.name), ["compute"]);

  const exports = roundTrip(exportSurfaceCarrier, {
    kind: "computing.export-surface",
    packageName: "@emsenn/computing",
    entries: [
      { specifier: ".", target: "./dist/index.mjs", conditions: ["import"], types: "./dist/index.d.mts" },
    ],
    mediaType: "application/vnd.npm.export-surface+json",
  });
  assert.equal(exports.entries[0].specifier, ".");

  const moduleGraph = roundTrip(moduleGraphCarrier, {
    kind: "computing.module-graph",
    roots: ["src/index.mts"],
    modules: [
      {
        id: "src/index.mts",
        mediaType: "text/javascript",
        imports: [{ specifier: "./host-neutral-carriers.mjs", phase: "static", target: "src/host-neutral-carriers.mts" }],
        exports: [{ name: "ManifestCarrier" }],
      },
    ],
    edges: [{ from: "src/index.mts", to: "src/host-neutral-carriers.mts", kind: "import", specifier: "./host-neutral-carriers.mjs" }],
  });
  assert.equal(moduleGraph.edges[0].kind, "import");

  const typeGraph = roundTrip(typeGraphCarrier, {
    kind: "computing.type-graph",
    types: [
      { id: "computing/manifest-carrier", name: "ManifestCarrier", kind: "object", carrier: "computing/manifest-carrier" },
      { id: "string", name: "string", kind: "primitive" },
    ],
    edges: [{ from: "computing/manifest-carrier", to: "string", relation: "uses" }],
  });
  assert.equal(typeGraph.types.length, 2);
});

test("computing Lean carriers decode proof-substrate text without host reads", () => {
  const toolchain = roundTrip(leanToolchainCarrier, decodeLeanToolchain("leanprover/lean4:v4.31.0\n"));
  assert.equal(toolchain.version, "4.31.0");

  const lakefile = roundTrip(lakefileCarrier, decodeLakefileToml(`
name = "RelMath"
version = "0.1.0"
defaultTargets = ["RelMath"]

[[lean_lib]]
name = "RelMath"
`));
  assert.deepEqual(lakefile.defaultTargets, ["RelMath"]);

  const module = roundTrip(leanModuleCarrier, decodeLeanModule(`
import RelMath.Mark
namespace RelMath
theorem sample_spine : True := by
  trivial
lemma admitted_frontier : True := by
  sorry
end RelMath
`, "RelMath.Sample", "RelMath/Sample.lean"));
  assert.deepEqual(module.imports, ["RelMath.Mark"]);
  assert.equal(module.declarations[0].name, "RelMath.sample_spine");
  assert.equal(module.declarations[1].proofStatus, "admitted");

  const graph = reflectLeanModuleGraph([module], ["RelMath.Sample"]);
  assert.equal(graph.edges[0].to, "RelMath.Mark");

  const oracle = roundTrip(leanBuildOracleCarrier, decodeLeanBuildOracle({
    command: "lake",
    args: ["build"],
    exitCode: 1,
    stderr: "RelMath/Sample.lean:5:2: error: declaration uses 'sorry'\n",
  }));
  assert.equal(oracle.succeeded, false);
  assert.equal(oracle.errors.length, 1);
});

test("computing admits the live RelMath proof environment through the single raw boundary", () => {
  const relmathRoot = fileURLToPath(new URL("../../../sites/relmath.bare-cedar-fog.emsenn.net/", import.meta.url));
  const admission = readLeanAdmission(relmathRoot);
  const environment = leanEnvironmentFromAdmission(admission);
  const graph = reflectLeanModuleGraph(environment.modules, [environment.rootModule]);

  assert.equal(environment.toolchain.toolchain, "leanprover/lean4:v4.31.0");
  assert.equal(environment.lakefile.name, "RelMath");
  assert.ok(environment.modules.length >= 180);
  assert.ok(environment.declarationIndex.declarations.includes("RelMath.Mark"));
  assert.ok(graph.edges.length >= environment.modules.length);
});
