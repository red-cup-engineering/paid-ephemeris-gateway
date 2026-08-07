import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { grant } from "@emsenn/animating";
import {
  federateGraded,
  accountableClaim,
  organizingDefaultJupyterViewArtifacts,
  organizingDefaultViewSessionEventsFromWitnessRows,
  writeOrganizingDefaultJupyterViews,
} from "../dist/index.mjs";
import { decodeIpynb } from "../dist/jupyter.mjs";

const activeClaim = (session, claimId, paths, reason = null) =>
  Object.freeze({
    kind: "organizing.theatre.active-work-locus-claim",
    claimId,
    capability: grant(
      `urn:agent:${session}`,
      `workspace:${paths.join("|")}`,
      `https://example.test/capabilities/${encodeURIComponent(claimId)}`,
    ),
    session,
    harness: "codex",
    paths: Object.freeze([...paths]),
    reason,
    at: "2026-06-26T15:00:00.000Z",
    expiresAt: "2026-06-27T15:00:00.000Z",
    event: `evt-${claimId}`,
  });

const federation = federateGraded([
  {
    id: "alpha",
    protocol: "fixture",
    collection: [
      { cell: "workspace:lib/organizing", value: "rewrite", witness: "alpha-1" },
      { cell: "workspace:lib/organizing", value: "review", witness: "alpha-2" },
    ],
  },
  {
    id: "beta",
    protocol: "fixture",
    collection: [
      { cell: "workspace:lib/organizing", value: "rewrite", witness: "beta-1" },
      { cell: "workspace:lib/organizing", value: "review", witness: "beta-2" },
    ],
  },
], { cluster: "fixture-camp" });

function fixtureInput() {
  const organizingPath = "lib/organizing/src/default-jupyter-views.mts";
  const alpha = activeClaim("alpha", "claim-alpha", [organizingPath], "write");
  const beta = activeClaim("beta", "claim-beta", [organizingPath], "review");
  return {
    instance: "fixture.organizing",
    exportedAt: "2026-06-26T15:30:00.000Z",
    witnessRows: [
      { e: "cell:absurd", a: "charge", v: { charge: "absurd" }, t: "2026-06-26T15:00:00.000Z" },
      { e: "cell:potential", a: "charge", v: { charge: "potential" }, t: "2026-06-26T15:01:00.000Z" },
      { e: "cell:active", a: "charge", v: { charge: "active" }, t: "2026-06-26T15:02:00.000Z" },
      { e: "cell:stable", a: "charge", v: { charge: "stable" }, t: "2026-06-26T15:03:00.000Z" },
    ],
    sessionEvents: [
      { id: "evt-1", session: "alpha", harness: "codex", kind: "PreToolUse", source: "mash", at: "2026-06-26T15:00:00.000Z" },
      { id: "evt-2", session: "beta", harness: "codex", kind: "PostToolUse", source: "mash", at: "2026-06-26T15:05:00.000Z" },
    ],
    camps: [
      { id: "fixture-camp", members: [{ id: "alpha" }, { id: "beta" }], sharedInbox: "https://example.test/inbox" },
    ],
    federationReports: [federation],
    accountableClaims: [accountableClaim(organizingPath, [alpha, beta])],
    packageMesh: {
      workspace: "fixture",
      packages: [
        {
          name: "@emsenn/organizing",
          version: "0.0.0",
          layer: "lib",
          lifecycle: "active",
          maturity: "experimental",
          dependencies: ["@emsenn/relating"],
          exports: [".", "./default-jupyter-views"],
          bins: ["organize"],
          scripts: ["check", "test"],
        },
        {
          name: "@emsenn/relating",
          version: "0.0.0",
          layer: "lib",
          lifecycle: "active",
          maturity: "experimental",
          dependencies: [],
          exports: ["."],
          scripts: ["check", "test"],
        },
      ],
      edges: [{ from: "@emsenn/organizing", to: "@emsenn/relating", kind: "dependency" }],
    },
  };
}

test("default organizing Jupyter views emit real notebooks and data slices", () => {
  const artifacts = organizingDefaultJupyterViewArtifacts(fixtureInput());

  assert.deepEqual(artifacts.notebooks.map((entry) => entry.path), [
    "notebooks/witness-ledger.ipynb",
    "notebooks/infotile-field.ipynb",
    "notebooks/package-mesh.ipynb",
    "notebooks/activity-timeseries.ipynb",
    "notebooks/four-charge-bilattice.ipynb",
    "notebooks/h1-coordination-cost.ipynb",
  ]);
  assert.equal(artifacts.data.some((entry) => entry.path === "data/witness-ledger.jsonl"), true);
  assert.equal(artifacts.data.some((entry) => entry.path === "data/infotile-field.jsonl"), true);

  const witnessData = artifacts.data.find((entry) => entry.path === "data/witness-ledger.jsonl");
  const rows = witnessData.content.trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(rows.map((row) => row.charge), ["absurd", "potential", "active", "stable"]);
  assert.deepEqual(rows.map((row) => row.leq_k), [0, 1, 1, 2]);
  assert.deepEqual(rows.map((row) => row.leq_t), [1, 2, 0, 1]);

  const infotileData = artifacts.data.find((entry) => entry.path === "data/infotile-field.jsonl");
  const tiles = infotileData.content.trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(tiles.map((row) => row.charge), ["absurd", "potential", "active", "stable"]);
  assert.deepEqual(tiles.map((row) => [row.x, row.y]), [[0, 0], [1, 0], [2, 0], [3, 0]]);

  const witnessNotebook = decodeIpynb(artifacts.notebooks[0].content);
  assert.equal(witnessNotebook.nbformat, 4);
  const code = witnessNotebook.cells.filter((cell) => cell.cell_type === "code").map((cell) => cell.source).join("\n");
  assert.match(code, /import pandas as pd/u);
  assert.match(code, /import altair as alt/u);
  assert.match(code, /import plotly\.graph_objects as go/u);
  assert.match(code, /import networkx as nx/u);

  const infotileNotebook = decodeIpynb(artifacts.notebooks[1].content);
  assert.equal(infotileNotebook.metadata.organizingDefaultView.view, "infotile-field");
  const infotileCode = infotileNotebook.cells.filter((cell) => cell.cell_type === "code").map((cell) => cell.source).join("\n");
  assert.match(infotileCode, /infotile-field\.jsonl/u);
  assert.match(infotileCode, /mark_rect/u);
});

test("default organizing Jupyter session events are read from canonical ICK witness rows", () => {
  const events = organizingDefaultViewSessionEventsFromWitnessRows([
    {
      e: { program: "information-coherence-kernel" },
      a: { verb: "admit-hook-event" },
      v: {
        kind: "information-coherence-kernel.hook.admission",
        session: "session-a",
        harness: "codex",
        hookEventName: "PreToolUse",
      },
      t: "2026-06-26T16:00:00.000Z",
    },
    {
      e: { program: "dev-runtime" },
      a: { verb: "record-dev-event" },
      v: {
        kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
        id: "dev-event-a",
        session: "session-b",
        harness: "claude",
        hookEventName: "PostToolUse",
        source: "dev.bare-cedar-fog.emsenn.net.inject-cockpit",
        at: "2026-06-26T16:01:00.000Z",
        activity: { type: "Create" },
      },
      t: "2026-06-26T16:01:00.000Z",
    },
  ]);

  assert.deepEqual(events.map((event) => event.session), ["session-a", "session-b"]);
  assert.deepEqual(events.map((event) => event.kind), ["PreToolUse", "PostToolUse"]);
  assert.deepEqual(events.map((event) => event.source), [
    "information-coherence-kernel.admit-hook-event",
    "dev.bare-cedar-fog.emsenn.net.inject-cockpit",
  ]);
});

test("default organizing Jupyter views write an instance-mounted artifact tree", () => {
  const outDir = mkdtempSync(path.join(tmpdir(), "organizing-default-views-"));
  const written = writeOrganizingDefaultJupyterViews({ ...fixtureInput(), outDir });

  assert.equal(written.notebooks.length, 6);
  assert.equal(written.data.length, 8);
  const packageRows = readFileSync(path.join(outDir, "data", "packages.jsonl"), "utf8");
  assert.match(packageRows, /"package":"@emsenn\/organizing"/u);
  const h1Rows = readFileSync(path.join(outDir, "data", "h1-coordination.jsonl"), "utf8");
  assert.match(h1Rows, /"h1_rank":1/u);
  const infotileRows = readFileSync(path.join(outDir, "data", "infotile-field.jsonl"), "utf8");
  assert.match(infotileRows, /"id":"tile:/u);
  const notebook = decodeIpynb(readFileSync(path.join(outDir, "notebooks", "package-mesh.ipynb"), "utf8"));
  assert.equal(notebook.metadata.organizingDefaultView.instance, "fixture.organizing");
});

const pythonStack = spawnSync("python", ["-c", "import pandas, altair, plotly, networkx"], { encoding: "utf8" });

test("generated fixture notebooks execute with the standard Python data-science stack", {
  skip: pythonStack.status === 0 ? false : "python standard stack missing: pandas, altair, plotly, networkx",
}, () => {
  const outDir = mkdtempSync(path.join(tmpdir(), "organizing-default-views-exec-"));
  writeOrganizingDefaultJupyterViews({ ...fixtureInput(), outDir });
  const executor = `
import json
from pathlib import Path
root = Path.cwd()
namespace = {"__name__": "__main__"}
for notebook in sorted((root / "notebooks").glob("*.ipynb")):
    document = json.loads(notebook.read_text(encoding="utf-8"))
    for cell in document["cells"]:
        if cell.get("cell_type") != "code":
            continue
        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)
        exec(compile(source, str(notebook), "exec"), namespace)
`;
  const run = spawnSync("python", ["-c", executor], { cwd: outDir, encoding: "utf8" });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});
